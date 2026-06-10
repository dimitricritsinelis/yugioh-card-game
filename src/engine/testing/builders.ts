import type { CardRecord, Phase } from "../../types";
import type { CardInstance, FaceState, MonsterPosition, ZoneCard } from "../core/cardRefs";
import { findCardByInstanceId } from "../core/zones";
import { projectDuelFromCore } from "../duel";
import { createDuel, type CreateDuelResult } from "../reducer";
import type { DeckList, DuelState as LegacyDuelState, PlayerId } from "../types";
import type { DuelState, PlayerState } from "../core/state";

export interface CreateRiggedDuelOptions {
  readonly seed?: string;
  readonly firstPlayer?: PlayerId;
  readonly p1Main?: readonly string[];
  readonly p2Main?: readonly string[];
  readonly p1PriorityCards?: readonly string[];
  readonly p2PriorityCards?: readonly string[];
  readonly allowUnsupportedCards?: boolean;
  readonly shuffleDecks?: boolean;
}

export interface PutCardOptions {
  readonly instanceId?: string;
  readonly index?: number;
}

export interface PutZoneCardOptions extends PutCardOptions {
  readonly face?: FaceState;
  readonly position?: MonsterPosition | null;
  readonly visibility?: ZoneCard["visibility"];
  readonly counters?: Readonly<Record<string, number>>;
  readonly attachments?: readonly string[];
}

export interface PutCardResult<TCard extends CardInstance | ZoneCard> {
  readonly state: DuelState;
  readonly card: TCard;
}

const MAIN_DECK_SIZE = 40;
const ZONE_COUNT = 5;

export function cardByName(cards: readonly CardRecord[], name: string): CardRecord {
  const card = cards.find((candidate) => candidate.name === name);

  if (!card) {
    throw new Error(`Missing card by name: ${name}`);
  }

  return card;
}

export function cardByPasscode(cards: readonly CardRecord[], passcode: string): CardRecord {
  const card = cards.find((candidate) => candidate.passcode === passcode);

  if (!card) {
    throw new Error(`Missing card by passcode: ${passcode}`);
  }

  return card;
}

export function createRiggedDuel(
  cards: readonly CardRecord[],
  options: CreateRiggedDuelOptions = {},
): CreateDuelResult {
  const decks: Record<PlayerId, DeckList> = {
    P1: {
      main: options.p1Main
        ? [...options.p1Main]
        : buildRiggedMainDeck(cards, options.p1PriorityCards ?? [], options.allowUnsupportedCards === true),
    },
    P2: {
      main: options.p2Main
        ? [...options.p2Main]
        : buildRiggedMainDeck(cards, options.p2PriorityCards ?? [], options.allowUnsupportedCards === true),
    },
  };

  return createDuel({
    cards,
    decks,
    seed: options.seed ?? "rigged-duel",
    firstPlayer: options.firstPlayer ?? "P1",
    allowUnsupportedCards: options.allowUnsupportedCards,
    shuffleDecks: options.shuffleDecks ?? false,
  });
}

export function putCardInHand(
  state: DuelState,
  playerId: PlayerId,
  card: CardRecord,
  options: PutCardOptions = {},
): PutCardResult<CardInstance> {
  const instance = toCardInstance(state, playerId, card, options.instanceId, "hand");
  const player = state.players[playerId];
  const index = options.index ?? player.hand.length;

  return {
    state: updatePlayer(state, playerId, {
      hand: insertArrayIndex(player.hand, index, instance),
    }),
    card: instance,
  };
}

export function putMonsterOnField(
  state: DuelState,
  playerId: PlayerId,
  card: CardRecord,
  zoneIndex = 0,
  options: PutZoneCardOptions = {},
): PutCardResult<ZoneCard> {
  const zoneCard = toZoneCard(state, playerId, card, options, "monster");
  const player = state.players[playerId];

  assertZoneIndex(zoneIndex, "monsterZone");

  return {
    state: updatePlayer(state, playerId, {
      monsterZones: replaceArrayIndex(player.monsterZones, zoneIndex, zoneCard),
    }),
    card: zoneCard,
  };
}

export function putSpellTrapOnField(
  state: DuelState,
  playerId: PlayerId,
  card: CardRecord,
  zoneIndex = 0,
  options: PutZoneCardOptions = {},
): PutCardResult<ZoneCard> {
  const zoneCard = toZoneCard(
    state,
    playerId,
    card,
    {
      face: "faceDown",
      position: null,
      visibility: "hidden",
      ...options,
    },
    "spell-trap",
  );
  const player = state.players[playerId];

  assertZoneIndex(zoneIndex, "spellTrapZone");

  return {
    state: updatePlayer(state, playerId, {
      spellTrapZones: replaceArrayIndex(player.spellTrapZones, zoneIndex, zoneCard),
    }),
    card: zoneCard,
  };
}

export function putCardInGraveyard(
  state: DuelState,
  playerId: PlayerId,
  card: CardRecord,
  options: PutZoneCardOptions = {},
): PutCardResult<ZoneCard> {
  const zoneCard = toZoneCard(
    state,
    playerId,
    card,
    {
      face: "faceUp",
      position: null,
      visibility: "public",
      ...options,
    },
    "graveyard",
  );
  const player = state.players[playerId];
  const index = options.index ?? 0;

  return {
    state: updatePlayer(state, playerId, {
      graveyard: insertArrayIndex(player.graveyard, index, zoneCard),
    }),
    card: zoneCard,
  };
}

export function setPhase(
  state: DuelState,
  phase: Phase,
  activePlayer: PlayerId = state.activePlayer,
): DuelState {
  return {
    ...state,
    phase,
    activePlayer,
  };
}

// Rigs a legacy (UI-facing) duel state core-first: applies the patch to the
// embedded core state — the single source of truth — and re-projects the
// legacy shape from it, preserving the existing action log.
export function patchDuelCoreState(
  state: LegacyDuelState,
  cards: readonly CardRecord[],
  patch: (core: DuelState) => DuelState,
): LegacyDuelState {
  if (!state.coreState) {
    throw new Error("Legacy duel state is missing its embedded core state.");
  }

  return {
    ...projectDuelFromCore(patch(state.coreState), cards, state.mode, []),
    events: state.events,
  };
}

function buildRiggedMainDeck(
  cards: readonly CardRecord[],
  priorityPasscodes: readonly string[],
  allowUnsupportedCards: boolean,
): string[] {
  if (priorityPasscodes.length > MAIN_DECK_SIZE) {
    throw new Error(`Rigged priority cards exceed ${MAIN_DECK_SIZE}.`);
  }

  const prioritySet = new Set(priorityPasscodes);
  const filler = cards
    .filter(
      (card) =>
        !prioritySet.has(card.passcode) &&
        card.legality.goat_world_pool &&
        card.legality.max_copies > 0 &&
        !card.classifications?.includes("Fusion"),
    )
    .flatMap((card) => Array.from({ length: card.legality.max_copies }, () => card.passcode));

  if (priorityPasscodes.length + filler.length < MAIN_DECK_SIZE) {
    throw new Error(`Not enough fixture cards to build a ${MAIN_DECK_SIZE}-card Main Deck.`);
  }

  return [...priorityPasscodes, ...filler].slice(0, MAIN_DECK_SIZE);
}

function toCardInstance(
  state: DuelState,
  playerId: PlayerId,
  card: CardRecord,
  instanceId: string | undefined,
  location: string,
): CardInstance {
  return {
    instanceId: instanceId ?? nextInstanceId(state, playerId, card.passcode, location),
    cardId: card.passcode,
    owner: playerId,
    controller: playerId,
  };
}

function toZoneCard(
  state: DuelState,
  playerId: PlayerId,
  card: CardRecord,
  options: PutZoneCardOptions,
  location: string,
): ZoneCard {
  return {
    ...toCardInstance(state, playerId, card, options.instanceId, location),
    face: options.face ?? "faceUp",
    position: options.position === undefined ? "attack" : options.position,
    visibility: options.visibility ?? "public",
    counters: { ...(options.counters ?? {}) },
    attachments: [...(options.attachments ?? [])],
    summonedTurn: state.turn,
    setTurn: options.face === "faceDown" ? state.turn : null,
    positionChangedTurn: null,
    attackedTurn: null,
  };
}

function nextInstanceId(state: DuelState, playerId: PlayerId, cardId: string, location: string): string {
  let index = 1;

  while (findCardByInstanceId(state, `${playerId}-${cardId}-${location}-${index}`)) {
    index += 1;
  }

  return `${playerId}-${cardId}-${location}-${index}`;
}

function updatePlayer(state: DuelState, playerId: PlayerId, patch: Partial<PlayerState>): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        ...patch,
      },
    },
  };
}

function insertArrayIndex<T>(values: readonly T[], index: number, value: T): readonly T[] {
  if (index < 0 || index > values.length) {
    throw new Error(`Index ${index} is outside insert bounds.`);
  }

  return [...values.slice(0, index), value, ...values.slice(index)];
}

function replaceArrayIndex<T>(values: readonly T[], index: number, value: T): readonly T[] {
  if (index < 0 || index >= values.length) {
    throw new Error(`Index ${index} is outside replace bounds.`);
  }

  return values.map((entry, entryIndex) => (entryIndex === index ? value : entry));
}

function assertZoneIndex(index: number, zone: string): void {
  if (index < 0 || index >= ZONE_COUNT) {
    throw new Error(`${zone}[${index}] is outside zone bounds.`);
  }
}
