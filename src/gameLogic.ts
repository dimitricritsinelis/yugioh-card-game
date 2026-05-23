import { createCardInstance } from "./cardData";
import {
  advanceToNextDecision,
  applyAction,
  assignRandomTestDecksToDuel,
  createDuel,
  getLegalActions,
  runPassiveBoardFillerOpponentTurn,
  serializeDuel,
  type DeckList,
  type DuelAction,
  type DuelState,
  type OpponentBehavior,
  type Rng,
  type SerializedCard,
} from "./engine";
import type {
  CardAction,
  CardCategory,
  CardInstance,
  CardLocation,
  CardRecord,
  GameState,
  Phase,
  PlayerState,
  ZoneCard,
  ZoneKind,
} from "./types";

export const ACTION_PHASES: Phase[] = ["M1", "BP", "M2", "EP"];
export const ZONE_COUNT = 5;

export const PHASE_INFO: Record<Phase, { short: string; full: string }> = {
  DP: { short: "Draw", full: "Draw Phase" },
  SP: { short: "Standby", full: "Standby Phase" },
  M1: { short: "Main 1", full: "Main Phase 1" },
  BP: { short: "Battle", full: "Battle Phase" },
  M2: { short: "Main 2", full: "Main Phase 2" },
  EP: { short: "End", full: "End Phase" },
};

export type LegalPlacementAction = Extract<DuelAction, { type: "play-card" }>;
type ProjectionMeta = Pick<GameState, "selectedCardId" | "lastDrawnCardId" | "lastPlacedCardId"> &
  Partial<Pick<GameState, "opponentBehavior" | "opponentTargetMonsterCount">>;

interface CreateInitialGameStateOptions {
  decks?: Partial<Record<"P1" | "P2", DeckList>>;
  opponentBehavior?: OpponentBehavior;
  opponentTargetMonsterCount?: number;
  rng?: Rng;
  seed?: string;
  suppressWarnings?: boolean;
}

export function createInitialGameState(cards: CardRecord[], options: CreateInitialGameStateOptions = {}): GameState {
  if (cards.length === 0) {
    return createEmptyGameState();
  }

  const assignment = options.decks ? null : assignRandomTestDecksToDuel(cards, options.rng);
  const opponentBehavior = options.opponentBehavior ?? "none";
  const opponentTargetMonsterCount = options.opponentTargetMonsterCount ?? 3;

  if (assignment?.warnings.length && !options.suppressWarnings) {
    console.warn(assignment.warnings.join("\n"));
  }

  const engine = createDuel({
    cards,
    mode: opponentBehavior === "passive-board-filler" ? "match" : "solo",
    seed: options.seed ?? crypto.randomUUID(),
    decks: options.decks ?? assignment?.decks,
  });
  const beforeHand = engine.players.P1.hand.map((card) => card.instanceId);
  const readyEngine = advanceToNextDecision(engine, "P1").state;
  const drawnCard = readyEngine.players.P1.hand.find((card) => !beforeHand.includes(card.instanceId));

  return projectEngineToGameState(readyEngine, {
    selectedCardId: readyEngine.players.P1.hand[0]?.instanceId ?? null,
    lastDrawnCardId: drawnCard?.instanceId ?? null,
    lastPlacedCardId: null,
    opponentBehavior,
    opponentTargetMonsterCount,
  });
}

/**
 * Dev-only board seed. Populates every visual state in one shot for screenshot
 * layout testing. Gameplay actions after loading the demo resync from the
 * engine's normal opening state.
 */
export function createDemoGameState(cards: CardRecord[]): GameState {
  const base = createInitialGameState(cards);

  const take = (category: CardCategory, count: number): CardInstance[] =>
    cards
      .filter((card) => card.category === category)
      .slice(0, count)
      .map(createCardInstance);

  const monsters = take("Monster", 4);
  const spells = take("Spell", 2);
  const traps = take("Trap", 3);

  if (monsters.length < 4 || spells.length < 2 || traps.length < 3) {
    return base;
  }

  const fieldCard = (instance: CardInstance, faceDown: boolean): ZoneCard => ({
    instance,
    faceDown,
    stance: faceDown ? "set" : "attack",
  });

  const pileCard = (instance: CardInstance): ZoneCard => ({
    instance,
    faceDown: false,
    stance: "activated",
  });

  return {
    ...base,
    player: {
      ...base.player,
      monsterZones: [
        fieldCard(monsters[0], false),
        null,
        fieldCard(monsters[1], true),
        null,
        fieldCard(monsters[2], false),
      ],
      spellTrapZones: [
        fieldCard(traps[0], true),
        null,
        { instance: spells[0], faceDown: false, stance: "activated" },
        null,
        fieldCard(traps[1], true),
      ],
      graveyard: [pileCard(monsters[3]), pileCard(spells[1])],
      banished: [pileCard(traps[2])],
    },
    opponent: {
      ...base.opponent,
      graveyardCount: 4,
      banishedCount: 2,
    },
    phase: "M1",
    turn: 3,
    selectedCardId: monsters[3].instanceId,
    lastDrawnCardId: null,
    lastPlacedCardId: null,
    actionLog: [
      {
        id: crypto.randomUUID(),
        message: "Demo scenario loaded - every board state populated for visual testing.",
      },
    ],
  };
}

export function continueTurnFlow(state: GameState): GameState {
  if (!state.engine) {
    return state;
  }

  const beforeHand = state.engine.players.P1.hand.map((card) => card.instanceId);
  let engine: DuelState;

  if (state.phase === "M1") {
    engine = canEnterBattle(state)
      ? applyAction(state.engine, { type: "advance-phase", playerId: "P1" }).state
      : applyAction(state.engine, { type: "end-turn", playerId: "P1" }).state;
  } else if (state.phase === "BP") {
    engine = applyAction(state.engine, { type: "advance-phase", playerId: "P1" }).state;
  } else if (state.phase === "M2") {
    engine = applyAction(state.engine, { type: "end-turn", playerId: "P1" }).state;
  } else {
    engine = applyAction(state.engine, {
      type: state.phase === "EP" ? "end-turn" : "advance-phase",
      playerId: "P1",
    }).state;
  }

  engine = runConfiguredOpponentBehavior(engine, state);

  const nextDecision = advanceToNextDecision(engine, "P1").state;
  const drawnCard = nextDecision.players.P1.hand.find((card) => !beforeHand.includes(card.instanceId));

  return projectEngineToGameState(nextDecision, {
    selectedCardId: drawnCard?.instanceId ?? state.selectedCardId,
    lastDrawnCardId: drawnCard?.instanceId ?? null,
    lastPlacedCardId: null,
    opponentBehavior: state.opponentBehavior,
    opponentTargetMonsterCount: state.opponentTargetMonsterCount,
  });
}

export function canEnterBattle(state: GameState): boolean {
  if (!state.engine || state.engine.phase !== "M1") {
    return false;
  }

  return state.engine.players.P1.monsterZones.some(
    (zone) => zone && !zone.faceDown && zone.position === "attack" && !zone.instance.attackedThisTurn,
  );
}

export function getTurnFlowActionLabel(state: GameState): string {
  if (state.phase === "M1") {
    return canEnterBattle(state) ? "Battle Phase" : "End Turn";
  }

  if (state.phase === "BP") {
    return "End Battle";
  }

  if (state.phase === "M2" || state.phase === "EP") {
    return "End Turn";
  }

  return "Continue";
}

export function getLegalPlacementsForCard(state: GameState, cardId: string | null): LegalPlacementAction[] {
  if (!state.engine || !cardId) {
    return [];
  }

  return getLegalActions(state.engine, "P1").filter(
    (action): action is LegalPlacementAction => action.type === "play-card" && action.instanceId === cardId,
  );
}

export function getUnavailableHandCardIds(state: GameState): string[] {
  if (!state.engine) {
    return [];
  }

  const playableCardIds = new Set(
    getLegalActions(state.engine, "P1")
      .filter((action): action is LegalPlacementAction => action.type === "play-card")
      .map((action) => action.instanceId),
  );

  return state.player.hand
    .filter((card) => !playableCardIds.has(card.instanceId))
    .map((card) => card.instanceId);
}

export function setLifePoints(
  state: GameState,
  side: "player" | "opponent",
  value: number,
): GameState {
  if (!state.engine) {
    return state;
  }

  const targetPlayerId = side === "player" ? "P1" : "P2";
  const result = applyAction(state.engine, {
    type: "set-life-points",
    playerId: "P1",
    targetPlayerId,
    value,
  });

  return projectEngineToGameState(result.state, {
    selectedCardId: state.selectedCardId,
    lastDrawnCardId: state.lastDrawnCardId,
    lastPlacedCardId: state.lastPlacedCardId,
    opponentBehavior: state.opponentBehavior,
    opponentTargetMonsterCount: state.opponentTargetMonsterCount,
  });
}

export function placeSelectedCard(
  state: GameState,
  action: CardAction,
  zoneKind: ZoneKind,
  index: number,
  tributeInstanceIds: string[] = [],
): GameState {
  if (!state.engine || !state.selectedCardId) {
    return state;
  }

  const result = applyAction(state.engine, {
    type: "play-card",
    playerId: "P1",
    instanceId: state.selectedCardId,
    intent: action,
    zoneKind,
    zoneIndex: index,
    tributeInstanceIds,
  });
  const placed = result.events.some((event) =>
    [
      "monster-set",
      "monster-summoned",
      "monster-tribute-set",
      "monster-tribute-summoned",
      "spell-trap-set",
      "card-activated",
    ].includes(event.type),
  );

  return projectEngineToGameState(result.state, {
    selectedCardId: state.selectedCardId,
    lastDrawnCardId: null,
    lastPlacedCardId: placed ? state.selectedCardId : null,
    opponentBehavior: state.opponentBehavior,
    opponentTargetMonsterCount: state.opponentTargetMonsterCount,
  });
}

export function sendSelectedToGraveyard(state: GameState): GameState {
  return moveSelectedCard(state, "graveyard");
}

export function banishSelected(state: GameState): GameState {
  return moveSelectedCard(state, "banished");
}

export function getSelectedCardInstance(state: GameState): CardInstance | null {
  if (!state.selectedCardId) {
    return null;
  }

  return findCardInstance(state.player, state.selectedCardId);
}

export function findCardLocation(player: PlayerState, cardId: string): CardLocation | null {
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

function moveSelectedCard(state: GameState, destination: "graveyard" | "banished"): GameState {
  if (!state.engine || !state.selectedCardId) {
    return state;
  }

  const result = applyAction(state.engine, {
    type: "move-card",
    playerId: "P1",
    instanceId: state.selectedCardId,
    destination,
  });

  return projectEngineToGameState(result.state, {
    selectedCardId: state.selectedCardId,
    lastDrawnCardId: null,
    lastPlacedCardId: null,
    opponentBehavior: state.opponentBehavior,
    opponentTargetMonsterCount: state.opponentTargetMonsterCount,
  });
}

function runConfiguredOpponentBehavior(engine: DuelState, state: GameState): DuelState {
  if (state.opponentBehavior !== "passive-board-filler" || engine.activePlayer !== "P2") {
    return engine;
  }

  return runPassiveBoardFillerOpponentTurn(engine, {
    targetMonsterCount: state.opponentTargetMonsterCount ?? 3,
  }).state;
}

function projectEngineToGameState(
  engine: DuelState,
  meta: ProjectionMeta,
): GameState {
  const serialized = serializeDuel(engine, "P1");

  return {
    engine,
    opponentBehavior: meta.opponentBehavior ?? "none",
    opponentTargetMonsterCount: meta.opponentTargetMonsterCount ?? 3,
    player: {
      lp: serialized.players.P1.lp,
      deck: engine.players.P1.deck.map(toCardInstance),
      hand: engine.players.P1.hand.map(toCardInstance),
      monsterZones: engine.players.P1.monsterZones.map(toZoneCard),
      spellTrapZones: engine.players.P1.spellTrapZones.map(toZoneCard),
      graveyard: engine.players.P1.graveyard.map(toZoneCard).filter(isZoneCard),
      banished: engine.players.P1.banished.map(toZoneCard).filter(isZoneCard),
    },
    opponent: {
      lp: serialized.players.P2.lp,
      monsterZones: serialized.players.P2.monsterZones.map(toOpponentZone),
      spellTrapZones: serialized.players.P2.spellTrapZones.map(toOpponentZone),
      deckCount: serialized.players.P2.deckCount,
      graveyardCount: serialized.players.P2.graveyard.length,
      banishedCount: serialized.players.P2.banished.length,
    },
    phase: serialized.phase,
    turn: serialized.turn,
    selectedCardId: meta.selectedCardId,
    actionLog: serialized.events
      .slice(-8)
      .reverse()
      .map((event) => ({
        id: event.id,
        message: event.message,
      })),
    lastDrawnCardId: meta.lastDrawnCardId,
    lastPlacedCardId: meta.lastPlacedCardId,
  };
}

function toCardInstance(instance: { instanceId: string; card: CardRecord }): CardInstance {
  return {
    instanceId: instance.instanceId,
    card: instance.card,
  };
}

function toZoneCard(zone: DuelState["players"]["P1"]["monsterZones"][number]): ZoneCard | null {
  if (!zone) {
    return null;
  }

  return {
    instance: toCardInstance(zone.instance),
    faceDown: zone.faceDown,
    stance: zone.status === "activated" ? "activated" : zone.faceDown ? "set" : "attack",
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

function findCardInstance(player: PlayerState, cardId: string): CardInstance | null {
  const location = findCardLocation(player, cardId);

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

function createEmptyGameState(): GameState {
  return {
    opponentBehavior: "none",
    opponentTargetMonsterCount: 3,
    player: {
      lp: 8000,
      deck: [],
      hand: [],
      monsterZones: emptyZones(),
      spellTrapZones: emptyZones(),
      graveyard: [],
      banished: [],
    },
    opponent: {
      lp: 8000,
      monsterZones: [false, false, false, false, false],
      spellTrapZones: [false, false, false, false, false],
      deckCount: 0,
      graveyardCount: 0,
      banishedCount: 0,
    },
    phase: "DP",
    turn: 1,
    selectedCardId: null,
    actionLog: [],
    lastDrawnCardId: null,
    lastPlacedCardId: null,
  };
}

function emptyZones(): Array<ZoneCard | null> {
  return Array.from({ length: ZONE_COUNT }, () => null);
}

function isZoneCard(zone: ZoneCard | null): zone is ZoneCard {
  return Boolean(zone);
}
