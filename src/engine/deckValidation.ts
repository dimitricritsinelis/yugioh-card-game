import type { CardRecord } from "../types";
import type { CardCoverageRegistry } from "./cards/coverage";
import { getCardCoverage, getCoverageRejectionReason, isPlayableCoverageStatus } from "./cards/coverage";
import type { DeckList, DeckValidationResult } from "./types";

const REQUIRED_MAIN_DECK_SIZE = 40;

export interface DeckValidationOptions {
  allowUnsupportedCards?: boolean;
  coverageRegistry?: CardCoverageRegistry;
}

export function validateDeck(
  deck: DeckList,
  cards: CardRecord[],
  options: DeckValidationOptions = {},
): DeckValidationResult {
  const errors: string[] = [];
  const cardByPasscode = new Map(cards.map((card) => [card.passcode, card]));
  const main = deck.main ?? [];
  const side = deck.side ?? [];
  const extra = deck.extra ?? [];

  if (main.length !== REQUIRED_MAIN_DECK_SIZE) {
    errors.push(`Main Deck must contain exactly ${REQUIRED_MAIN_DECK_SIZE} cards.`);
  }

  if (side.length > 0) {
    errors.push("Side Deck is not supported for playable duels.");
  }

  if (extra.length > 0) {
    errors.push("Extra Deck is not supported for playable duels.");
  }

  const counts = new Map<string, number>();

  for (const passcode of main) {
    counts.set(passcode, (counts.get(passcode) ?? 0) + 1);
  }

  for (const passcode of main) {
    const card = cardByPasscode.get(passcode);

    if (!card) {
      errors.push(`Unknown Main Deck card: ${passcode}.`);
      continue;
    }

    if (!options.allowUnsupportedCards) {
      const coverage = getCardCoverage(card, options.coverageRegistry);

      if (!isPlayableCoverageStatus(coverage.status)) {
        errors.push(`${card.name} is ${getCoverageRejectionReason(coverage)}.`);
        continue;
      }
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
