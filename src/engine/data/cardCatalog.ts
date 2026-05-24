export type CardId = string;
export type CardKind = "monster" | "spell" | "trap";

export interface CardDisplayData {
  readonly name: string;
  readonly slug: string;
  readonly text: string;
  readonly imageFileName: string;
}

export interface CardImageData {
  readonly fileName: string;
  readonly width: number | null;
  readonly height: number | null;
}

export interface CardLegalityData {
  readonly goatWorldPool: boolean;
  readonly restriction: string;
  readonly maxCopies: number;
}

export interface BaseCardDefinition {
  readonly cardId: CardId;
  readonly passcode: string;
  readonly kind: CardKind;
  readonly classifications: readonly string[];
  readonly display: CardDisplayData;
  readonly image: CardImageData;
  readonly legality: CardLegalityData;
}

export interface MonsterDefinition extends BaseCardDefinition {
  readonly kind: "monster";
  readonly monster: {
    readonly attribute: string | null;
    readonly type: string | null;
    readonly level: number | null;
    readonly atk: number | string | null;
    readonly def: number | string | null;
  };
}

export interface SpellTrapDefinition extends BaseCardDefinition {
  readonly kind: "spell" | "trap";
  readonly spellTrap: {
    readonly icon: string | null;
  };
}

export type CardDefinition = MonsterDefinition | SpellTrapDefinition;

export interface CardCatalog {
  readonly cards: readonly CardDefinition[];
  readonly cardById: Readonly<Record<CardId, CardDefinition>>;
}

export function buildCardCatalog(cards: readonly CardDefinition[]): CardCatalog {
  const cardById: Record<CardId, CardDefinition> = {};

  for (const card of cards) {
    if (cardById[card.cardId]) {
      throw new Error(`Duplicate cardId in card catalog: ${card.cardId}`);
    }

    cardById[card.cardId] = card;
  }

  return Object.freeze({
    cards: Object.freeze([...cards]),
    cardById: Object.freeze(cardById),
  });
}

export function getCardDefinition(catalog: CardCatalog, cardId: CardId): CardDefinition | undefined {
  return catalog.cardById[cardId];
}

export function requireCardDefinition(catalog: CardCatalog, cardId: CardId): CardDefinition {
  const card = getCardDefinition(catalog, cardId);

  if (!card) {
    throw new Error(`Unknown cardId: ${cardId}`);
  }

  return card;
}
