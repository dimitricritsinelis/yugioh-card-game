import type {
  ActionLogEntry,
  CardInstance,
  CardLocation,
  OpponentState,
  PlayerState,
  ZoneCard,
} from "../../types";
import { getLegalActions, serializeDuel } from "../duel";
import type {
  DuelAction,
  DuelState,
  DuelZoneCard,
  PlayerId,
  SerializedCard,
} from "../types";

export type LegalPlacementAction = Extract<DuelAction, { type: "play-card" }>;
export type LegalAttackAction = Extract<DuelAction, { type: "attack" }>;

export interface LegalAttackTarget {
  readonly attackerInstanceId: string;
  readonly target: { readonly kind: "direct" } | { readonly kind: "monster"; readonly zoneIndex: number };
  readonly command: LegalAttackAction;
}

export function selectPlayerView(engine: DuelState, viewerId: PlayerId = "P1"): PlayerState {
  const player = engine.players[viewerId];

  return {
    lp: player.lp,
    deck: player.deck.map(toCardInstance),
    hand: player.hand.map(toCardInstance),
    monsterZones: player.monsterZones.map(toZoneCard),
    spellTrapZones: player.spellTrapZones.map(toZoneCard),
    graveyard: player.graveyard.map(toZoneCard).filter(isZoneCard),
    banished: player.banished.map(toZoneCard).filter(isZoneCard),
  };
}

export function selectOpponentView(engine: DuelState, viewerId: PlayerId = "P1"): OpponentState {
  const opponentId = opponentOf(viewerId);
  const serialized = serializeDuel(engine, viewerId);
  const opponent = serialized.players[opponentId];

  return {
    lp: opponent.lp,
    monsterZones: opponent.monsterZones.map(toOpponentZone),
    spellTrapZones: opponent.spellTrapZones.map(toOpponentZone),
    deckCount: opponent.deckCount,
    graveyardCount: opponent.graveyard.length,
    banishedCount: opponent.banished.length,
  };
}

export function selectActionLog(engine: DuelState, viewerId: PlayerId = "P1", limit = 8): ActionLogEntry[] {
  return serializeDuel(engine, viewerId).events
    .slice(-limit)
    .reverse()
    .map((event) => ({
      id: event.id,
      message: event.message,
    }));
}

export function selectLegalPlacementActions(
  engine: DuelState,
  viewerId: PlayerId = "P1",
  selectedCardId: string | null = null,
): LegalPlacementAction[] {
  return getLegalActions(engine, viewerId).filter(
    (action): action is LegalPlacementAction =>
      action.type === "play-card" && (!selectedCardId || action.instanceId === selectedCardId),
  );
}

export function selectUnavailableHandCardIds(engine: DuelState, viewerId: PlayerId = "P1"): string[] {
  const playableCardIds = new Set(
    selectLegalPlacementActions(engine, viewerId).map((action) => action.instanceId),
  );

  return selectPlayerView(engine, viewerId).hand
    .filter((card) => !playableCardIds.has(card.instanceId))
    .map((card) => card.instanceId);
}

export function selectLegalAttackTargets(
  engine: DuelState,
  viewerId: PlayerId = "P1",
  selectedAttackerId: string | null = null,
): LegalAttackTarget[] {
  return getLegalActions(engine, viewerId)
    .filter((action): action is LegalAttackAction => action.type === "attack")
    .filter((action) => !selectedAttackerId || action.attackerInstanceId === selectedAttackerId)
    .map((action) => toLegalAttackTarget(engine, viewerId, action))
    .filter((target): target is LegalAttackTarget => Boolean(target));
}

export function findCardLocationInPlayerView(player: PlayerState, cardId: string): CardLocation | null {
  const handIndex = player.hand.findIndex((instance) => instance.instanceId === cardId);

  if (handIndex >= 0) {
    return { area: "hand", index: handIndex };
  }

  const monsterIndex = player.monsterZones.findIndex((zoneCard) => zoneCard?.instance.instanceId === cardId);

  if (monsterIndex >= 0) {
    return { area: "monster", index: monsterIndex };
  }

  const spellTrapIndex = player.spellTrapZones.findIndex((zoneCard) => zoneCard?.instance.instanceId === cardId);

  if (spellTrapIndex >= 0) {
    return { area: "spellTrap", index: spellTrapIndex };
  }

  const graveyardIndex = player.graveyard.findIndex((zoneCard) => zoneCard.instance.instanceId === cardId);

  if (graveyardIndex >= 0) {
    return { area: "graveyard", index: graveyardIndex };
  }

  const banishedIndex = player.banished.findIndex((zoneCard) => zoneCard.instance.instanceId === cardId);

  if (banishedIndex >= 0) {
    return { area: "banished", index: banishedIndex };
  }

  return null;
}

export function findCardInstanceInPlayerView(player: PlayerState, cardId: string): CardInstance | null {
  const location = findCardLocationInPlayerView(player, cardId);

  if (!location) {
    return null;
  }

  if (location.area === "hand") {
    return player.hand[location.index];
  }

  if (location.area === "monster") {
    return player.monsterZones[location.index]?.instance ?? null;
  }

  if (location.area === "spellTrap") {
    return player.spellTrapZones[location.index]?.instance ?? null;
  }

  if (location.area === "graveyard") {
    return player.graveyard[location.index].instance;
  }

  return player.banished[location.index].instance;
}

function toCardInstance(instance: { readonly instanceId: string; readonly card: CardInstance["card"] }): CardInstance {
  return {
    instanceId: instance.instanceId,
    card: instance.card,
  };
}

function toZoneCard(zone: DuelZoneCard | null): ZoneCard | null {
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

function toOpponentZone(zone: SerializedCard | null): ZoneCard | boolean | null {
  if (!zone) {
    return null;
  }

  if (!zone.card) {
    return true;
  }

  return {
    instance: {
      instanceId: zone.instanceId,
      card: zone.card,
    },
    faceDown: zone.faceDown,
    stance: zone.status === "activated" ? "activated" : zone.faceDown ? "set" : "attack",
  };
}

function toLegalAttackTarget(
  engine: DuelState,
  viewerId: PlayerId,
  command: LegalAttackAction,
): LegalAttackTarget | null {
  if (!command.defenderInstanceId) {
    return {
      attackerInstanceId: command.attackerInstanceId,
      target: { kind: "direct" },
      command,
    };
  }

  const opponent = engine.players[opponentOf(viewerId)];
  const zoneIndex = opponent.monsterZones.findIndex(
    (zone) => zone?.instance.instanceId === command.defenderInstanceId,
  );

  if (zoneIndex < 0) {
    return null;
  }

  return {
    attackerInstanceId: command.attackerInstanceId,
    target: { kind: "monster", zoneIndex },
    command,
  };
}

function isZoneCard(zone: ZoneCard | null): zone is ZoneCard {
  return Boolean(zone);
}

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}
