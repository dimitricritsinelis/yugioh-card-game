import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { getCardCoverage, type CardCoverageStatus } from "../cards/coverage";
import { buildPlayableCoverageReport } from "../cards/coverageReport";
import { PLAYABLE_DECK_FIXTURES } from "../testing/playableDecks";

const cards = cardsJson as CardRecord[];
const GRACEFUL_CHARITY_ID = "79571449";
const THOUSAND_EYES_RESTRICT_ID = "63519819";
const BUTTERFLY_DAGGER_ELMA_ID = "69243953";

describe("playable coverage report", () => {
  it("summarizes playable support separately from full card-pool support", () => {
    const report = buildPlayableCoverageReport(cards);
    const expectedCounts = coverageCounts();
    const reportedTotal =
      report.vanillaPlayable.count +
      report.implementedPlayable.count +
      report.unsupportedBlocked.count +
      report.blockedByNoExtraDeckScope.count +
      report.blockedByDeckValidation.count;

    expect(report.scope).toMatchObject({
      playableDeckPolicy: "exactly-40-main-deck-no-side-no-extra",
      fullCardPoolImplementationRequired: false,
      playableStatuses: ["implemented", "vanilla"],
      blockedStatuses: ["unsupported", "blockedNoExtraDeck", "blockedByScope"],
    });
    expect(report.totalLocalCards).toBe(cards.length);
    expect(report.playableCardCount).toBe(report.vanillaPlayable.count + report.implementedPlayable.count);
    expect(report.playableCardCount).toBeLessThan(report.totalLocalCards);
    expect(reportedTotal).toBe(report.totalLocalCards);
    expect(report.vanillaPlayable.count).toBe(expectedCounts.vanilla);
    expect(report.implementedPlayable.count).toBe(expectedCounts.implemented);
    expect(report.unsupportedBlocked.count).toBe(expectedCounts.unsupported);
    expect(report.blockedByNoExtraDeckScope.count).toBe(expectedCounts.blockedNoExtraDeck);
    expect(report.blockedByDeckValidation.count).toBe(expectedCounts.blockedByScope);
  });

  it("keeps unsupported, Extra/Fusion scope, and deck-validation blocks distinct", () => {
    const report = buildPlayableCoverageReport(cards);

    expect(cardIds(report.unsupportedBlocked.cards)).toContain(GRACEFUL_CHARITY_ID);
    expect(cardIds(report.blockedByNoExtraDeckScope.cards)).toContain(THOUSAND_EYES_RESTRICT_ID);
    expect(cardIds(report.blockedByDeckValidation.cards)).toContain(BUTTERFLY_DAGGER_ELMA_ID);
    expect(report.unsupportedBlocked.cards.find((entry) => entry.cardId === GRACEFUL_CHARITY_ID)).toMatchObject({
      status: "unsupported",
      reason: "not supported in playable decks",
    });
    expect(
      report.blockedByNoExtraDeckScope.cards.find((entry) => entry.cardId === THOUSAND_EYES_RESTRICT_ID),
    ).toMatchObject({
      status: "blockedNoExtraDeck",
      reason: "blocked because Extra/Fusion Decks are outside playable scope",
    });
    expect(report.blockedByDeckValidation.cards.find((entry) => entry.cardId === BUTTERFLY_DAGGER_ELMA_ID)).toMatchObject({
      status: "blockedByScope",
      reason: "blocked by the current playable scope",
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
        expect(["implemented", "vanilla"]).toContain(card.status);
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
      implemented: 0,
      vanilla: 0,
      unsupported: 0,
      blockedNoExtraDeck: 0,
      blockedByScope: 0,
    },
  );
}

function cardIds(entries: readonly { readonly cardId: string }[]): string[] {
  return entries.map((entry) => entry.cardId);
}
