import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { CARD_COVERAGE_STATUSES, getCardCoverage, type CardCoverageStatus } from "../cards/coverage";
import { buildPlayableCoverageReport } from "../cards/coverageReport";
import { PLAYABLE_DECK_FIXTURES } from "../testing/playableDecks";

const cards = cardsJson as CardRecord[];
const GRACEFUL_CHARITY_ID = "79571449";
const THOUSAND_EYES_RESTRICT_ID = "63519819";
const BUTTERFLY_DAGGER_ELMA_ID = "69243953";

describe("playable coverage report", () => {
  it("summarizes full card accountability separately from current playable support", () => {
    const report = buildPlayableCoverageReport(cards);
    const expectedCounts = coverageCounts();
    const reportedTotal = CARD_COVERAGE_STATUSES.reduce(
      (total, status) => total + report.statusCounts[status],
      0,
    );

    expect(report.scope).toMatchObject({
      playableDeckPolicy: "exactly-40-main-deck-no-side-no-extra",
      fullCardPoolImplementationRequired: true,
      playableStatuses: ["goatVanilla", "goatTemplate", "goatCustom"],
      blockedStatuses: ["goatForbiddenButScripted", "goatDeckBlocked", "goatUnsupported", "notInGoatPool"],
    });
    expect(report.totalLocalCards).toBe(cards.length);
    expect(report.statusCounts).toEqual(expectedCounts);
    expect(reportedTotal).toBe(report.totalLocalCards);
    expect(report.playableCardCount).toBe(
      report.statusCounts.goatVanilla + report.statusCounts.goatTemplate + report.statusCounts.goatCustom,
    );
    expect(report.goatLegalUnsupportedCount).toBe(report.bucketsByStatus.goatUnsupported.count);
    expect(report.goatLegalUnsupportedCards).toEqual(report.bucketsByStatus.goatUnsupported.cards);
    expect(report.strictFinalAcceptanceReady).toBe(false);
  });

  it("keeps unsupported, Extra/Fusion scope, and non-playable-pool blocks distinct", () => {
    const report = buildPlayableCoverageReport(cards);

    expect(cardIds(report.bucketsByStatus.goatUnsupported.cards)).toContain(GRACEFUL_CHARITY_ID);
    expect(cardIds(report.bucketsByStatus.goatDeckBlocked.cards)).toContain(THOUSAND_EYES_RESTRICT_ID);
    expect(cardIds(report.bucketsByStatus.notInGoatPool.cards)).toContain(BUTTERFLY_DAGGER_ELMA_ID);
    expect(report.bucketsByStatus.goatUnsupported.cards.find((entry) => entry.cardId === GRACEFUL_CHARITY_ID)).toMatchObject({
      status: "goatUnsupported",
      reason: "not supported in playable decks",
    });
    expect(report.bucketsByStatus.goatDeckBlocked.cards.find((entry) => entry.cardId === THOUSAND_EYES_RESTRICT_ID)).toMatchObject({
      status: "goatDeckBlocked",
      reason: "blocked because Extra/Fusion Decks are outside playable scope",
    });
    expect(report.bucketsByStatus.notInGoatPool.cards.find((entry) => entry.cardId === BUTTERFLY_DAGGER_ELMA_ID)).toMatchObject({
      status: "notInGoatPool",
      reason: "not in the supported GOAT playable pool",
    });
  });

  it("reports supported playable deck contents with zero unsupported cards", () => {
    const report = buildPlayableCoverageReport(cards);

    expect(report.supportedPlayableDecks.map((deck) => deck.id)).toEqual(
      PLAYABLE_DECK_FIXTURES.map((fixture) => fixture.id),
    );

    for (const deck of report.supportedPlayableDecks) {
      expect(deck.mainDeckSize).toBe(40);
      expect(deck.sideDeckSize).toBe(0);
      expect(deck.extraDeckSize).toBe(0);
      expect(deck.validationErrors).toEqual([]);
      expect(deck.unsupportedCardIds).toEqual([]);
      expect(deck.cards).toHaveLength(deck.uniqueCardCount);
      expect(deck.cards.reduce((total, card) => total + card.copies, 0)).toBe(40);

      for (const card of deck.cards) {
        expect(card.cardId).toMatch(/^\d+$/);
        expect(card.copies).toBeGreaterThan(0);
        expect(["goatVanilla", "goatTemplate", "goatCustom"]).toContain(card.status);
      }
    }
  });
});

function coverageCounts(): Record<CardCoverageStatus, number> {
  return cards.reduce<Record<CardCoverageStatus, number>>(
    (counts, card) => {
      counts[getCardCoverage(card).status] += 1;
      return counts;
    },
    {
      goatVanilla: 0,
      goatTemplate: 0,
      goatCustom: 0,
      goatForbiddenButScripted: 0,
      goatDeckBlocked: 0,
      goatUnsupported: 0,
      notInGoatPool: 0,
    },
  );
}

function cardIds(entries: readonly { readonly cardId: string }[]): string[] {
  return entries.map((entry) => entry.cardId);
}
