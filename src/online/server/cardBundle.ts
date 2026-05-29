import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";

let cachedCards: readonly CardRecord[] | null = null;

export function loadServerCardBundle(): readonly CardRecord[] {
  if (!cachedCards) {
    const rawCards = cardsJson as unknown;
    const cards = Array.isArray(rawCards) ? rawCards.filter(isUsableCardRecord) : [];

    if (cards.length === 0) {
      throw new Error("Server card bundle did not contain usable card records.");
    }

    cachedCards = cards;
  }

  return cachedCards;
}

function isUsableCardRecord(value: unknown): value is CardRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybeCard = value as Partial<CardRecord>;

  return Boolean(
    maybeCard.name &&
      maybeCard.passcode &&
      maybeCard.slug &&
      maybeCard.file_name &&
      maybeCard.category &&
      maybeCard.legality,
  );
}
