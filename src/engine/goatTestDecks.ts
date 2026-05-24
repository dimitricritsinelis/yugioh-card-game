import type { CardRecord } from "../types";
import { getCardCoverage, getCoverageRejectionReason, isPlayableCard } from "./cards/coverage";
import { validateDeck } from "./deckValidation";
import { createSeededRng, shuffleSeeded } from "./random";
import type { DeckList, PlayerId } from "./types";

export interface GoatTestDeckMetadata {
  id: "yugi_goat_test" | "kaiba_goat_test";
  displayName: string;
  character: string;
  format: "Goat";
}

export interface GoatTestDeckCardSpec {
  name: string;
  count: number;
}

export interface GoatTestDeckDefinition {
  metadata: GoatTestDeckMetadata;
  mainDeck: GoatTestDeckCardSpec[];
  extraDeck: GoatTestDeckCardSpec[];
}

export interface ResolvedGoatTestDeck {
  definition: GoatTestDeckDefinition;
  deck: DeckList;
  warnings: string[];
}

export interface GoatTestDeckAssignment {
  player: ResolvedGoatTestDeck;
  opponent: ResolvedGoatTestDeck;
  decks: Record<PlayerId, DeckList>;
  warnings: string[];
}

export type Rng = () => number;

export const YUGI_GOAT_TEST_DECK: GoatTestDeckDefinition = {
  metadata: {
    id: "yugi_goat_test",
    displayName: "Yugi Goat Test Deck",
    character: "Yugi",
    format: "Goat",
  },
  mainDeck: [
    { name: "Dark Magician", count: 2 },
    { name: "Dark Magician Girl", count: 1 },
    { name: "Buster Blader", count: 1 },
    { name: "Summoned Skull", count: 1 },
    { name: "Black Luster Soldier - Envoy of the Beginning", count: 1 },
    { name: "Breaker the Magical Warrior", count: 1 },
    { name: "Skilled Dark Magician", count: 2 },
    { name: "Magician of Faith", count: 2 },
    { name: "Apprentice Magician", count: 1 },
    { name: "Old Vindictive Magician", count: 1 },
    { name: "Sangan", count: 1 },
    { name: "Mystic Tomato", count: 1 },
    { name: "Exiled Force", count: 1 },
    { name: "D.D. Warrior Lady", count: 1 },
    { name: "Sinister Serpent", count: 1 },
    { name: "Kuriboh", count: 1 },
    { name: "Pot of Greed", count: 1 },
    { name: "Graceful Charity", count: 1 },
    { name: "Delinquent Duo", count: 1 },
    { name: "Heavy Storm", count: 1 },
    { name: "Mystical Space Typhoon", count: 1 },
    { name: "Premature Burial", count: 1 },
    { name: "Snatch Steal", count: 1 },
    { name: "Swords of Revealing Light", count: 1 },
    { name: "Scapegoat", count: 2 },
    { name: "Book of Moon", count: 1 },
    { name: "Polymerization", count: 1 },
    { name: "Dark Magic Attack", count: 1 },
    { name: "Thousand Knives", count: 1 },
    { name: "Emblem of Dragon Destroyer", count: 1 },
    { name: "Mirror Force", count: 1 },
    { name: "Torrential Tribute", count: 1 },
    { name: "Ring of Destruction", count: 1 },
    { name: "Call of the Haunted", count: 1 },
    { name: "Magic Cylinder", count: 1 },
    { name: "Spellbinding Circle", count: 1 },
  ],
  extraDeck: [{ name: "Dark Paladin", count: 1 }],
};

export const KAIBA_GOAT_TEST_DECK: GoatTestDeckDefinition = {
  metadata: {
    id: "kaiba_goat_test",
    displayName: "Seto Kaiba Goat Test Deck",
    character: "Seto Kaiba",
    format: "Goat",
  },
  mainDeck: [
    { name: "Blue-Eyes White Dragon", count: 3 },
    { name: "Lord of D.", count: 2 },
    { name: "Paladin of White Dragon", count: 1 },
    { name: "Kaiser Sea Horse", count: 1 },
    { name: "Kaiser Glider", count: 1 },
    { name: "Spear Dragon", count: 2 },
    { name: "Blade Knight", count: 2 },
    { name: "X-Head Cannon", count: 1 },
    { name: "Y-Dragon Head", count: 1 },
    { name: "Z-Metal Tank", count: 1 },
    { name: "Vorse Raider", count: 1 },
    { name: "La Jinn the Mystical Genie of the Lamp", count: 1 },
    { name: "Sangan", count: 1 },
    { name: "Breaker the Magical Warrior", count: 1 },
    { name: "Sinister Serpent", count: 1 },
    { name: "Pot of Greed", count: 1 },
    { name: "Graceful Charity", count: 1 },
    { name: "Heavy Storm", count: 1 },
    { name: "Mystical Space Typhoon", count: 1 },
    { name: "Premature Burial", count: 1 },
    { name: "Snatch Steal", count: 1 },
    { name: "Swords of Revealing Light", count: 1 },
    { name: "Book of Moon", count: 1 },
    { name: "Polymerization", count: 1 },
    { name: "The Flute of Summoning Dragon", count: 1 },
    { name: "White Dragon Ritual", count: 1 },
    { name: "Enemy Controller", count: 2 },
    { name: "Soul Exchange", count: 1 },
    { name: "Mirror Force", count: 1 },
    { name: "Torrential Tribute", count: 1 },
    { name: "Ring of Destruction", count: 1 },
    { name: "Call of the Haunted", count: 1 },
    { name: "Magic Cylinder", count: 1 },
    { name: "Negate Attack", count: 1 },
  ],
  extraDeck: [
    { name: "Blue-Eyes Ultimate Dragon", count: 1 },
    { name: "XYZ-Dragon Cannon", count: 1 },
    { name: "XY-Dragon Cannon", count: 1 },
    { name: "XZ-Tank Cannon", count: 1 },
    { name: "YZ-Tank Dragon", count: 1 },
  ],
};

export const GOAT_TEST_DECKS = [YUGI_GOAT_TEST_DECK, KAIBA_GOAT_TEST_DECK] as const;

// TODO: Replace this temporary fallback if Vorse Raider is added to yugioh_cards/cards.json.
const MISSING_MAIN_DECK_FALLBACKS: Record<string, string> = {
  "Vorse Raider": "Axe Raider",
};

export function getRandomGoatTestDeck(rng: Rng = createSeededRng("goat-test-deck")): GoatTestDeckDefinition {
  const index = Math.min(Math.floor(clampRandom(rng()) * GOAT_TEST_DECKS.length), GOAT_TEST_DECKS.length - 1);

  return GOAT_TEST_DECKS[index];
}

export function assignRandomTestDecksToDuel(
  cards: CardRecord[],
  rng: Rng = createSeededRng("goat-test-deck-assignment"),
): GoatTestDeckAssignment {
  const playerDefinition = getRandomGoatTestDeck(rng);
  const opponentDefinition = getRandomGoatTestDeck(rng);
  const player = buildGoatTestDeck(playerDefinition, cards, `P1:${randomSeed(rng)}`);
  const opponent = buildGoatTestDeck(opponentDefinition, cards, `P2:${randomSeed(rng)}`);
  const warnings = [...player.warnings, ...opponent.warnings];

  return {
    player,
    opponent,
    decks: {
      P1: cloneDeckList(player.deck),
      P2: cloneDeckList(opponent.deck),
    },
    warnings,
  };
}

export function buildGoatTestDeck(
  definition: GoatTestDeckDefinition,
  cards: CardRecord[],
  shuffleSeed: string = definition.metadata.id,
): ResolvedGoatTestDeck {
  const cardByName = new Map(cards.map((card) => [card.name, card]));
  const warnings: string[] = [];
  const main = resolveCardSpecs(definition.mainDeck, cardByName, warnings, definition.metadata.displayName, "Main Deck");
  const playableMain = buildPlayableMainDeck(main, cards, warnings, definition.metadata.displayName, shuffleSeed);

  return {
    definition,
    deck: {
      main: playableMain,
    },
    warnings,
  };
}

export function validateGoatTestDeckDefinitions(cards: CardRecord[]): string[] {
  return GOAT_TEST_DECKS.flatMap((definition) => {
    const warnings: string[] = [];
    const mainTotal = totalCards(definition.mainDeck);
    const extraTotal = totalCards(definition.extraDeck);

    if (mainTotal !== 40) {
      warnings.push(`${definition.metadata.displayName} Main Deck has ${mainTotal} cards; expected 40.`);
    }

    if (extraTotal > 15) {
      warnings.push(`${definition.metadata.displayName} Extra Deck has ${extraTotal} cards; expected 0-15.`);
    }

    for (const spec of [...definition.mainDeck, ...definition.extraDeck]) {
      if (spec.count < 1) {
        warnings.push(`${definition.metadata.displayName} has invalid count ${spec.count} for ${spec.name}.`);
      }
    }

    const resolved = buildGoatTestDeck(definition, cards);
    const validation = validateDeck(resolved.deck, cards);

    warnings.push(...resolved.warnings);
    warnings.push(...validation.errors.map((error) => `${definition.metadata.displayName}: ${error}`));

    return warnings;
  });
}

function resolveCardSpecs(
  specs: GoatTestDeckCardSpec[],
  cardByName: Map<string, CardRecord>,
  warnings: string[],
  deckName: string,
  zoneName: string,
  options: { omitMissing?: boolean } = {},
): string[] {
  return specs.flatMap((spec) => {
    const card = cardByName.get(spec.name);

    if (card) {
      return Array.from({ length: spec.count }, () => card.passcode);
    }

    const fallbackName = MISSING_MAIN_DECK_FALLBACKS[spec.name];
    const fallback = fallbackName ? cardByName.get(fallbackName) : null;

    if (fallback && !options.omitMissing) {
      warnings.push(
        `TODO: ${deckName} references missing ${zoneName} card "${spec.name}"; using "${fallback.name}" as a temporary local-card fallback.`,
      );
      return Array.from({ length: spec.count }, () => fallback.passcode);
    }

    warnings.push(`TODO: ${deckName} references missing ${zoneName} card "${spec.name}" in local cards.json.`);

    return [];
  });
}

function totalCards(specs: GoatTestDeckCardSpec[]): number {
  return specs.reduce((total, spec) => total + spec.count, 0);
}

function cloneDeckList(deck: DeckList): DeckList {
  return {
    main: [...deck.main],
  };
}

function buildPlayableMainDeck(
  passcodes: string[],
  cards: CardRecord[],
  warnings: string[],
  deckName: string,
  shuffleSeed: string,
): string[] {
  const cardByPasscode = new Map(cards.map((card) => [card.passcode, card]));
  const counts = new Map<string, number>();
  const playable: string[] = [];
  const warnedCardIds = new Set<string>();

  for (const passcode of passcodes) {
    const card = cardByPasscode.get(passcode);

    if (!card) {
      continue;
    }

    const coverage = getCardCoverage(card);

    if (!isPlayableCard(card.passcode, cards)) {
      if (!warnedCardIds.has(card.passcode)) {
        warnings.push(
          `${deckName}: ${card.name} is ${getCoverageRejectionReason(coverage)}; using supported vanilla filler instead.`,
        );
        warnedCardIds.add(card.passcode);
      }
      continue;
    }

    const count = counts.get(card.passcode) ?? 0;

    if (count >= card.legality.max_copies) {
      warnings.push(`${deckName}: ${card.name} exceeds its copy limit in the local preset; extra copies were omitted.`);
      continue;
    }

    counts.set(card.passcode, count + 1);
    playable.push(card.passcode);
  }

  const fillerPool = shuffleSeeded(
    cards.flatMap((card) => {
      if (!isPlayableCard(card.passcode, cards)) {
        return [];
      }

      const used = counts.get(card.passcode) ?? 0;
      const remaining = Math.max(0, card.legality.max_copies - used);

      return Array.from({ length: remaining }, () => card.passcode);
    }),
    `${deckName}:playable-filler`,
  );

  for (const passcode of fillerPool) {
    if (playable.length >= 40) {
      break;
    }

    const card = cardByPasscode.get(passcode);

    if (!card) {
      continue;
    }

    const count = counts.get(passcode) ?? 0;

    if (count >= card.legality.max_copies) {
      continue;
    }

    counts.set(passcode, count + 1);
    playable.push(passcode);
  }

  if (playable.length !== 40) {
    warnings.push(`${deckName}: resolved playable Main Deck has ${playable.length} cards; expected 40.`);
  }

  return shuffleSeeded(playable.slice(0, 40), `${shuffleSeed}:main`);
}

function randomSeed(rng: Rng): string {
  return Math.floor(clampRandom(rng()) * Number.MAX_SAFE_INTEGER).toString(36);
}

function clampRandom(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(value, 0.999999999999));
}
