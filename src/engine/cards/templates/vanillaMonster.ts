import type { CardScript } from "../CardScript";
import type { CardDefinition, MonsterDefinition } from "../../data/cardCatalog";

const VANILLA_EFFECTS: readonly [] = Object.freeze([]);

export function isVanillaMonsterDefinition(card: CardDefinition): card is MonsterDefinition {
  return (
    card.kind === "monster" &&
    card.classifications.includes("Normal") &&
    !card.classifications.includes("Effect") &&
    !card.classifications.includes("Fusion") &&
    !card.classifications.includes("Ritual")
  );
}

export function createVanillaMonsterScript(card: CardDefinition): CardScript {
  if (!isVanillaMonsterDefinition(card)) {
    throw new Error(`Cannot create vanilla monster script for cardId: ${card.cardId}`);
  }

  return Object.freeze({
    cardId: card.cardId,
    effects: VANILLA_EFFECTS,
  });
}

export function createVanillaMonsterScripts(cards: readonly CardDefinition[]): readonly CardScript[] {
  return Object.freeze(cards.filter(isVanillaMonsterDefinition).map(createVanillaMonsterScript));
}
