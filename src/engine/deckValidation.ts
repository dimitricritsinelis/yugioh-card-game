import type { CardRecord } from "../types";
import type { DeckList, DeckValidationResult } from "./types";

const MIN_MAIN_DECK_SIZE = 40;
const MAX_MAIN_DECK_SIZE = 60;
const MAX_SIDE_DECK_SIZE = 15;
const MAX_EXTRA_DECK_SIZE = 15;

export function validateDeck(deck: DeckList, cards: CardRecord[]): DeckValidationResult {
  const errors: string[] = [];
  const cardByPasscode = new Map(cards.map((card) => [card.passcode, card]));
  const main = deck.main ?? [];
  const side = deck.side ?? [];
  const extra = deck.extra ?? [];

  if (main.length < MIN_MAIN_DECK_SIZE || main.length > MAX_MAIN_DECK_SIZE) {
    errors.push(`Main Deck must contain ${MIN_MAIN_DECK_SIZE}-${MAX_MAIN_DECK_SIZE} cards.`);
  }

  if (side.length > MAX_SIDE_DECK_SIZE) {
    errors.push(`Side Deck cannot contain more than ${MAX_SIDE_DECK_SIZE} cards.`);
  }

  if (extra.length > MAX_EXTRA_DECK_SIZE) {
    errors.push(`Extra Deck cannot contain more than ${MAX_EXTRA_DECK_SIZE} Fusion Monsters.`);
  }

  const counts = new Map<string, number>();

  for (const passcode of [...main, ...side, ...extra]) {
    counts.set(passcode, (counts.get(passcode) ?? 0) + 1);
  }

  for (const passcode of main) {
    const card = cardByPasscode.get(passcode);

    if (!card) {
      errors.push(`Unknown Main Deck card: ${passcode}.`);
      continue;
    }

    if (card.classifications.includes("Fusion")) {
      errors.push(`${card.name} is a Fusion Monster and must be in the Extra Deck.`);
    }
  }

  for (const passcode of extra) {
    const card = cardByPasscode.get(passcode);

    if (!card) {
      errors.push(`Unknown Extra Deck card: ${passcode}.`);
      continue;
    }

    if (!card.classifications.includes("Fusion")) {
      errors.push(`${card.name} is not a Fusion Monster and cannot be in the Extra Deck.`);
    }
  }

  for (const [passcode, count] of counts) {
    const card = cardByPasscode.get(passcode);

    if (!card) {
      continue;
    }

    if (card.legality.goat_world_pool !== true) {
      errors.push(`${card.name} is not legal in the Goat World card pool.`);
      continue;
    }

    if (count > card.legality.max_copies) {
      errors.push(
        `${card.name} exceeds ${card.legality.restriction} copy limit (${count}/${card.legality.max_copies}).`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

