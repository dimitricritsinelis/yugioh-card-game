import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import {
  CARD_COVERAGE_MANIFEST,
  CARD_COVERAGE_STATUSES,
  getCardCoverage,
  isPlayableCoverageStatus,
} from "../cards/coverage";
import { buildPlayableCoverageReport } from "../cards/coverageReport";
import { CARD_SCRIPTS, getCardScript } from "../cards/registry";
import { validateDeck } from "../deckValidation";
import { clonePlayableDeck, PLAYABLE_DECK_FIXTURES } from "../testing/playableDecks";

const cards = cardsJson as CardRecord[];

describe("full card accountability manifest", () => {
  it("accounts for every local card passcode exactly once", () => {
    const passcodes = cards.map((card) => card.passcode);
    const uniquePasscodes = new Set(passcodes);
    const manifestIds = Object.keys(CARD_COVERAGE_MANIFEST);

    expect(uniquePasscodes.size).toBe(passcodes.length);
    expect(manifestIds.sort()).toEqual([...uniquePasscodes].sort());
    expect(manifestIds).toHaveLength(cards.length);
  });

  it("uses only valid coverage statuses", () => {
    const validStatuses = new Set(CARD_COVERAGE_STATUSES);

    expect(Object.values(CARD_COVERAGE_MANIFEST).every((status) => validStatuses.has(status))).toBe(true);
  });

  it("requires scripted manifest statuses to have registered production scripts", () => {
    const scriptedStatuses = new Set(["goatTemplate", "goatCustom", "goatForbiddenButScripted"]);
    const missingScripts = cards
      .filter((card) => scriptedStatuses.has(getCardCoverage(card).status))
      .filter((card) => !getCardScript(CARD_SCRIPTS, card.passcode))
      .map((card) => `${card.passcode} ${card.name}`);

    expect(missingScripts).toEqual([]);
  });

  it("keeps normal playable decks free of unsupported manifest statuses", () => {
    for (const fixture of PLAYABLE_DECK_FIXTURES) {
      const deck = clonePlayableDeck(fixture.deck);

      expect(validateDeck(deck, cards).errors).toEqual([]);

      for (const cardId of deck.main) {
        const card = cards.find((candidate) => candidate.passcode === cardId);

        expect(card).toBeDefined();
        expect(isPlayableCoverageStatus(getCardCoverage(card!).status)).toBe(true);
      }
    }
  });

  it("keeps strict final acceptance false while GOAT-legal unsupported cards remain", () => {
    const report = buildPlayableCoverageReport(cards);

    expect(report).toHaveProperty("goatLegalUnsupportedCount");
    expect(report).toHaveProperty("goatLegalUnsupportedCards");
    expect(report).toHaveProperty("strictFinalAcceptanceReady");
    expect(report.goatLegalUnsupportedCount).toBeGreaterThan(0);
    expect(report.strictFinalAcceptanceReady).toBe(false);
  });
});
