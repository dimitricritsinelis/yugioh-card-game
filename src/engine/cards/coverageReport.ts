import type { CardRecord } from "../../types";
import { validateDeck } from "../deckValidation";
import type { DeckList } from "../types";
import { getCardCoverage, getCoverageRejectionReason, type CardCoverageStatus } from "./coverage";
import { clonePlayableDeck, PLAYABLE_DECK_FIXTURES } from "../testing/playableDecks";

export interface CoverageReportCard {
  readonly cardId: string;
  readonly name: string;
  readonly status: CardCoverageStatus;
  readonly reason: string;
}

export interface CoverageReportBucket {
  readonly count: number;
  readonly cards: readonly CoverageReportCard[];
}

export interface SupportedPlayableDeckCardReport {
  readonly cardId: string;
  readonly name: string;
  readonly copies: number;
  readonly status: Extract<CardCoverageStatus, "implemented" | "vanilla">;
}

export interface SupportedPlayableDeckReport {
  readonly id: string;
  readonly displayName: string;
  readonly mainDeckSize: number;
  readonly sideDeckSize: number;
  readonly extraDeckSize: number;
  readonly uniqueCardCount: number;
  readonly cards: readonly SupportedPlayableDeckCardReport[];
  readonly unsupportedCardIds: readonly string[];
  readonly validationErrors: readonly string[];
}

export interface PlayableCoverageReport {
  readonly scope: {
    readonly playableDeckPolicy: "exactly-40-main-deck-no-side-no-extra";
    readonly fullCardPoolImplementationRequired: false;
    readonly playableStatuses: readonly ["implemented", "vanilla"];
    readonly blockedStatuses: readonly ["unsupported", "blockedNoExtraDeck", "blockedByScope"];
  };
  readonly totalLocalCards: number;
  readonly playableCardCount: number;
  readonly vanillaPlayable: CoverageReportBucket;
  readonly implementedPlayable: CoverageReportBucket;
  readonly unsupportedBlocked: CoverageReportBucket;
  readonly blockedByNoExtraDeckScope: CoverageReportBucket;
  readonly blockedByDeckValidation: CoverageReportBucket;
  readonly supportedPlayableDecks: readonly SupportedPlayableDeckReport[];
}

export function buildPlayableCoverageReport(cards: readonly CardRecord[]): PlayableCoverageReport {
  const entries = cards.map((card) => toCoverageReportCard(card));

  const vanillaPlayable = bucket(entries, "vanilla");
  const implementedPlayable = bucket(entries, "implemented");
  const unsupportedBlocked = bucket(entries, "unsupported");
  const blockedByNoExtraDeckScope = bucket(entries, "blockedNoExtraDeck");
  const blockedByDeckValidation = bucket(entries, "blockedByScope");

  return Object.freeze({
    scope: Object.freeze({
      playableDeckPolicy: "exactly-40-main-deck-no-side-no-extra",
      fullCardPoolImplementationRequired: false,
      playableStatuses: Object.freeze(["implemented", "vanilla"] as const),
      blockedStatuses: Object.freeze(["unsupported", "blockedNoExtraDeck", "blockedByScope"] as const),
    }),
    totalLocalCards: cards.length,
    playableCardCount: vanillaPlayable.count + implementedPlayable.count,
    vanillaPlayable,
    implementedPlayable,
    unsupportedBlocked,
    blockedByNoExtraDeckScope,
    blockedByDeckValidation,
    supportedPlayableDecks: Object.freeze(
      PLAYABLE_DECK_FIXTURES.map((fixture) =>
        buildSupportedPlayableDeckReport(fixture.id, fixture.displayName, clonePlayableDeck(fixture.deck), cards),
      ),
    ),
  });
}

function toCoverageReportCard(card: CardRecord): CoverageReportCard {
  const coverage = getCardCoverage(card);

  return Object.freeze({
    cardId: card.passcode,
    name: card.name,
    status: coverage.status,
    reason: getCoverageRejectionReason(coverage),
  });
}

function bucket(entries: readonly CoverageReportCard[], status: CardCoverageStatus): CoverageReportBucket {
  const cards = entries.filter((entry) => entry.status === status);

  return Object.freeze({
    count: cards.length,
    cards: Object.freeze(cards),
  });
}

function buildSupportedPlayableDeckReport(
  id: string,
  displayName: string,
  deck: DeckList,
  cards: readonly CardRecord[],
): SupportedPlayableDeckReport {
  const cardById = new Map(cards.map((card) => [card.passcode, card]));
  const validation = validateDeck(deck, [...cards]);
  const counts = new Map<string, number>();

  for (const cardId of deck.main) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }

  const deckCards = [...counts.entries()].map(([cardId, copies]) => {
    const card = cardById.get(cardId);

    if (!card) {
      throw new Error(`Supported playable deck ${id} references unknown cardId: ${cardId}.`);
    }

    const status = getCardCoverage(card).status;

    if (status !== "implemented" && status !== "vanilla") {
      return null;
    }

    return Object.freeze({
      cardId,
      name: card.name,
      copies,
      status,
    });
  });
  const unsupportedCardIds = [...counts.keys()].filter((cardId) => {
    const card = cardById.get(cardId);
    const status = card ? getCardCoverage(card).status : "unsupported";

    return status !== "implemented" && status !== "vanilla";
  });

  return Object.freeze({
    id,
    displayName,
    mainDeckSize: deck.main.length,
    sideDeckSize: deck.side?.length ?? 0,
    extraDeckSize: deck.extra?.length ?? 0,
    uniqueCardCount: counts.size,
    cards: Object.freeze(
      deckCards.filter((entry): entry is SupportedPlayableDeckCardReport => entry !== null),
    ),
    unsupportedCardIds: Object.freeze(unsupportedCardIds),
    validationErrors: Object.freeze([...validation.errors]),
  });
}
