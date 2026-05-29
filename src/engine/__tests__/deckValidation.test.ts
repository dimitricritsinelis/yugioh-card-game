import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { validateDeck } from "../index";
import type { DeckList } from "../types";

const cards = cardsJson as CardRecord[];

describe("playable deck validation", () => {
  it("rejects 39-card Main Decks", () => {
    const result = validateDeck({ main: legalMainDeck(39) }, cards);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Main Deck must contain exactly 40 cards.");
  });

  it("accepts exactly 40 supported Main Deck cards with legal copy counts", () => {
    const main = legalMainDeck(40);
    const result = validateDeck({ main }, cards);

    expect(result).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects 41-card Main Decks", () => {
    const result = validateDeck({ main: legalMainDeck(41) }, cards);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Main Deck must contain exactly 40 cards.");
  });

  it("rejects Side Deck input", () => {
    const main = legalMainDeck(40);
    const result = validateDeck({ main, side: [main[0]] }, cards);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Side Deck is not supported for playable duels.");
  });

  it("rejects Extra Deck input", () => {
    const result = validateDeck(
      {
        main: legalMainDeck(40),
        extra: [cardByName("Thousand-Eyes Restrict").passcode],
      },
      cards,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Extra Deck is not supported for playable duels.");
  });

  it("rejects Fusion Monsters in the playable Main Deck", () => {
    const result = validateDeck(deckWithPriority(["Thousand-Eyes Restrict"]), cards);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Extra/Fusion Decks are outside playable scope");
  });

  it("rejects duplicate cards over their copy limit", () => {
    const result = validateDeck(deckWithPriority(["Pot of Greed", "Pot of Greed"]), cards);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Pot of Greed exceeds Limited copy limit");
  });
});

function legalMainDeck(size: number): string[] {
  const passcodes = cards
    .filter(
      (card) =>
        card.legality.goat_world_pool &&
        card.legality.max_copies > 0 &&
        card.legality.goat_world_pool === true,
    )
    .map((card) => card.passcode);

  if (passcodes.length < size) {
    throw new Error(`Not enough legal fixture cards for ${size}-card deck.`);
  }

  return passcodes.slice(0, size);
}

function deckWithPriority(priorityNames: string[]): DeckList {
  const priorityPasscodes = priorityNames.map((name) => cardByName(name).passcode);
  const excluded = new Set(priorityPasscodes);
  const filler = legalMainDeck(40 + excluded.size).filter((passcode) => !excluded.has(passcode));

  return {
    main: [...priorityPasscodes, ...filler].slice(0, 40),
  };
}

function cardByName(name: string): CardRecord {
  const card = cards.find((candidate) => candidate.name === name);

  if (!card) {
    throw new Error(`Missing fixture card: ${name}`);
  }

  return card;
}
