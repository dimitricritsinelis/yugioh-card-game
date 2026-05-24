import type { CardRecord } from "../../types";
import { validateDeck } from "../deckValidation";
import type { DeckList } from "../types";
import {
  CARD_COVERAGE_STATUSES,
  getCardCoverage,
  getCoverageRejectionReason,
  isPlayableCoverageStatus,
  type CardCoverageStatus,
} from "./coverage";
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
  readonly status: Extract<CardCoverageStatus, "goatTemplate" | "goatCustom" | "goatVanilla">;
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
    readonly fullCardPoolImplementationRequired: true;
    readonly playableStatuses: readonly ["goatVanilla", "goatTemplate", "goatCustom"];
    readonly blockedStatuses: readonly ["goatForbiddenButScripted", "goatDeckBlocked", "goatUnsupported", "notInGoatPool"];
  };
  readonly totalLocalCards: number;
  readonly statusCounts: Readonly<Record<CardCoverageStatus, number>>;
  readonly bucketsByStatus: Readonly<Record<CardCoverageStatus, CoverageReportBucket>>;
  readonly playableCardCount: number;
  readonly goatLegalUnsupportedCount: number;
  readonly goatLegalUnsupportedCards: readonly CoverageReportCard[];
  readonly strictFinalAcceptanceReady: boolean;
  readonly supportedPlayableDecks: readonly SupportedPlayableDeckReport[];
}

export function buildPlayableCoverageReport(cards: readonly CardRecord[]): PlayableCoverageReport {
  const entries = cards.map((card) => toCoverageReportCard(card));
  const bucketsByStatus = Object.freeze(
    Object.fromEntries(
      CARD_COVERAGE_STATUSES.map((status) => [status, bucket(entries, status)]),
    ) as Record<CardCoverageStatus, CoverageReportBucket>,
  );
  const statusCounts = Object.freeze(
    Object.fromEntries(
      CARD_COVERAGE_STATUSES.map((status) => [status, bucketsByStatus[status].count]),
    ) as Record<CardCoverageStatus, number>,
  );
  const playableCardCount =
    statusCounts.goatVanilla + statusCounts.goatTemplate + statusCounts.goatCustom;
  const goatLegalUnsupportedCards = bucketsByStatus.goatUnsupported.cards;

  return Object.freeze({
    scope: Object.freeze({
      playableDeckPolicy: "exactly-40-main-deck-no-side-no-extra",
      fullCardPoolImplementationRequired: true,
      playableStatuses: Object.freeze(["goatVanilla", "goatTemplate", "goatCustom"] as const),
      blockedStatuses: Object.freeze([
        "goatForbiddenButScripted",
        "goatDeckBlocked",
        "goatUnsupported",
        "notInGoatPool",
      ] as const),
    }),
    totalLocalCards: cards.length,
    statusCounts,
    bucketsByStatus,
    playableCardCount,
    goatLegalUnsupportedCount: goatLegalUnsupportedCards.length,
    goatLegalUnsupportedCards,
    strictFinalAcceptanceReady: goatLegalUnsupportedCards.length === 0,
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

    if (!isPlayableCoverageStatus(status)) {
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
    const status = card ? getCardCoverage(card).status : "goatUnsupported";

    return !isPlayableCoverageStatus(status);
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
