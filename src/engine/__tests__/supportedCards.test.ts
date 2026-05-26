import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import {
  GOAT_TEST_DECKS,
  buildGoatTestDeck,
  buildInitialSupportedCardPool,
  buildInitialSupportedPlayableDecks,
  getCardCoverage,
  isInitialSupportedCard,
  validateDeck,
} from "../index";
import type { DeckList } from "../types";

const cards = cardsJson as CardRecord[];
const DARK_MAGICIAN_ID = "46986414";
const SUMMONED_SKULL_ID = "70781052";
const BLUE_EYES_ID = "89631139";
const X_HEAD_CANNON_ID = "62651957";
const LA_JINN_ID = "97590747";
const AXE_RAIDER_ID = "48305365";
const Y_DRAGON_HEAD_ID = "65622692";
const POT_OF_GREED_ID = "55144522";
const HEAVY_STORM_ID = "19613556";
const MYSTICAL_SPACE_TYPHOON_ID = "05318639";
const BOOK_OF_MOON_ID = "14087893";
const UPSTART_GOBLIN_ID = "70368879";
const GRACEFUL_CHARITY_ID = "79571449";
const MIRROR_FORCE_ID = "44095762";
const TORRENTIAL_TRIBUTE_ID = "53582587";
const SAKURETSU_ARMOR_ID = "56120475";
const WABOKU_ID = "12607053";
const DEKOICHI_ID = "87621407";
const MAGICIAN_OF_FAITH_ID = "31560081";
const OLD_VINDICTIVE_MAGICIAN_ID = "45141844";
const EXILED_FORCE_ID = "74131780";
const SANGAN_ID = "26202165";
const MYSTIC_TOMATO_ID = "83011277";
const BREAKER_THE_MAGICAL_WARRIOR_ID = "71413901";
const TRIBE_INFECTING_VIRUS_ID = "33184167";
const SINISTER_SERPENT_ID = "08131171";
const DD_WARRIOR_LADY_ID = "07572887";
const INJECTION_FAIRY_LILY_ID = "79575620";
const REFLECT_BOUNDER_ID = "02851070";
const JINZO_ID = "77585513";
const RING_OF_DESTRUCTION_ID = "83555666";
const CALL_OF_THE_HAUNTED_ID = "97077563";
const PREMATURE_BURIAL_ID = "70828912";
const SNATCH_STEAL_ID = "45986603";
const THOUSAND_EYES_RESTRICT_ID = "63519819";

describe("initial supported playable card pool", () => {
  it("includes supported vanilla cards from the local presets and excludes unsupported complex cards", () => {
    const pool = buildInitialSupportedCardPool(cards);
    const supported = new Set(pool.cardIds);

    for (const cardId of [
      DARK_MAGICIAN_ID,
      SUMMONED_SKULL_ID,
      BLUE_EYES_ID,
      X_HEAD_CANNON_ID,
      LA_JINN_ID,
      AXE_RAIDER_ID,
    ]) {
      expect(supported.has(cardId)).toBe(true);
      expect(getCardCoverage(cardById(cardId)).status).toBe("goatVanilla");
    }

    for (const cardId of [
      POT_OF_GREED_ID,
      HEAVY_STORM_ID,
      MYSTICAL_SPACE_TYPHOON_ID,
      BOOK_OF_MOON_ID,
      UPSTART_GOBLIN_ID,
      MIRROR_FORCE_ID,
      TORRENTIAL_TRIBUTE_ID,
      SAKURETSU_ARMOR_ID,
      DEKOICHI_ID,
      MAGICIAN_OF_FAITH_ID,
      OLD_VINDICTIVE_MAGICIAN_ID,
      EXILED_FORCE_ID,
      MYSTIC_TOMATO_ID,
    ]) {
      expect(supported.has(cardId)).toBe(true);
      expect(getCardCoverage(cardById(cardId)).status).toBe("goatTemplate");
    }

    for (const cardId of [
      BREAKER_THE_MAGICAL_WARRIOR_ID,
      TRIBE_INFECTING_VIRUS_ID,
      SINISTER_SERPENT_ID,
      DD_WARRIOR_LADY_ID,
      INJECTION_FAIRY_LILY_ID,
      REFLECT_BOUNDER_ID,
      JINZO_ID,
      RING_OF_DESTRUCTION_ID,
      CALL_OF_THE_HAUNTED_ID,
      PREMATURE_BURIAL_ID,
      SNATCH_STEAL_ID,
    ]) {
      expect(supported.has(cardId)).toBe(true);
      expect(getCardCoverage(cardById(cardId)).status).toBe("goatCustom");
    }

    for (const cardId of [
      Y_DRAGON_HEAD_ID,
      GRACEFUL_CHARITY_ID,
      WABOKU_ID,
      SANGAN_ID,
      THOUSAND_EYES_RESTRICT_ID,
    ]) {
      expect(supported.has(cardId)).toBe(false);
      expect(isInitialSupportedCard(cardById(cardId))).toBe(false);
    }
  });

  it("builds at least two exact-40 supported playable decks without Side or Extra Decks", () => {
    const supportedDecks = buildInitialSupportedPlayableDecks(cards);

    expect(supportedDecks).toHaveLength(2);

    for (const supportedDeck of supportedDecks) {
      assertExactSupportedMainDeck(supportedDeck.deck);
      expect(validateDeck(supportedDeck.deck, cards)).toEqual({ valid: true, errors: [] });
    }
  });

  it("resolves each local default test deck to exactly 40 supported Main Deck cards only", () => {
    for (const definition of GOAT_TEST_DECKS) {
      const resolved = buildGoatTestDeck(definition, cards);

      assertExactSupportedMainDeck(resolved.deck);
      expect(validateDeck(resolved.deck, cards)).toEqual({ valid: true, errors: [] });
    }
  });
});

function assertExactSupportedMainDeck(deck: DeckList): void {
  expect(deck.main).toHaveLength(40);
  expect(deck.side).toBeUndefined();
  expect(deck.extra).toBeUndefined();

  for (const cardId of deck.main) {
    expect(isInitialSupportedCard(cardById(cardId))).toBe(true);
  }
}

function cardById(cardId: string): CardRecord {
  const card = cards.find((candidate) => candidate.passcode === cardId);

  if (!card) {
    throw new Error(`Missing fixture cardId: ${cardId}`);
  }

  return card;
}
