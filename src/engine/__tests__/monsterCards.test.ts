import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { getCardCoverage, isPlayableCard } from "../cards/coverage";
import {
  A_CAT_OF_ILL_OMEN_ID,
  A_TEAM_TRAP_DISPOSAL_UNIT_ID,
  AIRKNIGHT_PARSHATH_ID,
  AMAZONESS_ARCHER_ID,
  AN_OWL_OF_LUCK_ID,
  ARMED_NINJA_ID,
  BLADEFLY_ID,
  BOWGANIAN_ID,
  CANNON_SOLDIER_ID,
  CRIMSON_NINJA_ID,
  CURE_MERMAID_ID,
  CYBER_STEIN_ID,
  DANCING_FAIRY_ID,
  DARK_DRICERATOPS_ID,
  DEKOICHI_ID,
  DES_LACOODA_ID,
  DRAGON_MANIPULATOR_ID,
  ENRAGED_BATTLE_OX_ID,
  FLYING_KAMAKIRI_1_ID,
  GALE_LIZARD_ID,
  GIANT_RAT_ID,
  GOLEM_SENTRY_ID,
  GRAVEKEEPERS_GUARD_ID,
  GRAVEKEEPERS_SPEAR_SOLDIER_ID,
  GREENKAPPA_ID,
  GUARDIAN_STATUE_ID,
  HADE_HANE_ID,
  HANE_HANE_ID,
  HOWLING_INSECT_ID,
  HOSHININGEN_ID,
  HYSTERIC_FAIRY_ID,
  KAIBAMAN_ID,
  EIGHT_CLAWS_SCORPION_ID,
  EXILED_FORCE_ID,
  FOUR_STARRED_LADYBUG_OF_DOOM_ID,
  JINZO_7_ID,
  LEGHUL_ID,
  LITTLE_CHIMERA_ID,
  MAGICIAN_OF_FAITH_ID,
  MAN_EATER_BUG_ID,
  MAD_SWORD_BEAST_ID,
  MASK_OF_DARKNESS_ID,
  MASKED_DRAGON_ID,
  MEDUSA_WORM_ID,
  MILUS_RADIANT_ID,
  MIRAGE_DRAGON_ID,
  MOAI_INTERCEPTOR_CANNONS_ID,
  MOLTEN_ZOMBIE_ID,
  MOTHER_GRIZZLY_ID,
  MYSTIC_LAMP_ID,
  MYSTIC_TOMATO_ID,
  MYSTICAL_SHINE_BALL_ID,
  NIGHTMARE_HORSE_ID,
  NOBLEMAN_EATER_BUG_ID,
  OLD_VINDICTIVE_MAGICIAN_ID,
  OOGUCHI_ID,
  PENGUIN_SOLDIER_ID,
  PITCH_BLACK_WARWOLF_ID,
  POISON_MUMMY_ID,
  PRINCESS_OF_TSURUGI_ID,
  QUEENS_DOUBLE_ID,
  RAFFLESIA_SEDUCTION_ID,
  RAINBOW_FLOWER_ID,
  REAPER_OF_THE_CARDS_ID,
  SERVANT_OF_CATABOLISM_ID,
  SHADOW_TAMER_ID,
  SHINING_ANGEL_ID,
  SPEAR_DRAGON_ID,
  STAR_BOY_ID,
  STEALTH_BIRD_ID,
  SWARM_OF_LOCUSTS_ID,
  SWARM_OF_SCARABS_ID,
  THE_AGENT_OF_CREATION_VENUS_ID,
  THE_CREATOR_ID,
  THE_CREATOR_INCARNATE_ID,
  THE_IMMORTAL_OF_THUNDER_ID,
  THREE_HUMP_LACOODA_ID,
  TORNADO_BIRD_ID,
  TRAP_MASTER_ID,
  TROOP_DRAGON_ID,
  UFO_TURTLE_ID,
  WITCHS_APPRENTICE_ID,
} from "../cards/scripts/monsters";
import { JAR_OF_GREED_ID } from "../cards/scripts/traps";
import type { CardInstance, ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { validateDeck } from "../deckValidation";
import { deriveBattleStats } from "../effects/continuous";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const SANGAN_ID = "26202165";
const POT_OF_GREED_ID = "55144522";
const BATTLE_OX_ID = "05053103";
const BLUE_EYES_ID = "89631139";
const BLUE_WINGED_CROWN_ID = "41396436";
const BLAZING_INPACHI_ID = "05464695";
const AQUA_MADOOR_ID = "85639257";
const AITSU_ID = "48202661";
const ANCIENT_BRAIN_ID = "42431843";
const ANCIENT_ELF_ID = "93221206";
const BABY_DRAGON_ID = "88819587";
const BASIC_INSECT_ID = "89091579";
const TORRENTIAL_TRIBUTE_ID = "53582587";
const MIRROR_FORCE_ID = "44095762";
const SAKURETSU_ARMOR_ID = "56120475";
const NECROVALLEY_ID = "47355498";
const ARCHFIEND_SOLDIER_ID = "49881766";
const CYBER_SAURUS_ID = "89112729";
const PREMATURE_BURIAL_ID = "70828912";

const CYBER_STEIN_CASE = {
  taskId: "C-0294",
  sourceIndex: 293,
  cardId: CYBER_STEIN_ID,
  name: "Cyber-Stein",
  text: "Pay 5000 Life Points. Special Summon 1 Fusion Monster from your Fusion Deck to the field in Attack Position.",
  stats: { attribute: "DARK", type: "Machine", level: 2, atk: 700, def: 500 },
} as const;

const MOLTEN_ZOMBIE_CASE = {
  taskId: "C-1002",
  sourceIndex: 1001,
  cardId: MOLTEN_ZOMBIE_ID,
  name: "Molten Zombie",
  text: "When this card is Special Summoned from the GY, the controller of this card draws 1 card.",
  stats: { attribute: "FIRE", type: "Pyro", level: 4, atk: 1600, def: 400 },
} as const;

const PRINCESS_OF_TSURUGI_CASE = {
  taskId: "C-1159",
  sourceIndex: 1158,
  cardId: PRINCESS_OF_TSURUGI_ID,
  name: "Princess of Tsurugi",
  text: "FLIP: Inflict 500 points of damage to your opponent's Life Points for each Spell and Trap Card on your opponent's side of the field.",
  stats: { attribute: "WIND", type: "Warrior", level: 3, atk: 900, def: 700 },
} as const;

const STANDBY_LP_TRIGGER_CASES = [
  {
    taskId: "C-0185",
    sourceIndex: 184,
    cardId: BOWGANIAN_ID,
    name: "Bowganian",
    text: "During each of your Standby Phases, inflict 600 damage to your opponent.",
    stats: { attribute: "DARK", type: "Machine", level: 3, atk: 1300, def: 1000 },
    position: "attack",
    expectedP1Lp: 8000,
    expectedP2Lp: 7400,
  },
  {
    taskId: "C-0279",
    sourceIndex: 278,
    cardId: CURE_MERMAID_ID,
    name: "Cure Mermaid",
    text: "As long as this card remains face-up on your side of the field, increase your Life Points by 800 points during each of your Standby Phases.",
    stats: { attribute: "WATER", type: "Fish", level: 4, atk: 1500, def: 800 },
    position: "attack",
    expectedP1Lp: 8800,
    expectedP2Lp: 8000,
  },
  {
    taskId: "C-0310",
    sourceIndex: 309,
    cardId: DANCING_FAIRY_ID,
    name: "Dancing Fairy",
    text: "As long as this card remains in face-up Defense Position on your side of the field, increase your Life Points by 1000 points during each of your Standby Phases.",
    stats: { attribute: "WIND", type: "Fairy", level: 4, atk: 1700, def: 1000 },
    position: "defense",
    expectedP1Lp: 9000,
    expectedP2Lp: 8000,
  },
] as const;

const BATTLE_PHASE_TRAP_LOCK_CASES = [
  {
    taskId: "C-0987",
    sourceIndex: 986,
    cardId: MIRAGE_DRAGON_ID,
    name: "Mirage Dragon",
    text: "Your opponent cannot activate Trap Cards during the Battle Phase.",
    stats: { attribute: "LIGHT", type: "Dragon", level: 4, atk: 1600, def: 600 },
  },
  {
    taskId: "C-1143",
    sourceIndex: 1142,
    cardId: PITCH_BLACK_WARWOLF_ID,
    name: "Pitch-Black Warwolf",
    text: "Your opponent cannot activate Trap Cards during the Battle Phase.",
    stats: { attribute: "DARK", type: "Beast-Warrior", level: 4, atk: 1600, def: 600 },
  },
] as const;

const ATTRIBUTE_AURA_CASES = [
  {
    taskId: "C-0157",
    sourceIndex: 156,
    cardId: BLADEFLY_ID,
    name: "Bladefly",
    text: "As long as this card remains face-up on the Field, increase the ATK of all WIND monsters by 500 points and decreases the ATK of all EARTH monsters by 400 points.",
    stats: { attribute: "WIND", type: "Insect", level: 2, atk: 600, def: 700 },
    boostedId: BLUE_WINGED_CROWN_ID,
    weakenedId: BATTLE_OX_ID,
  },
  {
    taskId: "C-0729",
    sourceIndex: 728,
    cardId: HOSHININGEN_ID,
    name: "Hoshiningen",
    text: "As long as this card remains face-up on the field, increase the ATK of all LIGHT monsters by 500 points and decrease the ATK of all DARK monsters by 400 points.",
    stats: { attribute: "LIGHT", type: "Fairy", level: 2, atk: 500, def: 700 },
    boostedId: BLUE_EYES_ID,
    weakenedId: ARCHFIEND_SOLDIER_ID,
  },
  {
    taskId: "C-0871",
    sourceIndex: 870,
    cardId: LITTLE_CHIMERA_ID,
    name: "Little Chimera",
    text: "As long as this card remains face-up on the field, increase the ATK of all FIRE monsters by 500 points and decrease the ATK of all WATER monsters by 400 points.",
    stats: { attribute: "FIRE", type: "Beast", level: 2, atk: 600, def: 550 },
    boostedId: BLAZING_INPACHI_ID,
    weakenedId: AQUA_MADOOR_ID,
  },
  {
    taskId: "C-0975",
    sourceIndex: 974,
    cardId: MILUS_RADIANT_ID,
    name: "Milus Radiant",
    text: "As long as this card remains face-up on the field, increase the ATK of all EARTH monsters by 500 points and decrease the ATK of all WIND monsters by 400 points.",
    stats: { attribute: "EARTH", type: "Beast", level: 1, atk: 300, def: 250 },
    boostedId: BATTLE_OX_ID,
    weakenedId: BLUE_WINGED_CROWN_ID,
  },
  {
    taskId: "C-1413",
    sourceIndex: 1412,
    cardId: STAR_BOY_ID,
    name: "Star Boy",
    text: "As long as this card remains face-up on the field, increase the ATK of all WATER monsters by 500 points and decrease the ATK of all FIRE monsters by 400 points.",
    stats: { attribute: "WATER", type: "Aqua", level: 2, atk: 550, def: 500 },
    boostedId: AQUA_MADOOR_ID,
    weakenedId: BLAZING_INPACHI_ID,
  },
  {
    taskId: "C-1673",
    sourceIndex: 1672,
    cardId: WITCHS_APPRENTICE_ID,
    name: "Witch's Apprentice",
    text: "As long as this card remains face-up on the field, increase the ATK of all DARK monsters by 500 points and decrease the ATK of all LIGHT monsters by 400 points.",
    stats: { attribute: "DARK", type: "Spellcaster", level: 2, atk: 550, def: 500 },
    boostedId: ARCHFIEND_SOLDIER_ID,
    weakenedId: BLUE_EYES_ID,
  },
] as const;

const MONSTER_ONLY_CARD_CASES = [
  {
    taskId: "C-0027",
    sourceIndex: 26,
    cardId: AIRKNIGHT_PARSHATH_ID,
    name: "Airknight Parshath",
    text: "If this card attacks a Defense Position monster, inflict piercing battle damage to your opponent. When this card inflicts battle damage to your opponent: Draw 1 card.",
    stats: { attribute: "LIGHT", type: "Fairy", level: 5, atk: 1900, def: 1400 },
  },
  {
    taskId: "C-0487",
    sourceIndex: 486,
    cardId: ENRAGED_BATTLE_OX_ID,
    name: "Enraged Battle Ox",
    text: "As long as this card remains face-up on your side of the field, when Beast, Beast-Warrior and Winged Beast-Type monsters on your side of the field attack with an ATK that is higher than the DEF of your opponent's Defense Position monster, inflict the difference as Battle Damage to your opponent's Life Points.",
    stats: { attribute: "EARTH", type: "Beast-Warrior", level: 4, atk: 1700, def: 1000 },
  },
] as const;

const SELF_SET_RETURN_CASES = [
  {
    taskId: "C-0621",
    sourceIndex: 620,
    cardId: GOLEM_SENTRY_ID,
    name: "Golem Sentry",
    text: "Once per turn, you can flip this card into face-down Defense Position. When this card is Flip Summoned, return 1 monster on your opponent's side of the field to the owner's hand.",
    stats: { attribute: "EARTH", type: "Rock", level: 4, atk: 800, def: 1800 },
  },
  {
    taskId: "C-0675",
    sourceIndex: 674,
    cardId: GUARDIAN_STATUE_ID,
    name: "Guardian Statue",
    text: "Once per turn, during your Main Phase, you can flip this card into face-down Defense Position. When this card is Flip Summoned, return 1 monster on your opponent's side of the field to the owner's hand.",
    stats: { attribute: "EARTH", type: "Rock", level: 4, atk: 800, def: 1400 },
  },
] as const;

const SELF_SET_DESTROY_CASES = [
  {
    taskId: "C-0945",
    sourceIndex: 944,
    cardId: MEDUSA_WORM_ID,
    name: "Medusa Worm",
    text: "Once per turn, during your Main Phase, you can flip this card into face-down Defense Position. When this card is Flip Summoned, destroy 1 monster on your opponent's side of the field.",
    stats: { attribute: "EARTH", type: "Rock", level: 2, atk: 500, def: 600 },
    targetId: BLUE_EYES_ID,
  },
  {
    taskId: "C-1440",
    sourceIndex: 1439,
    cardId: SWARM_OF_SCARABS_ID,
    name: "Swarm of Scarabs",
    text: "Once per turn, you can flip this card into face-down Defense Position. When this card is Flip Summoned, destroy 1 monster your opponent controls.",
    stats: { attribute: "DARK", type: "Insect", level: 3, atk: 500, def: 1000 },
    targetId: BLUE_EYES_ID,
  },
] as const;

const FLIP_CONTROL_CASES = [
  {
    taskId: "C-0423",
    sourceIndex: 422,
    cardId: DRAGON_MANIPULATOR_ID,
    name: "Dragon Manipulator",
    text: "FLIP: Take control of 1 face-up Dragon-Type monster on your opponent's side of the field until the end of the End Phase.",
    stats: { attribute: "EARTH", type: "Warrior", level: 3, atk: 700, def: 800 },
    targetId: BLUE_EYES_ID,
  },
  {
    taskId: "C-1176",
    sourceIndex: 1175,
    cardId: RAFFLESIA_SEDUCTION_ID,
    name: "Rafflesia Seduction",
    text: "FLIP: Take control of 1 face-up monster on your opponent's side of the field until the end of the turn.",
    stats: { attribute: "EARTH", type: "Plant", level: 2, atk: 300, def: 900 },
    targetId: BATTLE_OX_ID,
  },
  {
    taskId: "C-1300",
    sourceIndex: 1299,
    cardId: SHADOW_TAMER_ID,
    name: "Shadow Tamer",
    text: "FLIP: Take control of 1 face-up Fiend-Type monster on your opponent's side of the field until the end of the End Phase.",
    stats: { attribute: "EARTH", type: "Warrior", level: 3, atk: 800, def: 700 },
    targetId: ARCHFIEND_SOLDIER_ID,
  },
] as const;

const BATTLE_RECRUITER_CASES = [
  {
    taskId: "C-0542",
    sourceIndex: 541,
    cardId: FLYING_KAMAKIRI_1_ID,
    name: "Flying Kamakiri #1",
    text: "When this card is destroyed by battle and sent to the GY: You can Special Summon 1 WIND monster with 1500 or less ATK from your Deck, in face-up Attack Position.",
    stats: { attribute: "WIND", type: "Insect", level: 4, atk: 1400, def: 900 },
    targetId: BABY_DRAGON_ID,
  },
  {
    taskId: "C-0597",
    sourceIndex: 596,
    cardId: GIANT_RAT_ID,
    name: "Giant Rat",
    text: "When this card is destroyed by battle and sent to the GY: You can Special Summon 1 EARTH monster with 1500 or less ATK from your Deck, in face-up Attack Position.",
    stats: { attribute: "EARTH", type: "Beast", level: 4, atk: 1400, def: 1450 },
    targetId: BASIC_INSECT_ID,
  },
  {
    taskId: "C-0731",
    sourceIndex: 730,
    cardId: HOWLING_INSECT_ID,
    name: "Howling Insect",
    text: "When this card is destroyed and sent to the GY as a result of battle, you can Special Summon 1 Insect-Type monster with an ATK of 1500 or less to your side of the field from your Deck. Then shuffle your Deck.",
    stats: { attribute: "EARTH", type: "Insect", level: 3, atk: 1200, def: 1300 },
    targetId: BASIC_INSECT_ID,
  },
  {
    taskId: "C-0932",
    sourceIndex: 931,
    cardId: MASKED_DRAGON_ID,
    name: "Masked Dragon",
    text: "When this card is destroyed by battle and sent to the GY: You can Special Summon 1 Dragon-Type monster with 1500 or less ATK from your Deck.",
    stats: { attribute: "FIRE", type: "Dragon", level: 3, atk: 1400, def: 1100 },
    targetId: BABY_DRAGON_ID,
  },
  {
    taskId: "C-1013",
    sourceIndex: 1012,
    cardId: MOTHER_GRIZZLY_ID,
    name: "Mother Grizzly",
    text: "When this card is destroyed by battle and sent to the GY, you can Special Summon 1 WATER monster with 1500 or less ATK from your Deck in face-up Attack Position.",
    stats: { attribute: "WATER", type: "Beast-Warrior", level: 4, atk: 1400, def: 1000 },
    targetId: AQUA_MADOOR_ID,
  },
  {
    taskId: "C-1035",
    sourceIndex: 1034,
    cardId: MYSTIC_TOMATO_ID,
    name: "Mystic Tomato",
    text: "When this card is destroyed by battle and sent to the GY: You can Special Summon 1 DARK monster with 1500 or less ATK from your Deck, in face-up Attack Position.",
    stats: { attribute: "DARK", type: "Plant", level: 4, atk: 1400, def: 1100 },
    targetId: ANCIENT_BRAIN_ID,
  },
  {
    taskId: "C-1312",
    sourceIndex: 1311,
    cardId: SHINING_ANGEL_ID,
    name: "Shining Angel",
    text: "When this card is destroyed by battle and sent to the GY: You can Special Summon 1 LIGHT monster with 1500 or less ATK from your Deck, in face-up Attack Position.",
    stats: { attribute: "LIGHT", type: "Fairy", level: 4, atk: 1400, def: 800 },
    targetId: ANCIENT_ELF_ID,
  },
  {
    taskId: "C-1583",
    sourceIndex: 1582,
    cardId: TROOP_DRAGON_ID,
    name: "Troop Dragon",
    text: "If this card is destroyed and sent to the GY as a result of battle, select and Special Summon 1 \"Troop Dragon\" from your Deck to your side of the field. Then shuffle your Deck.",
    stats: { attribute: "WIND", type: "Dragon", level: 2, atk: 700, def: 800 },
    targetId: TROOP_DRAGON_ID,
  },
  {
    taskId: "C-1607",
    sourceIndex: 1606,
    cardId: UFO_TURTLE_ID,
    name: "UFO Turtle",
    text: "When this card is destroyed by battle and sent to the GY: You can Special Summon 1 FIRE monster with 1500 or less ATK from your Deck, in face-up Attack Position.",
    stats: { attribute: "FIRE", type: "Machine", level: 4, atk: 1400, def: 1200 },
    targetId: AITSU_ID,
  },
] as const;

const CUSTOM_MONSTER_CASES = [
  {
    taskId: "C-0994",
    sourceIndex: 993,
    cardId: MOAI_INTERCEPTOR_CANNONS_ID,
    name: "Moai Interceptor Cannons",
    classifications: ["Effect"],
    text: "Once per turn, during your Main Phase, you can flip this card into face-down Defense Position.",
    stats: { attribute: "EARTH", type: "Rock", level: 4, atk: 1100, def: 2000 },
  },
  {
    taskId: "C-1375",
    sourceIndex: 1374,
    cardId: SPEAR_DRAGON_ID,
    name: "Spear Dragon",
    classifications: ["Effect"],
    text: "During battle between this attacking card and a Defense Position monster whose DEF is lower than the ATK of this card, inflict the difference as Battle Damage to your opponent's Life Points. If this card attacks, it is changed to Defense Position at the end of the Damage Step.",
    stats: { attribute: "WIND", type: "Dragon", level: 4, atk: 1900, def: 0 },
  },
  {
    taskId: "C-1495",
    sourceIndex: 1494,
    cardId: THE_IMMORTAL_OF_THUNDER_ID,
    name: "The Immortal of Thunder",
    classifications: ["Effect", "Flip"],
    text: "FLIP: Increase your Life Points by 3000 points. When this card is sent from the field to the GY, you lose 5000 Life Points.",
    stats: { attribute: "LIGHT", type: "Thunder", level: 4, atk: 1500, def: 1300 },
  },
] as const;

describe("supported Monster card scripts", () => {
  it("verifies attribute aura monster source records and coverage statuses", () => {
    for (const expected of ATTRIBUTE_AURA_CASES) {
      const card = cardById(expected.cardId);

      expect(cards.findIndex((candidate) => candidate.passcode === expected.cardId), expected.taskId).toBe(expected.sourceIndex);
      expect(card).toMatchObject({
        id: expected.cardId,
        passcode: expected.cardId,
        name: expected.name,
        category: "Monster",
        classifications: ["Effect"],
        text: expected.text,
        monster: expected.stats,
        legality: {
          goat_world_pool: true,
          restriction: "Unlimited",
          max_copies: 3,
        },
      });
      expect(getCardCoverage(card).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it.each(ATTRIBUTE_AURA_CASES)(
    "supports $name boosting one attribute and weakening the opposing attribute while face-up",
    (testCase) => {
      const state = withAttributeAuraBattlefield(testCase.cardId, testCase.boostedId, testCase.weakenedId);
      const source = state.players.P1.monsterZones[0]!;
      const boosted = state.players.P1.monsterZones[1]!;
      const weakened = state.players.P2.monsterZones[0]!;

      expect(deriveBattleStats(state, {
        playerId: "P1",
        card: source,
        base: monsterBaseStats(testCase.cardId),
      }).atk).toBe(testCase.stats.atk + 500);
      expect(deriveBattleStats(state, {
        playerId: "P1",
        card: boosted,
        base: monsterBaseStats(testCase.boostedId),
      }).atk).toBe(monsterBaseStats(testCase.boostedId).atk + 500);
      expect(deriveBattleStats(state, {
        playerId: "P2",
        card: weakened,
        base: monsterBaseStats(testCase.weakenedId),
      }).atk).toBe(Math.max(0, monsterBaseStats(testCase.weakenedId).atk - 400));
    },
  );

  it("does not apply attribute aura modifiers from a face-down source", () => {
    const state = withAttributeAuraBattlefield(BLADEFLY_ID, BLUE_WINGED_CROWN_ID, BATTLE_OX_ID, {
      sourceFace: "faceDown",
    });
    const boosted = state.players.P1.monsterZones[1]!;
    const weakened = state.players.P2.monsterZones[0]!;

    expect(deriveBattleStats(state, {
      playerId: "P1",
      card: boosted,
      base: monsterBaseStats(BLUE_WINGED_CROWN_ID),
    }).atk).toBe(monsterBaseStats(BLUE_WINGED_CROWN_ID).atk);
    expect(deriveBattleStats(state, {
      playerId: "P2",
      card: weakened,
      base: monsterBaseStats(BATTLE_OX_ID),
    }).atk).toBe(monsterBaseStats(BATTLE_OX_ID).atk);
  });

  it("verifies Cyber-Stein source record and coverage status", () => {
    const card = cardById(CYBER_STEIN_CASE.cardId);

    expect(cards.findIndex((candidate) => candidate.passcode === CYBER_STEIN_CASE.cardId), CYBER_STEIN_CASE.taskId)
      .toBe(CYBER_STEIN_CASE.sourceIndex);
    expect(card).toMatchObject({
      id: CYBER_STEIN_CASE.cardId,
      passcode: CYBER_STEIN_CASE.cardId,
      name: CYBER_STEIN_CASE.name,
      category: "Monster",
      classifications: ["Effect"],
      text: CYBER_STEIN_CASE.text,
      monster: CYBER_STEIN_CASE.stats,
      legality: {
        goat_world_pool: true,
        restriction: "Unlimited",
        max_copies: 3,
      },
    });
    expect(getCardCoverage(card).status).toBe("goatTemplate");
    expect(isPlayableCard(CYBER_STEIN_CASE.cardId, cards)).toBe(true);
  });

  it("supports Cyber-Stein paying 5000 LP to Special Summon a Fusion Monster from the Fusion Deck", () => {
    const state = withFusionDeckCard(
      withOwnFaceUpMonster(stateWithPriority([CYBER_STEIN_ID], []), CYBER_STEIN_ID),
      "P1",
      CYBER_SAURUS_ID,
    );
    const source = state.players.P1.monsterZones[0]!;
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "pay-lp-summon-fusion",
      targetRefs: [{ playerId: "P1", zone: "fusionDeck", index: 0 }],
    });
    const resolved = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(activated.state.players.P1.lp).toBe(3000);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.fusionDeck).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[1]).toMatchObject({
      cardId: CYBER_SAURUS_ID,
      face: "faceUp",
      position: "attack",
      visibility: "public",
    });
  });

  it.each([
    {
      taskId: "C-0792",
      sourceIndex: 791,
      cardId: KAIBAMAN_ID,
      name: "Kaibaman",
      text: "You can Tribute this face-up card; Special Summon 1 \"Blue-Eyes White Dragon\" from your hand.",
      stats: { attribute: "LIGHT", type: "Warrior", level: 3, atk: 200, def: 700 },
    },
    {
      taskId: "C-1466",
      sourceIndex: 1465,
      cardId: THE_AGENT_OF_CREATION_VENUS_ID,
      name: "The Agent of Creation - Venus",
      text: "You can pay 500 Life Points; Special Summon 1 \"Mystical Shine Ball\" from your hand or Deck.",
      stats: { attribute: "LIGHT", type: "Fairy", level: 3, atk: 1600, def: 0 },
    },
    {
      taskId: "C-1475",
      sourceIndex: 1474,
      cardId: THE_CREATOR_INCARNATE_ID,
      name: "The Creator Incarnate",
      text: "You can Tribute this card to Special Summon 1 \"The Creator\" from your hand.",
      stats: { attribute: "LIGHT", type: "Warrior", level: 4, atk: 1600, def: 1500 },
    },
  ])("verifies $name source record and coverage status", (expected) => {
    const card = cardById(expected.cardId);

    expect(cards.findIndex((candidate) => candidate.passcode === expected.cardId), expected.taskId)
      .toBe(expected.sourceIndex);
    expect(card).toMatchObject({
      id: expected.cardId,
      passcode: expected.cardId,
      name: expected.name,
      category: "Monster",
      classifications: ["Effect"],
      text: expected.text,
      monster: expected.stats,
      legality: {
        goat_world_pool: true,
        restriction: "Unlimited",
        max_copies: 3,
      },
    });
    expect(getCardCoverage(card).status).toBe("goatTemplate");
    expect(isPlayableCard(expected.cardId, cards)).toBe(true);
  });

  it("supports Kaibaman tributing itself to Special Summon Blue-Eyes White Dragon from hand", () => {
    const state = withOwnFaceUpMonster(stateWithPriority([KAIBAMAN_ID, BLUE_EYES_ID], []), KAIBAMAN_ID);
    const blueEyes = requireHandCard(state, "P1", BLUE_EYES_ID);
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-source",
      targetRefs: [{ playerId: "P1", zone: "hand", index: state.players.P1.hand.indexOf(blueEyes) }],
    });
    const resolved = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ instanceId: "p1-source" }));
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: BLUE_EYES_ID,
      face: "faceUp",
      position: "attack",
    });
  });

  it("supports The Agent of Creation - Venus paying 500 LP to Special Summon Mystical Shine Ball from Deck", () => {
    const withTarget = withMainDeckCard(
      withOwnFaceUpMonster(stateWithPriority([THE_AGENT_OF_CREATION_VENUS_ID, MYSTICAL_SHINE_BALL_ID], []), THE_AGENT_OF_CREATION_VENUS_ID),
      "P1",
      MYSTICAL_SHINE_BALL_ID,
    );
    const state: DuelState = {
      ...withTarget,
      players: {
        ...withTarget.players,
        P1: {
          ...withTarget.players.P1,
          hand: withTarget.players.P1.hand.filter((card) => card.cardId !== MYSTICAL_SHINE_BALL_ID),
        },
      },
    };
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-source",
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });
    const resolved = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(activated.state.players.P1.lp).toBe(7500);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[1]).toMatchObject({
      cardId: MYSTICAL_SHINE_BALL_ID,
      face: "faceUp",
      position: "attack",
    });
    expect(resolved.state.players.P1.mainDeck.some((card) => card.cardId === MYSTICAL_SHINE_BALL_ID)).toBe(false);
  });

  it("supports The Creator Incarnate tributing itself to Special Summon The Creator from hand", () => {
    const state = withOwnFaceUpMonster(
      stateWithPriorityAllowUnsupported([THE_CREATOR_INCARNATE_ID, THE_CREATOR_ID], []),
      THE_CREATOR_INCARNATE_ID,
    );
    const creator = requireHandCard(state, "P1", THE_CREATOR_ID);
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-source",
      targetRefs: [{ playerId: "P1", zone: "hand", index: state.players.P1.hand.indexOf(creator) }],
    });
    const resolved = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ instanceId: "p1-source" }));
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: THE_CREATOR_ID,
      face: "faceUp",
      position: "attack",
    });
  });

  it("verifies Molten Zombie source record and coverage status", () => {
    const card = cardById(MOLTEN_ZOMBIE_CASE.cardId);

    expect(cards.findIndex((candidate) => candidate.passcode === MOLTEN_ZOMBIE_CASE.cardId), MOLTEN_ZOMBIE_CASE.taskId)
      .toBe(MOLTEN_ZOMBIE_CASE.sourceIndex);
    expect(card).toMatchObject({
      id: MOLTEN_ZOMBIE_CASE.cardId,
      passcode: MOLTEN_ZOMBIE_CASE.cardId,
      name: MOLTEN_ZOMBIE_CASE.name,
      category: "Monster",
      classifications: ["Effect"],
      text: MOLTEN_ZOMBIE_CASE.text,
      monster: MOLTEN_ZOMBIE_CASE.stats,
      legality: {
        goat_world_pool: true,
        restriction: "Unlimited",
        max_copies: 3,
      },
    });
    expect(getCardCoverage(card).status).toBe("goatCustom");
    expect(isPlayableCard(MOLTEN_ZOMBIE_CASE.cardId, cards)).toBe(true);
  });

  it("supports Molten Zombie drawing when Special Summoned from the Graveyard", () => {
    const state = withOwnGraveyardMonster(
      stateWithPriority([PREMATURE_BURIAL_ID, MOLTEN_ZOMBIE_ID], []),
      MOLTEN_ZOMBIE_ID,
    );
    const source = requireHandCard(state, "P1", PREMATURE_BURIAL_ID);
    const handBefore = state.players.P1.hand.length;
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const revived = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });
    const drawn = reduceDuel(revived.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(revived.errors).toEqual([]);
    expect(revived.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: MOLTEN_ZOMBIE_ID,
      instanceId: `P1-${MOLTEN_ZOMBIE_ID}-graveyard`,
    });
    expect(revived.state.chain[0]).toMatchObject({
      cardId: MOLTEN_ZOMBIE_ID,
      effectId: "draw-when-special-summoned-from-graveyard",
    });
    expect(drawn.errors).toEqual([]);
    expect(drawn.events.filter((event) => event.type === "card-drawn" && event.playerId === "P1")).toHaveLength(1);
    expect(drawn.state.players.P1.hand).toHaveLength(handBefore - 1 + 1);
  });

  it("supports 3-Hump Lacooda Tributing two face-up copies to draw three cards", () => {
    const state = withThreeHumpLacoodas(stateWithPriority([THREE_HUMP_LACOODA_ID], []));
    const source = state.players.P1.monsterZones[0]!;
    const tribute = state.players.P1.monsterZones[1]!;
    const startingHandSize = state.players.P1.hand.length;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "tribute-two-draw-three",
      costInstanceIds: [source.instanceId, tribute.instanceId],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(THREE_HUMP_LACOODA_ID)).status).toBe("goatCustom");
    expect(activation.errors).toEqual([]);
    expect(activation.events.some((event) => event.type === "cost-paid" && event.costKind === "tribute")).toBe(true);
    expect(activation.state.players.P1.graveyard.map((card) => card.instanceId)).toEqual([
      tribute.instanceId,
      source.instanceId,
    ]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(3);
    expect(resolved.state.players.P1.hand).toHaveLength(startingHandSize + 3);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P1.monsterZones[2]).toMatchObject({
      cardId: THREE_HUMP_LACOODA_ID,
      instanceId: "p1-lacooda-3",
    });
  });

  it("rejects 3-Hump Lacooda when the third copy is face-down", () => {
    const state = withThreeHumpLacoodas(stateWithPriority([THREE_HUMP_LACOODA_ID], []), {
      thirdFace: "faceDown",
    });
    const source = state.players.P1.monsterZones[0]!;
    const tribute = state.players.P1.monsterZones[1]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "tribute-two-draw-three",
      costInstanceIds: [source.instanceId, tribute.instanceId],
    });

    expect(activation.errors[0]?.message).toBe("That effect cannot be activated right now.");
    expect(activation.state.players.P1.graveyard).toEqual([]);
    expect(activation.state.players.P1.hand).toHaveLength(state.players.P1.hand.length);
  });

  it("supports 8-Claws Scorpion setting itself face-down once per turn", () => {
    const state = withOwnFaceUpMonster(stateWithPriority([EIGHT_CLAWS_SCORPION_ID], []), EIGHT_CLAWS_SCORPION_ID);
    const source = state.players.P1.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "set-self-face-down",
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });
    const faceUpAgain = withOwnFaceUpMonster(resolved.state, EIGHT_CLAWS_SCORPION_ID);
    const second = reduceDuel(faceUpAgain, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-source",
      effectId: "set-self-face-down",
    });

    expect(getCardCoverage(cardById(EIGHT_CLAWS_SCORPION_ID)).status).toBe("goatCustom");
    expect(activation.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: EIGHT_CLAWS_SCORPION_ID,
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
    expect(second.errors[0]?.message).toBe("That effect has already been activated this turn.");
  });

  it("supports 8-Claws Scorpion becoming 2400 ATK only against face-down Defense Position monsters", () => {
    const boostedState = advanceToBattlePhase(withBattlefield(
      stateWithPriority([EIGHT_CLAWS_SCORPION_ID], [AQUA_MADOOR_ID]),
      {
        defenderFace: "faceDown",
      },
    ));
    const boosted = reduceDuel(boostedState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-8-claws",
      defenderInstanceId: "p2-defender",
    });
    const battleCompleted = boosted.events.find((event) => event.type === "battle-completed");

    expect(boosted.errors).toEqual([]);
    expect(battleCompleted).toMatchObject({ attackerBattleAtk: 2400 });
    expect(boosted.state.players.P2.monsterZones[0]).toBeNull();
    expect(boosted.state.players.P2.graveyard[0]).toMatchObject({ instanceId: "p2-defender" });

    const unboostedState = advanceToBattlePhase(withBattlefield(
      stateWithPriority([EIGHT_CLAWS_SCORPION_ID], [AQUA_MADOOR_ID]),
      {
        defenderFace: "faceUp",
      },
    ));
    const unboosted = reduceDuel(unboostedState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-8-claws",
      defenderInstanceId: "p2-defender",
    });
    const unboostedBattle = unboosted.events.find((event) => event.type === "battle-completed");

    expect(unboosted.errors).toEqual([]);
    expect(unboostedBattle).toMatchObject({ attackerBattleAtk: 300 });
    expect(unboosted.state.players.P1.lp).toBe(6300);
    expect(unboosted.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: "p2-defender" });
  });

  it("supports A-Team: Trap Disposal Unit tributing itself to negate and destroy an opponent Trap activation", () => {
    const base = stateWithPriority([A_TEAM_TRAP_DISPOSAL_UNIT_ID, BATTLE_OX_ID], [TORRENTIAL_TRIBUTE_ID]);
    const aTeam = requireHandCard(base, "P1", A_TEAM_TRAP_DISPOSAL_UNIT_ID);
    const summonedMonster = requireHandCard(base, "P1", BATTLE_OX_ID);
    const torrential = requireHandCard(base, "P2", TORRENTIAL_TRIBUTE_ID);
    const ready: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          hand: base.players.P1.hand.filter((card) => card.instanceId !== aTeam.instanceId),
          monsterZones: [zoneCard(aTeam.instanceId, A_TEAM_TRAP_DISPOSAL_UNIT_ID, "P1"), null, null, null, null],
        },
        P2: {
          ...base.players.P2,
          hand: base.players.P2.hand.filter((card) => card.instanceId !== torrential.instanceId),
          spellTrapZones: [
            zoneCard(torrential.instanceId, TORRENTIAL_TRIBUTE_ID, "P2", {
              face: "faceDown",
              position: null,
              visibility: "hidden",
              setTurn: 0,
            }),
            null,
            null,
            null,
            null,
          ],
        },
      },
    };
    const summon = reduceDuel(ready, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: summonedMonster.instanceId,
      zoneIndex: 1,
    });
    const negation = reduceDuel(summon.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: aTeam.instanceId,
      effectId: "tribute-negate-trap",
    });
    const p1Passed = reduceDuel(negation.state, { type: "pass-priority", playerId: "P1" });
    const p2Passed = reduceDuel(p1Passed.state, { type: "pass-priority", playerId: "P2" });
    const resolved = reduceDuel(p2Passed.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(A_TEAM_TRAP_DISPOSAL_UNIT_ID)).status).toBe("goatCustom");
    expect(summon.state.chain[0]).toMatchObject({ playerId: "P2", cardId: TORRENTIAL_TRIBUTE_ID });
    expect(negation.errors).toEqual([]);
    expect(negation.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ instanceId: aTeam.instanceId }));
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "effect-resolved-without-effect",
      chainLinkId: "chain-1",
      reason: "Chain link was negated.",
    }));
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.monsterZones[1]).toMatchObject({ instanceId: summonedMonster.instanceId });
    expect(resolved.state.players.P2.graveyard).toContainEqual(expect.objectContaining({ instanceId: torrential.instanceId }));
  });

  it("rejects A-Team: Trap Disposal Unit when no opponent Trap activation is on the chain", () => {
    const state = withOwnFaceUpMonster(
      stateWithPriority([A_TEAM_TRAP_DISPOSAL_UNIT_ID], []),
      A_TEAM_TRAP_DISPOSAL_UNIT_ID,
    );
    const source = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "tribute-negate-trap",
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
    expect(result.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: source.instanceId });
  });

  it("supports A Cat of Ill Omen placing a selected Trap from Deck on top of the Deck", () => {
    const state = withMainDeckSearchTargets(
      setOwnFaceDownMonster(
        stateWithPriority([A_CAT_OF_ILL_OMEN_ID, SAKURETSU_ARMOR_ID, MIRROR_FORCE_ID], []),
        A_CAT_OF_ILL_OMEN_ID,
      ),
    );
    const cat = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: cat.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(A_CAT_OF_ILL_OMEN_ID)).status).toBe("goatTemplate");
    expect(flipped.state.chain).toEqual([]);
    expect(flipped.prompts[0]).toMatchObject({ kind: "target", playerId: "P1" });
    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.mainDeck[0]).toMatchObject({ instanceId: "p1-sakuretsu-deck" });
    expect(resolved.state.players.P1.hand.some((card) => card.instanceId === "p1-sakuretsu-deck")).toBe(false);
  });

  it("supports A Cat of Ill Omen adding the selected Trap to hand while Necrovalley is active", () => {
    const state = withMainDeckSearchTargets(
      withFieldZone(
        setOwnFaceDownMonster(
          stateWithPriority([A_CAT_OF_ILL_OMEN_ID, SAKURETSU_ARMOR_ID, MIRROR_FORCE_ID], []),
          A_CAT_OF_ILL_OMEN_ID,
        ),
        NECROVALLEY_ID,
      ),
    );
    const cat = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: cat.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.hand.at(-1)).toMatchObject({ instanceId: "p1-sakuretsu-deck" });
    expect(resolved.state.players.P1.mainDeck.some((card) => card.instanceId === "p1-sakuretsu-deck")).toBe(false);
  });

  it("supports An Owl of Luck placing a selected Field Spell from Deck on top of the Deck", () => {
    const state = withMainDeckCards(
      setOwnFaceDownMonster(
        stateWithPriorityAllowUnsupported([AN_OWL_OF_LUCK_ID, NECROVALLEY_ID], []),
        AN_OWL_OF_LUCK_ID,
      ),
      [zoneCard("p1-necrovalley-deck", NECROVALLEY_ID, "P1", { position: null })],
    );
    const owl = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: owl.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(AN_OWL_OF_LUCK_ID)).status).toBe("goatTemplate");
    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.mainDeck[0]).toMatchObject({ instanceId: "p1-necrovalley-deck" });
    expect(resolved.state.players.P1.hand.some((card) => card.instanceId === "p1-necrovalley-deck")).toBe(false);
  });

  it("supports An Owl of Luck adding the selected Field Spell to hand while Necrovalley is active", () => {
    const state = withMainDeckCards(
      withFieldZone(
        setOwnFaceDownMonster(
          stateWithPriorityAllowUnsupported([AN_OWL_OF_LUCK_ID, NECROVALLEY_ID], []),
          AN_OWL_OF_LUCK_ID,
        ),
        NECROVALLEY_ID,
      ),
      [zoneCard("p1-necrovalley-deck", NECROVALLEY_ID, "P1", { position: null })],
    );
    const owl = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: owl.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.hand.at(-1)).toMatchObject({ instanceId: "p1-necrovalley-deck" });
    expect(resolved.state.players.P1.mainDeck.some((card) => card.instanceId === "p1-necrovalley-deck")).toBe(false);
  });

  it("rejects An Owl of Luck selecting a non-Field Spell from Deck", () => {
    const state = withMainDeckCards(
      setOwnFaceDownMonster(stateWithPriority([AN_OWL_OF_LUCK_ID, POT_OF_GREED_ID], []), AN_OWL_OF_LUCK_ID),
      [{ instanceId: "p1-pot-deck", cardId: POT_OF_GREED_ID, owner: "P1", controller: "P1" }],
    );
    const owl = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: owl.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(answered.errors[0]?.message).toBe("Target must be a Field Spell Card.");
    expect(answered.state.players.P1.mainDeck[0]).toMatchObject({ instanceId: "p1-pot-deck" });
  });

  it("supports 4-Starred Ladybug of Doom destroying opponent face-up Level 4 monsters on flip", () => {
    const state = withLadybugDoomBattlefield(stateWithPriority([FOUR_STARRED_LADYBUG_OF_DOOM_ID], [BATTLE_OX_ID, BLUE_EYES_ID]));
    const ladybug = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, {
      type: "flip-summon",
      playerId: "P1",
      instanceId: ladybug.instanceId,
    });
    const resolved = reduceDuel(flipped.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(FOUR_STARRED_LADYBUG_OF_DOOM_ID)).status).toBe("goatTemplate");
    expect(flipped.errors).toEqual([]);
    expect(flipped.state.chain[0]).toMatchObject({
      cardId: FOUR_STARRED_LADYBUG_OF_DOOM_ID,
      effectId: "flip",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[1]).toMatchObject({
      cardId: BLUE_EYES_ID,
    });
    expect(resolved.state.players.P2.monsterZones[2]).toMatchObject({
      cardId: BATTLE_OX_ID,
      face: "faceDown",
    });
    expect(resolved.state.players.P1.monsterZones[1]).toMatchObject({
      cardId: BATTLE_OX_ID,
      face: "faceUp",
    });
  });

  it("supports Dekoichi drawing when Flip Summoned", () => {
    const state = setOwnFaceDownMonster(stateWithPriority([DEKOICHI_ID], []), DEKOICHI_ID);
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const resolved = reduceDuel(flipped.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(DEKOICHI_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.events.some((event) => event.type === "card-drawn")).toBe(true);
  });

  it("supports Magician of Faith returning a Spell from Graveyard to hand", () => {
    const state = setOwnFaceDownMonster(
      stateWithPriority([MAGICIAN_OF_FAITH_ID, POT_OF_GREED_ID], []),
      MAGICIAN_OF_FAITH_ID,
    );
    const patched: DuelState = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          graveyard: [zoneCard("p1-pot-grave", POT_OF_GREED_ID, "P1", { position: null })],
        },
      },
    };
    const monster = patched.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(patched, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.hand.at(-1)).toMatchObject({ instanceId: "p1-pot-grave" });
  });

  it("supports Mask of Darkness returning a Trap from Graveyard to hand", () => {
    const state = setOwnFaceDownMonster(
      stateWithPriority([MASK_OF_DARKNESS_ID, SAKURETSU_ARMOR_ID], []),
      MASK_OF_DARKNESS_ID,
    );
    const patched: DuelState = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          graveyard: [zoneCard("p1-trap-grave", SAKURETSU_ARMOR_ID, "P1", { position: null })],
        },
      },
    };
    const monster = patched.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(patched, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(MASK_OF_DARKNESS_ID)).status).toBe("goatTemplate");
    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.hand.map((card) => card.instanceId)).toContain("p1-trap-grave");
  });

  it("supports Old Vindictive Magician destroying a selected monster", () => {
    const state = withOpponentMonster(
      setOwnFaceDownMonster(stateWithPriority([OLD_VINDICTIVE_MAGICIAN_ID], [BLUE_EYES_ID]), OLD_VINDICTIVE_MAGICIAN_ID),
      BLUE_EYES_ID,
    );
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
  });

  it.each([
    [MAN_EATER_BUG_ID, "Man-Eater Bug"],
    [OLD_VINDICTIVE_MAGICIAN_ID, "Old Vindictive Magician"],
  ])("supports %s %s destroying one selected monster on flip", (cardId) => {
    const state = withOpponentMonster(
      setOwnFaceDownMonster(stateWithPriority([cardId], [BLUE_EYES_ID]), cardId),
      BLUE_EYES_ID,
    );
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard.some((card) => card.instanceId === "p2-target")).toBe(true);
  });

  it("supports Nobleman-Eater Bug destroying exactly two selected monsters on flip", () => {
    const baseState = setOwnFaceDownMonster(
      stateWithPriority([NOBLEMAN_EATER_BUG_ID, BATTLE_OX_ID], [BLUE_EYES_ID]),
      NOBLEMAN_EATER_BUG_ID,
    );
    const state: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P1: {
          ...baseState.players.P1,
          monsterZones: [
            baseState.players.P1.monsterZones[0],
            zoneCard("p1-battle-ox", BATTLE_OX_ID, "P1"),
            null,
            null,
            null,
          ],
        },
        P2: {
          ...baseState.players.P2,
          monsterZones: [zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
        },
      },
    };
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [
        { playerId: "P1", zone: "monsterZone", index: 1 },
        { playerId: "P2", zone: "monsterZone", index: 0 },
      ],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(NOBLEMAN_EATER_BUG_ID)).status).toBe("goatTemplate");
    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
  });

  it("supports Exiled Force Tributing itself to destroy a selected monster", () => {
    const state = withOpponentMonster(
      withOwnFaceUpMonster(stateWithPriority([EXILED_FORCE_ID], [BLUE_EYES_ID]), EXILED_FORCE_ID),
      BLUE_EYES_ID,
    );
    const source = state.players.P1.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(activation.events.some((event) => event.type === "cost-paid" && event.costKind === "tribute")).toBe(true);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ instanceId: source.instanceId });
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
  });

  it("supports Cannon Soldier tributing 1 monster to deal 500 damage to the opponent", () => {
    const ANOTHER_MONSTER_ID = "05053103";
    const baseState = withOwnFaceUpMonster(stateWithPriority([CANNON_SOLDIER_ID, ANOTHER_MONSTER_ID], []), CANNON_SOLDIER_ID);
    const stateWithBoth: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P1: {
          ...baseState.players.P1,
          monsterZones: [
            baseState.players.P1.monsterZones[0],
            zoneCard("p1-tribute", ANOTHER_MONSTER_ID, "P1"),
            null,
            null,
            null,
          ],
        },
      },
    };
    const source = stateWithBoth.players.P1.monsterZones[0]!;
    const activation = reduceDuel(stateWithBoth, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      costInstanceIds: ["p1-tribute"],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(activation.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P2.lp).toBe(7500);
  });

  it("supports Amazoness Archer tributing two monsters, including itself, to deal 1200 damage to the opponent", () => {
    const ANOTHER_MONSTER_ID = "05053103";
    const baseState = withOwnFaceUpMonster(stateWithPriority([AMAZONESS_ARCHER_ID, ANOTHER_MONSTER_ID], []), AMAZONESS_ARCHER_ID);
    const stateWithBoth: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P1: {
          ...baseState.players.P1,
          monsterZones: [
            baseState.players.P1.monsterZones[0],
            zoneCard("p1-tribute", ANOTHER_MONSTER_ID, "P1"),
            null,
            null,
            null,
          ],
        },
      },
    };
    const source = stateWithBoth.players.P1.monsterZones[0]!;
    const activation = reduceDuel(stateWithBoth, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      costInstanceIds: [source.instanceId, "p1-tribute"],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(AMAZONESS_ARCHER_ID)).status).toBe("goatTemplate");
    expect(activation.errors).toEqual([]);
    expect(activation.events.some((event) => event.type === "cost-paid" && event.costKind === "tribute")).toBe(true);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P1.graveyard.map((card) => card.instanceId)).toEqual(["p1-tribute", source.instanceId]);
    expect(resolved.state.players.P2.lp).toBe(6800);
  });

  it("rejects Amazoness Archer when two tribute cost cards are not provided", () => {
    const state = withOwnFaceUpMonster(stateWithPriority([AMAZONESS_ARCHER_ID], []), AMAZONESS_ARCHER_ID);
    const source = state.players.P1.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      costInstanceIds: [source.instanceId],
    });

    expect(activation.errors[0]?.message).toBe("Cost requires exactly 2 card(s).");
    expect(activation.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: source.instanceId });
    expect(activation.state.players.P1.graveyard).toEqual([]);
  });

  it("supports Hane-Hane, Gravekeeper's Guard, and Gale Lizard returning a targeted monster to its owner's hand on flip", () => {
    for (const flipMonsterId of [HANE_HANE_ID, GRAVEKEEPERS_GUARD_ID, GALE_LIZARD_ID] as const) {
      const baseState = stateWithPriority([flipMonsterId], [BLUE_EYES_ID]);
      const stateWithBoth: DuelState = {
        ...baseState,
        players: {
          ...baseState.players,
          P1: {
            ...baseState.players.P1,
            monsterZones: [
              zoneCard("p1-flip", flipMonsterId, "P1", { face: "faceDown", position: "defense", visibility: "hidden" }),
              null,
              null,
              null,
              null,
            ],
          },
          P2: {
            ...baseState.players.P2,
            monsterZones: [
              zoneCard("p2-target", BLUE_EYES_ID, "P2", { face: "faceUp", position: "attack" }),
              null,
              null,
              null,
              null,
            ],
          },
        },
      };
      const flipUp = reduceDuel(stateWithBoth, {
        type: "change-position",
        playerId: "P1",
        instanceId: "p1-flip",
        position: "attack",
      });
      const prompts = flipUp.state.pendingPromptIds.map((id) => flipUp.state.prompts[id]);
      const targetPrompt = prompts.find((p) => p?.kind === "target");

      if (targetPrompt) {
        const answered = reduceDuel(flipUp.state, {
          type: "answer-prompt",
          playerId: "P1",
          promptId: targetPrompt.id,
          targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
        });
        const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

        expect(resolved.errors).toEqual([]);
        expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
        expect(resolved.state.players.P2.hand.some((card) => card.instanceId === "p2-target")).toBe(true);
      }
    }
  });

  it("supports Penguin Soldier returning up to two targeted monsters to their owners' hands on flip", () => {
    const baseState = setOwnFaceDownMonster(
      stateWithPriority([PENGUIN_SOLDIER_ID], [BLUE_EYES_ID, BATTLE_OX_ID]),
      PENGUIN_SOLDIER_ID,
    );
    const state: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P2: {
          ...baseState.players.P2,
          monsterZones: [
            zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"),
            zoneCard("p2-battle-ox", BATTLE_OX_ID, "P2"),
            null,
            null,
            null,
          ],
        },
      },
    };
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [
        { playerId: "P2", zone: "monsterZone", index: 0 },
        { playerId: "P2", zone: "monsterZone", index: 1 },
      ],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(PENGUIN_SOLDIER_ID)).status).toBe("goatTemplate");
    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P2.hand.some((card) => card.instanceId === "p2-blue-eyes")).toBe(true);
    expect(resolved.state.players.P2.hand.some((card) => card.instanceId === "p2-battle-ox")).toBe(true);
  });

  it("supports Hade-Hane returning up to three targeted monsters to their owners' hands on flip", () => {
    const baseState = setOwnFaceDownMonster(
      stateWithPriority([HADE_HANE_ID, BATTLE_OX_ID], [BLUE_EYES_ID, AQUA_MADOOR_ID]),
      HADE_HANE_ID,
    );
    const state: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P1: {
          ...baseState.players.P1,
          monsterZones: [
            baseState.players.P1.monsterZones[0],
            zoneCard("p1-battle-ox", BATTLE_OX_ID, "P1"),
            null,
            null,
            null,
          ],
        },
        P2: {
          ...baseState.players.P2,
          monsterZones: [
            zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"),
            zoneCard("p2-aqua-madoor", AQUA_MADOOR_ID, "P2"),
            null,
            null,
            null,
          ],
        },
      },
    };
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [
        { playerId: "P1", zone: "monsterZone", index: 1 },
        { playerId: "P2", zone: "monsterZone", index: 0 },
        { playerId: "P2", zone: "monsterZone", index: 1 },
      ],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(HADE_HANE_ID)).status).toBe("goatTemplate");
    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P1.hand.map((card) => card.instanceId)).toContain("p1-battle-ox");
    expect(resolved.state.players.P2.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      "p2-blue-eyes",
      "p2-aqua-madoor",
    ]));
  });

  it("supports Poison Mummy inflicting 500 damage on flip", () => {
    const state = setOwnFaceDownMonster(stateWithPriority([POISON_MUMMY_ID], []), POISON_MUMMY_ID);
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const resolved = reduceDuel(flipped.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(POISON_MUMMY_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(7500);
  });

  it("supports Princess of Tsurugi damaging by opponent Spell and Trap cards on the field", () => {
    const base = setOwnFaceDownMonster(stateWithPriority([PRINCESS_OF_TSURUGI_ID], []), PRINCESS_OF_TSURUGI_ID);
    const state = {
      ...base,
      players: {
        ...base.players,
        P2: {
          ...base.players.P2,
          spellTrapZones: [
            zoneCard("p2-princess-spell", POT_OF_GREED_ID, "P2", { position: null }),
            zoneCard("p2-princess-trap", MIRROR_FORCE_ID, "P2", { position: null }),
            null,
            null,
            null,
          ],
          fieldZone: zoneCard("p2-princess-field", NECROVALLEY_ID, "P2", { position: null }),
        },
      },
    };
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const resolved = reduceDuel(flipped.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(PRINCESS_OF_TSURUGI_ID)).status).toBe("goatTemplate");
    expect(flipped.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(6500);
  });

  it.each(STANDBY_LP_TRIGGER_CASES)("supports $name resolving during its controller's Standby Phase", (testCase) => {
    const state = withOwnMonsterInPosition(drawPhaseStateWithPriority([testCase.cardId], []), testCase.cardId, testCase.position);
    const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" });
    const resolved = reduceDuel(standby.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(testCase.cardId)).status).toBe("goatTemplate");
    expect(standby.errors).toEqual([]);
    expect(standby.state.chain).toHaveLength(1);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(testCase.expectedP1Lp);
    expect(resolved.state.players.P2.lp).toBe(testCase.expectedP2Lp);
  });

  it("does not trigger Dancing Fairy while it is face-up Attack Position", () => {
    const state = withOwnMonsterInPosition(drawPhaseStateWithPriority([DANCING_FAIRY_ID], []), DANCING_FAIRY_ID, "attack");
    const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" });

    expect(standby.errors).toEqual([]);
    expect(standby.state.chain).toHaveLength(0);
    expect(standby.state.players.P1.lp).toBe(8000);
  });

  it.each(BATTLE_PHASE_TRAP_LOCK_CASES)("supports $name preventing opponent Trap activations only during Battle Phase", (testCase) => {
    const main = reduceDuel(
      withOwnMonsterAndOpponentSetTrap(stateWithPriority([testCase.cardId], [JAR_OF_GREED_ID]), testCase.cardId, JAR_OF_GREED_ID),
      { type: "pass-priority", playerId: "P1" },
    ).state;
    const mainTrap = main.players.P2.spellTrapZones[0]!;
    const mainActivation = reduceDuel(main, {
      type: "activate-card",
      playerId: "P2",
      instanceId: mainTrap.instanceId,
    });
    const battle = reduceDuel(
      advanceToBattlePhase(withOwnMonsterAndOpponentSetTrap(
        stateWithPriority([testCase.cardId], [JAR_OF_GREED_ID]),
        testCase.cardId,
        JAR_OF_GREED_ID,
      )),
      { type: "pass-priority", playerId: "P1" },
    ).state;
    const battleTrap = battle.players.P2.spellTrapZones[0]!;
    const battleActivation = reduceDuel(battle, {
      type: "activate-card",
      playerId: "P2",
      instanceId: battleTrap.instanceId,
    });

    expect(getCardCoverage(cardById(testCase.cardId)).status).toBe("goatTemplate");
    expect(mainActivation.errors).toEqual([]);
    expect(battleActivation.errors[0]?.message).toBe("Your opponent cannot activate Trap Cards during the Battle Phase.");
    expect(battleActivation.state.chain).toHaveLength(0);
  });

  it("supports Greenkappa destroying exactly two targeted Set Spell or Trap cards on flip", () => {
    const baseState = setOwnFaceDownMonster(
      stateWithPriority([GREENKAPPA_ID, POT_OF_GREED_ID], [POT_OF_GREED_ID]),
      GREENKAPPA_ID,
    );
    const state: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P1: {
          ...baseState.players.P1,
          spellTrapZones: [
            zoneCard("p1-set-spell", POT_OF_GREED_ID, "P1", {
              face: "faceDown",
              position: null,
              visibility: "hidden",
            }),
            null,
            null,
            null,
            null,
          ],
        },
        P2: {
          ...baseState.players.P2,
          spellTrapZones: [
            zoneCard("p2-set-spell", POT_OF_GREED_ID, "P2", {
              face: "faceDown",
              position: null,
              visibility: "hidden",
            }),
            null,
            null,
            null,
            null,
          ],
        },
      },
    };
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [
        { playerId: "P1", zone: "spellTrapZone", index: 0 },
        { playerId: "P2", zone: "spellTrapZone", index: 0 },
      ],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(GREENKAPPA_ID)).status).toBe("goatTemplate");
    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === "p1-set-spell")).toBe(true);
    expect(resolved.state.players.P2.graveyard.some((card) => card.instanceId === "p2-set-spell")).toBe(true);
  });

  it("supports Armed Ninja destroying a targeted Spell card on flip", () => {
    const baseState = setOwnFaceDownMonster(
      stateWithPriority([ARMED_NINJA_ID, POT_OF_GREED_ID], []),
      ARMED_NINJA_ID,
    );
    const state: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P1: {
          ...baseState.players.P1,
          spellTrapZones: [
            zoneCard("p1-spell", POT_OF_GREED_ID, "P1", { position: null }),
            null,
            null,
            null,
            null,
          ],
        },
      },
    };
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "spellTrapZone", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(ARMED_NINJA_ID)).status).toBe("goatTemplate");
    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === "p1-spell")).toBe(true);
  });

  it.each([
    [CRIMSON_NINJA_ID, "Crimson Ninja"],
    [REAPER_OF_THE_CARDS_ID, "Reaper of the Cards"],
    [TRAP_MASTER_ID, "Trap Master"],
  ])("supports %s %s destroying a targeted Trap card on flip", (cardId) => {
    const baseState = setOwnFaceDownMonster(
      stateWithPriority([cardId, SAKURETSU_ARMOR_ID], []),
      cardId,
    );
    const state: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P1: {
          ...baseState.players.P1,
          spellTrapZones: [
            zoneCard("p1-trap", SAKURETSU_ARMOR_ID, "P1", { position: null }),
            null,
            null,
            null,
            null,
          ],
        },
      },
    };
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "spellTrapZone", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(cardId)).status).toBe("goatTemplate");
    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === "p1-trap")).toBe(true);
  });

  it("supports Tornado Bird returning exactly two Spell or Trap cards to their owners' hands on flip", () => {
    const baseState = setOwnFaceDownMonster(
      stateWithPriority([TORNADO_BIRD_ID, POT_OF_GREED_ID], [POT_OF_GREED_ID]),
      TORNADO_BIRD_ID,
    );
    const state: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P1: {
          ...baseState.players.P1,
          spellTrapZones: [
            zoneCard("p1-pot-field", POT_OF_GREED_ID, "P1", { position: null }),
            null,
            null,
            null,
            null,
          ],
        },
        P2: {
          ...baseState.players.P2,
          spellTrapZones: [
            zoneCard("p2-pot-field", POT_OF_GREED_ID, "P2", { position: null }),
            null,
            null,
            null,
            null,
          ],
        },
      },
    };
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [
        { playerId: "P1", zone: "spellTrapZone", index: 0 },
        { playerId: "P2", zone: "spellTrapZone", index: 0 },
      ],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(TORNADO_BIRD_ID)).status).toBe("goatTemplate");
    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P1.hand.map((card) => card.instanceId)).toContain("p1-pot-field");
    expect(resolved.state.players.P2.hand.map((card) => card.instanceId)).toContain("p2-pot-field");
  });

  it("supports Hysteric Fairy tributing two monsters to gain 1000 LP", () => {
    const baseState = withOwnFaceUpMonster(
      stateWithPriority([HYSTERIC_FAIRY_ID, BATTLE_OX_ID, AQUA_MADOOR_ID], []),
      HYSTERIC_FAIRY_ID,
    );
    const state: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P1: {
          ...baseState.players.P1,
          monsterZones: [
            baseState.players.P1.monsterZones[0],
            zoneCard("p1-tribute-a", BATTLE_OX_ID, "P1"),
            zoneCard("p1-tribute-b", AQUA_MADOOR_ID, "P1"),
            null,
            null,
          ],
        },
      },
    };
    const source = state.players.P1.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      costInstanceIds: ["p1-tribute-a", "p1-tribute-b"],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(HYSTERIC_FAIRY_ID)).status).toBe("goatTemplate");
    expect(activation.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(9000);
    expect(resolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P1.monsterZones[2]).toBeNull();
  });

  it.each([
    [DES_LACOODA_ID, "Des Lacooda"],
    [STEALTH_BIRD_ID, "Stealth Bird"],
    [GOLEM_SENTRY_ID, "Golem Sentry"],
    [GUARDIAN_STATUE_ID, "Guardian Statue"],
    [MEDUSA_WORM_ID, "Medusa Worm"],
    [MOAI_INTERCEPTOR_CANNONS_ID, "Moai Interceptor Cannons"],
    [SWARM_OF_LOCUSTS_ID, "Swarm of Locusts"],
    [SWARM_OF_SCARABS_ID, "Swarm of Scarabs"],
  ])("supports %s %s changing itself to face-down Defense Position once per turn", (cardId) => {
    const state = withOwnFaceUpMonster(stateWithPriority([cardId], []), cardId);
    const source = state.players.P1.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "set-self-face-down",
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(cardId)).status).toBe("goatCustom");
    expect(activation.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId,
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
  });

  it("supports The Immortal of Thunder gaining LP when Flip Summoned", () => {
    const state = setOwnFaceDownMonster(
      stateWithPriority([THE_IMMORTAL_OF_THUNDER_ID], []),
      THE_IMMORTAL_OF_THUNDER_ID,
    );
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const resolved = reduceDuel(flipped.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(THE_IMMORTAL_OF_THUNDER_ID)).status).toBe("goatCustom");
    expect(flipped.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(11000);
  });

  it("supports The Immortal of Thunder losing LP when sent from the field to the Graveyard", () => {
    const state = advanceToBattlePhase(withBattleAttackerAndDefender(
      stateWithPriority([BLUE_EYES_ID], [THE_IMMORTAL_OF_THUNDER_ID]),
      BLUE_EYES_ID,
      THE_IMMORTAL_OF_THUNDER_ID,
      { defenderPosition: "defense" },
    ));
    const battle = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });
    const resolved = reduceDuel(battle.state, { type: "resolve-chain", playerId: "P1" });

    expect(battle.errors).toEqual([]);
    expect(battle.state.players.P2.graveyard[0]).toMatchObject({
      cardId: THE_IMMORTAL_OF_THUNDER_ID,
      instanceId: "p2-defender",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(3000);
  });

  it("verifies custom monster source records and coverage statuses", () => {
    for (const expected of CUSTOM_MONSTER_CASES) {
      const card = cardById(expected.cardId);

      expect(cards.findIndex((candidate) => candidate.passcode === expected.cardId), expected.taskId).toBe(expected.sourceIndex);
      expect(card).toMatchObject({
        passcode: expected.cardId,
        id: expected.cardId,
        name: expected.name,
        category: "Monster",
        classifications: expected.classifications,
        monster: expected.stats,
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(card).status).toBe("goatCustom");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("verifies monster-only source records and coverage statuses", () => {
    for (const expected of MONSTER_ONLY_CARD_CASES) {
      const card = cardById(expected.cardId);

      expect(cards.findIndex((candidate) => candidate.passcode === expected.cardId), expected.taskId).toBe(expected.sourceIndex);
      expect(card).toMatchObject({
        passcode: expected.cardId,
        id: expected.cardId,
        name: expected.name,
        category: "Monster",
        classifications: ["Effect"],
        monster: expected.stats,
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(card).status).toBe("goatCustom");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("verifies count-scaled Flip monster source records and coverage statuses", () => {
    const card = cardById(PRINCESS_OF_TSURUGI_CASE.cardId);

    expect(cards.findIndex((candidate) => candidate.passcode === PRINCESS_OF_TSURUGI_CASE.cardId), PRINCESS_OF_TSURUGI_CASE.taskId)
      .toBe(PRINCESS_OF_TSURUGI_CASE.sourceIndex);
    expect(card).toMatchObject({
      passcode: PRINCESS_OF_TSURUGI_CASE.cardId,
      id: PRINCESS_OF_TSURUGI_CASE.cardId,
      name: PRINCESS_OF_TSURUGI_CASE.name,
      category: "Monster",
      classifications: ["Effect", "Flip"],
      monster: PRINCESS_OF_TSURUGI_CASE.stats,
      text: PRINCESS_OF_TSURUGI_CASE.text,
      legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
    });
    expect(getCardCoverage(card).status).toBe("goatTemplate");
    expect(isPlayableCard(PRINCESS_OF_TSURUGI_CASE.cardId, cards)).toBe(true);
  });

  it("verifies Standby Phase LP trigger monster source records and coverage statuses", () => {
    for (const expected of STANDBY_LP_TRIGGER_CASES) {
      const card = cardById(expected.cardId);

      expect(cards.findIndex((candidate) => candidate.passcode === expected.cardId), expected.taskId).toBe(expected.sourceIndex);
      expect(card).toMatchObject({
        passcode: expected.cardId,
        id: expected.cardId,
        name: expected.name,
        category: "Monster",
        classifications: ["Effect"],
        monster: expected.stats,
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(card).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("verifies Battle Phase Trap-lock monster source records and coverage statuses", () => {
    for (const expected of BATTLE_PHASE_TRAP_LOCK_CASES) {
      const card = cardById(expected.cardId);

      expect(cards.findIndex((candidate) => candidate.passcode === expected.cardId), expected.taskId).toBe(expected.sourceIndex);
      expect(card).toMatchObject({
        passcode: expected.cardId,
        id: expected.cardId,
        name: expected.name,
        category: "Monster",
        classifications: ["Effect"],
        monster: expected.stats,
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(card).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("verifies self-set return monster source records and coverage statuses", () => {
    for (const expected of SELF_SET_RETURN_CASES) {
      const card = cardById(expected.cardId);

      expect(cards.findIndex((candidate) => candidate.passcode === expected.cardId), expected.taskId).toBe(expected.sourceIndex);
      expect(card).toMatchObject({
        passcode: expected.cardId,
        id: expected.cardId,
        name: expected.name,
        category: "Monster",
        classifications: ["Effect"],
        monster: expected.stats,
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(card).status).toBe("goatCustom");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("verifies self-set destroy monster source records and coverage statuses", () => {
    for (const expected of SELF_SET_DESTROY_CASES) {
      const card = cardById(expected.cardId);

      expect(cards.findIndex((candidate) => candidate.passcode === expected.cardId), expected.taskId).toBe(expected.sourceIndex);
      expect(card).toMatchObject({
        passcode: expected.cardId,
        id: expected.cardId,
        name: expected.name,
        category: "Monster",
        classifications: ["Effect"],
        monster: expected.stats,
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(card).status).toBe("goatCustom");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("verifies flip control monster source records and coverage statuses", () => {
    for (const expected of FLIP_CONTROL_CASES) {
      const card = cardById(expected.cardId);

      expect(cards.findIndex((candidate) => candidate.passcode === expected.cardId), expected.taskId).toBe(expected.sourceIndex);
      expect(card).toMatchObject({
        passcode: expected.cardId,
        id: expected.cardId,
        name: expected.name,
        category: "Monster",
        classifications: ["Effect", "Flip"],
        monster: expected.stats,
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(card).status).toBe("goatCustom");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("verifies battle recruiter monster source records and coverage statuses", () => {
    for (const expected of BATTLE_RECRUITER_CASES) {
      const card = cardById(expected.cardId);

      expect(cards.findIndex((candidate) => candidate.passcode === expected.cardId), expected.taskId).toBe(expected.sourceIndex);
      expect(card).toMatchObject({
        passcode: expected.cardId,
        id: expected.cardId,
        name: expected.name,
        category: "Monster",
        classifications: ["Effect"],
        monster: expected.stats,
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(card).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("supports Des Lacooda drawing when Flip Summoned", () => {
    const state = setOwnFaceDownMonster(stateWithPriority([DES_LACOODA_ID], []), DES_LACOODA_ID);
    const monster = state.players.P1.monsterZones[0]!;
    const handBefore = state.players.P1.hand.length;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const resolved = reduceDuel(flipped.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.some((event) => event.type === "card-drawn")).toBe(true);
    expect(resolved.state.players.P1.hand).toHaveLength(handBefore + 1);
  });

  it("supports Stealth Bird inflicting 1000 damage when Flip Summoned", () => {
    const state = setOwnFaceDownMonster(stateWithPriority([STEALTH_BIRD_ID], []), STEALTH_BIRD_ID);
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const resolved = reduceDuel(flipped.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(7000);
  });

  it.each(SELF_SET_RETURN_CASES)("supports $name returning an opponent monster when Flip Summoned", (testCase) => {
    const state = withOpponentMonster(
      setOwnFaceDownMonster(stateWithPriority([testCase.cardId], [BLUE_EYES_ID]), testCase.cardId),
      BLUE_EYES_ID,
    );
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.hand.some((card) => card.instanceId === "p2-target")).toBe(true);
  });

  it.each(FLIP_CONTROL_CASES)("supports $name temporarily taking control of a matching opponent monster", (testCase) => {
    const state = withOpponentMonster(
      setOwnFaceDownMonster(stateWithPriority([testCase.cardId], [testCase.targetId]), testCase.cardId),
      testCase.targetId,
    );
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });
    const controlled = resolved.state.players.P1.monsterZones[1]!;
    const endPhase = advanceToEndPhase(resolved.state);

    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(controlled).toMatchObject({
      instanceId: "p2-target",
      owner: "P2",
      controller: "P1",
    });
    expect(resolved.state.controlChangeReturns).toEqual([
      expect.objectContaining({ instanceId: "p2-target", returnPlayerId: "P2", expiresAtPhase: "EP" }),
    ]);
    expect(endPhase.state.players.P2.monsterZones[0]).toMatchObject({
      instanceId: "p2-target",
      owner: "P2",
      controller: "P2",
    });
  });

  it.each(BATTLE_RECRUITER_CASES)("supports $name Special Summoning a matching monster from Deck after battle destruction", (testCase) => {
    const base = stateWithPriority([BLUE_EYES_ID], [testCase.cardId, testCase.targetId]);
    const state = withMainDeckCard(
      advanceToBattlePhase(withBattleAttackerAndDefender(base, BLUE_EYES_ID, testCase.cardId)),
      "P2",
      testCase.targetId,
    );
    const battle = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });
    const resolved = reduceDuel(battle.state, { type: "resolve-chain", playerId: "P1" });

    expect(battle.errors).toEqual([]);
    expect(battle.state.chain[0]).toMatchObject({ cardId: testCase.cardId, effectId: "battle-recruit" });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({
      cardId: testCase.targetId,
      face: "faceUp",
      position: "attack",
      visibility: "public",
    });
    expect(resolved.state.players.P2.graveyard.some((card) => card.instanceId === "p2-defender")).toBe(true);
  });

  it("supports Swarm of Locusts destroying a targeted opponent Spell or Trap when Flip Summoned", () => {
    const baseState = setOwnFaceDownMonster(
      stateWithPriority([SWARM_OF_LOCUSTS_ID], [POT_OF_GREED_ID]),
      SWARM_OF_LOCUSTS_ID,
    );
    const state: DuelState = {
      ...baseState,
      players: {
        ...baseState.players,
        P2: {
          ...baseState.players.P2,
          spellTrapZones: [
            zoneCard("p2-spell", POT_OF_GREED_ID, "P2", { position: null }),
            null,
            null,
            null,
            null,
          ],
        },
      },
    };
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard.some((card) => card.instanceId === "p2-spell")).toBe(true);
  });

  it.each(SELF_SET_DESTROY_CASES)("supports $name destroying a targeted opponent monster when Flip Summoned", (testCase) => {
    const state = withOpponentMonster(
      setOwnFaceDownMonster(stateWithPriority([testCase.cardId], [testCase.targetId]), testCase.cardId),
      testCase.targetId,
    );
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(answered.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard.some((card) => card.instanceId === "p2-target")).toBe(true);
  });

  it("supports Airknight Parshath piercing Defense Position monsters and drawing from its own battle damage", () => {
    const state = advanceToBattlePhase(withBattleAttackerAndDefender(
      stateWithPriority([AIRKNIGHT_PARSHATH_ID], [BATTLE_OX_ID]),
      AIRKNIGHT_PARSHATH_ID,
      BATTLE_OX_ID,
      { defenderPosition: "defense" },
    ));
    const startingHandSize = state.players.P1.hand.length;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });
    const battleDamage = result.events.find((event) => event.type === "battle-damage");
    const resolved = reduceDuel(result.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(AIRKNIGHT_PARSHATH_ID)).status).toBe("goatCustom");
    expect(result.errors).toEqual([]);
    expect(battleDamage).toMatchObject({
      playerId: "P2",
      amount: 900,
      sourceInstanceId: "p1-attacker",
    });
    expect(result.state.players.P2.lp).toBe(7100);
    expect(result.state.chain[0]).toMatchObject({
      cardId: AIRKNIGHT_PARSHATH_ID,
      effectId: "draw-on-battle-damage",
      sourceInstanceId: "p1-attacker",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.events.filter((event) => event.type === "card-drawn" && event.playerId === "P1")).toHaveLength(1);
    expect(resolved.state.players.P1.hand).toHaveLength(startingHandSize + 1);
  });

  it.each([
    [GIANT_RAT_ID, "Giant Rat", 7600],
    [MOTHER_GRIZZLY_ID, "Mother Grizzly", 7600],
    [BLUE_WINGED_CROWN_ID, "Blue-Winged Crown", 7400],
  ])("supports Enraged Battle Ox granting piercing to own %s %s", (attackerId, _name, expectedOpponentLp) => {
    const state = advanceToBattlePhase(withEnragedBattleOxSupport(
      stateWithPriority([ENRAGED_BATTLE_OX_ID, attackerId], [BATTLE_OX_ID]),
      attackerId,
    ));
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });

    expect(getCardCoverage(cardById(ENRAGED_BATTLE_OX_ID)).status).toBe("goatCustom");
    expect(result.errors).toEqual([]);
    expect(result.state.players.P2.lp).toBe(expectedOpponentLp);
  });

  it("keeps Enraged Battle Ox piercing bounded to Beast, Beast-Warrior, and Winged Beast monsters", () => {
    const state = advanceToBattlePhase(withEnragedBattleOxSupport(
      stateWithPriority([ENRAGED_BATTLE_OX_ID, BLUE_EYES_ID], [BATTLE_OX_ID]),
      BLUE_EYES_ID,
    ));
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });

    expect(result.errors).toEqual([]);
    expect(result.events.some((event) => event.type === "battle-damage")).toBe(false);
    expect(result.state.players.P2.lp).toBe(8000);
    expect(result.state.players.P2.graveyard.some((card) => card.instanceId === "p2-defender")).toBe(true);
  });

  it.each([
    [DARK_DRICERATOPS_ID, "Dark Driceratops", 2400, 6600],
    [GRAVEKEEPERS_SPEAR_SOLDIER_ID, "Gravekeeper's Spear Soldier", 1500, 7500],
    [MAD_SWORD_BEAST_ID, "Mad Sword Beast", 1400, 7600],
  ])("supports %s %s piercing Defense Position monsters", (cardId, _name, attackerAtk, expectedOpponentLp) => {
    const state = advanceToBattlePhase(withBattleAttackerAndDefender(
      stateWithPriority([cardId], [BATTLE_OX_ID]),
      cardId,
      BATTLE_OX_ID,
      { defenderPosition: "defense" },
    ));
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });
    const battleCompleted = result.events.find((event) => event.type === "battle-completed");

    expect(getCardCoverage(cardById(cardId)).status).toBe("goatTemplate");
    expect(result.errors).toEqual([]);
    expect(battleCompleted).toMatchObject({ attackerBattleAtk: attackerAtk });
    expect(result.state.players.P2.lp).toBe(expectedOpponentLp);
  });

  it("supports Spear Dragon piercing Defense Position monsters and changing to Defense Position after attacking", () => {
    const state = advanceToBattlePhase(withBattleAttackerAndDefender(
      stateWithPriority([SPEAR_DRAGON_ID], [BATTLE_OX_ID]),
      SPEAR_DRAGON_ID,
      BATTLE_OX_ID,
      { defenderPosition: "defense" },
    ));
    const battle = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });
    const resolved = reduceDuel(battle.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(SPEAR_DRAGON_ID)).status).toBe("goatCustom");
    expect(battle.errors).toEqual([]);
    expect(battle.events).toContainEqual(expect.objectContaining({
      type: "battle-damage",
      playerId: "P2",
      amount: 900,
    }));
    expect(battle.state.chain[0]).toMatchObject({
      cardId: SPEAR_DRAGON_ID,
      effectId: "change-to-defense-after-attacking",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: SPEAR_DRAGON_ID,
      face: "faceUp",
      position: "defense",
    });
  });

  it.each([
    [JINZO_7_ID, "Jinzo #7", 7500],
    [LEGHUL_ID, "Leghul", 7700],
    [MYSTIC_LAMP_ID, "Mystic Lamp", 7600],
    [NIGHTMARE_HORSE_ID, "Nightmare Horse", 7500],
    [OOGUCHI_ID, "Ooguchi", 7700],
    [QUEENS_DOUBLE_ID, "Queen's Double", 7650],
    [RAINBOW_FLOWER_ID, "Rainbow Flower", 7600],
    [SERVANT_OF_CATABOLISM_ID, "Servant of Catabolism", 7300],
  ])("supports %s %s attacking directly while the opponent controls a monster", (cardId, _name, expectedOpponentLp) => {
    const state = advanceToBattlePhase(withBattleAttackerAndDefender(
      stateWithPriority([cardId], [BATTLE_OX_ID]),
      cardId,
      BATTLE_OX_ID,
    ));
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });

    expect(getCardCoverage(cardById(cardId)).status).toBe("goatTemplate");
    expect(result.errors).toEqual([]);
    expect(result.state.players.P2.lp).toBe(expectedOpponentLp);
    expect(result.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: "p2-defender" });
  });

  it("keeps unsupported effect monsters blocked from playable decks", () => {
    const sangan = cardById(SANGAN_ID);
    const result = validateDeck(deckWithPriority([SANGAN_ID]), [...cards]);

    expect(getCardCoverage(sangan).status).toBe("goatUnsupported");
    expect(isPlayableCard(SANGAN_ID, cards)).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Sangan is not supported in playable decks.");
  });
});

function stateWithPriority(p1PriorityIds: readonly string[], p2PriorityIds: readonly string[]): DuelState {
  return advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(p1PriorityIds),
      P2: deckWithPriority(p2PriorityIds),
    },
    seed: "monster-card-tests",
    shuffleDecks: false,
  }).state);
}

function drawPhaseStateWithPriority(p1PriorityIds: readonly string[], p2PriorityIds: readonly string[]): DuelState {
  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(p1PriorityIds),
      P2: deckWithPriority(p2PriorityIds),
    },
    seed: "monster-card-standby-tests",
    shuffleDecks: false,
  }).state;
}

function stateWithPriorityAllowUnsupported(p1PriorityIds: readonly string[], p2PriorityIds: readonly string[]): DuelState {
  return advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(p1PriorityIds),
      P2: deckWithPriority(p2PriorityIds),
    },
    seed: "monster-card-unsupported-fixture-tests",
    shuffleDecks: false,
    allowUnsupportedCards: true,
  }).state);
}

function setOwnFaceDownMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-flip", cardId, "P1", { face: "faceDown", position: "defense", visibility: "hidden" }), null, null, null, null],
      },
    },
  };
}

function withOwnFaceUpMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-source", cardId, "P1"), null, null, null, null],
      },
    },
  };
}

function withOpponentMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        monsterZones: [zoneCard("p2-target", cardId, "P2"), null, null, null, null],
      },
    },
  };
}

function withAttributeAuraBattlefield(
  sourceId: string,
  boostedId: string,
  weakenedId: string,
  options: { readonly sourceFace?: ZoneCard["face"] } = {},
): DuelState {
  const sourceFace = options.sourceFace ?? "faceUp";
  const state = stateWithPriority([sourceId, boostedId], [weakenedId]);

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [
          zoneCard("p1-aura-source", sourceId, "P1", {
            face: sourceFace,
            position: sourceFace === "faceDown" ? "defense" : "attack",
            visibility: sourceFace === "faceDown" ? "hidden" : "public",
          }),
          zoneCard("p1-aura-boosted", boostedId, "P1"),
          null,
          null,
          null,
        ],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [zoneCard("p2-aura-weakened", weakenedId, "P2"), null, null, null, null],
      },
    },
  };
}

function withFusionDeckCard(state: DuelState, playerId: "P1" | "P2", cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        fusionDeck: [cardInstance(`${playerId.toLowerCase()}-fusion-target`, cardId, playerId)],
      },
    },
  };
}

function withOwnMonsterInPosition(state: DuelState, cardId: string, position: "attack" | "defense"): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-standby-monster", cardId, "P1", { position }), null, null, null, null],
      },
    },
  };
}

function withOwnMonsterAndOpponentSetTrap(state: DuelState, monsterId: string, trapId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-trap-lock-monster", monsterId, "P1"), null, null, null, null],
      },
      P2: {
        ...state.players.P2,
        spellTrapZones: [
          zoneCard("p2-trap-lock-trap", trapId, "P2", {
            face: "faceDown",
            position: null,
            visibility: "hidden",
            setTurn: 0,
          }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withOwnGraveyardMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: state.players.P1.hand.filter((card) => card.cardId !== cardId),
        graveyard: [zoneCard(`P1-${cardId}-graveyard`, cardId, "P1", { position: null })],
      },
    },
  };
}

function advanceToEndPhase(state: DuelState) {
  let current = state;
  const events = [];

  for (const phase of ["BP", "M2", "EP"] as const) {
    const result = reduceDuel(current, { type: "change-phase", playerId: "P1", phase });
    events.push(...result.events);
    current = result.state;
  }

  return { state: current, events };
}

function withBattleAttackerAndDefender(
  state: DuelState,
  attackerId: string,
  defenderId: string,
  options: { readonly defenderPosition?: ZoneCard["position"] } = {},
): DuelState {
  const defenderPosition = options.defenderPosition ?? "attack";

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-attacker", attackerId, "P1"), null, null, null, null],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [
          zoneCard("p2-defender", defenderId, "P2", {
            position: defenderPosition,
            face: "faceUp",
            visibility: "public",
          }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withEnragedBattleOxSupport(state: DuelState, attackerId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [
          zoneCard("p1-enraged-battle-ox", ENRAGED_BATTLE_OX_ID, "P1"),
          zoneCard("p1-attacker", attackerId, "P1"),
          null,
          null,
          null,
        ],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [
          zoneCard("p2-defender", BATTLE_OX_ID, "P2", {
            position: "defense",
            face: "faceUp",
            visibility: "public",
          }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withBattlefield(
  state: DuelState,
  options: { readonly defenderFace: ZoneCard["face"] },
): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-8-claws", EIGHT_CLAWS_SCORPION_ID, "P1"), null, null, null, null],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [
          zoneCard("p2-defender", AQUA_MADOOR_ID, "P2", {
            face: options.defenderFace,
            position: "defense",
            visibility: options.defenderFace === "faceDown" ? "hidden" : "public",
          }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withMainDeckSearchTargets(state: DuelState): DuelState {
  return withMainDeckCards(state, [
    { instanceId: "p1-sakuretsu-deck", cardId: SAKURETSU_ARMOR_ID, owner: "P1", controller: "P1" },
    state.players.P1.mainDeck[0],
    { instanceId: "p1-mirror-force-deck", cardId: MIRROR_FORCE_ID, owner: "P1", controller: "P1" },
    ...state.players.P1.mainDeck.slice(1),
  ]);
}

function withMainDeckCard(state: DuelState, playerId: "P1" | "P2", cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        mainDeck: [cardInstance(`${playerId.toLowerCase()}-${cardId}-deck-target`, cardId, playerId), ...state.players[playerId].mainDeck],
      },
    },
  };
}

function withMainDeckCards(state: DuelState, mainDeck: DuelState["players"]["P1"]["mainDeck"]): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        mainDeck,
      },
    },
  };
}

function cardInstance(instanceId: string, cardId: string, owner: "P1" | "P2"): CardInstance {
  return {
    instanceId,
    cardId,
    owner,
    controller: owner,
  };
}

function withFieldZone(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        fieldZone: zoneCard("p1-field", cardId, "P1", { position: null }),
      },
    },
  };
}

function withThreeHumpLacoodas(
  state: DuelState,
  options: { thirdFace?: ZoneCard["face"] } = {},
): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [
          zoneCard("p1-lacooda-1", THREE_HUMP_LACOODA_ID, "P1"),
          zoneCard("p1-lacooda-2", THREE_HUMP_LACOODA_ID, "P1"),
          zoneCard("p1-lacooda-3", THREE_HUMP_LACOODA_ID, "P1", {
            face: options.thirdFace ?? "faceUp",
            position: options.thirdFace === "faceDown" ? "defense" : "attack",
            visibility: options.thirdFace === "faceDown" ? "hidden" : "public",
          }),
          null,
          null,
        ],
      },
    },
  };
}

function withLadybugDoomBattlefield(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [
          zoneCard("p1-ladybug", FOUR_STARRED_LADYBUG_OF_DOOM_ID, "P1", {
            face: "faceDown",
            position: "defense",
            visibility: "hidden",
          }),
          zoneCard("p1-level4", BATTLE_OX_ID, "P1"),
          null,
          null,
          null,
        ],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [
          zoneCard("p2-level4", BATTLE_OX_ID, "P2"),
          zoneCard("p2-level8", BLUE_EYES_ID, "P2"),
          zoneCard("p2-facedown-level4", BATTLE_OX_ID, "P2", {
            face: "faceDown",
            position: "defense",
            visibility: "hidden",
          }),
          null,
          null,
        ],
      },
    },
  };
}

function advanceToM1(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
}

function advanceToBattlePhase(state: DuelState): DuelState {
  return reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "BP" }).state;
}

function deckWithPriority(priorityIds: readonly string[]) {
  const excluded = new Set(priorityIds);
  const filler = legalMainDeck(40 + excluded.size).filter((passcode) => !excluded.has(passcode));

  return {
    main: [...priorityIds, ...filler].slice(0, 40),
  };
}

function legalMainDeck(size: number): string[] {
  const passcodes = cards
    .filter(
      (card) =>
        card.legality.goat_world_pool &&
        card.legality.max_copies > 0 &&
        isPlayableCard(card.passcode, cards),
    )
    .map((card) => card.passcode);

  if (passcodes.length < size) {
    throw new Error(`Not enough legal fixture cards for ${size}-card deck.`);
  }

  return passcodes.slice(0, size);
}

function requireHandCard(state: DuelState, playerId: "P1" | "P2", cardId: string) {
  const card = state.players[playerId].hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in ${playerId} hand.`);
  }

  return card;
}

function zoneCard(
  instanceId: string,
  cardId: string,
  owner: "P1" | "P2",
  overrides: Partial<ZoneCard> = {},
): ZoneCard {
  return {
    instanceId,
    cardId,
    owner,
    controller: owner,
    face: "faceUp",
    position: "attack",
    visibility: "public",
    counters: {},
    attachments: [],
    summonedTurn: 0,
    positionChangedTurn: null,
    attackedTurn: null,
    setTurn: null,
    ...overrides,
  };
}

function monsterBaseStats(cardId: string): { readonly atk: number; readonly def: number } {
  const monster = cardById(cardId).monster;

  if (!monster) {
    throw new Error(`Expected monster stats for ${cardId}.`);
  }

  if (typeof monster.atk !== "number" || typeof monster.def !== "number") {
    throw new Error(`Expected numeric monster stats for ${cardId}.`);
  }

  return { atk: monster.atk, def: monster.def };
}

function cardById(cardId: string): CardRecord {
  const card = cards.find((candidate) => candidate.passcode === cardId);

  if (!card) {
    throw new Error(`Missing fixture cardId: ${cardId}`);
  }

  return card;
}
