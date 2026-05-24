import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import {
  getCardDefinition,
  normalizeCard,
  normalizeCardCatalog,
  requireCardDefinition,
} from "../index";

const cards = cardsJson as CardRecord[];

describe("engine card catalog", () => {
  it("normalizes a monster with passcode as the primary cardId", () => {
    const battleOx = normalizeCard(cardByName("Battle Ox"));

    expect(battleOx.cardId).toBe("05053103");
    expect(battleOx.passcode).toBe("05053103");
    expect(battleOx.kind).toBe("monster");
    if (battleOx.kind !== "monster") {
      throw new Error("Battle Ox should normalize as a monster.");
    }
    expect(battleOx.display.name).toBe("Battle Ox");
    expect(battleOx.display.text).toContain("tremendous power");
    expect(battleOx.monster).toEqual({
      attribute: "EARTH",
      type: "Beast-Warrior",
      level: 4,
      atk: 1700,
      def: 1000,
    });
    expect(battleOx.classifications).toEqual(["Normal"]);
  });

  it("normalizes spell and trap cards as spell/trap catalog data", () => {
    const potOfGreed = normalizeCard(cardByName("Pot of Greed"));
    const mirrorForce = normalizeCard(cardByName("Mirror Force"));

    expect(potOfGreed.kind).toBe("spell");
    if (potOfGreed.kind === "monster") {
      throw new Error("Pot of Greed should normalize as a spell.");
    }
    expect(potOfGreed.display.text).toBe("Draw 2 cards.");
    expect(potOfGreed.spellTrap.icon).toBe("Normal");
    expect(potOfGreed.legality).toEqual({
      goatWorldPool: true,
      restriction: "Limited",
      maxCopies: 1,
    });

    expect(mirrorForce.kind).toBe("trap");
    if (mirrorForce.kind === "monster") {
      throw new Error("Mirror Force should normalize as a trap.");
    }
    expect(mirrorForce.spellTrap.icon).toBe("Normal");
    expect(mirrorForce.cardId).toBe(mirrorForce.passcode);
  });

  it("keeps Ritual and Fusion Monster classifications as inert catalog metadata", () => {
    const ritual = cards.find((card) => card.category === "Monster" && card.classifications.includes("Ritual"));
    const fusion = cards.find((card) => card.category === "Monster" && card.classifications.includes("Fusion"));

    if (ritual) {
      const ritualDefinition = normalizeCard(ritual);

      expect(ritualDefinition.kind).toBe("monster");
      expect(ritualDefinition.classifications).toContain("Ritual");
      expect(ritualDefinition.display.text).toBe(ritual.text);
    }

    if (fusion) {
      const fusionDefinition = normalizeCard(fusion);

      expect(fusionDefinition.kind).toBe("monster");
      expect(fusionDefinition.classifications).toContain("Fusion");
      expect(fusionDefinition.display.text).toBe(fusion.text);
    }
  });

  it("builds a catalog keyed by cardId instead of card name", () => {
    const battleOx = cardByName("Battle Ox");
    const catalog = normalizeCardCatalog([battleOx, cardByName("Pot of Greed"), cardByName("Mirror Force")]);

    expect(requireCardDefinition(catalog, battleOx.passcode).display.name).toBe("Battle Ox");
    expect(getCardDefinition(catalog, "Battle Ox")).toBeUndefined();
  });

  it("preserves card text for display without deriving executable behavior from it", () => {
    const source = cardByName("Battle Ox");
    const rawCard: CardRecord = {
      ...source,
      classifications: ["Normal"],
      text: "This card cannot be Normal Summoned. Draw 2 cards.",
    };

    const normalized = normalizeCard(rawCard);

    expect(normalized.display.text).toBe(rawCard.text);
    expect(normalized.classifications).toEqual(["Normal"]);
    expect("summonProfile" in normalized).toBe(false);
    expect("effects" in normalized).toBe(false);
    expect("actions" in normalized).toBe(false);
  });
});

function cardByName(name: string): CardRecord {
  const card = cards.find((candidate) => candidate.name === name);

  if (!card) {
    throw new Error(`Missing test card: ${name}`);
  }

  return card;
}
