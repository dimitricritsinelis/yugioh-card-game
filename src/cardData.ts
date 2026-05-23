import type { CardRecord, CardInstance } from "./types";

const CARDS_URL = "/yugioh_cards/cards.json";
const IMAGE_BASE_URL = "/yugioh_cards/images";

export const CARD_BACK_IMAGE_URL = `${IMAGE_BASE_URL}/card-back.webp`;
export const CARD_DECK_IMAGE_URL = `${IMAGE_BASE_URL}/deck.webp`;

let instanceCounter = 0;

export async function loadCards(): Promise<CardRecord[]> {
  const response = await fetch(CARDS_URL);

  if (!response.ok) {
    throw new Error(`Unable to load card bundle (${response.status})`);
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Card bundle did not contain a card array.");
  }

  const cards = data.filter(isUsableCardRecord);

  if (cards.length === 0) {
    throw new Error("Card bundle did not contain usable card records.");
  }

  return cards;
}

export function getCardImageUrl(card: CardRecord): string {
  const fileName = card.image?.file_name || card.file_name;
  return `${IMAGE_BASE_URL}/${fileName}`;
}

export interface SummonProfile {
  kind: "normal" | "tribute" | "special";
  tributes: number;
  specialType: string | null;
}

/**
 * Classifies how a monster card is summoned (GOAT-era rules): Level 1-4 → Normal
 * Summon; Level 5-6 / 7+ → Tribute Summon with 1 / 2 tributes; Fusion / Ritual /
 * Nomi cards → Special Summon. Returns null for non-monsters.
 */
export function getSummonProfile(card: CardRecord): SummonProfile | null {
  if (card.category !== "Monster" || !card.monster) {
    return null;
  }

  if (card.classifications.includes("Fusion")) {
    return { kind: "special", tributes: 0, specialType: "Fusion" };
  }
  if (card.classifications.includes("Ritual")) {
    return { kind: "special", tributes: 0, specialType: "Ritual" };
  }
  if (/cannot be normal summoned/i.test(card.text)) {
    return { kind: "special", tributes: 0, specialType: null };
  }

  const level = card.monster.level ?? 0;
  const tributes = level >= 7 ? 2 : level >= 5 ? 1 : 0;
  return { kind: tributes > 0 ? "tribute" : "normal", tributes, specialType: null };
}

export function createCardInstance(card: CardRecord): CardInstance {
  instanceCounter += 1;

  return {
    instanceId: `${card.passcode}-${instanceCounter}`,
    card,
  };
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
