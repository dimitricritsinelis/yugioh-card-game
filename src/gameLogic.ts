import { createCardInstance } from "./cardData";
import {
  advanceToNextDecision,
  applyAction,
  assignRandomPlayableDecksToDuel,
  createDuel,
  runPassiveBoardFillerOpponentTurn,
  validateDeck,
  type DeckList,
  type OverrideCardDestination,
  type ChainLink,
  type DuelAction,
  type DuelCardInstance,
  type DuelZoneCard,
  type DuelPrompt,
  type DuelState,
  type OpponentBehavior,
  type PlayerId,
  type Rng,
  type CoreZoneRef,
} from "./engine";
import {
  createEmptyFrontendGameState,
  projectEngineToGameState,
  type FrontendProjectionMeta,
} from "./engine/adapters/frontendAdapter";
import {
  findCardInstanceInPlayerView,
  findCardLocationInPlayerView,
  selectLegalAttackTargets,
  selectLegalPlacementActions,
  selectUnavailableHandCardIds,
  type LegalAttackTarget,
} from "./engine/adapters/viewSelectors";
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
export type { LegalAttackTarget };
type ProjectionMeta = FrontendProjectionMeta;

export interface PriorityView {
  currentPlayerId: PlayerId;
  canPass: boolean;
}

export interface ChainLinkView {
  id: string;
  playerId: PlayerId;
  sourceInstanceId: string;
  cardId: string | null;
  effectId: string | null;
  spellSpeed: 1 | 2 | 3;
}

export interface ChainView {
  links: ChainLinkView[];
  canResolve: boolean;
}

export interface PromptSelectionCandidate {
  id: string;
  label: string;
  instanceId: string;
  zoneRef: CoreZoneRef;
}

export interface PromptView {
  activePrompt: DuelPrompt | null;
  candidates: PromptSelectionCandidate[];
}

export type OverrideCardLocation =
  | { area: "deck"; index: number }
  | { area: "hand"; index: number }
  | { area: "monsterZone"; index: number }
  | { area: "spellTrapZone"; index: number }
  | { area: "graveyard"; index: number }
  | { area: "banished"; index: number };

export interface OverrideCardEntry {
  instanceId: string;
  card: CardRecord;
  copyLabel: string;
  location: OverrideCardLocation;
  locationLabel: string;
}

export interface FrontendDeckSelectionValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export class FrontendDeckSelectionError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(`Cannot start duel with invalid deck selection:\n- ${errors.join("\n- ")}`);
    this.name = "FrontendDeckSelectionError";
    this.errors = errors;
  }
}

interface CreateInitialGameStateOptions {
  decks?: Partial<Record<"P1" | "P2", DeckList>>;
  allowUnsupportedCards?: boolean;
  opponentBehavior?: OpponentBehavior;
  opponentTargetMonsterCount?: number;
  rng?: Rng;
  seed?: string;
  suppressWarnings?: boolean;
  viewerId?: PlayerId;
}

export function createInitialGameState(cards: CardRecord[], options: CreateInitialGameStateOptions = {}): GameState {
  if (cards.length === 0) {
    return createEmptyFrontendGameState();
  }

  const viewerId = options.viewerId ?? "P1";
  const assignment = options.decks ? null : assignRandomPlayableDecksToDuel(cards, options.rng ?? Math.random);
  const decks = options.decks ?? assignment?.decks;
  const opponentBehavior = options.opponentBehavior ?? "none";
  const opponentTargetMonsterCount = options.opponentTargetMonsterCount ?? 3;

  if (assignment?.warnings.length && !options.suppressWarnings) {
    console.warn(assignment.warnings.join("\n"));
  }

  assertFrontendDeckSelection(cards, decks, {
    allowUnsupportedCards: options.allowUnsupportedCards === true,
  });

  const engine = createDuel({
    cards,
    mode: opponentBehavior === "passive-board-filler" ? "match" : "solo",
    seed: options.seed ?? crypto.randomUUID(),
    decks,
    allowUnsupportedCards: options.allowUnsupportedCards === true,
  });
  const beforeHand = engine.players[viewerId].hand.map((card) => card.instanceId);
  const readyEngine = advanceToNextDecision(engine, viewerId).state;
  const drawnCard = readyEngine.players[viewerId].hand.find((card) => !beforeHand.includes(card.instanceId));

  return projectEngineToGameState(
    readyEngine,
    {
      selectedCardId: readyEngine.players[viewerId].hand[0]?.instanceId ?? null,
      lastDrawnCardId: drawnCard?.instanceId ?? null,
      lastPlacedCardId: null,
      opponentBehavior,
      opponentTargetMonsterCount,
    },
    viewerId,
  );
}

function getViewerId(state: GameState): PlayerId {
  return state.viewerId ?? "P1";
}

function getOpposingPlayerId(viewerId: PlayerId): PlayerId {
  return viewerId === "P1" ? "P2" : "P1";
}

export function validateFrontendDeckSelection(
  cards: CardRecord[],
  decks: Partial<Record<PlayerId, DeckList>> | null | undefined,
  options: { allowUnsupportedCards?: boolean } = {},
): FrontendDeckSelectionValidation {
  const errors: string[] = [];

  for (const playerId of ["P1", "P2"] as const) {
    const deck = decks?.[playerId];

    if (!deck) {
      errors.push(`${deckPlayerLabel(playerId)} deck is missing.`);
      continue;
    }

    const result = validateDeck(deck, cards, {
      allowUnsupportedCards: options.allowUnsupportedCards === true,
    });

    errors.push(...result.errors.map((error) => `${deckPlayerLabel(playerId)}: ${error}`));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
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

  const viewer = getViewerId(state);
  const beforeHand = state.engine.players[viewer].hand.map((card) => card.instanceId);
  let engine: DuelState;

  if (state.phase === "M1") {
    engine = canEnterBattle(state)
      ? applyAction(state.engine, { type: "advance-phase", playerId: viewer }).state
      : applyAction(state.engine, { type: "end-turn", playerId: viewer }).state;
  } else if (state.phase === "BP") {
    engine = applyAction(state.engine, { type: "advance-phase", playerId: viewer }).state;
  } else if (state.phase === "M2") {
    engine = applyAction(state.engine, { type: "end-turn", playerId: viewer }).state;
  } else {
    engine = applyAction(state.engine, {
      type: state.phase === "EP" ? "end-turn" : "advance-phase",
      playerId: viewer,
    }).state;
  }

  engine = runConfiguredOpponentBehavior(engine, state);

  const nextDecision = advanceToNextDecision(engine, viewer).state;
  const drawnCard = nextDecision.players[viewer].hand.find((card) => !beforeHand.includes(card.instanceId));

  return projectEngineToGameState(
    nextDecision,
    {
      selectedCardId: drawnCard?.instanceId ?? state.selectedCardId,
      lastDrawnCardId: drawnCard?.instanceId ?? null,
      lastPlacedCardId: null,
      opponentBehavior: state.opponentBehavior,
      opponentTargetMonsterCount: state.opponentTargetMonsterCount,
    },
    viewer,
  );
}

export function isViewerActivePlayer(state: GameState): boolean {
  if (!state.engine) {
    return false;
  }

  const viewer = getViewerId(state);
  return state.engine.activePlayer === viewer && !state.engine.winner;
}

export function canEnterBattle(state: GameState): boolean {
  if (!state.engine || state.engine.phase !== "M1") {
    return false;
  }

  const viewer = getViewerId(state);
  return state.engine.players[viewer].monsterZones.some(
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

  return selectLegalPlacementActions(state.engine, getViewerId(state), cardId);
}

export function getUnavailableHandCardIds(state: GameState): string[] {
  if (!state.engine) {
    return [];
  }

  return selectUnavailableHandCardIds(state.engine, getViewerId(state));
}

export function getLegalAttackTargetsForCard(
  state: GameState,
  attackerId: string | null,
): LegalAttackTarget[] {
  if (!state.engine || !attackerId) {
    return [];
  }

  return selectLegalAttackTargets(state.engine, getViewerId(state), attackerId);
}

// Manual-play build: chains, priority, and effect prompts are removed. These
// view-models return empty defaults so any remaining callers stay inert.
export function getPriorityView(state: GameState): PriorityView {
  return {
    currentPlayerId: getViewerId(state),
    canPass: false,
  };
}

export function getChainView(_state: GameState): ChainView {
  return {
    links: [],
    canResolve: false,
  };
}

export function getPromptView(_state: GameState): PromptView {
  return {
    activePrompt: null,
    candidates: [],
  };
}

export function getOverrideCardEntries(state: GameState): OverrideCardEntry[] {
  if (!state.engine) {
    return [];
  }

  const viewer = getViewerId(state);
  const player = state.engine.players[viewer];
  const entries: OverrideCardEntry[] = [
    ...player.deck.map((instance, index) => overrideEntry(instance, { area: "deck", index })),
    ...player.hand.map((instance, index) => overrideEntry(instance, { area: "hand", index })),
    ...collectOverrideZoneEntries(player.monsterZones, "monsterZone"),
    ...collectOverrideZoneEntries(player.spellTrapZones, "spellTrapZone"),
    ...player.graveyard.map((zone, index) => overrideEntry(zone.instance, { area: "graveyard", index })),
    ...player.banished.map((zone, index) => overrideEntry(zone.instance, { area: "banished", index })),
  ];

  return entries.sort(compareOverrideEntries);
}

// Manual-play build: priority/chain/prompt actions no longer exist. Kept as
// no-ops so any stale callers compile and do nothing.
export function passPriorityForPlayer(state: GameState): GameState {
  return state;
}

export function resolveCurrentChain(state: GameState): GameState {
  return state;
}

export function answerActivePrompt(
  state: GameState,
  _answer: { promptId: string; choiceIds?: string[]; candidateIds?: string[] },
): GameState {
  return state;
}

export function setLifePoints(
  state: GameState,
  side: "player" | "opponent",
  value: number,
): GameState {
  if (!state.engine) {
    return state;
  }

  const viewer = getViewerId(state);
  const targetPlayerId = side === "player" ? viewer : getOpposingPlayerId(viewer);
  const result = applyAction(state.engine, {
    type: "set-life-points",
    playerId: viewer,
    targetPlayerId,
    value,
  });

  return projectEngineToGameState(result.state, preserveMeta(state), viewer);
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

  const viewer = getViewerId(state);
  const result = applyAction(state.engine, {
    type: "play-card",
    playerId: viewer,
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
      "summon-successful",
      "spell-trap-set",
      "card-activated",
      "effect-activated",
    ].includes(event.type),
  );

  return projectEngineToGameState(
    result.state,
    {
      selectedCardId: state.selectedCardId,
      lastDrawnCardId: null,
      lastPlacedCardId: placed ? state.selectedCardId : null,
      opponentBehavior: state.opponentBehavior,
      opponentTargetMonsterCount: state.opponentTargetMonsterCount,
    },
    viewer,
  );
}

export function activateSetCard(state: GameState, instanceId: string): GameState {
  if (!state.engine) {
    return state;
  }

  const viewer = getViewerId(state);
  const result = applyAction(state.engine, {
    type: "activate-set-card",
    playerId: viewer,
    instanceId,
  });

  return projectEngineToGameState(
    result.state,
    {
      selectedCardId: instanceId,
      lastDrawnCardId: null,
      lastPlacedCardId: instanceId,
      opponentBehavior: state.opponentBehavior,
      opponentTargetMonsterCount: state.opponentTargetMonsterCount,
    },
    viewer,
  );
}

export function attackWithSelectedCard(state: GameState, target: LegalAttackTarget): GameState {
  if (!state.engine || state.selectedCardId !== target.attackerInstanceId) {
    return state;
  }

  const viewer = getViewerId(state);
  const result = applyAction(state.engine, target.command);

  return projectEngineToGameState(
    result.state,
    {
      selectedCardId: target.attackerInstanceId,
      lastDrawnCardId: null,
      lastPlacedCardId: null,
      opponentBehavior: state.opponentBehavior,
      opponentTargetMonsterCount: state.opponentTargetMonsterCount,
    },
    viewer,
  );
}

export function sendSelectedToGraveyard(state: GameState): GameState {
  return moveSelectedCard(state, "graveyard");
}

export function banishSelected(state: GameState): GameState {
  return moveSelectedCard(state, "banished");
}

export function overrideCardLocation(
  state: GameState,
  instanceId: string,
  destination: OverrideCardDestination,
): GameState {
  if (!state.engine) {
    return state;
  }

  const viewer = getViewerId(state);
  const result = applyAction(state.engine, {
    type: "override-card-location",
    playerId: viewer,
    instanceId,
    destination,
  });

  return projectEngineToGameState(
    result.state,
    {
      selectedCardId: instanceId,
      lastDrawnCardId: null,
      lastPlacedCardId: null,
      opponentBehavior: state.opponentBehavior,
      opponentTargetMonsterCount: state.opponentTargetMonsterCount,
    },
    viewer,
  );
}

export function getSelectedCardInstance(state: GameState): CardInstance | null {
  if (!state.selectedCardId) {
    return null;
  }

  return findCardInstanceInPlayerView(state.player, state.selectedCardId);
}

export function findCardLocation(player: PlayerState, cardId: string): CardLocation | null {
  return findCardLocationInPlayerView(player, cardId);
}

function moveSelectedCard(state: GameState, destination: "graveyard" | "banished"): GameState {
  if (!state.engine || !state.selectedCardId) {
    return state;
  }

  return overrideCardLocation(state, state.selectedCardId, { zone: destination });
}

function collectOverrideZoneEntries(
  zones: Array<DuelZoneCard | null>,
  area: "monsterZone" | "spellTrapZone",
): OverrideCardEntry[] {
  return zones.flatMap((zone, index) =>
    zone ? [overrideEntry(zone.instance, { area, index })] : [],
  );
}

function overrideEntry(instance: DuelCardInstance, location: OverrideCardLocation): OverrideCardEntry {
  return {
    instanceId: instance.instanceId,
    card: instance.card,
    copyLabel: `Copy ${copyNumberFromInstanceId(instance.instanceId)}`,
    location,
    locationLabel: overrideLocationLabel(location),
  };
}

function compareOverrideEntries(first: OverrideCardEntry, second: OverrideCardEntry): number {
  return (
    overrideLocationRank(first.location.area) - overrideLocationRank(second.location.area) ||
    first.card.name.localeCompare(second.card.name) ||
    first.card.passcode.localeCompare(second.card.passcode) ||
    copyNumberFromInstanceId(first.instanceId) - copyNumberFromInstanceId(second.instanceId) ||
    first.instanceId.localeCompare(second.instanceId)
  );
}

// Group the Override list by location: Hand, Board, Graveyard, Banished, then Deck.
function overrideLocationRank(area: OverrideCardLocation["area"]): number {
  switch (area) {
    case "hand":
      return 0;
    case "monsterZone":
    case "spellTrapZone":
      return 1;
    case "graveyard":
      return 2;
    case "banished":
      return 3;
    case "deck":
      return 4;
  }
}

function copyNumberFromInstanceId(instanceId: string): number {
  const copy = Number(instanceId.split("-").at(-1));

  return Number.isInteger(copy) && copy > 0 ? copy : 1;
}

function overrideLocationLabel(location: OverrideCardLocation): string {
  switch (location.area) {
    case "deck":
      return "Deck";
    case "hand":
      return "Hand";
    case "monsterZone":
      return `Monster Zone ${location.index + 1}`;
    case "spellTrapZone":
      return `Spell/Trap Zone ${location.index + 1}`;
    case "graveyard":
      return "Graveyard";
    case "banished":
      return "Banished";
  }
}

function preserveMeta(state: GameState): ProjectionMeta {
  return {
    selectedCardId: state.selectedCardId,
    lastDrawnCardId: state.lastDrawnCardId,
    lastPlacedCardId: state.lastPlacedCardId,
    opponentBehavior: state.opponentBehavior,
    opponentTargetMonsterCount: state.opponentTargetMonsterCount,
  };
}

function assertFrontendDeckSelection(
  cards: CardRecord[],
  decks: Partial<Record<PlayerId, DeckList>> | null | undefined,
  options: { allowUnsupportedCards?: boolean },
): asserts decks is Record<PlayerId, DeckList> {
  const validation = validateFrontendDeckSelection(cards, decks, options);

  if (!validation.valid) {
    throw new FrontendDeckSelectionError(validation.errors);
  }
}

function runConfiguredOpponentBehavior(engine: DuelState, state: GameState): DuelState {
  const viewer = getViewerId(state);
  if (
    state.opponentBehavior !== "passive-board-filler" ||
    viewer !== "P1" ||
    engine.activePlayer !== "P2"
  ) {
    return engine;
  }

  return runPassiveBoardFillerOpponentTurn(engine, {
    targetMonsterCount: state.opponentTargetMonsterCount ?? 3,
  }).state;
}

function toChainLinkView(link: ChainLink): ChainLinkView {
  return {
    id: link.id,
    playerId: link.playerId,
    sourceInstanceId: link.sourceInstanceId,
    cardId: link.cardId ?? null,
    effectId: link.effectId ?? null,
    spellSpeed: link.spellSpeed,
  };
}

function promptUsesCardSelection(kind: DuelPrompt["kind"]): boolean {
  return kind === "target" || kind === "discard" || kind === "tribute";
}

function collectPromptSelectionCandidates(state: GameState): PromptSelectionCandidate[] {
  if (!state.engine) {
    return [];
  }

  const viewer = getViewerId(state);
  const opponent = getOpposingPlayerId(viewer);

  return [
    ...state.engine.players[viewer].hand.map((instance, index) => ({
      id: candidateId(viewer, "hand", index),
      label: `Hand ${index + 1}: ${instance.card.name}`,
      instanceId: instance.instanceId,
      zoneRef: { playerId: viewer, zone: "hand", index } satisfies CoreZoneRef,
    })),
    ...collectZoneCandidates(state.engine, viewer, "monsterZone", viewer),
    ...collectZoneCandidates(state.engine, viewer, "spellTrapZone", viewer),
    ...collectPileCandidates(state.engine, viewer, "graveyard", viewer),
    ...collectPileCandidates(state.engine, viewer, "banished", viewer),
    ...collectZoneCandidates(state.engine, opponent, "monsterZone", viewer),
    ...collectZoneCandidates(state.engine, opponent, "spellTrapZone", viewer),
    ...collectPileCandidates(state.engine, opponent, "graveyard", viewer),
    ...collectPileCandidates(state.engine, opponent, "banished", viewer),
  ];
}

function collectZoneCandidates(
  engine: DuelState,
  playerId: PlayerId,
  zone: "monsterZone" | "spellTrapZone",
  viewer: PlayerId,
): PromptSelectionCandidate[] {
  const zones = zone === "monsterZone"
    ? engine.players[playerId].monsterZones
    : engine.players[playerId].spellTrapZones;

  return zones.flatMap((zoneCard, index) =>
    zoneCard
      ? [{
          id: candidateId(playerId, zone, index),
          label: `${playerLabel(playerId, viewer)} ${zone === "monsterZone" ? "Monster" : "Spell/Trap"} ${index + 1}: ${zoneCard.faceDown ? "Set card" : zoneCard.instance.card.name}`,
          instanceId: zoneCard.instance.instanceId,
          zoneRef: { playerId, zone, index } satisfies CoreZoneRef,
        }]
      : [],
  );
}

function collectPileCandidates(
  engine: DuelState,
  playerId: PlayerId,
  zone: "graveyard" | "banished",
  viewer: PlayerId,
): PromptSelectionCandidate[] {
  return engine.players[playerId][zone].map((zoneCard, index) => ({
    id: candidateId(playerId, zone, index),
    label: `${playerLabel(playerId, viewer)} ${zone === "graveyard" ? "GY" : "Banished"} ${index + 1}: ${zoneCard.instance.card.name}`,
    instanceId: zoneCard.instance.instanceId,
    zoneRef: { playerId, zone, index } satisfies CoreZoneRef,
  }));
}

function candidateId(playerId: PlayerId, zone: CoreZoneRef["zone"], index: number): string {
  return `${playerId}:${zone}:${index}`;
}

function playerLabel(playerId: PlayerId, viewer: PlayerId): string {
  return playerId === viewer ? "Player" : "Opponent";
}

function deckPlayerLabel(playerId: PlayerId): string {
  return playerId === "P1" ? "Player 1" : "Player 2";
}
