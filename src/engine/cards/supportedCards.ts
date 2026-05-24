import type { CardRecord } from "../../types";
import type { DeckList } from "../types";
import {
  getCardCoverage,
  isPlayableCardRecord,
  type CardCoverageRegistry,
  type CardCoverageStatus,
} from "./coverage";
import { ENGINE_CARD_COVERAGE } from "./registry";

export interface SupportedCardEntry {
  readonly cardId: string;
  readonly status: Extract<CardCoverageStatus, "implemented" | "vanilla">;
  readonly source: "implemented-script" | "vanilla-template";
}

export interface SupportedCardPool {
  readonly cardIds: readonly string[];
  readonly entries: readonly SupportedCardEntry[];
}

export interface SupportedPlayableDeck {
  readonly id: "yugi_supported_playable" | "kaiba_supported_playable";
  readonly displayName: string;
  readonly deck: DeckList;
}

interface SupportedDeckSeed {
  readonly id: SupportedPlayableDeck["id"];
  readonly displayName: string;
  readonly priorityCardIds: readonly string[];
}

const REQUIRED_MAIN_DECK_SIZE = 40;

// Passcode/cardId seeds are the supported cards currently present in the local
// Yugi/Kaiba presets. Unsupported effect, Spell, Trap, Ritual, and Fusion cards
// remain excluded until future scripted tasks add templates and tests.
export const SUPPORTED_PLAYABLE_DECK_SEEDS: readonly SupportedDeckSeed[] = Object.freeze([
  Object.freeze({
    id: "yugi_supported_playable",
    displayName: "Yugi Supported Playable Deck",
    priorityCardIds: Object.freeze([
      "46986414",
      "46986414",
      "70781052",
    ]),
  }),
  Object.freeze({
    id: "kaiba_supported_playable",
    displayName: "Seto Kaiba Supported Playable Deck",
    priorityCardIds: Object.freeze([
      "89631139",
      "89631139",
      "89631139",
      "62651957",
      "48305365",
      "97590747",
    ]),
  }),
]);

export function buildInitialSupportedCardPool(
  cards: readonly CardRecord[],
  registry: CardCoverageRegistry = ENGINE_CARD_COVERAGE,
): SupportedCardPool {
  const entries = cards.flatMap((card): SupportedCardEntry[] => {
    const coverage = getCardCoverage(card, registry);

    if (coverage.status !== "implemented" && coverage.status !== "vanilla") {
      return [];
    }

    return [
      Object.freeze({
        cardId: card.passcode,
        status: coverage.status,
        source: coverage.status === "implemented" ? "implemented-script" : "vanilla-template",
      }),
    ];
  });

  return Object.freeze({
    cardIds: Object.freeze(entries.map((entry) => entry.cardId)),
    entries: Object.freeze(entries),
  });
}

export function isInitialSupportedCard(
  card: CardRecord,
  registry: CardCoverageRegistry = ENGINE_CARD_COVERAGE,
): boolean {
  return isPlayableCardRecord(card, registry);
}

export function buildInitialSupportedPlayableDecks(
  cards: readonly CardRecord[],
  registry: CardCoverageRegistry = ENGINE_CARD_COVERAGE,
): readonly SupportedPlayableDeck[] {
  return Object.freeze(
    SUPPORTED_PLAYABLE_DECK_SEEDS.map((seed) =>
      Object.freeze({
        id: seed.id,
        displayName: seed.displayName,
        deck: {
          main: buildSupportedMainDeck(cards, seed.priorityCardIds, registry),
        },
      }),
    ),
  );
}

function buildSupportedMainDeck(
  cards: readonly CardRecord[],
  priorityCardIds: readonly string[],
  registry: CardCoverageRegistry,
): string[] {
  const cardById = new Map(cards.map((card) => [card.passcode, card]));
  const counts = new Map<string, number>();
  const main: string[] = [];

  for (const cardId of priorityCardIds) {
    const card = cardById.get(cardId);

    if (!card || !isInitialSupportedCard(card, registry)) {
      continue;
    }

    const count = counts.get(cardId) ?? 0;

    if (count >= card.legality.max_copies) {
      continue;
    }

    counts.set(cardId, count + 1);
    main.push(cardId);
  }

  for (const card of cards) {
    if (main.length >= REQUIRED_MAIN_DECK_SIZE) {
      break;
    }

    if (!isInitialSupportedCard(card, registry)) {
      continue;
    }

    const used = counts.get(card.passcode) ?? 0;
    const remaining = Math.max(0, card.legality.max_copies - used);

    for (let index = 0; index < remaining && main.length < REQUIRED_MAIN_DECK_SIZE; index += 1) {
      counts.set(card.passcode, (counts.get(card.passcode) ?? 0) + 1);
      main.push(card.passcode);
    }
  }

  if (main.length !== REQUIRED_MAIN_DECK_SIZE) {
    throw new Error(`Initial supported card pool can only build ${main.length} Main Deck cards.`);
  }

  return main;
}
