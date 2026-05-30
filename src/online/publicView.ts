import {
  getLegalActions,
  type DuelAction,
  type DuelEvent,
  type DuelState,
  type DuelZoneCard,
  type PlayerId,
} from "../engine";
import {
  selectLegalPlacementActions,
  selectUnavailableHandCardIds,
} from "../engine/adapters/viewSelectors";
import type { ActionLogEntry, CardInstance, OpponentState, PlayerState, ZoneCard } from "../types";
import { formatActionLogEntry } from "./redaction";
import type {
  OnlineBoardZone,
  OnlineGameStatus,
  OnlineGameView,
  OnlineLegalAttackTarget,
  OnlineLegalState,
  OnlinePublicPlayerBoard,
  OnlineSeatPublicStatus,
  OnlineSeatsView,
  OnlineSpectatorBoard,
  OnlineViewerRole,
  SeatRecord,
} from "./types";

const HAND_SIZE_LIMIT = 6;

export function buildOnlineGameView(input: {
  readonly gameId: string;
  readonly code: string;
  readonly realtimeTopic: string;
  readonly status: OnlineGameStatus;
  readonly version: number;
  readonly engine: DuelState;
  readonly seats: readonly SeatRecord[];
  readonly viewerRole: OnlineViewerRole;
  readonly eventLimit?: number;
}): OnlineGameView {
  const viewerId = input.viewerRole === "P1" || input.viewerRole === "P2" ? input.viewerRole : undefined;
  const seats = publicSeats(input.seats);
  const actionLog = selectRedactedActionLog(input.engine.events, viewerId ?? null, input.eventLimit ?? 6);
  const legal = viewerId ? selectOnlineLegalState(input.engine, viewerId) : emptyLegalState("Spectating");

  const base = {
      gameId: input.gameId,
      code: input.code,
      realtimeTopic: input.realtimeTopic,
      version: input.version,
    status: input.status,
    seats,
    viewerRole: input.viewerRole,
    viewerId,
    phase: input.engine.phase,
    turn: input.engine.turn,
    activePlayer: input.engine.activePlayer,
    winner: input.engine.winner,
    actionLog,
    legal,
  } satisfies Omit<OnlineGameView, "player" | "opponent" | "spectator">;

  if (!viewerId) {
    return {
      ...base,
      spectator: selectSpectatorBoard(input.engine),
    };
  }

  return {
    ...base,
    player: selectPrivatePlayerView(input.engine, viewerId),
    playerDeckCount: input.engine.players[viewerId].deck.length,
    opponent: selectPublicOpponentView(input.engine, viewerId),
  };
}

export function selectOnlineLegalState(engine: DuelState, viewerId: PlayerId): OnlineLegalState {
  if (engine.winner || engine.activePlayer !== viewerId) {
    return emptyLegalState(`Waiting on ${opponentOf(viewerId)}`);
  }

  const placements = selectLegalPlacementActions(engine, viewerId);
  const attacks = selectSafeLegalAttackTargets(engine, viewerId);
  const activateSetCardIds = selectActivatableSetCardIds(engine, viewerId);
  const advanceLabel = getAdvanceLabel(engine, viewerId);
  const discardRequiredCount =
    advanceLabel === "End Turn" && engine.players[viewerId].hand.length > HAND_SIZE_LIMIT
      ? engine.players[viewerId].hand.length - HAND_SIZE_LIMIT
      : 0;

  return {
    placements,
    attacks,
    activateSetCardIds,
    unavailableHandCardIds: selectUnavailableHandCardIds(engine, viewerId),
    canAdvance: true,
    advanceLabel,
    discardRequiredCount,
  };
}

export function selectSpectatorBoard(engine: DuelState): OnlineSpectatorBoard {
  return {
    P1: selectPublicPlayerBoard(engine, "P1"),
    P2: selectPublicPlayerBoard(engine, "P2"),
  };
}

function selectPrivatePlayerView(engine: DuelState, viewerId: PlayerId): PlayerState {
  const player = engine.players[viewerId];

  return {
    lp: player.lp,
    deck: [],
    hand: player.hand.map(toCardInstance),
    monsterZones: player.monsterZones.map((zone) => toPrivateZoneCard(zone)),
    spellTrapZones: player.spellTrapZones.map((zone) => toPrivateZoneCard(zone)),
    graveyard: player.graveyard.map(toPrivateZoneCard).filter(isZoneCard),
    banished: player.banished.map(toPrivateZoneCard).filter(isZoneCard),
  };
}

function selectPublicOpponentView(engine: DuelState, viewerId: PlayerId): OpponentState {
  const opponent = engine.players[opponentOf(viewerId)];

  return {
    lp: opponent.lp,
    monsterZones: opponent.monsterZones.map((zone) => toPublicBoardZone(zone)),
    spellTrapZones: opponent.spellTrapZones.map((zone) => toPublicBoardZone(zone)),
    deckCount: opponent.deck.length,
    graveyardCount: opponent.graveyard.length,
    banishedCount: opponent.banished.length,
  };
}

function selectPublicPlayerBoard(engine: DuelState, playerId: PlayerId): OnlinePublicPlayerBoard {
  const player = engine.players[playerId];

  return {
    lp: player.lp,
    deckCount: player.deck.length,
    handCount: player.hand.length,
    monsterZones: player.monsterZones.map((zone) => toPublicBoardZone(zone)),
    spellTrapZones: player.spellTrapZones.map((zone) => toPublicBoardZone(zone)),
    graveyard: player.graveyard.map(toPrivateZoneCard).filter(isZoneCard),
    banished: player.banished.map(toPrivateZoneCard).filter(isZoneCard),
  };
}

function selectSafeLegalAttackTargets(engine: DuelState, viewerId: PlayerId): OnlineLegalAttackTarget[] {
  const targets: OnlineLegalAttackTarget[] = [];
  const legalAttacks = getLegalActions(engine, viewerId).filter(
    (action): action is Extract<DuelAction, { type: "attack" }> => action.type === "attack",
  );

  for (const action of legalAttacks) {
    if (!action.defenderInstanceId) {
      targets.push({
        attackerInstanceId: action.attackerInstanceId,
        target: { kind: "direct" },
        command: {
          type: "attack",
          playerId: viewerId,
          attackerInstanceId: action.attackerInstanceId,
        },
      });
      continue;
    }

    const opponent = engine.players[opponentOf(viewerId)];
    const zoneIndex = opponent.monsterZones.findIndex(
      (zone) => zone?.instance.instanceId === action.defenderInstanceId,
    );

    if (zoneIndex < 0) {
      continue;
    }

    targets.push({
      attackerInstanceId: action.attackerInstanceId,
      target: { kind: "monster", zoneIndex },
      command: {
        type: "attack",
        playerId: viewerId,
        attackerInstanceId: action.attackerInstanceId,
      },
    });
  }

  return targets;
}

function selectActivatableSetCardIds(engine: DuelState, viewerId: PlayerId): string[] {
  if (engine.winner || engine.activePlayer !== viewerId) {
    return [];
  }

  return engine.players[viewerId].spellTrapZones.flatMap((zone) => {
    if (!zone || !zone.faceDown || zone.status !== "set") {
      return [];
    }

    if (zone.instance.card.category === "Trap" && (zone.setTurn == null || zone.setTurn >= engine.turn)) {
      return [];
    }

    return [zone.instance.instanceId];
  });
}

function selectRedactedActionLog(
  events: readonly DuelEvent[],
  viewerId: PlayerId | null,
  limit: number,
): ActionLogEntry[] {
  const entries: ActionLogEntry[] = [];
  for (const event of events) {
    const formatted = formatActionLogEntry(event, viewerId);
    if (formatted) {
      entries.push({ id: event.id, message: formatted.text, actor: formatted.actor });
    }
  }

  // Keep the most recent meaningful entries, newest first.
  return entries.slice(-limit).reverse();
}

function getAdvanceLabel(engine: DuelState, viewerId: PlayerId): string {
  if (engine.activePlayer !== viewerId || engine.winner) {
    return `Waiting on ${opponentOf(viewerId)}`;
  }

  if (engine.phase === "M1") {
    return canEnterBattle(engine, viewerId) ? "Battle Phase" : "End Turn";
  }

  if (engine.phase === "BP") {
    return "Main Phase 2";
  }

  if (engine.phase === "M2" || engine.phase === "EP") {
    return "End Turn";
  }

  return "Continue";
}

function canEnterBattle(engine: DuelState, playerId: PlayerId): boolean {
  if (engine.phase !== "M1") {
    return false;
  }

  return engine.players[playerId].monsterZones.some(
    (zone) => zone && !zone.faceDown && zone.position === "attack" && !zone.instance.attackedThisTurn,
  );
}

function publicSeats(seats: readonly SeatRecord[]): OnlineSeatsView {
  return {
    P1: publicSeat("P1", seats),
    P2: publicSeat("P2", seats),
  };
}

function publicSeat(role: PlayerId, seats: readonly SeatRecord[]): OnlineSeatPublicStatus {
  const seat = seats.find((candidate) => candidate.role === role);

  return {
    role,
    occupied: Boolean(seat),
    playerName: seat?.playerName ?? null,
    heartbeatAt: seat?.heartbeatAt ?? null,
    disconnectedAt: seat?.disconnectedAt ?? null,
  };
}

function toCardInstance(instance: { readonly instanceId: string; readonly card: CardInstance["card"] }): CardInstance {
  return {
    instanceId: instance.instanceId,
    card: instance.card,
  };
}

function toPrivateZoneCard(zone: DuelZoneCard | null): ZoneCard | null {
  if (!zone) {
    return null;
  }

  return {
    instance: toCardInstance(zone.instance),
    faceDown: zone.faceDown,
    stance: zone.status === "activated" ? "activated" : zone.faceDown ? "set" : "attack",
    setTurn: zone.setTurn ?? null,
  };
}

function toPublicBoardZone(zone: DuelZoneCard | null): OnlineBoardZone {
  if (!zone) {
    return null;
  }

  if (zone.faceDown) {
    return true;
  }

  return toPrivateZoneCard(zone);
}

function emptyLegalState(advanceLabel: string): OnlineLegalState {
  return {
    placements: [],
    attacks: [],
    activateSetCardIds: [],
    unavailableHandCardIds: [],
    canAdvance: false,
    advanceLabel,
    discardRequiredCount: 0,
  };
}

function isZoneCard(zone: ZoneCard | null): zone is ZoneCard {
  return Boolean(zone);
}

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}
