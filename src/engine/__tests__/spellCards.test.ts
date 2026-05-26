import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import {
  A_DEAL_WITH_DARK_RULER_ID,
  A_FEATHER_OF_THE_PHOENIX_ID,
  A_WINGBEAT_OF_GIANT_DRAGON_ID,
  ACID_RAIN_ID,
  BACK_TO_SQUARE_ONE_ID,
  BALLISTA_OF_RAMPART_SMASHING_ID,
  BATTERY_CHARGER_ID,
  BEAST_FANGS_ID,
  BERSERK_DRAGON_ID,
  BLACK_PENDANT_ID,
  BLUE_MEDICINE_ID,
  BLOCK_ATTACK_ID,
  BOOK_OF_MOON_ID,
  BOOK_OF_TAIYOU_ID,
  BOOK_OF_SECRET_ARTS_ID,
  BRAIN_CONTROL_ID,
  BURNING_SPEAR_ID,
  BURST_STREAM_OF_DESTRUCTION_ID,
  CHAOS_END_ID,
  CHAOS_GREED_ID,
  CONTRACT_WITH_EXODIA_ID,
  CYCLON_LASER_ID,
  DARK_MAGICIAN_ID,
  DARK_MAGICIAN_GIRL_ID,
  DARK_MAGICIAN_KNIGHT_ID,
  DARK_MAGIC_ATTACK_ID,
  DARK_ENERGY_ID,
  DARKNESS_APPROACHES_ID,
  DEDICATION_THROUGH_LIGHT_AND_DARKNESS_ID,
  DE_SPELL_ID,
  DIAN_KETO_THE_CURE_MASTER_ID,
  DRAGON_TREASURE_ID,
  EARTHQUAKE_ID,
  ELECTRO_WHIP_ID,
  ELEGANT_EGOTIST_ID,
  ELFS_LIGHT_ID,
  EMBLEM_OF_DRAGON_DESTROYER_ID,
  EXODIA_NECROSS_ID,
  EXILE_OF_THE_WICKED_ID,
  FAIRY_METEOR_CRUSH_ID,
  FINAL_DESTINY_ID,
  FINAL_FLAME_ID,
  FOLLOW_WIND_ID,
  FOREST_ID,
  FUHMA_SHURIKEN_ID,
  FUSION_SAGE_ID,
  FUSION_WEAPON_ID,
  GAIA_POWER_ID,
  GATHER_YOUR_MIND_ID,
  MONSTER_REINCARNATION_ID,
  GOBLIN_THIEF_ID,
  GOBLINS_SECRET_REMEDY_ID,
  GEARFRIED_THE_IRON_KNIGHT_ID,
  GEARFRIED_THE_SWORDMASTER_ID,
  GRADIUS_ID,
  GUST_FAN_ID,
  HEAVY_STORM_ID,
  HINOTAMA_ID,
  INSECT_BARRIER_ID,
  INVIGORATION_ID,
  KNIGHTS_TITLE_ID,
  LASER_CANNON_ARMOR_ID,
  LEGENDARY_SWORD_ID,
  LIGHTNING_BLADE_ID,
  LIGHTNING_VORTEX_ID,
  LUMINOUS_SPARK_ID,
  MACHINE_CONVERSION_FACTORY_ID,
  METEOR_OF_DESTRUCTION_ID,
  MOLTEN_DESTRUCTION_ID,
  MOUNTAIN_ID,
  MYSTICAL_SPACE_TYPHOON_ID,
  MYSTICAL_MOON_ID,
  MYSTIC_PLASMA_ZONE_ID,
  OJAMA_DELTA_HURRICANE_ID,
  POWER_OF_KAISHIN_ID,
  POISON_OF_THE_OLD_MAN_ID,
  POLYMERIZATION_ID,
  OOKAZI_ID,
  OPTI_CAMOUFLAGE_ARMOR_ID,
  POT_OF_GREED_ID,
  RAIMEI_ID,
  RAIN_OF_MERCY_ID,
  RAISE_BODY_HEAT_ID,
  RED_MEDICINE_ID,
  REMOVE_TRAP_ID,
  REINFORCEMENT_OF_THE_ARMY_ID,
  RELEASE_RESTRAINT_ID,
  RESTRUCTER_REVOLUTION_ID,
  RISING_AIR_CURRENT_ID,
  RITUAL_WEAPON_ID,
  RUSH_RECKLESSLY_ID,
  SALAMANDRA_ID,
  SAGES_STONE_ID,
  SEVEN_COMPLETED_ID,
  SEVEN_ID,
  SHOOTING_STAR_BOW_CEAL_ID,
  SILVER_BOW_AND_ARROW_ID,
  SOGEN_ID,
  SOUL_OF_THE_PURE_ID,
  SPARKS_ID,
  SPIRITUALISM_ID,
  STEEL_SHELL_ID,
  STOP_DEFENSE_ID,
  SWORD_OF_DARK_DESTRUCTION_ID,
  TERRAFORMING_ID,
  THE_RELIABLE_GUARDIAN_ID,
  THE_WARRIOR_RETURNING_ALIVE_ID,
  THOUSAND_KNIVES_ID,
  TOON_TABLE_OF_CONTENTS_ID,
  TREMENDOUS_FIRE_ID,
  TRIBUTE_TO_THE_DOOMED_ID,
  UMI_ID,
  UMIIRUKA_ID,
  UPSTART_GOBLIN_ID,
  VILE_GERMS_ID,
  VIOLET_CRYSTAL_ID,
  WASTELAND_ID,
  YAMI_ID,
  YELLOW_LUSTER_SHIELD_ID,
} from "../cards/scripts/spells";
import { getCardCoverage, isPlayableCard } from "../cards/coverage";
import type { CardInstance, ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { deriveBattleStats } from "../effects/continuous";
import { createDuel, reduceDuel } from "../reducer";
import { validateDeck } from "../deckValidation";

const cards = cardsJson as CardRecord[];
const GRACEFUL_CHARITY_ID = "79571449";
const BLUE_EYES_ID = "89631139";
const LA_JINN_ID = "97590747";
const AXE_RAIDER_ID = "48305365";
const AITSU_ID = "48202661";
const AQUA_MADOOR_ID = "85639257";
const CYBER_FALCON_ID = "30655537";
const CYBER_SOLDIER_OF_DARKWORLD_ID = "75559356";
const ARCHFIEND_SOLDIER_ID = "49881766";
const BATTLE_FOOTBALLER_ID = "48094997";
const BATTLE_OX_ID = "05053103";
const MIRROR_FORCE_ID = "44095762";
const NECROVALLEY_ID = "47355498";
const BATTERYMAN_AA_ID = "63142001";
const BUSTER_BLADER_ID = "78193831";
const DARK_MAGICIAN_OF_CHAOS_ID = "40737112";
const MANGA_RYU_RAN_ID = "38369349";
const TOON_WORLD_ID = "15259703";
const CYBER_HARPIE_LADY_ID = "80316585";
const HARPIE_LADY_ID = "76812113";
const HARPIE_LADY_SISTERS_ID = "12206212";
const EXODIA_THE_FORBIDDEN_ONE_ID = "33396948";
const RIGHT_ARM_OF_THE_FORBIDDEN_ONE_ID = "70903634";
const LEFT_ARM_OF_THE_FORBIDDEN_ONE_ID = "07902349";
const RIGHT_LEG_OF_THE_FORBIDDEN_ONE_ID = "08124921";
const LEFT_LEG_OF_THE_FORBIDDEN_ONE_ID = "44519536";
const ANCIENT_BRAIN_ID = "42431843";
const ANCIENT_ELF_ID = "93221206";
const ANCIENT_ONE_OF_THE_DEEP_FOREST_ID = "14015067";
const ANSATSU_ID = "48365709";
const ARMORED_STARFISH_ID = "17535588";
const ARMORED_ZOMBIE_ID = "20277860";
const BABY_DRAGON_ID = "88819587";
const BASIC_INSECT_ID = "89091579";
const BEAN_SOLDIER_ID = "84990171";
const BLAZING_INPACHI_ID = "05464695";
const BLUE_WINGED_CROWN_ID = "41396436";
const CRAWLING_DRAGON_2_ID = "38289717";
const GIANT_SOLDIER_OF_STONE_ID = "13039848";
const LIGHTNING_CONGER_ID = "27671321";
const PETIT_MOTH_ID = "58192742";
const PETIT_ANGEL_ID = "38142739";
const CHARUBIN_THE_FIRE_KNIGHT_ID = "37421579";
const HUNGRY_BURGER_ID = "30243636";
const ARMED_NINJA_ID = "09076207";
const MAN_EATER_BUG_ID = "54652250";
const OJAMA_BLACK_ID = "79335209";
const OJAMA_GREEN_ID = "12482652";
const OJAMA_YELLOW_ID = "42941100";

const EQUIP_STAT_CASES = [
  {
    taskId: "C-0123",
    sourceIndex: 122,
    spellId: BEAST_FANGS_ID,
    name: "Beast Fangs",
    text: "A Beast-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: ANCIENT_ONE_OF_THE_DEEP_FOREST_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-0180",
    sourceIndex: 179,
    spellId: BOOK_OF_SECRET_ARTS_ID,
    name: "Book of Secret Arts",
    text: "A Spellcaster-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: ANCIENT_ELF_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-0195",
    sourceIndex: 194,
    spellId: BURNING_SPEAR_ID,
    name: "Burning Spear",
    text: "A FIRE monster equipped with this card increases its ATK by 400 and decreases its DEF by 200.",
    targetMonsterId: BLAZING_INPACHI_ID,
    atkDelta: 400,
    defDelta: -200,
  },
  {
    taskId: "C-1267",
    sourceIndex: 1266,
    spellId: SALAMANDRA_ID,
    name: "Salamandra",
    text: "Equip only to a FIRE monster; it gains 700 ATK.",
    targetMonsterId: BLAZING_INPACHI_ID,
    atkDelta: 700,
    defDelta: 0,
  },
  {
    taskId: "C-0323",
    sourceIndex: 322,
    spellId: DARK_ENERGY_ID,
    name: "Dark Energy",
    text: "A Fiend-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: ANCIENT_BRAIN_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-0426",
    sourceIndex: 425,
    spellId: DRAGON_TREASURE_ID,
    name: "Dragon Treasure",
    text: "A Dragon-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: BABY_DRAGON_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-0454",
    sourceIndex: 453,
    spellId: ELECTRO_WHIP_ID,
    name: "Electro-Whip",
    text: "A Thunder-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: LIGHTNING_CONGER_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-0472",
    sourceIndex: 471,
    spellId: ELFS_LIGHT_ID,
    name: "Elf's Light",
    text: "A LIGHT monster equipped with this card increases its ATK by 400 and decreases its DEF by 200.",
    targetMonsterId: ANCIENT_ELF_ID,
    atkDelta: 400,
    defDelta: -200,
  },
  {
    taskId: "C-0545",
    sourceIndex: 544,
    spellId: FOLLOW_WIND_ID,
    name: "Follow Wind",
    text: "A Winged Beast-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: BLUE_WINGED_CROWN_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-0568",
    sourceIndex: 567,
    spellId: FUSION_WEAPON_ID,
    name: "Fusion Weapon",
    text: "This card can only be equipped to a Fusion Monster of Level 6 or less. Increase the ATK and DEF of the equipped monster by 1500 points.",
    targetMonsterId: CHARUBIN_THE_FIRE_KNIGHT_ID,
    atkDelta: 1500,
    defDelta: 1500,
  },
  {
    taskId: "C-0680",
    sourceIndex: 679,
    spellId: GUST_FAN_ID,
    name: "Gust Fan",
    text: "A WIND monster equipped with this card increases its ATK by 400 and decreases its DEF by 200.",
    targetMonsterId: BABY_DRAGON_ID,
    atkDelta: 400,
    defDelta: -200,
  },
  {
    taskId: "C-0769",
    sourceIndex: 768,
    spellId: INVIGORATION_ID,
    name: "Invigoration",
    text: "An EARTH monster equipped with this card increases its ATK by 400 and decreases its DEF by 200.",
    targetMonsterId: BATTLE_OX_ID,
    atkDelta: 400,
    defDelta: -200,
  },
  {
    taskId: "C-0839",
    sourceIndex: 838,
    spellId: LASER_CANNON_ARMOR_ID,
    name: "Laser Cannon Armor",
    text: "An Insect-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: BASIC_INSECT_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-0851",
    sourceIndex: 850,
    spellId: LEGENDARY_SWORD_ID,
    name: "Legendary Sword",
    text: "A Warrior-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: ANSATSU_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-0885",
    sourceIndex: 884,
    spellId: MACHINE_CONVERSION_FACTORY_ID,
    name: "Machine Conversion Factory",
    text: "A Machine-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: CYBER_FALCON_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-1038",
    sourceIndex: 1037,
    spellId: MYSTICAL_MOON_ID,
    name: "Mystical Moon",
    text: "A Beast-Warrior-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: BATTLE_OX_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-1153",
    sourceIndex: 1152,
    spellId: POWER_OF_KAISHIN_ID,
    name: "Power of Kaishin",
    text: "A Aqua-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: ARMORED_STARFISH_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-1183",
    sourceIndex: 1182,
    spellId: RAISE_BODY_HEAT_ID,
    name: "Raise Body Heat",
    text: "A Dinosaur-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: CRAWLING_DRAGON_2_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-1229",
    sourceIndex: 1228,
    spellId: RITUAL_WEAPON_ID,
    name: "Ritual Weapon",
    text: "This card can only be equipped to a Ritual Monster of Level 6 or less. Increase the ATK and DEF of the equipped monster by 1500 points.",
    targetMonsterId: HUNGRY_BURGER_ID,
    atkDelta: 1500,
    defDelta: 1500,
  },
  {
    taskId: "C-1319",
    sourceIndex: 1318,
    spellId: SILVER_BOW_AND_ARROW_ID,
    name: "Silver Bow and Arrow",
    text: "A Fairy-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: AITSU_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-1420",
    sourceIndex: 1419,
    spellId: STEEL_SHELL_ID,
    name: "Steel Shell",
    text: "A WATER monster equipped with this card increases its ATK by 400 and decreases its DEF by 200.",
    targetMonsterId: AQUA_MADOOR_ID,
    atkDelta: 400,
    defDelta: -200,
  },
  {
    taskId: "C-1443",
    sourceIndex: 1442,
    spellId: SWORD_OF_DARK_DESTRUCTION_ID,
    name: "Sword of Dark Destruction",
    text: "A DARK monster equipped with this card increases its ATK by 400 points and decreases its DEF by 200 points.",
    targetMonsterId: ANCIENT_BRAIN_ID,
    atkDelta: 400,
    defDelta: -200,
  },
  {
    taskId: "C-1635",
    sourceIndex: 1634,
    spellId: VILE_GERMS_ID,
    name: "Vile Germs",
    text: "A Plant-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: BEAN_SOLDIER_ID,
    atkDelta: 300,
    defDelta: 300,
  },
  {
    taskId: "C-1637",
    sourceIndex: 1636,
    spellId: VIOLET_CRYSTAL_ID,
    name: "Violet Crystal",
    text: "A Zombie-Type monster equipped with this card increases its ATK and DEF by 300 points.",
    targetMonsterId: ARMORED_ZOMBIE_ID,
    atkDelta: 300,
    defDelta: 300,
  },
] as const;

const SPELL_TEMPLATE_CASES = [
  {
    taskId: "C-0186",
    sourceIndex: 185,
    spellId: BRAIN_CONTROL_ID,
    name: "Brain Control",
    classifications: ["Normal"],
    text: "Pay 800 Life Points. Select 1 face-up monster your opponent controls. Take control of it until the End Phase.",
  },
  {
    taskId: "C-0361",
    sourceIndex: 360,
    spellId: DARKNESS_APPROACHES_ID,
    name: "Darkness Approaches",
    classifications: ["Normal"],
    text: "Discard 2 cards from your hand. Select 1 face-up monster and flip it face-down, but do not change its battle position.",
  },
  {
    taskId: "C-0521",
    sourceIndex: 520,
    spellId: FINAL_DESTINY_ID,
    name: "Final Destiny",
    classifications: ["Normal"],
    text: "Discard 5 cards from your hand. Destroy all cards on the field.",
  },
  {
    taskId: "C-1696",
    sourceIndex: 1695,
    spellId: YELLOW_LUSTER_SHIELD_ID,
    name: "Yellow Luster Shield",
    classifications: ["Continuous"],
    text: "Increase the DEF of all monsters on your side of the field by 300 points.",
  },
] as const;

const FIELD_SPELL_CASES = [
  {
    taskId: "C-0548",
    sourceIndex: 547,
    spellId: FOREST_ID,
    name: "Forest",
    text: "All Insect, Beast, Plant, and Beast-Warrior monsters on the field gain 200 ATK/DEF.",
    targetMonsterId: BASIC_INSECT_ID,
    unaffectedMonsterId: BLUE_EYES_ID,
    atkDelta: 200,
    defDelta: 200,
  },
  {
    taskId: "C-0572",
    sourceIndex: 571,
    spellId: GAIA_POWER_ID,
    name: "Gaia Power",
    text: "Increase the ATK of all EARTH monsters by 500 points and decreases their DEF by 400 points.",
    targetMonsterId: BATTLE_OX_ID,
    unaffectedMonsterId: BLUE_EYES_ID,
    atkDelta: 500,
    defDelta: -400,
  },
  {
    taskId: "C-0880",
    sourceIndex: 879,
    spellId: LUMINOUS_SPARK_ID,
    name: "Luminous Spark",
    text: "Increase the ATK of all LIGHT monsters by 500 and decreases their DEF by 400 points.",
    targetMonsterId: BLUE_EYES_ID,
    unaffectedMonsterId: BATTLE_OX_ID,
    atkDelta: 500,
    defDelta: -400,
  },
  {
    taskId: "C-1001",
    sourceIndex: 1000,
    spellId: MOLTEN_DESTRUCTION_ID,
    name: "Molten Destruction",
    text: "Increase the ATK of all FIRE monsters by 500 and decreases their DEF by 400 points.",
    targetMonsterId: BLAZING_INPACHI_ID,
    unaffectedMonsterId: BLUE_EYES_ID,
    atkDelta: 500,
    defDelta: -400,
  },
  {
    taskId: "C-1014",
    sourceIndex: 1013,
    spellId: MOUNTAIN_ID,
    name: "Mountain",
    text: "Increases the ATK and DEF of all Dragon, Winged Beast, and Thunder-Type monsters by 200 points.",
    targetMonsterId: BLUE_EYES_ID,
    unaffectedMonsterId: BATTLE_OX_ID,
    atkDelta: 200,
    defDelta: 200,
  },
  {
    taskId: "C-1030",
    sourceIndex: 1029,
    spellId: MYSTIC_PLASMA_ZONE_ID,
    name: "Mystic Plasma Zone",
    text: "Increase the ATK of all DARK monsters by 500 points and decrease their DEF by 400 points.",
    targetMonsterId: ARCHFIEND_SOLDIER_ID,
    unaffectedMonsterId: BLUE_EYES_ID,
    atkDelta: 500,
    defDelta: -400,
  },
  {
    taskId: "C-1347",
    sourceIndex: 1346,
    spellId: SOGEN_ID,
    name: "Sogen",
    text: "Increases the ATK and DEF of all Beast-Warrior and Warrior-Type monsters by 200 points.",
    targetMonsterId: BATTLE_OX_ID,
    unaffectedMonsterId: BLUE_EYES_ID,
    atkDelta: 200,
    defDelta: 200,
  },
  {
    taskId: "C-1617",
    sourceIndex: 1616,
    spellId: UMI_ID,
    name: "Umi",
    text: "Increase the ATK and DEF of all Fish, Sea Serpent, Thunder, and Aqua-Type monsters by 200 points. Also decrease the ATK and DEF of all Machine and Pyro-Type monsters by 200 points.",
    targetMonsterId: LIGHTNING_CONGER_ID,
    unaffectedMonsterId: BLUE_EYES_ID,
    atkDelta: 200,
    defDelta: 200,
  },
  {
    taskId: "C-1618",
    sourceIndex: 1617,
    spellId: UMIIRUKA_ID,
    name: "Umiiruka",
    text: "Increase the ATK of all WATER monsters by 500 and decreases their DEF by 400 points.",
    targetMonsterId: AQUA_MADOOR_ID,
    unaffectedMonsterId: BATTLE_OX_ID,
    atkDelta: 500,
    defDelta: -400,
  },
  {
    taskId: "C-1227",
    sourceIndex: 1226,
    spellId: RISING_AIR_CURRENT_ID,
    name: "Rising Air Current",
    text: "Increase the ATK of all WIND monsters by 500 and decreases their DEF by 400 points.",
    targetMonsterId: BABY_DRAGON_ID,
    unaffectedMonsterId: BATTLE_OX_ID,
    atkDelta: 500,
    defDelta: -400,
  },
  {
    taskId: "C-1646",
    sourceIndex: 1645,
    spellId: WASTELAND_ID,
    name: "Wasteland",
    text: "Increases the ATK and DEF of all Dinosaur, Zombie, and Rock-Type monsters by 200 points.",
    targetMonsterId: GIANT_SOLDIER_OF_STONE_ID,
    unaffectedMonsterId: BLUE_EYES_ID,
    atkDelta: 200,
    defDelta: 200,
  },
  {
    taskId: "C-1693",
    sourceIndex: 1692,
    spellId: YAMI_ID,
    name: "Yami",
    text: "Increases the ATK and DEF of all Fiend and Spellcaster-Type monsters by 200 points. Also decreases the ATK and DEF of all Fairy-Type monsters by 200 points.",
    targetMonsterId: ARCHFIEND_SOLDIER_ID,
    unaffectedMonsterId: BATTLE_OX_ID,
    atkDelta: 200,
    defDelta: 200,
  },
] as const;

const FIELD_SPELL_PENALTY_CASES = [
  {
    spellId: UMI_ID,
    name: "Umi",
    targetMonsterId: CYBER_FALCON_ID,
    atkDelta: -200,
    defDelta: -200,
  },
  {
    spellId: YAMI_ID,
    name: "Yami",
    targetMonsterId: PETIT_ANGEL_ID,
    atkDelta: -200,
    defDelta: -200,
  },
] as const;

const QUICK_PLAY_TEMP_STAT_CASES = [
  {
    taskId: "C-1255",
    sourceIndex: 1254,
    spellId: RUSH_RECKLESSLY_ID,
    name: "Rush Recklessly",
    text: "Target face-up monster gains 700 ATK until the End Phase.",
    stat: "atk",
    amount: 700,
  },
  {
    taskId: "C-1508",
    sourceIndex: 1507,
    spellId: THE_RELIABLE_GUARDIAN_ID,
    name: "The Reliable Guardian",
    text: "Increase 1 face-up monster's DEF by 700 points until the end of this turn.",
    stat: "def",
    amount: 700,
  },
] as const;

const NORMAL_SPELL_COUNT_BURN_CASES = [
  {
    taskId: "C-1214",
    sourceIndex: 1213,
    spellId: RESTRUCTER_REVOLUTION_ID,
    name: "Restructer Revolution",
    text: "Inflict 200 points of damage to your opponent's Life Points for each card in your opponent's hand.",
    amountPer: 200,
  },
] as const;

const EQUIP_INTERACTION_CASES = [
  {
    taskId: "C-0151",
    sourceIndex: 150,
    spellId: BLACK_PENDANT_ID,
    name: "Black Pendant",
    text: "The equipped monster gains 500 ATK. When this card is sent from the field to the GY, inflict 500 damage to your opponent.",
  },
  {
    taskId: "C-0106",
    sourceIndex: 105,
    spellId: BALLISTA_OF_RAMPART_SMASHING_ID,
    name: "Ballista of Rampart Smashing",
    text: "If the equipped monster attacks a face-down Defense Position monster, it gains 1500 ATK during damage calculation only.",
  },
  {
    taskId: "C-0295",
    sourceIndex: 294,
    spellId: CYCLON_LASER_ID,
    name: "Cyclon Laser",
    text: "You can only equip this card to \"Gradius\". Increase the ATK of \"Gradius\" by 300 points. When the equipped \"Gradius\" attacks with an ATK that is higher than the DEF of a Defense Position monster, inflict the difference as Battle Damage to your opponent's Life Points.",
  },
  {
    taskId: "C-0500",
    sourceIndex: 499,
    spellId: FAIRY_METEOR_CRUSH_ID,
    name: "Fairy Meteor Crush",
    text: "When a monster equipped with this card attacks with an ATK that is higher than the DEF of a Defense Position monster, inflict the difference as Battle Damage to your opponent's Life Points.",
  },
  {
    taskId: "C-0560",
    sourceIndex: 559,
    spellId: FUHMA_SHURIKEN_ID,
    name: "Fuhma Shuriken",
    text: "You can only equip this card to a monster that includes \"Ninja\" in its card name. Increase the ATK of the equipped monster by 700 points. When this card is sent from the field to the GY, inflict 700 points of damage to your opponent's Life Points.",
  },
  {
    taskId: "C-1314",
    sourceIndex: 1313,
    spellId: SHOOTING_STAR_BOW_CEAL_ID,
    name: "Shooting Star Bow - Ceal",
    text: "Decrease the ATK of a monster equipped with this card by 1000 points. A monster equipped with this card can attack your opponent's Life Points directly.",
  },
  {
    taskId: "C-0866",
    sourceIndex: 865,
    spellId: LIGHTNING_BLADE_ID,
    name: "Lightning Blade",
    text: "You can only equip this card to a Warrior-Type monster. Increase the ATK of the equipped monster by 800 points and decrease the ATK of all WATER monsters on the field by 500 points.",
  },
  {
    taskId: "C-1099",
    sourceIndex: 1098,
    spellId: OPTI_CAMOUFLAGE_ARMOR_ID,
    name: "Opti-Camouflage Armor",
    text: "You can only equip this card to a Level 1 monster. A monster equipped with this card can attack your opponent's Life Points directly.",
  },
] as const;

describe("supported Spell card scripts", () => {
  it("keeps the low-risk Spell shard aligned with canonical source records", () => {
    const expectedRecords = [
      {
        sourceIndex: 166,
        cardId: BLOCK_ATTACK_ID,
        name: "Block Attack",
        classifications: ["Normal"],
        text: "Select 1 face-up Attack Position monster on your opponent's side of the field and change it to Defense Position.",
        coverage: "goatCustom",
      },
      {
        sourceIndex: 260,
        cardId: CONTRACT_WITH_EXODIA_ID,
        name: "Contract with Exodia",
        classifications: ["Normal"],
        text: "You can only activate this card when you have \"Exodia the Forbidden One\", \"Right Arm of the Forbidden One\", \"Left Arm of the Forbidden One\", \"Right Leg of the Forbidden One\", and \"Left Leg of the Forbidden One\" in your GY. Special Summon 1 \"Exodia Necross\" from your hand.",
        coverage: "goatCustom",
      },
      {
        sourceIndex: 114,
        cardId: BATTERY_CHARGER_ID,
        name: "Battery Charger",
        classifications: ["Normal"],
        text: "Pay 500 Life Points. Special Summon 1 monster from your GY that includes \"Batteryman\" in its card name.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 196,
        cardId: BURST_STREAM_OF_DESTRUCTION_ID,
        name: "Burst Stream of Destruction",
        classifications: ["Normal"],
        text: "If you control a face-up \"Blue-Eyes White Dragon\": Destroy all monsters your opponent controls. \"Blue-Eyes White Dragons\" cannot attack the turn you activate this card.",
        coverage: "goatCustom",
      },
      {
        sourceIndex: 229,
        cardId: CHAOS_END_ID,
        name: "Chaos End",
        classifications: ["Normal"],
        text: "You can only activate this card if 7 or more of your cards are currently removed from play. Destroy all Monster Cards on the field.",
        coverage: "goatCustom",
      },
      {
        sourceIndex: 363,
        cardId: DE_SPELL_ID,
        name: "De-Spell",
        classifications: ["Normal"],
        text: "Select 1 Spell Card on the field and destroy it. If the selected card is Set, pick up and see the card. If it is a Spell Card, it is destroyed. If it is a Trap Card, return it to its original position.",
        coverage: "goatCustom",
      },
      {
        sourceIndex: 367,
        cardId: DEDICATION_THROUGH_LIGHT_AND_DARKNESS_ID,
        name: "Dedication through Light and Darkness",
        classifications: ["Quick-Play"],
        text: "You can only activate this card by Tributing 1 \"Dark Magician\" on your side of the field. Select 1 \"Dark Magician of Chaos\" from your hand, your GY or your Deck and Special Summon it.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 454,
        cardId: ELEGANT_EGOTIST_ID,
        name: "Elegant Egotist",
        classifications: ["Normal"],
        text: "If \"Harpie Lady\" is on the field: Special Summon 1 \"Harpie Lady\" or \"Harpie Lady Sisters\" from your hand or Deck.",
        coverage: "goatCustom",
      },
      {
        sourceIndex: 472,
        cardId: EMBLEM_OF_DRAGON_DESTROYER_ID,
        name: "Emblem of Dragon Destroyer",
        classifications: ["Normal"],
        text: "Add 1 \"Buster Blader\" from your Deck or your GY to your hand.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 565,
        cardId: FUSION_SAGE_ID,
        name: "Fusion Sage",
        classifications: ["Normal"],
        text: "Add 1 \"Polymerization\" card from your Deck to your hand. Then shuffle your Deck.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 582,
        cardId: GATHER_YOUR_MIND_ID,
        name: "Gather Your Mind",
        classifications: ["Normal"],
        text: "Add 1 \"Gather Your Mind\" card from your Deck to your hand. Your Deck is then shuffled. You can only use 1 \"Gather Your Mind\" per turn.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 867,
        cardId: LIGHTNING_VORTEX_ID,
        name: "Lightning Vortex",
        classifications: ["Normal"],
        text: "Discard 1 card. Destroy all face-up monsters your opponent controls.",
        coverage: "goatTemplate",
        restriction: "Limited",
        maxCopies: 1,
      },
      {
        sourceIndex: 1007,
        cardId: MONSTER_REINCARNATION_ID,
        name: "Monster Reincarnation",
        classifications: ["Normal"],
        text: "Discard 1 card to select 1 Monster Card in your GY, and add it to your hand.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 1086,
        cardId: OJAMA_DELTA_HURRICANE_ID,
        name: "Ojama Delta Hurricane!!",
        classifications: ["Normal"],
        text: "You can only activate this card while \"Ojama Green\", \"Ojama Yellow\" and \"Ojama Black\" are face-up on your side of the field. Destroy all cards on your opponent's side of the field.",
        coverage: "goatCustom",
      },
      {
        sourceIndex: 1203,
        cardId: REINFORCEMENT_OF_THE_ARMY_ID,
        name: "Reinforcement of the Army",
        classifications: ["Normal"],
        text: "Add 1 Level 4 or lower Warrior-Type monster from your Deck to your hand.",
        coverage: "goatTemplate",
        restriction: "Semi-Limited",
        maxCopies: 2,
      },
      {
        sourceIndex: 1558,
        cardId: TOON_TABLE_OF_CONTENTS_ID,
        name: "Toon Table of Contents",
        classifications: ["Normal"],
        text: "Add 1 \"Toon\" card or \"Manga Ryu-Ran\" from your Deck to your hand.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 1559,
        cardId: TOON_WORLD_ID,
        name: "Toon World",
        classifications: ["Continuous"],
        text: "Activate this card by paying 1000 LP.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 1147,
        cardId: POISON_OF_THE_OLD_MAN_ID,
        name: "Poison of the Old Man",
        classifications: ["Quick-Play"],
        text: "Activate 1 of these effects: Gain 1200 Life Points. Inflict 800 damage to your opponent.",
        coverage: "goatCustom",
      },
      {
        sourceIndex: 1205,
        cardId: RELEASE_RESTRAINT_ID,
        name: "Release Restraint",
        classifications: ["Normal"],
        text: "Tribute 1 \"Gearfried the Iron Knight\"; Special Summon 1 \"Gearfried the Swordmaster\" from your hand or Deck.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 1263,
        cardId: SAGES_STONE_ID,
        name: "Sage's Stone",
        classifications: ["Normal"],
        text: "Activate only if you control a face-up \"Dark Magician Girl\". Special Summon 1 \"Dark Magician\" from your hand or Deck.",
        coverage: "goatCustom",
      },
      {
        sourceIndex: 1408,
        cardId: SPIRITUALISM_ID,
        name: "Spiritualism",
        classifications: ["Normal"],
        text: "Return 1 Spell or Trap Card on your opponent's side of the field to his/her hand. This card's activation and effect cannot be negated by any other card.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 1423,
        cardId: STOP_DEFENSE_ID,
        name: "Stop Defense",
        classifications: ["Normal"],
        text: "Select 1 of your opponent's monsters and switch it to Attack Position. If the card is face-down, flip it face-up. If the card has a flip effect, it is activated immediately.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 1459,
        cardId: TERRAFORMING_ID,
        name: "Terraforming",
        classifications: ["Normal"],
        text: "Add 1 Field Spell Card from your Deck to your hand.",
        coverage: "goatTemplate",
      },
      {
        sourceIndex: 814,
        cardId: KNIGHTS_TITLE_ID,
        name: "Knight's Title",
        classifications: ["Normal"],
        text: "Activate this card by offering 1 face-up \"Dark Magician\" on your side of the field as a Tribute. Special Summon 1 \"Dark Magician Knight\" from your hand, Deck or GY.",
        coverage: "goatTemplate",
      },
    ] as const;

    for (const expected of expectedRecords) {
      const card = cards[expected.sourceIndex];

      expect(card).toMatchObject({
        id: expected.cardId,
        passcode: expected.cardId,
        name: expected.name,
        category: "Spell",
        classifications: expected.classifications,
        text: expected.text,
        legality: {
          goat_world_pool: true,
          restriction: "restriction" in expected ? expected.restriction : "Unlimited",
          max_copies: "maxCopies" in expected ? expected.maxCopies : 3,
        },
      });
      expect(cardById(expected.cardId)).toBe(card);
      expect(getCardCoverage(card).status).toBe(expected.coverage);
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("verifies Field Spell stat modifier batch source records and coverage statuses", () => {
    for (const expected of FIELD_SPELL_CASES) {
      const spell = cardById(expected.spellId);

      expect(cards.findIndex((card) => card.passcode === expected.spellId), expected.taskId).toBe(expected.sourceIndex);
      expect(spell).toMatchObject({
        passcode: expected.spellId,
        id: expected.spellId,
        name: expected.name,
        category: "Spell",
        classifications: ["Field"],
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(spell).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.spellId, cards)).toBe(true);
    }
  });

  it("supports Field Spells activating into the Field Zone and replacing the active Field Spell", () => {
    const state = withFieldCards(stateWithPriority([GAIA_POWER_ID]), {
      P2: {
        fieldZone: zoneCard("p2-forest", FOREST_ID, "P2", { position: null }),
      },
    });
    const resolved = activateAndResolve(state, GAIA_POWER_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.fieldZone).toMatchObject({ cardId: GAIA_POWER_ID, face: "faceUp", position: null });
    expect(resolved.state.players.P1.spellTrapZones.every((card) => card?.cardId !== GAIA_POWER_ID)).toBe(true);
    expect(resolved.state.players.P2.fieldZone).toBeNull();
    expect(resolved.state.players.P2.graveyard.some((card) => card.cardId === FOREST_ID)).toBe(true);
  });

  it.each(FIELD_SPELL_CASES)("supports $name applying its field-wide stat modifier", (testCase) => {
    const state = withFieldCards(stateWithPriority([
      testCase.spellId,
      testCase.targetMonsterId,
      testCase.unaffectedMonsterId,
    ]), {
      P1: {
        monsterZones: [zoneCard("p1-field-target", testCase.targetMonsterId, "P1"), null, null, null, null],
      },
      P2: {
        monsterZones: [zoneCard("p2-unaffected", testCase.unaffectedMonsterId, "P2"), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, testCase.spellId);
    const target = resolved.state.players.P1.monsterZones[0]!;
    const unaffected = resolved.state.players.P2.monsterZones[0]!;
    const targetBase = monsterBaseStats(testCase.targetMonsterId);
    const unaffectedBase = monsterBaseStats(testCase.unaffectedMonsterId);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.fieldZone).toMatchObject({ cardId: testCase.spellId });
    expect(deriveBattleStats(resolved.state, { playerId: "P1", card: target, base: targetBase })).toEqual({
      atk: targetBase.atk + testCase.atkDelta,
      def: Math.max(0, targetBase.def + testCase.defDelta),
    });
    expect(deriveBattleStats(resolved.state, { playerId: "P2", card: unaffected, base: unaffectedBase })).toEqual(unaffectedBase);
  });

  it.each(FIELD_SPELL_PENALTY_CASES)("supports $name applying its stat penalty branch", (testCase) => {
    const state = withFieldCards(stateWithPriority([testCase.spellId, testCase.targetMonsterId]), {
      P1: {
        monsterZones: [zoneCard("p1-penalty-target", testCase.targetMonsterId, "P1"), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, testCase.spellId);
    const target = resolved.state.players.P1.monsterZones[0]!;
    const baseStats = monsterBaseStats(testCase.targetMonsterId);

    expect(resolved.errors).toEqual([]);
    expect(deriveBattleStats(resolved.state, { playerId: "P1", card: target, base: baseStats })).toEqual({
      atk: Math.max(0, baseStats.atk + testCase.atkDelta),
      def: Math.max(0, baseStats.def + testCase.defDelta),
    });
  });

  it("verifies Quick-Play temporary stat modifier source records and coverage statuses", () => {
    for (const expected of QUICK_PLAY_TEMP_STAT_CASES) {
      const spell = cardById(expected.spellId);

      expect(cards.findIndex((card) => card.passcode === expected.spellId), expected.taskId).toBe(expected.sourceIndex);
      expect(spell).toMatchObject({
        passcode: expected.spellId,
        id: expected.spellId,
        name: expected.name,
        category: "Spell",
        classifications: ["Quick-Play"],
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(spell).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.spellId, cards)).toBe(true);
    }
  });

  it.each(QUICK_PLAY_TEMP_STAT_CASES)("supports $name applying an until-End-Phase stat modifier", (testCase) => {
    const state = withFieldCards(stateWithPriority([testCase.spellId, BATTLE_OX_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-temp-stat-target", BATTLE_OX_ID, "P1"), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, testCase.spellId, {
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const target = resolved.state.players.P1.monsterZones[0]!;
    const baseStats = monsterBaseStats(BATTLE_OX_ID);
    const modified = deriveBattleStats(resolved.state, { playerId: "P1", card: target, base: baseStats });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ cardId: testCase.spellId });
    expect(modified).toEqual({
      atk: baseStats.atk + (testCase.stat === "atk" ? testCase.amount : 0),
      def: baseStats.def + (testCase.stat === "def" ? testCase.amount : 0),
    });
  });

  it("verifies Normal Spell count-scaled burn source records and coverage statuses", () => {
    for (const expected of NORMAL_SPELL_COUNT_BURN_CASES) {
      const spell = cardById(expected.spellId);

      expect(cards.findIndex((card) => card.passcode === expected.spellId), expected.taskId).toBe(expected.sourceIndex);
      expect(spell).toMatchObject({
        passcode: expected.spellId,
        id: expected.spellId,
        name: expected.name,
        category: "Spell",
        classifications: ["Normal"],
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(spell).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.spellId, cards)).toBe(true);
    }
  });

  it.each(NORMAL_SPELL_COUNT_BURN_CASES)("supports $name damaging by the opponent hand count", (testCase) => {
    const state = stateWithPriority([testCase.spellId]);
    const opponentHandSize = state.players.P2.hand.length;
    const resolved = activateAndResolve(state, testCase.spellId);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(8000 - opponentHandSize * testCase.amountPer);
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ cardId: testCase.spellId });
  });

  it("supports 7 staying face-up until the third copy draws three and destroys all controlled face-up copies", () => {
    const state = withFieldCards(stateWithPriority([SEVEN_ID]), {
      P1: {
        spellTrapZones: [
          zoneCard("p1-seven-a", SEVEN_ID, "P1", { position: null }),
          zoneCard("p1-seven-b", SEVEN_ID, "P1", { position: null }),
          null,
          null,
          null,
        ],
      },
      P2: {
        spellTrapZones: [
          zoneCard("p2-seven", SEVEN_ID, "P2", { position: null }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const handBefore = state.players.P1.hand.length;
    const resolved = activateAndResolve(state, SEVEN_ID);
    const lpResolved = reduceDuel(resolved.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(SEVEN_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(3);
    expect(resolved.state.players.P1.hand).toHaveLength(handBefore - 1 + 3);
    expect(resolved.state.players.P1.spellTrapZones.every((card) => card?.cardId !== SEVEN_ID)).toBe(true);
    expect(resolved.state.players.P2.spellTrapZones[0]).toMatchObject({ cardId: SEVEN_ID });
    expect(resolved.state.players.P1.graveyard.filter((card) => card.cardId === SEVEN_ID)).toHaveLength(3);
    expect(resolved.state.chain).toHaveLength(3);
    expect(resolved.state.chain.every((link) => link.effectId === "field-to-graveyard-gain-lp")).toBe(true);
    expect(lpResolved.errors).toEqual([]);
    expect(lpResolved.state.players.P1.lp).toBe(10100);
  });

  it("supports 7 gaining 700 LP when sent directly from field to Graveyard by another effect", () => {
    const state = withFieldCards(stateWithPriority([HEAVY_STORM_ID]), {
      P1: {
        spellTrapZones: [zoneCard("p1-seven", SEVEN_ID, "P1", { position: null }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, HEAVY_STORM_ID);
    const lpResolved = reduceDuel(resolved.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === SEVEN_ID)).toBe(true);
    expect(resolved.state.chain).toHaveLength(1);
    expect(resolved.state.chain[0]).toMatchObject({
      cardId: SEVEN_ID,
      effectId: "field-to-graveyard-gain-lp",
    });
    expect(lpResolved.errors).toEqual([]);
    expect(lpResolved.state.players.P1.lp).toBe(8700);
  });

  it("supports 7 Completed equipping to a Machine monster and choosing ATK or DEF", () => {
    const targetRef: ZoneRef = { playerId: "P1", zone: "monsterZone", index: 0 };
    const atkState = withFieldCards(stateWithPriority([SEVEN_COMPLETED_ID, CYBER_FALCON_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-machine-atk", CYBER_FALCON_ID, "P1"), null, null, null, null],
      },
    });
    const atkResolved = activateAndResolve(atkState, SEVEN_COMPLETED_ID, {
      effectId: "equip-atk",
      targetRefs: [targetRef],
    });
    const atkTarget = atkResolved.state.players.P1.monsterZones[0]!;
    const atkSource = atkResolved.state.players.P1.spellTrapZones[0]!;
    const baseStats = monsterBaseStats(CYBER_FALCON_ID);

    expect(getCardCoverage(cardById(SEVEN_COMPLETED_ID)).status).toBe("goatCustom");
    expect(atkResolved.errors).toEqual([]);
    expect(atkSource).toMatchObject({ cardId: SEVEN_COMPLETED_ID, effectMarkers: ["equip-atk"] });
    expect(atkTarget.attachments).toContain(atkSource.instanceId);
    expect(deriveBattleStats(atkResolved.state, { playerId: "P1", card: atkTarget, base: baseStats })).toEqual({
      atk: baseStats.atk + 700,
      def: baseStats.def,
    });

    const defState = withFieldCards(stateWithPriority([SEVEN_COMPLETED_ID, CYBER_FALCON_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-machine-def", CYBER_FALCON_ID, "P1"), null, null, null, null],
      },
    });
    const defResolved = activateAndResolve(defState, SEVEN_COMPLETED_ID, {
      effectId: "equip-def",
      targetRefs: [targetRef],
    });
    const defTarget = defResolved.state.players.P1.monsterZones[0]!;

    expect(defResolved.errors).toEqual([]);
    expect(deriveBattleStats(defResolved.state, { playerId: "P1", card: defTarget, base: baseStats })).toEqual({
      atk: baseStats.atk,
      def: baseStats.def + 700,
    });
  });

  it("rejects 7 Completed targeting a non-Machine monster", () => {
    const state = withFieldCards(stateWithPriority([SEVEN_COMPLETED_ID, LA_JINN_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-non-machine", LA_JINN_ID, "P1"), null, null, null, null],
      },
    });
    const source = requireHandCard(state, "P1", SEVEN_COMPLETED_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "equip-atk",
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });

    expect(result.errors[0]?.message).toBe("Target must be a Machine monster.");
  });

  it("verifies simple Equip Spell stat batch source records and coverage statuses", () => {
    for (const expected of EQUIP_STAT_CASES) {
      const spell = cardById(expected.spellId);

      expect(cards.findIndex((card) => card.passcode === expected.spellId), expected.taskId).toBe(expected.sourceIndex);
      expect(spell).toMatchObject({
        passcode: expected.spellId,
        id: expected.spellId,
        name: expected.name,
        category: "Spell",
        classifications: ["Equip"],
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(spell).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.spellId, cards)).toBe(true);
    }
  });

  it.each(EQUIP_STAT_CASES)("supports $name equipping to the matching monster and modifying stats", (testCase) => {
    const targetRef: ZoneRef = { playerId: "P1", zone: "monsterZone", index: 0 };
    const baseState = testCase.spellId === FUSION_WEAPON_ID
      ? stateWithPriorityAndExtra([testCase.spellId], [testCase.targetMonsterId])
      : stateWithPriority([testCase.spellId, testCase.targetMonsterId]);
    const state = withFieldCards(baseState, {
      P1: {
        monsterZones: [zoneCard("p1-equip-target", testCase.targetMonsterId, "P1"), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, testCase.spellId, { targetRefs: [targetRef] });
    const source = resolved.state.players.P1.spellTrapZones[0]!;
    const target = resolved.state.players.P1.monsterZones[0]!;
    const baseStats = monsterBaseStats(testCase.targetMonsterId);

    expect(resolved.errors).toEqual([]);
    expect(source).toMatchObject({ cardId: testCase.spellId, effectMarkers: ["equip"] });
    expect(target.attachments).toContain(source.instanceId);
    expect(deriveBattleStats(resolved.state, { playerId: "P1", card: target, base: baseStats })).toEqual({
      atk: baseStats.atk + testCase.atkDelta,
      def: Math.max(0, baseStats.def + testCase.defDelta),
    });
  });

  it.each(EQUIP_STAT_CASES)("rejects $name targeting the wrong monster family", (testCase) => {
    const wrongMonsterId = testCase.targetMonsterId === BABY_DRAGON_ID
      ? ANCIENT_ELF_ID
      : testCase.targetMonsterId === ANCIENT_ELF_ID
        ? BATTLE_OX_ID
        : BLUE_EYES_ID;
    const state = withFieldCards(stateWithPriority([testCase.spellId, wrongMonsterId]), {
      P1: {
        monsterZones: [zoneCard("p1-wrong-target", wrongMonsterId, "P1"), null, null, null, null],
      },
    });
    const source = requireHandCard(state, "P1", testCase.spellId);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });

    expect(result.errors[0]?.message).toMatch(/^Target must be a .+ monster\.$|^Target card identity does not match target requirements\.$/);
    expect(result.state.chain).toHaveLength(0);
  });

  it("verifies Equip Spell interaction source records and coverage statuses", () => {
    for (const expected of EQUIP_INTERACTION_CASES) {
      const spell = cardById(expected.spellId);

      expect(cards.findIndex((card) => card.passcode === expected.spellId), expected.taskId).toBe(expected.sourceIndex);
      expect(spell).toMatchObject({
        passcode: expected.spellId,
        id: expected.spellId,
        name: expected.name,
        category: "Spell",
        classifications: ["Equip"],
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(spell).status).toBe("goatCustom");
      expect(isPlayableCard(expected.spellId, cards)).toBe(true);
    }
  });

  it("supports Black Pendant granting ATK and burning the opponent when sent from field to Graveyard", () => {
    const targetRef: ZoneRef = { playerId: "P1", zone: "monsterZone", index: 0 };
    const state = withFieldCards(stateWithPriority([BLACK_PENDANT_ID, BATTLE_OX_ID, HEAVY_STORM_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-black-pendant-target", BATTLE_OX_ID, "P1"), null, null, null, null],
      },
    });
    const equipped = activateAndResolve(state, BLACK_PENDANT_ID, { targetRefs: [targetRef] });
    const target = equipped.state.players.P1.monsterZones[0]!;
    const source = equipped.state.players.P1.spellTrapZones[0]!;
    const destroyed = activateAndResolve(equipped.state, HEAVY_STORM_ID);
    const burned = reduceDuel(destroyed.state, { type: "resolve-chain", playerId: "P1" });
    const baseStats = monsterBaseStats(BATTLE_OX_ID);

    expect(equipped.errors).toEqual([]);
    expect(source).toMatchObject({ cardId: BLACK_PENDANT_ID, effectMarkers: ["equip"] });
    expect(target.attachments).toContain(source.instanceId);
    expect(deriveBattleStats(equipped.state, { playerId: "P1", card: target, base: baseStats }).atk).toBe(baseStats.atk + 500);
    expect(destroyed.state.chain[0]).toMatchObject({
      cardId: BLACK_PENDANT_ID,
      effectId: "field-to-graveyard-burn",
    });
    expect(burned.errors).toEqual([]);
    expect(burned.state.players.P2.lp).toBe(7500);
  });

  it("supports Fuhma Shuriken equipping only to Ninja monsters and burning the opponent when sent to Graveyard", () => {
    const targetRef: ZoneRef = { playerId: "P1", zone: "monsterZone", index: 0 };
    const state = withFieldCards(stateWithPriority([FUHMA_SHURIKEN_ID, ARMED_NINJA_ID, BATTLE_OX_ID, HEAVY_STORM_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-fuhma-target", ARMED_NINJA_ID, "P1"), null, null, null, null],
      },
    });
    const equipped = activateAndResolve(state, FUHMA_SHURIKEN_ID, { targetRefs: [targetRef] });
    const target = equipped.state.players.P1.monsterZones[0]!;
    const source = equipped.state.players.P1.spellTrapZones[0]!;
    const destroyed = activateAndResolve(equipped.state, HEAVY_STORM_ID);
    const burned = reduceDuel(destroyed.state, { type: "resolve-chain", playerId: "P1" });
    const baseStats = monsterBaseStats(ARMED_NINJA_ID);

    expect(equipped.errors).toEqual([]);
    expect(source).toMatchObject({ cardId: FUHMA_SHURIKEN_ID, effectMarkers: ["equip"] });
    expect(target.attachments).toContain(source.instanceId);
    expect(deriveBattleStats(equipped.state, { playerId: "P1", card: target, base: baseStats }).atk).toBe(baseStats.atk + 700);
    expect(destroyed.state.chain[0]).toMatchObject({
      cardId: FUHMA_SHURIKEN_ID,
      effectId: "field-to-graveyard-burn",
    });
    expect(burned.errors).toEqual([]);
    expect(burned.state.players.P2.lp).toBe(7300);
  });

  it("rejects Fuhma Shuriken targeting a non-Ninja monster", () => {
    const state = withFieldCards(stateWithPriority([FUHMA_SHURIKEN_ID, BATTLE_OX_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-fuhma-wrong-target", BATTLE_OX_ID, "P1"), null, null, null, null],
      },
    });
    const source = requireHandCard(state, "P1", FUHMA_SHURIKEN_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });

    expect(result.errors[0]?.message).toBe("Target card identity does not match target requirements.");
    expect(result.state.chain).toHaveLength(0);
  });

  it("supports Fairy Meteor Crush granting piercing battle damage to the equipped monster", () => {
    const state = withFieldCards(stateWithPriority([FAIRY_METEOR_CRUSH_ID, BLUE_EYES_ID, AQUA_MADOOR_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-fairy-attacker", BLUE_EYES_ID, "P1"), null, null, null, null],
      },
      P2: {
        monsterZones: [
          zoneCard("p2-fairy-defender", AQUA_MADOOR_ID, "P2", { position: "defense" }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const equipped = activateAndResolve(state, FAIRY_METEOR_CRUSH_ID, {
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const battleState = advanceToBattlePhase(equipped.state);
    const battle = reduceDuel(battleState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-fairy-attacker",
      defenderInstanceId: "p2-fairy-defender",
    });

    expect(equipped.errors).toEqual([]);
    expect(battle.errors).toEqual([]);
    expect(battle.events).toContainEqual(expect.objectContaining({
      type: "battle-damage",
      playerId: "P2",
      amount: 1000,
      sourceInstanceId: "p1-fairy-attacker",
    }));
    expect(battle.state.players.P2.lp).toBe(7000);
  });

  it("supports Ballista of Rampart Smashing giving the equipped attacker 1500 ATK only against face-down Defense Position monsters", () => {
    const state = withFieldCards(stateWithPriority([BALLISTA_OF_RAMPART_SMASHING_ID, BATTLE_OX_ID, AQUA_MADOOR_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-ballista-attacker", BATTLE_OX_ID, "P1"), null, null, null, null],
      },
      P2: {
        monsterZones: [
          zoneCard("p2-ballista-defender", AQUA_MADOOR_ID, "P2", { face: "faceDown", position: "defense" }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const equipped = activateAndResolve(state, BALLISTA_OF_RAMPART_SMASHING_ID, {
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const attacker = equipped.state.players.P1.monsterZones[0]!;
    const battleState = advanceToBattlePhase(equipped.state);
    const battle = reduceDuel(battleState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-ballista-attacker",
      defenderInstanceId: "p2-ballista-defender",
    });

    expect(equipped.errors).toEqual([]);
    expect(deriveBattleStats(equipped.state, {
      playerId: "P1",
      card: attacker,
      base: monsterBaseStats(BATTLE_OX_ID),
    }).atk).toBe(1700);
    expect(battle.errors).toEqual([]);
    expect(battle.events).toContainEqual(expect.objectContaining({
      type: "monster-flipped-face-up",
      cardId: AQUA_MADOOR_ID,
    }));
    expect(battle.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: "p1-ballista-attacker" });
    expect(battle.state.players.P2.monsterZones[0]).toBeNull();
    expect(battle.state.players.P2.lp).toBe(8000);
  });

  it("supports Cyclon Laser equipping only to Gradius, granting 300 ATK and piercing damage", () => {
    const state = withFieldCards(stateWithPriority([CYCLON_LASER_ID, GRADIUS_ID, BATTLE_OX_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-gradius", GRADIUS_ID, "P1"), null, null, null, null],
      },
      P2: {
        monsterZones: [
          zoneCard("p2-cyclon-defender", BATTLE_OX_ID, "P2", { position: "defense" }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const equipped = activateAndResolve(state, CYCLON_LASER_ID, {
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const gradius = equipped.state.players.P1.monsterZones[0]!;
    const battleState = advanceToBattlePhase(equipped.state);
    const battle = reduceDuel(battleState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-gradius",
      defenderInstanceId: "p2-cyclon-defender",
    });

    expect(equipped.errors).toEqual([]);
    expect(deriveBattleStats(equipped.state, {
      playerId: "P1",
      card: gradius,
      base: monsterBaseStats(GRADIUS_ID),
    }).atk).toBe(1500);
    expect(battle.errors).toEqual([]);
    expect(battle.events).toContainEqual(expect.objectContaining({
      type: "battle-damage",
      playerId: "P2",
      amount: 500,
      sourceInstanceId: "p1-gradius",
    }));
    expect(battle.state.players.P2.lp).toBe(7500);

    const invalidState = withFieldCards(stateWithPriority([CYCLON_LASER_ID, BATTLE_OX_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-not-gradius", BATTLE_OX_ID, "P1"), null, null, null, null],
      },
    });
    const source = requireHandCard(invalidState, "P1", CYCLON_LASER_ID);
    const invalid = reduceDuel(invalidState, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });

    expect(invalid.errors[0]?.message).toBe("Target card identity does not match target requirements.");
  });

  it("supports Shooting Star Bow - Ceal reducing ATK and allowing a direct attack through monsters", () => {
    const state = withFieldCards(stateWithPriority([SHOOTING_STAR_BOW_CEAL_ID, BLUE_EYES_ID, BATTLE_OX_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-ceal-attacker", BLUE_EYES_ID, "P1"), null, null, null, null],
      },
      P2: {
        monsterZones: [zoneCard("p2-ceal-bystander", BATTLE_OX_ID, "P2"), null, null, null, null],
      },
    });
    const equipped = activateAndResolve(state, SHOOTING_STAR_BOW_CEAL_ID, {
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const attacker = equipped.state.players.P1.monsterZones[0]!;
    const battleState = advanceToBattlePhase(equipped.state);
    const directAttack = reduceDuel(battleState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-ceal-attacker",
    });

    expect(equipped.errors).toEqual([]);
    expect(deriveBattleStats(equipped.state, {
      playerId: "P1",
      card: attacker,
      base: monsterBaseStats(BLUE_EYES_ID),
    }).atk).toBe(2000);
    expect(directAttack.errors).toEqual([]);
    expect(directAttack.state.players.P2.lp).toBe(6000);
    expect(directAttack.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: "p2-ceal-bystander" });
  });

  it("supports Lightning Blade boosting the equipped Warrior while reducing all face-up WATER monsters", () => {
    const state = withFieldCards(stateWithPriority([LIGHTNING_BLADE_ID, AXE_RAIDER_ID, AQUA_MADOOR_ID, BATTLE_OX_ID]), {
      P1: {
        monsterZones: [
          zoneCard("p1-warrior", AXE_RAIDER_ID, "P1"),
          zoneCard("p1-water", AQUA_MADOOR_ID, "P1"),
          null,
          null,
          null,
        ],
      },
      P2: {
        monsterZones: [zoneCard("p2-earth", BATTLE_OX_ID, "P2"), null, null, null, null],
      },
    });
    const equipped = activateAndResolve(state, LIGHTNING_BLADE_ID, {
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const warrior = equipped.state.players.P1.monsterZones[0]!;
    const water = equipped.state.players.P1.monsterZones[1]!;
    const earth = equipped.state.players.P2.monsterZones[0]!;

    expect(equipped.errors).toEqual([]);
    expect(deriveBattleStats(equipped.state, {
      playerId: "P1",
      card: warrior,
      base: monsterBaseStats(AXE_RAIDER_ID),
    }).atk).toBe(2500);
    expect(deriveBattleStats(equipped.state, {
      playerId: "P1",
      card: water,
      base: monsterBaseStats(AQUA_MADOOR_ID),
    }).atk).toBe(700);
    expect(deriveBattleStats(equipped.state, {
      playerId: "P2",
      card: earth,
      base: monsterBaseStats(BATTLE_OX_ID),
    }).atk).toBe(1700);
  });

  it("supports Opti-Camouflage Armor equipping only to Level 1 monsters and granting direct attacks", () => {
    const state = withFieldCards(stateWithPriority([OPTI_CAMOUFLAGE_ARMOR_ID, PETIT_MOTH_ID, BATTLE_OX_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-petit-moth", PETIT_MOTH_ID, "P1"), null, null, null, null],
      },
      P2: {
        monsterZones: [zoneCard("p2-opti-bystander", BATTLE_OX_ID, "P2"), null, null, null, null],
      },
    });
    const equipped = activateAndResolve(state, OPTI_CAMOUFLAGE_ARMOR_ID, {
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const directAttack = reduceDuel(advanceToBattlePhase(equipped.state), {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-petit-moth",
    });

    expect(equipped.errors).toEqual([]);
    expect(directAttack.errors).toEqual([]);
    expect(directAttack.state.players.P2.lp).toBe(7700);
    expect(directAttack.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: "p2-opti-bystander" });

    const invalidState = withFieldCards(stateWithPriority([OPTI_CAMOUFLAGE_ARMOR_ID, BASIC_INSECT_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-level-two", BASIC_INSECT_ID, "P1"), null, null, null, null],
      },
    });
    const source = requireHandCard(invalidState, "P1", OPTI_CAMOUFLAGE_ARMOR_ID);
    const invalid = reduceDuel(invalidState, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });

    expect(invalid.errors[0]?.message).toBe("Target must be Level 1 or lower.");
  });

  it("supports Pot of Greed drawing two cards", () => {
    const state = stateWithPriority([POT_OF_GREED_ID]);
    const beforeDeckSize = state.players.P1.mainDeck.length;
    const resolved = activateAndResolve(state, POT_OF_GREED_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(2);
    expect(resolved.state.players.P1.mainDeck).toHaveLength(beforeDeckSize - 2);
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ cardId: POT_OF_GREED_ID });
  });

  it("supports Chaos Greed drawing two cards when four cards are banished and the Graveyard is empty", () => {
    const state = withBanishedCards(
      stateWithPriority([CHAOS_GREED_ID, BLUE_EYES_ID, LA_JINN_ID, AXE_RAIDER_ID, ARCHFIEND_SOLDIER_ID]),
      [
        zoneCard("p1-banished-blue-eyes", BLUE_EYES_ID, "P1"),
        zoneCard("p1-banished-la-jinn", LA_JINN_ID, "P1"),
        zoneCard("p1-banished-axe", AXE_RAIDER_ID, "P1"),
        zoneCard("p1-banished-archfiend", ARCHFIEND_SOLDIER_ID, "P1"),
      ],
    );
    const handBefore = state.players.P1.hand.length;
    const deckBefore = state.players.P1.mainDeck.length;
    const resolved = activateAndResolve(state, CHAOS_GREED_ID);

    expect(getCardCoverage(cardById(CHAOS_GREED_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(2);
    expect(resolved.state.players.P1.hand).toHaveLength(handBefore - 1 + 2);
    expect(resolved.state.players.P1.mainDeck).toHaveLength(deckBefore - 2);
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === CHAOS_GREED_ID)).toBe(true);
  });

  it("rejects Chaos Greed unless its banished and empty-Graveyard condition is met", () => {
    const state = stateWithPriority([CHAOS_GREED_ID]);
    const source = requireHandCard(state, "P1", CHAOS_GREED_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports Heavy Storm destroying all Spell and Trap cards on the field", () => {
    const state = withFieldCards(stateWithPriority([HEAVY_STORM_ID]), {
      P1: {
        spellTrapZones: [zoneCard("p1-set", LA_JINN_ID, "P1", { position: null }), null, null, null, null],
        fieldZone: zoneCard("p1-field", AXE_RAIDER_ID, "P1", { position: null }),
      },
      P2: {
        spellTrapZones: [zoneCard("p2-set", BLUE_EYES_ID, "P2", { position: null }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, HEAVY_STORM_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.spellTrapZones.every((card) => card === null)).toBe(true);
    expect(resolved.state.players.P2.spellTrapZones.every((card) => card === null)).toBe(true);
    expect(resolved.state.players.P1.fieldZone).toBeNull();
    expect(resolved.events.filter((event) => event.type === "card-destroyed")).toHaveLength(3);
  });

  it("supports Dark Magic Attack destroying all opponent Spell and Trap cards while Dark Magician is face-up", () => {
    const state = withFieldCards(stateWithPriority([
      DARK_MAGIC_ATTACK_ID,
      DARK_MAGICIAN_ID,
      POT_OF_GREED_ID,
      BLUE_MEDICINE_ID,
    ]), {
      P1: {
        monsterZones: [zoneCard("p1-dark-magician", DARK_MAGICIAN_ID, "P1"), null, null, null, null],
      },
      P2: {
        spellTrapZones: [
          zoneCard("p2-pot", POT_OF_GREED_ID, "P2", { position: null }),
          zoneCard("p2-medicine", BLUE_MEDICINE_ID, "P2", { position: null }),
          null,
          null,
          null,
        ],
      },
    });
    const resolved = activateAndResolve(state, DARK_MAGIC_ATTACK_ID);

    expect(getCardCoverage(cardById(DARK_MAGIC_ATTACK_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.spellTrapZones.every((card) => card === null)).toBe(true);
    expect(resolved.state.players.P2.graveyard.map((card) => card.instanceId).sort()).toEqual(["p2-medicine", "p2-pot"]);
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === DARK_MAGIC_ATTACK_ID)).toBe(true);
  });

  it("rejects Dark Magic Attack without a face-up Dark Magician", () => {
    const state = stateWithPriority([DARK_MAGIC_ATTACK_ID]);
    const source = requireHandCard(state, "P1", DARK_MAGIC_ATTACK_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports A Wingbeat of Giant Dragon returning a controlled Level 5 or higher Dragon before destroying all Spell and Trap cards", () => {
    const targetRef: ZoneRef = { playerId: "P1", zone: "monsterZone", index: 0 };
    const state = withFieldCards(stateWithPriority([A_WINGBEAT_OF_GIANT_DRAGON_ID, BLUE_EYES_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-dragon", BLUE_EYES_ID, "P1", { face: "faceUp", position: "attack" }), null, null, null, null],
        spellTrapZones: [zoneCard("p1-set", BOOK_OF_MOON_ID, "P1", { position: null }), null, null, null, null],
        fieldZone: zoneCard("p1-field", MYSTICAL_SPACE_TYPHOON_ID, "P1", { position: null }),
      },
      P2: {
        spellTrapZones: [zoneCard("p2-set", BLUE_MEDICINE_ID, "P2", { position: null }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, A_WINGBEAT_OF_GIANT_DRAGON_ID, { targetRefs: [targetRef] });

    expect(getCardCoverage(cardById(A_WINGBEAT_OF_GIANT_DRAGON_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.hand.some((card) => card.instanceId === "p1-dragon")).toBe(true);
    expect(resolved.state.players.P1.spellTrapZones.every((card) => card === null)).toBe(true);
    expect(resolved.state.players.P1.fieldZone).toBeNull();
    expect(resolved.state.players.P2.spellTrapZones.every((card) => card === null)).toBe(true);
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === A_WINGBEAT_OF_GIANT_DRAGON_ID)).toBe(true);
    expect(resolved.events.filter((event) => event.type === "card-destroyed")).toHaveLength(3);
  });

  it("rejects A Wingbeat of Giant Dragon targeting a non-Dragon monster", () => {
    const state = withFieldCards(stateWithPriority([A_WINGBEAT_OF_GIANT_DRAGON_ID, CYBER_FALCON_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-machine", CYBER_FALCON_ID, "P1", { face: "faceUp", position: "attack" }), null, null, null, null],
      },
    });
    const source = requireHandCard(state, "P1", A_WINGBEAT_OF_GIANT_DRAGON_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });

    expect(result.errors[0]?.message).toBe("Target must be a Dragon monster.");
  });

  it("supports Mystical Space Typhoon destroying a targeted Spell or Trap", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "spellTrapZone", index: 0 };
    const state = withFieldCards(stateWithPriority([MYSTICAL_SPACE_TYPHOON_ID]), {
      P2: {
        spellTrapZones: [zoneCard("p2-set", POT_OF_GREED_ID, "P2", { position: null }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, MYSTICAL_SPACE_TYPHOON_ID, { targetRefs: [targetRef] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ instanceId: "p2-set" });
  });

  it("supports Book of Moon setting a face-up monster face-down in Defense Position", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "monsterZone", index: 0 };
    const state = withFieldCards(stateWithPriority([BOOK_OF_MOON_ID]), {
      P2: {
        monsterZones: [zoneCard("p2-monster", BLUE_EYES_ID, "P2", { face: "faceUp", position: "attack" }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, BOOK_OF_MOON_ID, { targetRefs: [targetRef] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
  });

  it("supports Upstart Goblin drawing one card and giving the opponent 1000 LP", () => {
    const state = stateWithPriority([UPSTART_GOBLIN_ID]);
    const beforeDeckSize = state.players.P1.mainDeck.length;
    const resolved = activateAndResolve(state, UPSTART_GOBLIN_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(1);
    expect(resolved.state.players.P1.mainDeck).toHaveLength(beforeDeckSize - 1);
    expect(resolved.state.players.P2.lp).toBe(9000);
  });

  it("supports Acid Rain destroying every face-up Machine monster on the field but leaving non-Machine monsters and face-down monsters alone", () => {
    const state = withFieldCards(stateWithPriority([ACID_RAIN_ID, CYBER_FALCON_ID, CYBER_SOLDIER_OF_DARKWORLD_ID, BLUE_EYES_ID]), {
      P1: {
        monsterZones: [
          zoneCard("p1-machine", CYBER_FALCON_ID, "P1", { face: "faceUp", position: "attack" }),
          zoneCard("p1-dragon", BLUE_EYES_ID, "P1", { face: "faceUp", position: "attack" }),
          null,
          null,
          null,
        ],
      },
      P2: {
        monsterZones: [
          zoneCard("p2-machine-up", CYBER_SOLDIER_OF_DARKWORLD_ID, "P2", { face: "faceUp", position: "attack" }),
          zoneCard("p2-machine-down", CYBER_SOLDIER_OF_DARKWORLD_ID, "P2", { face: "faceDown", position: "defense", visibility: "hidden" }),
          null,
          null,
          null,
        ],
      },
    });
    const resolved = activateAndResolve(state, ACID_RAIN_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.monsterZones[1]).toMatchObject({ instanceId: "p1-dragon" });
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[1]).toMatchObject({ instanceId: "p2-machine-down", face: "faceDown" });
    expect(resolved.events.filter((event) => event.type === "card-destroyed")).toHaveLength(2);
  });

  it("supports Blue Medicine restoring 400 LP to the controller", () => {
    const state = stateWithPriority([BLUE_MEDICINE_ID]);
    const lpBefore = state.players.P1.lp;
    const resolved = activateAndResolve(state, BLUE_MEDICINE_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(lpBefore + 400);
    expect(resolved.state.players.P2.lp).toBe(8000);
  });

  it("supports Dian Keto the Cure Master restoring 1000 LP to the controller", () => {
    const state = stateWithPriority([DIAN_KETO_THE_CURE_MASTER_ID]);
    const lpBefore = state.players.P1.lp;
    const resolved = activateAndResolve(state, DIAN_KETO_THE_CURE_MASTER_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(lpBefore + 1000);
  });

  it("supports Goblin's Secret Remedy restoring 600 LP to the controller", () => {
    const state = stateWithPriority([GOBLINS_SECRET_REMEDY_ID]);
    const lpBefore = state.players.P1.lp;
    const resolved = activateAndResolve(state, GOBLINS_SECRET_REMEDY_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(lpBefore + 600);
  });

  it("supports Red Medicine restoring 500 LP to the controller", () => {
    const state = stateWithPriority([RED_MEDICINE_ID]);
    const lpBefore = state.players.P1.lp;
    const resolved = activateAndResolve(state, RED_MEDICINE_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(lpBefore + 500);
  });

  it("supports Meteor of Destruction dealing 1000 damage while the opponent has more than 3000 LP", () => {
    const state = stateWithPriority([METEOR_OF_DESTRUCTION_ID]);
    const resolved = activateAndResolve(state, METEOR_OF_DESTRUCTION_ID);

    expect(getCardCoverage(cardById(METEOR_OF_DESTRUCTION_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(7000);
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === METEOR_OF_DESTRUCTION_ID)).toBe(true);
  });

  it("rejects Meteor of Destruction when the opponent has 3000 LP or less", () => {
    const base = stateWithPriority([METEOR_OF_DESTRUCTION_ID]);
    const state = {
      ...base,
      players: {
        ...base.players,
        P2: {
          ...base.players.P2,
          lp: 3000,
        },
      },
    };
    const source = requireHandCard(state, "P1", METEOR_OF_DESTRUCTION_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports Exile of the Wicked destroying every face-up Fiend-Type monster on the field", () => {
    const state = withFieldCards(stateWithPriority([EXILE_OF_THE_WICKED_ID, ARCHFIEND_SOLDIER_ID, BLUE_EYES_ID]), {
      P1: {
        monsterZones: [
          zoneCard("p1-fiend", ARCHFIEND_SOLDIER_ID, "P1", { face: "faceUp", position: "attack" }),
          zoneCard("p1-dragon", BLUE_EYES_ID, "P1", { face: "faceUp", position: "attack" }),
          null,
          null,
          null,
        ],
      },
      P2: {
        monsterZones: [
          zoneCard("p2-fiend", ARCHFIEND_SOLDIER_ID, "P2", { face: "faceUp", position: "attack" }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const resolved = activateAndResolve(state, EXILE_OF_THE_WICKED_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.monsterZones[1]).toMatchObject({ instanceId: "p1-dragon" });
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.events.filter((event) => event.type === "card-destroyed")).toHaveLength(2);
  });

  it("supports Hinotama dealing 500 LP damage to the opponent only", () => {
    const state = stateWithPriority([HINOTAMA_ID]);
    const resolved = activateAndResolve(state, HINOTAMA_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(8000);
    expect(resolved.state.players.P2.lp).toBe(7500);
  });

  it("supports Final Flame dealing 600 LP damage to the opponent only", () => {
    const state = stateWithPriority([FINAL_FLAME_ID]);
    const resolved = activateAndResolve(state, FINAL_FLAME_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(7400);
  });

  it("supports Ookazi dealing 800 LP damage to the opponent only", () => {
    const state = stateWithPriority([OOKAZI_ID]);
    const resolved = activateAndResolve(state, OOKAZI_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(7200);
  });

  it("supports Goblin Thief dealing 500 LP damage to the opponent and restoring 500 LP to the controller", () => {
    const state = stateWithPriority([GOBLIN_THIEF_ID]);
    const resolved = activateAndResolve(state, GOBLIN_THIEF_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(8500);
    expect(resolved.state.players.P2.lp).toBe(7500);
  });

  it("supports Tremendous Fire dealing 1000 LP damage to the opponent and 500 LP damage to the controller", () => {
    const state = stateWithPriority([TREMENDOUS_FIRE_ID]);
    const resolved = activateAndResolve(state, TREMENDOUS_FIRE_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(7500);
    expect(resolved.state.players.P2.lp).toBe(7000);
  });

  it("supports Raimei dealing 300 LP damage to the opponent only", () => {
    const state = stateWithPriority([RAIMEI_ID]);
    const resolved = activateAndResolve(state, RAIMEI_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(8000);
    expect(resolved.state.players.P2.lp).toBe(7700);
  });

  it("supports Book of Taiyou flipping a target face-down monster face-up in Attack Position", () => {
    const targetRef: ZoneRef = { playerId: "P1", zone: "monsterZone", index: 0 };
    const state = withFieldCards(stateWithPriority([BOOK_OF_TAIYOU_ID]), {
      P1: {
        monsterZones: [
          zoneCard("p1-set", BLUE_EYES_ID, "P1", { face: "faceDown", position: "defense", visibility: "hidden" }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const resolved = activateAndResolve(state, BOOK_OF_TAIYOU_ID, { targetRefs: [targetRef] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      face: "faceUp",
      position: "attack",
      visibility: "public",
    });
  });

  it("supports Sparks dealing 200 LP damage to the opponent only", () => {
    const state = stateWithPriority([SPARKS_ID]);
    const resolved = activateAndResolve(state, SPARKS_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(7800);
  });

  it("supports Soul of the Pure restoring 800 LP to the controller", () => {
    const state = stateWithPriority([SOUL_OF_THE_PURE_ID]);
    const resolved = activateAndResolve(state, SOUL_OF_THE_PURE_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(8800);
  });

  it("supports Rain of Mercy restoring 1000 LP to both players", () => {
    const state = stateWithPriority([RAIN_OF_MERCY_ID]);
    const resolved = activateAndResolve(state, RAIN_OF_MERCY_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(9000);
    expect(resolved.state.players.P2.lp).toBe(9000);
  });

  it("supports Remove Trap destroying a targeted face-up Trap Card and ignoring face-down Spell/Trap zones", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "spellTrapZone", index: 0 };
    const MIRROR_FORCE_ID = "44095762";
    const state = withFieldCards(stateWithPriority([REMOVE_TRAP_ID, MIRROR_FORCE_ID]), {
      P2: {
        spellTrapZones: [
          zoneCard("p2-trap", MIRROR_FORCE_ID, "P2", { position: null }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const resolved = activateAndResolve(state, REMOVE_TRAP_ID, { targetRefs: [targetRef] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.events.some((event) => event.type === "card-destroyed")).toBe(true);
  });

  it("supports De-Spell destroying a selected Spell Card on the field", () => {
    const state = withFieldCards(stateWithPriority([DE_SPELL_ID, POT_OF_GREED_ID]), {
      P2: {
        spellTrapZones: [
          zoneCard("p2-spell", POT_OF_GREED_ID, "P2", { position: null }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const resolved = activateAndResolve(state, DE_SPELL_ID, {
      targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 0 }],
    });

    expect(getCardCoverage(cardById(DE_SPELL_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard).toContainEqual(expect.objectContaining({ instanceId: "p2-spell" }));
  });

  it("supports De-Spell selecting a Set Trap Card and returning it to its original position", () => {
    const state = withFieldCards(stateWithPriority([DE_SPELL_ID, MIRROR_FORCE_ID]), {
      P2: {
        spellTrapZones: [
          zoneCard("p2-set-trap", MIRROR_FORCE_ID, "P2", {
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
    });
    const resolved = activateAndResolve(state, DE_SPELL_ID, {
      targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 0 }],
    });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.spellTrapZones[0]).toMatchObject({
      instanceId: "p2-set-trap",
      face: "faceDown",
      visibility: "hidden",
    });
    expect(resolved.state.players.P2.graveyard.some((card) => card.instanceId === "p2-set-trap")).toBe(false);
  });

  it("rejects De-Spell targeting a face-up Trap Card", () => {
    const state = withFieldCards(stateWithPriority([DE_SPELL_ID, MIRROR_FORCE_ID]), {
      P2: {
        spellTrapZones: [
          zoneCard("p2-face-up-trap", MIRROR_FORCE_ID, "P2", { position: null }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const source = requireHandCard(state, "P1", DE_SPELL_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 0 }],
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
    expect(result.state.chain).toHaveLength(0);
  });

  it("supports Terraforming adding a Field Spell Card from Deck to hand", () => {
    const state = withMainDeckCard(stateWithPriorityAllowUnsupported([TERRAFORMING_ID, NECROVALLEY_ID]), NECROVALLEY_ID);
    const resolved = activateAndResolve(state, TERRAFORMING_ID, {
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(getCardCoverage(cardById(TERRAFORMING_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.hand).toContainEqual(expect.objectContaining({ instanceId: "p1-deck-47355498" }));
    expect(resolved.state.players.P1.mainDeck.some((card) => card.instanceId === "p1-deck-47355498")).toBe(false);
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: TERRAFORMING_ID }));
  });

  it("supports named Normal Spell deck searches for Fusion Sage and Gather Your Mind", () => {
    const fusionSageState = withMainDeckCard(stateWithPriorityAllowUnsupported([FUSION_SAGE_ID, POLYMERIZATION_ID]), POLYMERIZATION_ID);
    const fusionSageResolved = activateAndResolve(fusionSageState, FUSION_SAGE_ID, {
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(fusionSageResolved.errors).toEqual([]);
    expect(getCardCoverage(cardById(FUSION_SAGE_ID)).status).toBe("goatTemplate");
    expect(fusionSageResolved.state.players.P1.hand).toContainEqual(
      expect.objectContaining({ instanceId: "p1-deck-24094653", cardId: POLYMERIZATION_ID }),
    );
    expect(fusionSageResolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: FUSION_SAGE_ID }));

    const gatherState = withMainDeckCards(stateWithPriority([GATHER_YOUR_MIND_ID]), GATHER_YOUR_MIND_ID, 2);
    const gatherResolved = activateAndResolve(gatherState, GATHER_YOUR_MIND_ID, {
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(gatherResolved.errors).toEqual([]);
    expect(getCardCoverage(cardById(GATHER_YOUR_MIND_ID)).status).toBe("goatTemplate");
    expect(gatherResolved.state.players.P1.hand).toContainEqual(
      expect.objectContaining({ instanceId: "p1-deck-07512044-1", cardId: GATHER_YOUR_MIND_ID }),
    );

    const secondCopy = requireHandCard(gatherResolved.state, "P1", GATHER_YOUR_MIND_ID);
    const secondActivation = reduceDuel(gatherResolved.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: secondCopy.instanceId,
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(secondActivation.errors[0]?.message).toBe("That effect has already been activated this turn.");
    expect(secondActivation.state.chain).toHaveLength(0);
  });

  it("supports Normal Spell monster searches for Reinforcement of the Army and Emblem of Dragon Destroyer", () => {
    const reinforcementState = withMainDeckCard(
      stateWithPriority([REINFORCEMENT_OF_THE_ARMY_ID, AXE_RAIDER_ID]),
      AXE_RAIDER_ID,
    );
    const reinforcementResolved = activateAndResolve(reinforcementState, REINFORCEMENT_OF_THE_ARMY_ID, {
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(getCardCoverage(cardById(REINFORCEMENT_OF_THE_ARMY_ID)).status).toBe("goatTemplate");
    expect(reinforcementResolved.errors).toEqual([]);
    expect(reinforcementResolved.state.players.P1.hand).toContainEqual(
      expect.objectContaining({ instanceId: "p1-deck-48305365", cardId: AXE_RAIDER_ID }),
    );
    expect(reinforcementResolved.state.players.P1.graveyard).toContainEqual(
      expect.objectContaining({ cardId: REINFORCEMENT_OF_THE_ARMY_ID }),
    );

    const emblemDeckState = withMainDeckCard(
      stateWithPriorityAllowUnsupported([EMBLEM_OF_DRAGON_DESTROYER_ID, BUSTER_BLADER_ID]),
      BUSTER_BLADER_ID,
    );
    const emblemDeckResolved = activateAndResolve(emblemDeckState, EMBLEM_OF_DRAGON_DESTROYER_ID, {
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(getCardCoverage(cardById(EMBLEM_OF_DRAGON_DESTROYER_ID)).status).toBe("goatTemplate");
    expect(emblemDeckResolved.errors).toEqual([]);
    expect(emblemDeckResolved.state.players.P1.hand).toContainEqual(
      expect.objectContaining({ instanceId: "p1-deck-78193831", cardId: BUSTER_BLADER_ID }),
    );

    const emblemGraveyardState = withGraveyardCards(
      stateWithPriorityAllowUnsupported([EMBLEM_OF_DRAGON_DESTROYER_ID, BUSTER_BLADER_ID]),
      [zoneCard("p1-buster-grave", BUSTER_BLADER_ID, "P1", { position: null })],
    );
    const emblemGraveyardResolved = activateAndResolve(emblemGraveyardState, EMBLEM_OF_DRAGON_DESTROYER_ID, {
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });

    expect(emblemGraveyardResolved.errors).toEqual([]);
    expect(emblemGraveyardResolved.state.players.P1.hand).toContainEqual(
      expect.objectContaining({ instanceId: "p1-buster-grave", cardId: BUSTER_BLADER_ID }),
    );
    expect(emblemGraveyardResolved.state.players.P1.graveyard).toContainEqual(
      expect.objectContaining({ cardId: EMBLEM_OF_DRAGON_DESTROYER_ID }),
    );
  });

  it("rejects Reinforcement of the Army targets outside its Level 4 or lower Warrior filter", () => {
    const highLevelWarriorState = withMainDeckCard(
      stateWithPriorityAllowUnsupported([REINFORCEMENT_OF_THE_ARMY_ID, BUSTER_BLADER_ID]),
      BUSTER_BLADER_ID,
    );
    const highLevelWarrior = requireHandCard(highLevelWarriorState, "P1", REINFORCEMENT_OF_THE_ARMY_ID);
    const highLevelResult = reduceDuel(highLevelWarriorState, {
      type: "activate-card",
      playerId: "P1",
      instanceId: highLevelWarrior.instanceId,
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(highLevelResult.errors[0]?.message).toBe("Target must be Level 4 or lower.");
    expect(highLevelResult.state.chain).toHaveLength(0);

    const nonWarriorState = withMainDeckCard(
      stateWithPriority([REINFORCEMENT_OF_THE_ARMY_ID, BATTLE_FOOTBALLER_ID]),
      BATTLE_FOOTBALLER_ID,
    );
    const nonWarriorSource = requireHandCard(nonWarriorState, "P1", REINFORCEMENT_OF_THE_ARMY_ID);
    const nonWarriorResult = reduceDuel(nonWarriorState, {
      type: "activate-card",
      playerId: "P1",
      instanceId: nonWarriorSource.instanceId,
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(nonWarriorResult.errors[0]?.message).toBe("Target must be a Warrior monster.");
    expect(nonWarriorResult.state.chain).toHaveLength(0);
  });

  it("supports Toon Table of Contents searching Toon cards and Manga Ryu-Ran from Deck", () => {
    const toonWorldState = withMainDeckCard(
      stateWithPriorityAllowUnsupported([TOON_TABLE_OF_CONTENTS_ID, TOON_WORLD_ID]),
      TOON_WORLD_ID,
    );
    const toonWorldResolved = activateAndResolve(toonWorldState, TOON_TABLE_OF_CONTENTS_ID, {
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(getCardCoverage(cardById(TOON_TABLE_OF_CONTENTS_ID)).status).toBe("goatTemplate");
    expect(toonWorldResolved.errors).toEqual([]);
    expect(toonWorldResolved.state.players.P1.hand).toContainEqual(
      expect.objectContaining({ instanceId: "p1-deck-15259703", cardId: TOON_WORLD_ID }),
    );
    expect(toonWorldResolved.state.players.P1.graveyard).toContainEqual(
      expect.objectContaining({ cardId: TOON_TABLE_OF_CONTENTS_ID }),
    );

    const mangaState = withMainDeckCard(
      stateWithPriorityAllowUnsupported([TOON_TABLE_OF_CONTENTS_ID, MANGA_RYU_RAN_ID]),
      MANGA_RYU_RAN_ID,
    );
    const mangaResolved = activateAndResolve(mangaState, TOON_TABLE_OF_CONTENTS_ID, {
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(mangaResolved.errors).toEqual([]);
    expect(mangaResolved.state.players.P1.hand).toContainEqual(
      expect.objectContaining({ instanceId: "p1-deck-38369349", cardId: MANGA_RYU_RAN_ID }),
    );
  });

  it("rejects Toon Table of Contents targeting a non-Toon card", () => {
    const state = withMainDeckCard(
      stateWithPriorityAllowUnsupported([TOON_TABLE_OF_CONTENTS_ID, NECROVALLEY_ID]),
      NECROVALLEY_ID,
    );
    const source = requireHandCard(state, "P1", TOON_TABLE_OF_CONTENTS_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(result.errors[0]?.message).toBe("Target card identity does not match target requirements.");
    expect(result.state.chain).toHaveLength(0);
  });

  it("supports Elegant Egotist Special Summoning Harpie Lady Sisters from Deck while Harpie Lady is on the field", () => {
    const state = withMainDeckCard(
      withFieldCards(stateWithPriorityAllowUnsupported([ELEGANT_EGOTIST_ID, HARPIE_LADY_ID, HARPIE_LADY_SISTERS_ID]), {
        P2: {
          monsterZones: [zoneCard("p2-harpie", HARPIE_LADY_ID, "P2"), null, null, null, null],
        },
      }),
      HARPIE_LADY_SISTERS_ID,
    );
    const resolved = activateAndResolve(state, ELEGANT_EGOTIST_ID, {
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(getCardCoverage(cardById(ELEGANT_EGOTIST_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: HARPIE_LADY_SISTERS_ID,
      face: "faceUp",
      position: "attack",
    });
  });

  it("rejects Elegant Egotist without any face-up Harpie Lady on the field", () => {
    const state = stateWithPriorityAllowUnsupported([ELEGANT_EGOTIST_ID, HARPIE_LADY_SISTERS_ID]);
    const source = requireHandCard(state, "P1", ELEGANT_EGOTIST_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "hand", index: state.players.P1.hand.findIndex((card) => card.cardId === HARPIE_LADY_SISTERS_ID) }],
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports Sage's Stone Special Summoning Dark Magician from Deck while controlling Dark Magician Girl", () => {
    const state = withMainDeckCard(
      withFieldCards(stateWithPriorityAllowUnsupported([SAGES_STONE_ID, DARK_MAGICIAN_GIRL_ID, DARK_MAGICIAN_ID]), {
        P1: {
          monsterZones: [zoneCard("p1-dmg", DARK_MAGICIAN_GIRL_ID, "P1"), null, null, null, null],
        },
      }),
      DARK_MAGICIAN_ID,
    );
    const resolved = activateAndResolve(state, SAGES_STONE_ID, {
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(getCardCoverage(cardById(SAGES_STONE_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[1]).toMatchObject({
      cardId: DARK_MAGICIAN_ID,
      face: "faceUp",
      position: "attack",
    });
  });

  it("supports Release Restraint tributing Gearfried the Iron Knight to Special Summon Gearfried the Swordmaster from Deck", () => {
    const state = withMainDeckCard(
      withFieldCards(stateWithPriorityAllowUnsupported([RELEASE_RESTRAINT_ID, GEARFRIED_THE_IRON_KNIGHT_ID, GEARFRIED_THE_SWORDMASTER_ID]), {
        P1: {
          monsterZones: [zoneCard("p1-gearfried", GEARFRIED_THE_IRON_KNIGHT_ID, "P1"), null, null, null, null],
        },
      }),
      GEARFRIED_THE_SWORDMASTER_ID,
    );
    const resolved = activateAndResolve(state, RELEASE_RESTRAINT_ID, {
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
      costInstanceIds: ["p1-gearfried"],
    });

    expect(getCardCoverage(cardById(RELEASE_RESTRAINT_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ instanceId: "p1-gearfried" }));
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: GEARFRIED_THE_SWORDMASTER_ID,
      face: "faceUp",
      position: "attack",
    });
  });

  it("supports Knight's Title tributing Dark Magician to Special Summon Dark Magician Knight from the Graveyard", () => {
    const state = withGraveyardCards(
      withFieldCards(stateWithPriorityAllowUnsupported([KNIGHTS_TITLE_ID, DARK_MAGICIAN_ID, DARK_MAGICIAN_KNIGHT_ID]), {
        P1: {
          monsterZones: [zoneCard("p1-dark-magician", DARK_MAGICIAN_ID, "P1"), null, null, null, null],
        },
      }),
      [zoneCard("p1-dmk-grave", DARK_MAGICIAN_KNIGHT_ID, "P1", { position: null })],
    );
    const resolved = activateAndResolve(state, KNIGHTS_TITLE_ID, {
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
      costInstanceIds: ["p1-dark-magician"],
    });

    expect(getCardCoverage(cardById(KNIGHTS_TITLE_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ instanceId: "p1-dark-magician" }));
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: DARK_MAGICIAN_KNIGHT_ID,
      face: "faceUp",
      position: "attack",
    });
  });

  it("supports costed Special Summon spells from the Graveyard", () => {
    const batteryState = withGraveyardCards(
      stateWithPriorityAllowUnsupported([BATTERY_CHARGER_ID, BATTERYMAN_AA_ID]),
      [zoneCard("p1-batteryman-grave", BATTERYMAN_AA_ID, "P1", { position: null })],
    );
    const batteryResolved = activateAndResolve(batteryState, BATTERY_CHARGER_ID, {
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });

    expect(getCardCoverage(cardById(BATTERY_CHARGER_ID)).status).toBe("goatTemplate");
    expect(batteryResolved.errors).toEqual([]);
    expect(batteryResolved.state.players.P1.lp).toBe(7500);
    expect(batteryResolved.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: "p1-batteryman-grave",
      cardId: BATTERYMAN_AA_ID,
      face: "faceUp",
      position: "attack",
    });
    expect(batteryResolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: BATTERY_CHARGER_ID }));

    const dedicationState = withGraveyardCards(
      withFieldCards(stateWithPriorityAllowUnsupported([
        DEDICATION_THROUGH_LIGHT_AND_DARKNESS_ID,
        DARK_MAGICIAN_ID,
        DARK_MAGICIAN_OF_CHAOS_ID,
      ]), {
        P1: {
          monsterZones: [zoneCard("p1-dark-magician", DARK_MAGICIAN_ID, "P1"), null, null, null, null],
        },
      }),
      [zoneCard("p1-dmoc-grave", DARK_MAGICIAN_OF_CHAOS_ID, "P1", { position: null })],
    );
    const dedicationResolved = activateAndResolve(dedicationState, DEDICATION_THROUGH_LIGHT_AND_DARKNESS_ID, {
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
      costInstanceIds: ["p1-dark-magician"],
    });

    expect(getCardCoverage(cardById(DEDICATION_THROUGH_LIGHT_AND_DARKNESS_ID)).status).toBe("goatTemplate");
    expect(dedicationResolved.errors).toEqual([]);
    expect(dedicationResolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ instanceId: "p1-dark-magician" }));
    expect(dedicationResolved.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: "p1-dmoc-grave",
      cardId: DARK_MAGICIAN_OF_CHAOS_ID,
      face: "faceUp",
      position: "attack",
    });
  });

  it("supports Contract with Exodia Special Summoning Exodia Necross from hand when all Exodia pieces are in the Graveyard", () => {
    const state = withGraveyardCards(
      stateWithPriorityAllowUnsupported([
        CONTRACT_WITH_EXODIA_ID,
        EXODIA_NECROSS_ID,
        EXODIA_THE_FORBIDDEN_ONE_ID,
        RIGHT_ARM_OF_THE_FORBIDDEN_ONE_ID,
        LEFT_ARM_OF_THE_FORBIDDEN_ONE_ID,
        RIGHT_LEG_OF_THE_FORBIDDEN_ONE_ID,
        LEFT_LEG_OF_THE_FORBIDDEN_ONE_ID,
      ]),
      [
        zoneCard("p1-exodia", EXODIA_THE_FORBIDDEN_ONE_ID, "P1", { position: null }),
        zoneCard("p1-right-arm", RIGHT_ARM_OF_THE_FORBIDDEN_ONE_ID, "P1", { position: null }),
        zoneCard("p1-left-arm", LEFT_ARM_OF_THE_FORBIDDEN_ONE_ID, "P1", { position: null }),
        zoneCard("p1-right-leg", RIGHT_LEG_OF_THE_FORBIDDEN_ONE_ID, "P1", { position: null }),
        zoneCard("p1-left-leg", LEFT_LEG_OF_THE_FORBIDDEN_ONE_ID, "P1", { position: null }),
      ],
    );
    const necrossIndex = state.players.P1.hand.findIndex((card) => card.cardId === EXODIA_NECROSS_ID);
    const resolved = activateAndResolve(state, CONTRACT_WITH_EXODIA_ID, {
      targetRefs: [{ playerId: "P1", zone: "hand", index: necrossIndex }],
    });

    expect(getCardCoverage(cardById(CONTRACT_WITH_EXODIA_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: EXODIA_NECROSS_ID,
      face: "faceUp",
      position: "attack",
    });
  });

  it("verifies normal and continuous Spell source records and coverage statuses", () => {
    for (const expected of SPELL_TEMPLATE_CASES) {
      const spell = cardById(expected.spellId);

      expect(cards.findIndex((card) => card.passcode === expected.spellId), expected.taskId).toBe(expected.sourceIndex);
      expect(spell).toMatchObject({
        passcode: expected.spellId,
        id: expected.spellId,
        name: expected.name,
        category: "Spell",
        classifications: expected.classifications,
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(spell).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.spellId, cards)).toBe(true);
    }
  });

  it("supports Brain Control paying LP to take an opponent face-up monster until the End Phase", () => {
    const state = withFieldCards(stateWithPriority([BRAIN_CONTROL_ID, BATTLE_OX_ID]), {
      P2: {
        monsterZones: [zoneCard("p2-brain-control-target", BATTLE_OX_ID, "P2"), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, BRAIN_CONTROL_ID, {
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const endPhase = advanceToEndPhase(resolved.state);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(7200);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: "p2-brain-control-target",
      owner: "P2",
      controller: "P1",
    });
    expect(resolved.state.controlChangeReturns).toContainEqual(expect.objectContaining({
      instanceId: "p2-brain-control-target",
      returnPlayerId: "P2",
    }));
    expect(endPhase.players.P2.monsterZones[0]).toMatchObject({
      instanceId: "p2-brain-control-target",
      owner: "P2",
      controller: "P2",
    });
  });

  it("supports Darkness Approaches discarding two cards to set a face-up monster without changing battle position", () => {
    const state = withFieldCards(stateWithPriority([
      DARKNESS_APPROACHES_ID,
      BATTLE_OX_ID,
      LA_JINN_ID,
      AXE_RAIDER_ID,
    ]), {
      P1: {
        monsterZones: [zoneCard("p1-darkness-target", BATTLE_OX_ID, "P1", { position: "attack" }), null, null, null, null],
      },
    });
    const discardOne = requireHandCard(state, "P1", LA_JINN_ID);
    const discardTwo = requireHandCard(state, "P1", AXE_RAIDER_ID);
    const resolved = activateAndResolve(state, DARKNESS_APPROACHES_ID, {
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
      costInstanceIds: [discardOne.instanceId, discardTwo.instanceId],
    });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: "p1-darkness-target",
      face: "faceDown",
      position: "attack",
      visibility: "hidden",
    });
    expect(resolved.state.players.P1.graveyard.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      discardOne.instanceId,
      discardTwo.instanceId,
    ]));
  });

  it("supports Final Destiny discarding five cards to destroy all cards on the field", () => {
    const state = withFieldCards(stateWithPriority([
      FINAL_DESTINY_ID,
      BATTLE_OX_ID,
      LA_JINN_ID,
      AXE_RAIDER_ID,
      AQUA_MADOOR_ID,
      ANSATSU_ID,
      POT_OF_GREED_ID,
      MIRROR_FORCE_ID,
    ]), {
      P1: {
        monsterZones: [zoneCard("p1-final-monster", BATTLE_OX_ID, "P1"), null, null, null, null],
        spellTrapZones: [zoneCard("p1-final-spell", POT_OF_GREED_ID, "P1", { position: null }), null, null, null, null],
      },
      P2: {
        monsterZones: [zoneCard("p2-final-monster", LA_JINN_ID, "P2"), null, null, null, null],
        spellTrapZones: [zoneCard("p2-final-trap", MIRROR_FORCE_ID, "P2", { position: null }), null, null, null, null],
      },
    });
    const discardIds = [BATTLE_OX_ID, LA_JINN_ID, AXE_RAIDER_ID, AQUA_MADOOR_ID, ANSATSU_ID]
      .map((cardId) => requireHandCard(state, "P1", cardId).instanceId);
    const resolved = activateAndResolve(state, FINAL_DESTINY_ID, { costInstanceIds: discardIds });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones).toEqual([null, null, null, null, null]);
    expect(resolved.state.players.P2.monsterZones).toEqual([null, null, null, null, null]);
    expect(resolved.state.players.P1.spellTrapZones).toEqual([null, null, null, null, null]);
    expect(resolved.state.players.P2.spellTrapZones).toEqual([null, null, null, null, null]);
    expect(resolved.state.players.P1.graveyard.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      ...discardIds,
      "p1-final-monster",
      "p1-final-spell",
    ]));
    expect(resolved.state.players.P2.graveyard.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      "p2-final-monster",
      "p2-final-trap",
    ]));
  });

  it("supports Burst Stream of Destruction clearing only opponent monsters and blocking Blue-Eyes attacks for the turn", () => {
    const state = withFieldCards(stateWithPriority([
      BURST_STREAM_OF_DESTRUCTION_ID,
      BLUE_EYES_ID,
      LA_JINN_ID,
      AXE_RAIDER_ID,
    ]), {
      P1: {
        monsterZones: [zoneCard("p1-burst-blue-eyes", BLUE_EYES_ID, "P1"), null, null, null, null],
      },
      P2: {
        monsterZones: [
          zoneCard("p2-burst-la-jinn", LA_JINN_ID, "P2"),
          zoneCard("p2-burst-axe", AXE_RAIDER_ID, "P2"),
          null,
          null,
          null,
        ],
      },
    });
    const resolved = activateAndResolve(state, BURST_STREAM_OF_DESTRUCTION_ID);
    const battleState = advanceToBattlePhase(resolved.state);
    const blockedAttack = reduceDuel(battleState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-burst-blue-eyes",
    });

    expect(getCardCoverage(cardById(BURST_STREAM_OF_DESTRUCTION_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: "p1-burst-blue-eyes" });
    expect(resolved.state.players.P2.monsterZones).toEqual([null, null, null, null, null]);
    expect(resolved.state.players.P2.graveyard.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      "p2-burst-la-jinn",
      "p2-burst-axe",
    ]));
    expect(blockedAttack.errors[0]?.message).toBe(
      "Blue-Eyes White Dragon cannot attack this turn after Burst Stream of Destruction resolves.",
    );
  });

  it("rejects Burst Stream of Destruction without a face-up Blue-Eyes White Dragon", () => {
    const state = stateWithPriority([BURST_STREAM_OF_DESTRUCTION_ID, BLUE_EYES_ID]);
    const source = requireHandCard(state, "P1", BURST_STREAM_OF_DESTRUCTION_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports Chaos End destroying every monster when seven own cards are banished", () => {
    const banished = [
      BLUE_EYES_ID,
      LA_JINN_ID,
      AXE_RAIDER_ID,
      AQUA_MADOOR_ID,
      ANSATSU_ID,
      BATTLE_OX_ID,
      ARCHFIEND_SOLDIER_ID,
    ].map((cardId, index) => zoneCard(`p1-chaos-end-banished-${index}`, cardId, "P1", { position: null }));
    const state = withFieldCards(
      withBanishedCards(stateWithPriority([
        CHAOS_END_ID,
        BLUE_EYES_ID,
        LA_JINN_ID,
        AXE_RAIDER_ID,
        AQUA_MADOOR_ID,
        ANSATSU_ID,
        BATTLE_OX_ID,
        ARCHFIEND_SOLDIER_ID,
      ]), banished),
      {
        P1: {
          monsterZones: [zoneCard("p1-chaos-end-blue-eyes", BLUE_EYES_ID, "P1"), null, null, null, null],
        },
        P2: {
          monsterZones: [zoneCard("p2-chaos-end-la-jinn", LA_JINN_ID, "P2"), null, null, null, null],
        },
      },
    );
    const resolved = activateAndResolve(state, CHAOS_END_ID);

    expect(getCardCoverage(cardById(CHAOS_END_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones).toEqual([null, null, null, null, null]);
    expect(resolved.state.players.P2.monsterZones).toEqual([null, null, null, null, null]);
    expect(resolved.state.players.P1.graveyard.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      "p1-chaos-end-blue-eyes",
      expect.stringContaining(CHAOS_END_ID),
    ]));
    expect(resolved.state.players.P2.graveyard.map((card) => card.instanceId)).toContain("p2-chaos-end-la-jinn");
  });

  it("rejects Chaos End while fewer than seven own cards are banished", () => {
    const banished = [
      BLUE_EYES_ID,
      LA_JINN_ID,
      AXE_RAIDER_ID,
      AQUA_MADOOR_ID,
      ANSATSU_ID,
      BATTLE_OX_ID,
    ].map((cardId, index) => zoneCard(`p1-chaos-end-short-banished-${index}`, cardId, "P1", { position: null }));
    const state = withBanishedCards(stateWithPriority([
      CHAOS_END_ID,
      BLUE_EYES_ID,
      LA_JINN_ID,
      AXE_RAIDER_ID,
      AQUA_MADOOR_ID,
      ANSATSU_ID,
      BATTLE_OX_ID,
    ]), banished);
    const source = requireHandCard(state, "P1", CHAOS_END_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports Ojama Delta Hurricane!! destroying only the opponent's field when the Ojama trio is face-up", () => {
    const state = withFieldCards(stateWithPriority([
      OJAMA_DELTA_HURRICANE_ID,
      OJAMA_BLACK_ID,
      OJAMA_GREEN_ID,
      OJAMA_YELLOW_ID,
      BLUE_EYES_ID,
      LA_JINN_ID,
      POT_OF_GREED_ID,
      MIRROR_FORCE_ID,
      FOREST_ID,
    ]), {
      P1: {
        monsterZones: [
          zoneCard("p1-ojama-black", OJAMA_BLACK_ID, "P1"),
          zoneCard("p1-ojama-green", OJAMA_GREEN_ID, "P1"),
          zoneCard("p1-ojama-yellow", OJAMA_YELLOW_ID, "P1"),
          null,
          null,
        ],
      },
      P2: {
        monsterZones: [zoneCard("p2-ojama-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
        spellTrapZones: [zoneCard("p2-ojama-trap", MIRROR_FORCE_ID, "P2", { position: null }), null, null, null, null],
        fieldZone: zoneCard("p2-ojama-field", FOREST_ID, "P2", { position: null }),
      },
    });
    const resolved = activateAndResolve(state, OJAMA_DELTA_HURRICANE_ID);

    expect(getCardCoverage(cardById(OJAMA_DELTA_HURRICANE_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones.slice(0, 3).map((card) => card?.instanceId)).toEqual([
      "p1-ojama-black",
      "p1-ojama-green",
      "p1-ojama-yellow",
    ]);
    expect(resolved.state.players.P2.monsterZones).toEqual([null, null, null, null, null]);
    expect(resolved.state.players.P2.spellTrapZones).toEqual([null, null, null, null, null]);
    expect(resolved.state.players.P2.fieldZone).toBeNull();
    expect(resolved.state.players.P2.graveyard.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      "p2-ojama-blue-eyes",
      "p2-ojama-trap",
      "p2-ojama-field",
    ]));
  });

  it("rejects Ojama Delta Hurricane!! unless all three Ojama Normal Monsters are face-up on your field", () => {
    const state = withFieldCards(stateWithPriority([
      OJAMA_DELTA_HURRICANE_ID,
      OJAMA_BLACK_ID,
      OJAMA_GREEN_ID,
      OJAMA_YELLOW_ID,
    ]), {
      P1: {
        monsterZones: [
          zoneCard("p1-ojama-black", OJAMA_BLACK_ID, "P1"),
          zoneCard("p1-ojama-green", OJAMA_GREEN_ID, "P1"),
          zoneCard("p1-ojama-yellow", OJAMA_YELLOW_ID, "P1", { face: "faceDown", position: "defense", visibility: "hidden" }),
          null,
          null,
        ],
      },
    });
    const source = requireHandCard(state, "P1", OJAMA_DELTA_HURRICANE_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports Lightning Vortex discarding a card to destroy all opponent face-up monsters only", () => {
    const state = withFieldCards(stateWithPriority([LIGHTNING_VORTEX_ID, BLUE_EYES_ID, LA_JINN_ID, AXE_RAIDER_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-own-monster", BATTLE_OX_ID, "P1"), null, null, null, null],
      },
      P2: {
        monsterZones: [
          zoneCard("p2-face-up-a", BLUE_EYES_ID, "P2"),
          zoneCard("p2-face-up-b", LA_JINN_ID, "P2"),
          zoneCard("p2-face-down", AXE_RAIDER_ID, "P2", { face: "faceDown", position: "defense", visibility: "hidden" }),
          null,
          null,
        ],
      },
    });
    const discard = requireHandCard(state, "P1", BLUE_EYES_ID);
    const resolved = activateAndResolve(state, LIGHTNING_VORTEX_ID, { costInstanceIds: [discard.instanceId] });

    expect(getCardCoverage(cardById(LIGHTNING_VORTEX_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[2]).toMatchObject({ instanceId: "p2-face-down", face: "faceDown" });
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: "p1-own-monster" });
    expect(resolved.state.players.P1.graveyard).toEqual(expect.arrayContaining([
      expect.objectContaining({ instanceId: discard.instanceId }),
      expect.objectContaining({ cardId: LIGHTNING_VORTEX_ID }),
    ]));
  });

  it("supports Yellow Luster Shield increasing only the controller's face-up monster DEF", () => {
    const state = withFieldCards(stateWithPriority([YELLOW_LUSTER_SHIELD_ID, BATTLE_OX_ID, LA_JINN_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-yellow-target", BATTLE_OX_ID, "P1", { position: "defense" }), null, null, null, null],
      },
      P2: {
        monsterZones: [zoneCard("p2-yellow-unaffected", LA_JINN_ID, "P2", { position: "defense" }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, YELLOW_LUSTER_SHIELD_ID);
    const ownMonster = resolved.state.players.P1.monsterZones[0]!;
    const opponentMonster = resolved.state.players.P2.monsterZones[0]!;
    const ownBase = monsterBaseStats(BATTLE_OX_ID);
    const opponentBase = monsterBaseStats(LA_JINN_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.spellTrapZones[0]).toMatchObject({
      cardId: YELLOW_LUSTER_SHIELD_ID,
      face: "faceUp",
    });
    expect(deriveBattleStats(resolved.state, { playerId: "P1", card: ownMonster, base: ownBase }).def).toBe(ownBase.def + 300);
    expect(deriveBattleStats(resolved.state, { playerId: "P2", card: opponentMonster, base: opponentBase }).def).toBe(opponentBase.def);
  });

  it("supports Toon World paying 1000 LP and remaining in the Spell & Trap Zone", () => {
    const resolved = activateAndResolve(stateWithPriority([TOON_WORLD_ID]), TOON_WORLD_ID);

    expect(getCardCoverage(cardById(TOON_WORLD_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(7000);
    expect(resolved.state.players.P1.spellTrapZones[0]).toMatchObject({
      cardId: TOON_WORLD_ID,
      face: "faceUp",
    });
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === TOON_WORLD_ID)).toBe(false);
  });

  it("supports Insect Barrier blocking attack declarations from opposing Insect-Type monsters and leaving your own Insects unaffected", () => {
    const BASIC_INSECT_ID = "89091579";
    const base = stateWithPriority([INSECT_BARRIER_ID, BASIC_INSECT_ID]);
    const withInsectBarrier: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          spellTrapZones: [
            zoneCard("p1-insect-barrier", INSECT_BARRIER_ID, "P1", {
              face: "faceUp",
              position: null,
              visibility: "public",
            }),
            null,
            null,
            null,
            null,
          ],
        },
        P2: {
          ...base.players.P2,
          monsterZones: [
            zoneCard("p2-insect", BASIC_INSECT_ID, "P2", { face: "faceUp", position: "attack" }),
            null,
            null,
            null,
            null,
          ],
        },
      },
      activePlayer: "P2",
      priorityPlayer: "P2",
      priority: { ...base.priority, holder: "P2", status: "open" },
      turn: 2,
      phase: "BP",
    };
    const blocked = reduceDuel(withInsectBarrier, {
      type: "attack",
      playerId: "P2",
      attackerInstanceId: "p2-insect",
    });

    expect(blocked.errors[0]).toMatchObject({
      code: "illegal-action",
      message: "Your opponent's Insect-Type monsters cannot attack while Insect Barrier is face-up.",
    });
  });

  it("supports Earthquake changing every face-up monster on both sides of the field to face-up Defense Position", () => {
    const BLUE_EYES = "89631139";
    const BATTLE_OX = "05053103";
    const state = withFieldCards(stateWithPriority([EARTHQUAKE_ID, BLUE_EYES, BATTLE_OX]), {
      P1: {
        monsterZones: [
          zoneCard("p1-bew", BLUE_EYES, "P1", { face: "faceUp", position: "attack" }),
          null,
          null,
          null,
          null,
        ],
      },
      P2: {
        monsterZones: [
          zoneCard("p2-ox", BATTLE_OX, "P2", { face: "faceUp", position: "attack" }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const resolved = activateAndResolve(state, EARTHQUAKE_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ position: "defense", face: "faceUp" });
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({ position: "defense", face: "faceUp" });
  });

  it("supports A Deal with Dark Ruler summoning Berserk Dragon from Deck after a controlled Level 8 monster went to the Graveyard this turn", () => {
    const state = withBerserkDragonOnTopOfDeck(withLevelEightSentThisTurn(stateWithPriorityAllowUnsupported([
      A_DEAL_WITH_DARK_RULER_ID,
      BERSERK_DRAGON_ID,
      BLUE_EYES_ID,
    ])));

    const resolved = activateAndResolve(state, A_DEAL_WITH_DARK_RULER_ID, {
      effectId: "summon-berserk-dragon",
      targetRefs: [{ playerId: "P1", zone: "mainDeck", index: 0 }],
    });

    expect(getCardCoverage(cardById(A_DEAL_WITH_DARK_RULER_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: BERSERK_DRAGON_ID,
      face: "faceUp",
      position: "attack",
    });
    expect(resolved.state.players.P1.mainDeck.some((card) => card.cardId === BERSERK_DRAGON_ID)).toBe(false);
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === A_DEAL_WITH_DARK_RULER_ID)).toBe(true);
  });

  it("supports A Deal with Dark Ruler summoning Berserk Dragon from hand", () => {
    const state = withLevelEightSentThisTurn(stateWithPriorityAllowUnsupported([
      A_DEAL_WITH_DARK_RULER_ID,
      BERSERK_DRAGON_ID,
      BLUE_EYES_ID,
    ]));
    const berserk = requireHandCard(state, "P1", BERSERK_DRAGON_ID);
    const resolved = activateAndResolve(state, A_DEAL_WITH_DARK_RULER_ID, {
      effectId: "summon-berserk-dragon",
      targetRefs: [{ playerId: "P1", zone: "hand", index: state.players.P1.hand.indexOf(berserk) }],
    });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: berserk.instanceId });
    expect(resolved.state.players.P1.hand.some((card) => card.instanceId === berserk.instanceId)).toBe(false);
  });

  it("rejects A Deal with Dark Ruler without a Level 8 or higher monster sent from the controller's field this turn", () => {
    const state = stateWithPriorityAllowUnsupported([
      A_DEAL_WITH_DARK_RULER_ID,
      BERSERK_DRAGON_ID,
    ]);
    const source = requireHandCard(state, "P1", A_DEAL_WITH_DARK_RULER_ID);
    const berserk = requireHandCard(state, "P1", BERSERK_DRAGON_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "summon-berserk-dragon",
      targetRefs: [{ playerId: "P1", zone: "hand", index: state.players.P1.hand.indexOf(berserk) }],
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports A Feather of the Phoenix discarding a card to return the selected Graveyard card to the top of the Deck", () => {
    const state = withGraveyardCards(
      stateWithPriority([
        A_FEATHER_OF_THE_PHOENIX_ID,
        POT_OF_GREED_ID,
        BLUE_EYES_ID,
      ]),
      [
        zoneCard("p1-pot-grave", POT_OF_GREED_ID, "P1", { position: null }),
      ],
    );
    const source = requireHandCard(state, "P1", A_FEATHER_OF_THE_PHOENIX_ID);
    const discardCandidate = state.players.P1.hand.find((card) => card.instanceId !== source.instanceId)!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
      costInstanceIds: [discardCandidate.instanceId],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(A_FEATHER_OF_THE_PHOENIX_ID)).status).toBe("goatTemplate");
    expect(activation.errors).toEqual([]);
    expect(activation.events.some((event) => event.type === "cost-paid")).toBe(true);
    expect(activation.state.chain[0]?.selectedTargets?.targetInstanceIds).toEqual(["p1-pot-grave"]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.mainDeck[0]).toMatchObject({ instanceId: "p1-pot-grave" });
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === "p1-pot-grave")).toBe(false);
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === discardCandidate.instanceId)).toBe(true);
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === A_FEATHER_OF_THE_PHOENIX_ID)).toBe(true);
  });

  it("supports Tribute to the Doomed paying a discard cost to destroy a targeted monster", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "monsterZone", index: 0 };
    const state = withFieldCards(stateWithPriority([TRIBUTE_TO_THE_DOOMED_ID, BLUE_EYES_ID]), {
      P2: {
        monsterZones: [zoneCard("p2-target", BLUE_EYES_ID, "P2", { face: "faceUp", position: "attack" }), null, null, null, null],
      },
    });
    const source = requireHandCard(state, "P1", TRIBUTE_TO_THE_DOOMED_ID);
    const discardCandidate = state.players.P1.hand.find((card) => card.instanceId !== source.instanceId)!;
    const activate = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [targetRef],
      costInstanceIds: [discardCandidate.instanceId],
    });
    const resolved = reduceDuel(activate.state, { type: "resolve-chain", playerId: "P1" });

    expect(activate.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === discardCandidate.instanceId)).toBe(true);
    expect(resolved.state.players.P1.hand.some((card) => card.instanceId === discardCandidate.instanceId)).toBe(false);
  });

  it("supports Back to Square One discarding a card to return a targeted monster to the owner's Deck top", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "monsterZone", index: 0 };
    const state = withFieldCards(stateWithPriority([BACK_TO_SQUARE_ONE_ID, BLUE_EYES_ID]), {
      P2: {
        monsterZones: [zoneCard("p2-target", BLUE_EYES_ID, "P2", { face: "faceDown", position: "defense", visibility: "hidden" }), null, null, null, null],
      },
    });
    const source = requireHandCard(state, "P1", BACK_TO_SQUARE_ONE_ID);
    const discardCandidate = state.players.P1.hand.find((card) => card.instanceId !== source.instanceId)!;
    const activate = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [targetRef],
      costInstanceIds: [discardCandidate.instanceId],
    });
    const resolved = reduceDuel(activate.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(BACK_TO_SQUARE_ONE_ID)).status).toBe("goatTemplate");
    expect(activate.errors).toEqual([]);
    expect(activate.state.chain[0]?.selectedTargets?.targetInstanceIds).toEqual(["p2-target"]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.mainDeck[0]).toMatchObject({ instanceId: "p2-target" });
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === discardCandidate.instanceId)).toBe(true);
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === BACK_TO_SQUARE_ONE_ID)).toBe(true);
  });

  it("supports The Warrior Returning Alive adding a targeted Warrior monster from the Graveyard to hand", () => {
    const state = withGraveyardCards(
      stateWithPriority([THE_WARRIOR_RETURNING_ALIVE_ID]),
      [zoneCard("p1-warrior-grave", AXE_RAIDER_ID, "P1", { position: null })],
    );
    const beforeHandSize = state.players.P1.hand.length;
    const resolved = activateAndResolve(state, THE_WARRIOR_RETURNING_ALIVE_ID, {
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });

    expect(getCardCoverage(cardById(THE_WARRIOR_RETURNING_ALIVE_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === "p1-warrior-grave")).toBe(false);
    expect(resolved.state.players.P1.hand).toHaveLength(beforeHandSize);
    expect(resolved.state.players.P1.hand.some((card) => card.instanceId === "p1-warrior-grave")).toBe(true);
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === THE_WARRIOR_RETURNING_ALIVE_ID)).toBe(true);
  });

  it("rejects The Warrior Returning Alive targeting a non-Warrior monster in the Graveyard", () => {
    const state = withGraveyardCards(
      stateWithPriority([THE_WARRIOR_RETURNING_ALIVE_ID, BATTLE_FOOTBALLER_ID]),
      [zoneCard("p1-machine-grave", BATTLE_FOOTBALLER_ID, "P1", { position: null })],
    );
    const source = requireHandCard(state, "P1", THE_WARRIOR_RETURNING_ALIVE_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });

    expect(result.errors[0]?.message).toBe("Target must be a Warrior monster.");
  });

  it("supports Monster Reincarnation discarding a card to add a monster from the Graveyard to hand", () => {
    const state = withGraveyardCards(
      stateWithPriority([MONSTER_REINCARNATION_ID, BATTLE_FOOTBALLER_ID, BATTLE_OX_ID]),
      [zoneCard("p1-monster-grave", BATTLE_OX_ID, "P1", { position: null })],
    );
    const source = requireHandCard(state, "P1", MONSTER_REINCARNATION_ID);
    const discard = state.players.P1.hand.find((card) => card.instanceId !== source.instanceId)!;
    const resolved = activateAndResolve(state, MONSTER_REINCARNATION_ID, {
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
      costInstanceIds: [discard.instanceId],
    });

    expect(getCardCoverage(cardById(MONSTER_REINCARNATION_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.hand.some((card) => card.instanceId === "p1-monster-grave")).toBe(true);
    expect(resolved.state.players.P1.graveyard).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: discard.instanceId }),
        expect.objectContaining({ cardId: MONSTER_REINCARNATION_ID }),
      ]),
    );
  });

  it("supports Block Attack changing an opponent face-up Attack Position monster to Defense Position", () => {
    const state = withFieldCards(stateWithPriority([BLOCK_ATTACK_ID, BATTLE_OX_ID]), {
      P2: {
        monsterZones: [zoneCard("p2-attacker", BATTLE_OX_ID, "P2", { face: "faceUp", position: "attack" }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, BLOCK_ATTACK_ID, {
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });

    expect(getCardCoverage(cardById(BLOCK_ATTACK_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({
      instanceId: "p2-attacker",
      position: "defense",
    });
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: BLOCK_ATTACK_ID }));
  });

  it("rejects Block Attack targeting a Defense Position monster", () => {
    const state = withFieldCards(stateWithPriority([BLOCK_ATTACK_ID, BATTLE_OX_ID]), {
      P2: {
        monsterZones: [zoneCard("p2-defender", BATTLE_OX_ID, "P2", { face: "faceUp", position: "defense" }), null, null, null, null],
      },
    });
    const source = requireHandCard(state, "P1", BLOCK_ATTACK_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports both Poison of the Old Man effect choices", () => {
    const gain = activateAndResolve(stateWithPriority([POISON_OF_THE_OLD_MAN_ID]), POISON_OF_THE_OLD_MAN_ID, {
      effectId: "gain-lp",
    });
    const damage = activateAndResolve(stateWithPriority([POISON_OF_THE_OLD_MAN_ID]), POISON_OF_THE_OLD_MAN_ID, {
      effectId: "damage-opponent",
    });

    expect(getCardCoverage(cardById(POISON_OF_THE_OLD_MAN_ID)).status).toBe("goatCustom");
    expect(gain.errors).toEqual([]);
    expect(gain.state.players.P1.lp).toBe(9200);
    expect(gain.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: POISON_OF_THE_OLD_MAN_ID }));
    expect(damage.errors).toEqual([]);
    expect(damage.state.players.P2.lp).toBe(7200);
    expect(damage.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: POISON_OF_THE_OLD_MAN_ID }));
  });

  it("supports Thousand Knives destroying one opponent monster while Dark Magician is face-up", () => {
    const state = withFieldCards(stateWithPriority([THOUSAND_KNIVES_ID, DARK_MAGICIAN_ID, BLUE_EYES_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-dark-magician", DARK_MAGICIAN_ID, "P1"), null, null, null, null],
      },
      P2: {
        monsterZones: [zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, THOUSAND_KNIVES_ID, {
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });

    expect(getCardCoverage(cardById(THOUSAND_KNIVES_ID)).status).toBe("goatCustom");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ instanceId: "p2-blue-eyes" });
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === THOUSAND_KNIVES_ID)).toBe(true);
  });

  it("rejects Thousand Knives without a face-up Dark Magician", () => {
    const state = withFieldCards(stateWithPriority([THOUSAND_KNIVES_ID, BLUE_EYES_ID]), {
      P2: {
        monsterZones: [zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
      },
    });
    const source = requireHandCard(state, "P1", THOUSAND_KNIVES_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports Spiritualism returning an opponent Spell or Trap Card to its owner's hand", () => {
    const state = withFieldCards(stateWithPriority([SPIRITUALISM_ID, MIRROR_FORCE_ID]), {
      P2: {
        spellTrapZones: [zoneCard("p2-spiritualism-target", MIRROR_FORCE_ID, "P2", { position: null }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, SPIRITUALISM_ID, {
      targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 0 }],
    });

    expect(getCardCoverage(cardById(SPIRITUALISM_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.hand).toContainEqual(expect.objectContaining({
      instanceId: "p2-spiritualism-target",
      cardId: MIRROR_FORCE_ID,
    }));
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === SPIRITUALISM_ID)).toBe(true);
  });

  it("rejects Spiritualism targeting your own Spell or Trap Card", () => {
    const state = withFieldCards(stateWithPriority([SPIRITUALISM_ID, MIRROR_FORCE_ID]), {
      P1: {
        spellTrapZones: [zoneCard("p1-spiritualism-wrong-target", MIRROR_FORCE_ID, "P1", { position: null }), null, null, null, null],
      },
    });
    const source = requireHandCard(state, "P1", SPIRITUALISM_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P1", zone: "spellTrapZone", index: 0 }],
    });

    expect(result.errors[0]?.message).toBe("Target controller does not match target requirements.");
    expect(result.state.chain).toHaveLength(0);
  });

  it("supports Stop Defense flipping an opponent monster face-up into Attack Position and opening its Flip Effect", () => {
    const state = withFieldCards(stateWithPriority([STOP_DEFENSE_ID, MAN_EATER_BUG_ID, BATTLE_OX_ID]), {
      P1: {
        monsterZones: [zoneCard("p1-stop-defense-target", BATTLE_OX_ID, "P1"), null, null, null, null],
      },
      P2: {
        monsterZones: [
          zoneCard("p2-stop-defense-man-eater", MAN_EATER_BUG_ID, "P2", {
            face: "faceDown",
            position: "defense",
            visibility: "hidden",
          }),
          null,
          null,
          null,
          null,
        ],
      },
    });
    const resolved = activateAndResolve(state, STOP_DEFENSE_ID, {
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });

    expect(getCardCoverage(cardById(STOP_DEFENSE_ID)).status).toBe("goatTemplate");
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({
      instanceId: "p2-stop-defense-man-eater",
      face: "faceUp",
      position: "attack",
      visibility: "public",
    });
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "monster-flipped-face-up",
      playerId: "P2",
      instanceId: "p2-stop-defense-man-eater",
      reason: "effect",
    }));
    expect(resolved.prompts[0]).toMatchObject({
      kind: "target",
      playerId: "P2",
    });
  });

  it("keeps unsupported Spell cards blocked from playable decks", () => {
    const graceful = cardById(GRACEFUL_CHARITY_ID);

    expect(getCardCoverage(graceful).status).toBe("goatUnsupported");
    expect(isPlayableCard(GRACEFUL_CHARITY_ID, cards)).toBe(false);

    const result = validateDeck(deckWithPriority([GRACEFUL_CHARITY_ID]), [...cards]);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Graceful Charity is not supported in playable decks.");
  });
});

function stateWithPriority(priorityIds: readonly string[]): DuelState {
  return advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    seed: "spell-card-tests",
    shuffleDecks: false,
  }).state);
}

function stateWithPriorityAllowUnsupported(priorityIds: readonly string[]): DuelState {
  return advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    seed: "spell-card-unsupported-fixture-tests",
    shuffleDecks: false,
    allowUnsupportedCards: true,
  }).state);
}

function stateWithPriorityAndExtra(priorityIds: readonly string[], extraIds: readonly string[]): DuelState {
  const mainDeck = deckWithPriority(priorityIds);

  return advanceToM1(createDuel({
    cards,
    decks: {
      P1: { ...mainDeck, extra: [...extraIds] },
      P2: deckWithPriority([]),
    },
    seed: "spell-card-extra-deck-tests",
    shuffleDecks: false,
    deckValidation: { allowExtraDeck: true },
  }).state);
}

function activateAndResolve(
  state: DuelState,
  cardId: string,
  options: {
    readonly effectId?: string;
    readonly targetRefs?: readonly ZoneRef[];
    readonly costInstanceIds?: readonly string[];
  } = {},
) {
  const source = requireHandCard(state, "P1", cardId);
  const activation = reduceDuel(state, {
    type: "activate-card",
    playerId: "P1",
    instanceId: source.instanceId,
    effectId: options.effectId,
    targetRefs: options.targetRefs,
    costInstanceIds: options.costInstanceIds,
  });

  expect(activation.errors).toEqual([]);

  return reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });
}

function withBanishedCards(state: DuelState, banished: readonly ZoneCard[]): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        banished,
        graveyard: [],
      },
    },
  };
}

function withGraveyardCards(state: DuelState, graveyard: readonly ZoneCard[]): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        graveyard,
      },
    },
  };
}

function withFieldCards(
  state: DuelState,
  patches: Partial<Record<"P1" | "P2", Partial<Pick<DuelState["players"]["P1"], "monsterZones" | "spellTrapZones" | "fieldZone">>>>,
): DuelState {
  return {
    ...state,
    players: {
      P1: {
        ...state.players.P1,
        ...patches.P1,
      },
      P2: {
        ...state.players.P2,
        ...patches.P2,
      },
    },
  };
}

function withLevelEightSentThisTurn(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        graveyard: [
          zoneCard("p1-level8-grave", BLUE_EYES_ID, "P1", {
            position: null,
            sentToGraveyardTurn: state.turn,
            sentToGraveyardFromController: "P1",
            sentToGraveyardFromZone: "monsterZone",
          }),
        ],
      },
    },
  };
}

function withBerserkDragonOnTopOfDeck(state: DuelState): DuelState {
  const berserk = requireHandCard(state, "P1", BERSERK_DRAGON_ID);

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: state.players.P1.hand.filter((card) => card.instanceId !== berserk.instanceId),
        mainDeck: [berserk, ...state.players.P1.mainDeck],
      },
    },
  };
}

function withMainDeckCard(state: DuelState, cardId: string): DuelState {
  const instance = cardInstance(`p1-deck-${cardId}`, cardId, "P1");

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: state.players.P1.hand.filter((card) => card.cardId !== cardId),
        mainDeck: [
          instance,
          ...state.players.P1.mainDeck.filter((card) => card.cardId !== cardId),
        ],
      },
    },
  };
}

function withMainDeckCards(state: DuelState, cardId: string, count: number): DuelState {
  const instances = Array.from({ length: count }, (_, index) => cardInstance(`p1-deck-${cardId}-${index + 1}`, cardId, "P1"));

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        mainDeck: [
          ...instances,
          ...state.players.P1.mainDeck.filter((card) => card.cardId !== cardId),
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
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;
  const main = reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;

  return reduceDuel(main, { type: "change-phase", playerId: "P1", phase: "BP" }).state;
}

function advanceToEndPhase(state: DuelState): DuelState {
  let current = state;

  for (const phase of ["BP", "M2", "EP"] as const) {
    current = reduceDuel(current, { type: "change-phase", playerId: "P1", phase }).state;
  }

  return current;
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
    ...overrides,
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

function cardById(cardId: string): CardRecord {
  const card = cards.find((candidate) => candidate.passcode === cardId);

  if (!card) {
    throw new Error(`Missing fixture cardId: ${cardId}`);
  }

  return card;
}

function monsterBaseStats(cardId: string): { readonly atk: number; readonly def: number } {
  const monster = cardById(cardId).monster;

  if (!monster || typeof monster.atk !== "number" || typeof monster.def !== "number") {
    throw new Error(`Expected monster stats for cardId: ${cardId}`);
  }

  return {
    atk: monster.atk,
    def: monster.def,
  };
}
