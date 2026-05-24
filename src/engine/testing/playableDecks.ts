import type { CardRecord } from "../../types";
import { validateDeck } from "../deckValidation";
import { createSeededRng } from "../random";
import type { DeckList, PlayerId } from "../types";

export interface PlayableDeckFixture {
  readonly id: "yugi_playable_fixture" | "kaiba_playable_fixture";
  readonly displayName: string;
  readonly character: "Yugi" | "Seto Kaiba";
  readonly deck: {
    readonly main: readonly string[];
  };
}

export interface PlayableDeckAssignment {
  readonly player: PlayableDeckFixture;
  readonly opponent: PlayableDeckFixture;
  readonly decks: Record<PlayerId, DeckList>;
  readonly warnings: readonly string[];
}

export type Rng = () => number;

const DARK_MAGICIAN_ID = "46986414";
const SUMMONED_SKULL_ID = "70781052";
const BLUE_EYES_ID = "89631139";
const X_HEAD_CANNON_ID = "62651957";
const LA_JINN_ID = "97590747";
const AXE_RAIDER_ID = "48305365";
const BATTLE_OX_ID = "05053103";
const AQUA_MADOOR_ID = "85639257";
const POT_OF_GREED_ID = "55144522";
const HEAVY_STORM_ID = "19613556";
const MYSTICAL_SPACE_TYPHOON_ID = "05318639";
const BOOK_OF_MOON_ID = "14087893";
const UPSTART_GOBLIN_ID = "70368879";
const MIRROR_FORCE_ID = "44095762";
const TORRENTIAL_TRIBUTE_ID = "53582587";
const SAKURETSU_ARMOR_ID = "56120475";
const DEKOICHI_ID = "87621407";
const MAGICIAN_OF_FAITH_ID = "31560081";
const OLD_VINDICTIVE_MAGICIAN_ID = "45141844";
const EXILED_FORCE_ID = "74131780";
const BREAKER_THE_MAGICAL_WARRIOR_ID = "71413901";
const TRIBE_INFECTING_VIRUS_ID = "33184167";
const SINISTER_SERPENT_ID = "08131171";
const DD_WARRIOR_LADY_ID = "07572887";
const REFLECT_BOUNDER_ID = "02851070";
const JINZO_ID = "77585513";
const RING_OF_DESTRUCTION_ID = "83555666";
const CALL_OF_THE_HAUNTED_ID = "97077563";
const PREMATURE_BURIAL_ID = "70828912";
const SNATCH_STEAL_ID = "45986603";

export const YUGI_PLAYABLE_DECK_FIXTURE: PlayableDeckFixture = Object.freeze({
  id: "yugi_playable_fixture",
  displayName: "Yugi Supported Playable Deck",
  character: "Yugi",
  deck: Object.freeze({
    main: Object.freeze([
      DARK_MAGICIAN_ID,
      DARK_MAGICIAN_ID,
      SUMMONED_SKULL_ID,
      SUMMONED_SKULL_ID,
      LA_JINN_ID,
      LA_JINN_ID,
      LA_JINN_ID,
      AXE_RAIDER_ID,
      AXE_RAIDER_ID,
      AXE_RAIDER_ID,
      BATTLE_OX_ID,
      BATTLE_OX_ID,
      BATTLE_OX_ID,
      DEKOICHI_ID,
      DEKOICHI_ID,
      MAGICIAN_OF_FAITH_ID,
      MAGICIAN_OF_FAITH_ID,
      OLD_VINDICTIVE_MAGICIAN_ID,
      EXILED_FORCE_ID,
      BREAKER_THE_MAGICAL_WARRIOR_ID,
      TRIBE_INFECTING_VIRUS_ID,
      SINISTER_SERPENT_ID,
      DD_WARRIOR_LADY_ID,
      POT_OF_GREED_ID,
      HEAVY_STORM_ID,
      MYSTICAL_SPACE_TYPHOON_ID,
      BOOK_OF_MOON_ID,
      BOOK_OF_MOON_ID,
      BOOK_OF_MOON_ID,
      UPSTART_GOBLIN_ID,
      UPSTART_GOBLIN_ID,
      PREMATURE_BURIAL_ID,
      SNATCH_STEAL_ID,
      MIRROR_FORCE_ID,
      TORRENTIAL_TRIBUTE_ID,
      SAKURETSU_ARMOR_ID,
      SAKURETSU_ARMOR_ID,
      SAKURETSU_ARMOR_ID,
      RING_OF_DESTRUCTION_ID,
      CALL_OF_THE_HAUNTED_ID,
    ]),
  }),
});

export const KAIBA_PLAYABLE_DECK_FIXTURE: PlayableDeckFixture = Object.freeze({
  id: "kaiba_playable_fixture",
  displayName: "Seto Kaiba Supported Playable Deck",
  character: "Seto Kaiba",
  deck: Object.freeze({
    main: Object.freeze([
      BLUE_EYES_ID,
      BLUE_EYES_ID,
      BLUE_EYES_ID,
      X_HEAD_CANNON_ID,
      X_HEAD_CANNON_ID,
      X_HEAD_CANNON_ID,
      LA_JINN_ID,
      LA_JINN_ID,
      LA_JINN_ID,
      AXE_RAIDER_ID,
      AXE_RAIDER_ID,
      BATTLE_OX_ID,
      BATTLE_OX_ID,
      BATTLE_OX_ID,
      AQUA_MADOOR_ID,
      AQUA_MADOOR_ID,
      AQUA_MADOOR_ID,
      DEKOICHI_ID,
      DEKOICHI_ID,
      OLD_VINDICTIVE_MAGICIAN_ID,
      OLD_VINDICTIVE_MAGICIAN_ID,
      JINZO_ID,
      REFLECT_BOUNDER_ID,
      POT_OF_GREED_ID,
      HEAVY_STORM_ID,
      MYSTICAL_SPACE_TYPHOON_ID,
      BOOK_OF_MOON_ID,
      BOOK_OF_MOON_ID,
      BOOK_OF_MOON_ID,
      UPSTART_GOBLIN_ID,
      UPSTART_GOBLIN_ID,
      PREMATURE_BURIAL_ID,
      SNATCH_STEAL_ID,
      MIRROR_FORCE_ID,
      TORRENTIAL_TRIBUTE_ID,
      SAKURETSU_ARMOR_ID,
      SAKURETSU_ARMOR_ID,
      SAKURETSU_ARMOR_ID,
      RING_OF_DESTRUCTION_ID,
      CALL_OF_THE_HAUNTED_ID,
    ]),
  }),
});

export const PLAYABLE_DECK_FIXTURES: readonly PlayableDeckFixture[] = Object.freeze([
  YUGI_PLAYABLE_DECK_FIXTURE,
  KAIBA_PLAYABLE_DECK_FIXTURE,
]);

export function getRandomPlayableDeckFixture(rng: Rng = createSeededRng("playable-deck-fixture")): PlayableDeckFixture {
  const index = Math.min(Math.floor(clampRandom(rng()) * PLAYABLE_DECK_FIXTURES.length), PLAYABLE_DECK_FIXTURES.length - 1);

  return PLAYABLE_DECK_FIXTURES[index];
}

export function assignRandomPlayableDecksToDuel(
  cards: CardRecord[],
  rng: Rng = createSeededRng("playable-deck-assignment"),
): PlayableDeckAssignment {
  const player = getRandomPlayableDeckFixture(rng);
  const opponent = getRandomPlayableDeckFixture(rng);
  const decks = {
    P1: clonePlayableDeck(player.deck),
    P2: clonePlayableDeck(opponent.deck),
  };

  return {
    player,
    opponent,
    decks,
    warnings: validateAssignedDecks(decks, cards),
  };
}

export function validatePlayableDeckFixtures(cards: CardRecord[]): readonly string[] {
  return PLAYABLE_DECK_FIXTURES.flatMap((fixture) => {
    const deck = clonePlayableDeck(fixture.deck);
    const validation = validateDeck(deck, cards);
    const errors = validation.errors.map((error) => `${fixture.displayName}: ${error}`);

    if (deck.main.length !== 40) {
      errors.push(`${fixture.displayName}: Main Deck has ${deck.main.length} cards; expected 40.`);
    }

    if (deck.side !== undefined) {
      errors.push(`${fixture.displayName}: Side Deck must be omitted.`);
    }

    if (deck.extra !== undefined) {
      errors.push(`${fixture.displayName}: Extra Deck must be omitted.`);
    }

    return errors;
  });
}

export function clonePlayableDeck(deck: PlayableDeckFixture["deck"]): DeckList {
  return {
    main: [...deck.main],
  };
}

function validateAssignedDecks(decks: Record<PlayerId, DeckList>, cards: CardRecord[]): readonly string[] {
  return (Object.entries(decks) as Array<[PlayerId, DeckList]>).flatMap(([playerId, deck]) =>
    validateDeck(deck, cards).errors.map((error) => `${playerId}: ${error}`),
  );
}

function clampRandom(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(value, 0.999999999999));
}
