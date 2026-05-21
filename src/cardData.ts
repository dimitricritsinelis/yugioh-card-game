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

export function createRandomDeck(cards: CardRecord[], deckSize = 40): CardInstance[] {
  const legalCopies = cards.flatMap((card) => {
    const maxCopies = card.legality?.max_copies ?? 0;

    if (card.legality?.goat_world_pool !== true || maxCopies <= 0) {
      return [];
    }

    return Array.from({ length: maxCopies }, () => card);
  });

  const shuffledPool = shuffle(legalCopies);
  return shuffledPool.slice(0, deckSize).map(createCardInstance);
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
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
