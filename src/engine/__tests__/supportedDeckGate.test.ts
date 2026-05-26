import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import {
  getCardCoverage,
  isPlayableCard,
  normalizeCardCatalog,
  validateDeck,
  type CardCoverageRegistry,
} from "../index";

const cards = cardsJson as CardRecord[];

describe("supported playable deck gate", () => {
  it("treats vanilla Normal Monsters as playable through the vanilla template", () => {
    const battleOx = cardByName("Battle Ox");

    expect(getCardCoverage(battleOx).status).toBe("goatVanilla");
    expect(isPlayableCard(battleOx.passcode, cards)).toBe(true);
  });

  it("treats explicitly implemented effect cards as playable", () => {
    const potOfGreed = cardByName("Pot of Greed");
    const registry: CardCoverageRegistry = {
      [potOfGreed.passcode]: "goatTemplate",
    };

    expect(getCardCoverage(potOfGreed, registry).status).toBe("goatTemplate");
    expect(isPlayableCard(potOfGreed.passcode, cards, registry)).toBe(true);
  });

  it("blocks unsupported cards from playable deck validation", () => {
    const result = validateDeck(deckWithPriority(["Graceful Charity"]), cards);

    expect(getCardCoverage(cardByName("Graceful Charity")).status).toBe("goatUnsupported");
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Graceful Charity is not supported in playable decks.");
  });

  it("blocks cards requiring an Extra/Fusion Deck", () => {
    const thousandEyes = cardByName("Thousand-Eyes Restrict");
    const result = validateDeck(deckWithPriority(["Thousand-Eyes Restrict"]), cards);

    expect(getCardCoverage(thousandEyes).status).toBe("goatDeckBlocked");
    expect(isPlayableCard(thousandEyes.passcode, cards)).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "Thousand-Eyes Restrict is a Fusion Monster and must be placed in the Extra Deck.",
    );
  });

  it("blocks cards outside the current playable scope", () => {
    const forbiddenCard = cardByName("Butterfly Dagger - Elma");

    expect(getCardCoverage(forbiddenCard).status).toBe("notInGoatPool");
    expect(isPlayableCard(forbiddenCard.passcode, cards)).toBe(false);
  });

  it("keeps unsupported cards available as catalog display data", () => {
    const catalog = normalizeCardCatalog([cardByName("Graceful Charity")]);
    const gracefulCharity = catalog.cardById[cardByName("Graceful Charity").passcode];

    expect(gracefulCharity?.display.name).toBe("Graceful Charity");
    expect(gracefulCharity?.display.text).toBe("Draw 3 cards, then discard 2 cards.");
    expect(isPlayableCard(gracefulCharity!.cardId, cards)).toBe(false);
  });
});

function deckWithPriority(priorityNames: string[]) {
  const priorityPasscodes = priorityNames.map((name) => cardByName(name).passcode);
  const excluded = new Set(priorityPasscodes);
  const filler = cards
    .filter((card) => isPlayableCard(card.passcode, cards) && !excluded.has(card.passcode))
    .slice(0, 40 - priorityPasscodes.length)
    .map((card) => card.passcode);

  return {
    main: [...priorityPasscodes, ...filler],
  };
}

function cardByName(name: string): CardRecord {
  const card = cards.find((candidate) => candidate.name === name);

  if (!card) {
    throw new Error(`Missing fixture card: ${name}`);
  }

  return card;
}
