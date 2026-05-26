import type { CardCoverageRegistry } from "../coverage";
import type { CardEffectContext, CardScript } from "../CardScript";
import type { StatModifierSpec } from "../../effects/continuous";
import type { TargetSpec } from "../../effects/targets";
import type { PlayerId } from "../../types";
import { createContinuousSpellScript } from "../templates/continuousSpell";
import { createFieldSpellScript } from "../templates/fieldSpell";
import { createNormalSpellScript } from "../templates/normalSpell";
import { createQuickPlaySpellScript } from "../templates/quickPlaySpell";
import {
  BLACK_LUSTER_SOLDIER_ID,
  CRAB_TURTLE_ID,
  DOKURORIDER_ID,
  HUNGRY_BURGER_ID,
  PERFORMANCE_OF_SWORD_ID,
  SKULL_GUARDIAN_ID,
  THE_MASKED_BEAST_ID,
} from "./monsters";
export {
  BLACK_LUSTER_SOLDIER_ID,
  CRAB_TURTLE_ID,
  DOKURORIDER_ID,
  HUNGRY_BURGER_ID,
  PERFORMANCE_OF_SWORD_ID,
  SKULL_GUARDIAN_ID,
  THE_MASKED_BEAST_ID,
} from "./monsters";

export const INSECT_BARRIER_ID = "23615409";
export const A_DEAL_WITH_DARK_RULER_ID = "06850209";
export const A_FEATHER_OF_THE_PHOENIX_ID = "49140998";
export const A_WINGBEAT_OF_GIANT_DRAGON_ID = "28596933";
export const SEVEN_ID = "67048711";
export const SEVEN_COMPLETED_ID = "86198326";
export const BERSERK_DRAGON_ID = "85605684";
export const BLACK_ILLUSION_RITUAL_ID = "41426869";
export const RELINQUISHED_ID = "64631466";
export const BLACK_LUSTER_RITUAL_ID = "55761792";
export const CHAOS_GREED_ID = "97439308";
export const COMMENCEMENT_DANCE_ID = "43417563";
export const CONTRACT_WITH_EXODIA_ID = "33244944";
export const CONTRACT_WITH_THE_ABYSS_ID = "69035382";
export const CONTRACT_WITH_THE_DARK_MASTER_ID = "96420087";
export const DARK_MASTER_ZORC_ID = "97642679";
export const DARK_MAGICIAN_ID = "46986414";
export const DARK_MAGICIAN_GIRL_ID = "38033121";
export const DARK_MAGICIAN_KNIGHT_ID = "50725996";
export const DARK_MAGIC_ATTACK_ID = "02314238";
export const DE_SPELL_ID = "19159413";
export const CURSE_OF_THE_MASKED_BEAST_ID = "94377247";
export const DEDICATION_THROUGH_LIGHT_AND_DARKNESS_ID = "69542930";
export const DORIADOS_BLESSING_ID = "23965037";
export const ELEMENTAL_MISTRESS_DORIADO_ID = "99414168";
export const ELEGANT_EGOTIST_ID = "90219263";
export const EARTH_CHANT_ID = "59820352";
export const EMBLEM_OF_DRAGON_DESTROYER_ID = "06390406";
export const EXODIA_NECROSS_ID = "12600382";
export const POT_OF_GREED_ID = "55144522";
export const HEAVY_STORM_ID = "19613556";
export const MYSTICAL_SPACE_TYPHOON_ID = "05318639";
export const BOOK_OF_MOON_ID = "14087893";
export const BLOCK_ATTACK_ID = "25880422";
export const UPSTART_GOBLIN_ID = "70368879";
export const ACID_RAIN_ID = "21323861";
export const BALLISTA_OF_RAMPART_SMASHING_ID = "00242146";
export const BATTERY_CHARGER_ID = "61181383";
export const BLUE_MEDICINE_ID = "20871001";
export const DIAN_KETO_THE_CURE_MASTER_ID = "84257639";
export const GOBLINS_SECRET_REMEDY_ID = "11868825";
export const RED_MEDICINE_ID = "38199696";
export const EXILE_OF_THE_WICKED_ID = "26725158";
export const FAIRY_METEOR_CRUSH_ID = "97687912";
export const FINAL_DESTINY_ID = "18591904";
export const METEOR_OF_DESTRUCTION_ID = "33767325";
export const MONSTER_REINCARNATION_ID = "74848038";
export const FINAL_RITUAL_OF_THE_ANCIENTS_ID = "60369732";
export const RESHEF_THE_DARK_BEING_ID = "62420419";
export const FUSION_SAGE_ID = "26902560";
export const FUSION_WEAPON_ID = "27967615";
export const GATHER_YOUR_MIND_ID = "07512044";
export const HINOTAMA_ID = "46130346";
export const FINAL_FLAME_ID = "73134081";
export const OOKAZI_ID = "19523799";
export const GOBLIN_THIEF_ID = "45311864";
export const GEARFRIED_THE_IRON_KNIGHT_ID = "00423705";
export const GEARFRIED_THE_SWORDMASTER_ID = "57046845";
export const GRADIUS_ID = "10992251";
export const TREMENDOUS_FIRE_ID = "46918794";
export const RAIMEI_ID = "56260110";
export const REINFORCEMENT_OF_THE_ARMY_ID = "32807846";
export const HAMBURGER_RECIPE_ID = "80811661";
export const INCANDESCENT_ORDEAL_ID = "33031674";
export const LEGENDARY_FLAME_LORD_ID = "60258960";
export const KNIGHTS_TITLE_ID = "87210505";
export const BOOK_OF_TAIYOU_ID = "38699854";
export const SPARKS_ID = "76103675";
export const SOUL_OF_THE_PURE_ID = "47852924";
export const RAIN_OF_MERCY_ID = "66719324";
export const REMOVE_TRAP_ID = "51482758";
export const RELEASE_RESTRAINT_ID = "75417459";
export const RESTRUCTER_REVOLUTION_ID = "99518961";
export const POISON_OF_THE_OLD_MAN_ID = "08842266";
export const POLYMERIZATION_ID = "24094653";
export const EARTHQUAKE_ID = "82828051";
export const NOVOXS_PRAYER_ID = "43694075";
export const REVIVAL_OF_DOKURORIDER_ID = "31066283";
export const SHINATOS_ARK_ID = "60365591";
export const SHINATO_KING_OF_A_HIGHER_PLANE_ID = "86327225";
export const SHOOTING_STAR_BOW_CEAL_ID = "95638658";
export const CHAOS_END_ID = "61044390";
export const SPIRITUALISM_ID = "15866454";
export const STOP_DEFENSE_ID = "63102017";
export const TERRAFORMING_ID = "73628505";
export const TRIBUTE_TO_THE_DOOMED_ID = "79759861";
export const BACK_TO_SQUARE_ONE_ID = "47453433";
export const RUSH_RECKLESSLY_ID = "70046172";
export const BEAST_FANGS_ID = "46009906";
export const BLACK_PENDANT_ID = "65169794";
export const BOOK_OF_SECRET_ARTS_ID = "91595718";
export const BRAIN_CONTROL_ID = "87910978";
export const BURNING_SPEAR_ID = "18937875";
export const BURST_STREAM_OF_DESTRUCTION_ID = "17655904";
export const CYCLON_LASER_ID = "05494820";
export const DARK_ENERGY_ID = "04614116";
export const DARKNESS_APPROACHES_ID = "80168720";
export const DRAGON_TREASURE_ID = "01435851";
export const ELECTRO_WHIP_ID = "37820550";
export const ELFS_LIGHT_ID = "39897277";
export const FOLLOW_WIND_ID = "98252586";
export const FUHMA_SHURIKEN_ID = "09373534";
export const GUST_FAN_ID = "55321970";
export const INVIGORATION_ID = "98374133";
export const LASER_CANNON_ARMOR_ID = "77007920";
export const LEGENDARY_SWORD_ID = "61854111";
export const LIGHTNING_VORTEX_ID = "69162969";
export const LIGHTNING_BLADE_ID = "55226821";
export const MACHINE_CONVERSION_FACTORY_ID = "25769732";
export const MYSTICAL_MOON_ID = "36607978";
export const OPTI_CAMOUFLAGE_ARMOR_ID = "44762290";
export const OJAMA_DELTA_HURRICANE_ID = "08251996";
export const POWER_OF_KAISHIN_ID = "77027445";
export const RAISE_BODY_HEAT_ID = "51267887";
export const RISING_AIR_CURRENT_ID = "45778932";
export const RITUAL_WEAPON_ID = "54351224";
export const SALAMANDRA_ID = "32268901";
export const SAGES_STONE_ID = "13604200";
export const SILVER_BOW_AND_ARROW_ID = "01557499";
export const STEEL_SHELL_ID = "02370081";
export const SWORD_OF_DARK_DESTRUCTION_ID = "37120512";
export const VILE_GERMS_ID = "39774685";
export const VIOLET_CRYSTAL_ID = "15052462";
export const THE_WARRIOR_RETURNING_ALIVE_ID = "95281259";
export const THOUSAND_KNIVES_ID = "63391643";
export const TOON_TABLE_OF_CONTENTS_ID = "89997728";
export const TOON_WORLD_ID = "15259703";
export const TURTLE_OATH_ID = "76806714";
export const WHITE_DRAGON_RITUAL_ID = "09786492";
export const PALADIN_OF_WHITE_DRAGON_ID = "73398797";
export const THE_RELIABLE_GUARDIAN_ID = "16430187";
export const YELLOW_LUSTER_SHIELD_ID = "04542651";
export const FOREST_ID = "87430998";
export const GAIA_POWER_ID = "56594520";
export const LUMINOUS_SPARK_ID = "81777047";
export const MOLTEN_DESTRUCTION_ID = "19384334";
export const MOUNTAIN_ID = "50913601";
export const MYSTIC_PLASMA_ZONE_ID = "18161786";
export const SOGEN_ID = "86318356";
export const UMI_ID = "22702055";
export const UMIIRUKA_ID = "82999629";
export const WASTELAND_ID = "23424603";
export const YAMI_ID = "59197169";

const HARPIE_LADY_CARD_IDS = Object.freeze([
  "80316585",
  "76812113",
  "91932350",
  "27927359",
  "54415063",
] as const);

const EXODIA_PIECE_CARD_IDS = Object.freeze([
  "33396948",
  "70903634",
  "07902349",
  "08124921",
  "44519536",
] as const);

const BATTERYMAN_AA_ID = "63142001";
const BLUE_EYES_WHITE_DRAGON_ID = "89631139";
const BUSTER_BLADER_ID = "78193831";
const DARK_MAGICIAN_OF_CHAOS_ID = "40737112";
const OJAMA_BLACK_ID = "79335209";
const OJAMA_GREEN_ID = "12482652";
const OJAMA_YELLOW_ID = "42941100";
const NINJA_MONSTER_IDS = Object.freeze([
  "09076207",
  "14618326",
  "82005435",
  "04041838",
  "41006930",
  "01571945",
] as const);
const LEVEL_SIX_OR_LOWER_FUSION_MONSTER_IDS = Object.freeze([
  "37421579",
  "89112729",
  "80071763",
  "86805855",
  "13722870",
  "17881964",
  "28593363",
  "70681994",
  "35809262",
  "61204971",
  "15237615",
  "66235877",
  "58528964",
  "45231177",
  "95952802",
  "01641882",
  "51828629",
  "09653271",
  "54541900",
  "95144193",
  "09293977",
  "13803864",
  "56907389",
  "90140980",
  "74703140",
  "94905343",
  "85684223",
  "19066538",
  "49868263",
  "53539634",
  "75923050",
  "01412158",
  "63519819",
  "56413937",
  "02111707",
  "99724761",
  "25119460",
] as const);
const LEVEL_SIX_OR_LOWER_RITUAL_MONSTER_IDS = Object.freeze([
  "99721536",
  "99414168",
  "30243636",
  "73398797",
  "04849037",
  "64631466",
] as const);
const TOON_TABLE_SEARCH_CARD_IDS = Object.freeze([
  "53183600",
  "38369349",
  "59383041",
  "79875176",
  "43509019",
  "42386471",
  "15270885",
  "16392422",
  "65458948",
  "91842653",
  TOON_TABLE_OF_CONTENTS_ID,
  "15259703",
] as const);

const spellTrapTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["spellTrapZone", "fieldZone"] as const),
  cardKinds: Object.freeze(["spell", "trap"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const faceUpMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "faceUp" as const,
  min: 1,
  max: 1,
});

const anyMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const opponentMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "opponent" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const opponentSpellTrapTarget = Object.freeze({
  kind: "card" as const,
  controller: "opponent" as const,
  zones: Object.freeze(["spellTrapZone", "fieldZone"] as const),
  cardKinds: Object.freeze(["spell", "trap"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const opponentFaceUpMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "opponent" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "faceUp" as const,
  min: 1,
  max: 1,
});

const ritualMonsterAndTributesTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["hand", "monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any" as const,
  min: 2,
  max: 12,
});

const faceUpMachineMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "faceUp" as const,
  monsterType: "Machine",
  min: 1,
  max: 1,
});

const faceDownMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "faceDown" as const,
  min: 1,
  max: 1,
});

const faceUpTrapTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["spellTrapZone"] as const),
  cardKinds: Object.freeze(["trap"] as const),
  face: "faceUp" as const,
  min: 1,
  max: 1,
});

const ownBerserkDragonHandOrDeckTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["hand", "mainDeck"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  cardIds: Object.freeze([BERSERK_DRAGON_ID] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const ownGraveyardCardTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["graveyard"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const ownGraveyardWarriorMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["graveyard"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  monsterType: "Warrior",
  face: "any" as const,
  min: 1,
  max: 1,
});

const ownGraveyardMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["graveyard"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const ownMainDeckFieldSpellTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["mainDeck"] as const),
  cardKinds: Object.freeze(["spell"] as const),
  spellTrapIcon: "Field",
  face: "any" as const,
  min: 1,
  max: 1,
});

const ownMainDeckLevelFourOrLowerWarriorTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["mainDeck"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  monsterType: "Warrior",
  levelMax: 4,
  face: "any" as const,
  min: 1,
  max: 1,
});

function ownMainDeckSpellCardTarget(cardIds: readonly string[]): TargetSpec {
  return Object.freeze({
    kind: "card" as const,
    controller: "own" as const,
    zones: Object.freeze(["mainDeck"] as const),
    cardKinds: Object.freeze(["spell"] as const),
    cardIds: Object.freeze([...cardIds]),
    face: "any" as const,
    min: 1,
    max: 1,
  });
}

function ownMainDeckCardTarget(cardIds: readonly string[]): TargetSpec {
  return Object.freeze({
    kind: "card" as const,
    controller: "own" as const,
    zones: Object.freeze(["mainDeck"] as const),
    cardIds: Object.freeze([...cardIds]),
    face: "any" as const,
    min: 1,
    max: 1,
  });
}

function ownMonsterCardTarget(
  cardIds: readonly string[],
  zones: readonly ("hand" | "mainDeck" | "graveyard")[],
): TargetSpec {
  return Object.freeze({
    kind: "card" as const,
    controller: "own" as const,
    zones: Object.freeze([...zones]),
    cardKinds: Object.freeze(["monster"] as const),
    cardIds: Object.freeze([...cardIds]),
    face: "any" as const,
    min: 1,
    max: 1,
  });
}

const ownFaceUpLevelFiveOrHigherDragonTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "faceUp" as const,
  monsterType: "Dragon",
  levelMin: 5,
  min: 1,
  max: 1,
});

export const SPELL_CARD_SCRIPTS: readonly CardScript[] = Object.freeze([
  Object.freeze({
    cardId: A_DEAL_WITH_DARK_RULER_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "summon-berserk-dragon",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        targets: Object.freeze([ownBerserkDragonHandOrDeckTarget]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "special-summon-targets" as const, position: "attack" as const }),
          ]),
          sendSourceToGraveyard: true,
        }),
      }),
    ]),
    canActivate: canActivateADealWithDarkRuler,
  }),
  createNormalSpellScript({
    cardId: A_FEATHER_OF_THE_PHOENIX_ID,
    costs: Object.freeze([{ kind: "discard", count: 1 }]),
    targets: Object.freeze([ownGraveyardCardTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-deck-top" }]),
  }),
  createNormalSpellScript({
    cardId: A_WINGBEAT_OF_GIANT_DRAGON_ID,
    targets: Object.freeze([ownFaceUpLevelFiveOrHigherDragonTarget]),
    steps: Object.freeze([{ kind: "destroy-all-spells-traps-if-targets-returned-to-hand", controller: "all" }]),
  }),
  createNormalSpellScript({
    cardId: BRAIN_CONTROL_ID,
    costs: Object.freeze([{ kind: "pay-lp", amount: 800 }]),
    targets: Object.freeze([opponentFaceUpMonsterTarget]),
    steps: Object.freeze([{ kind: "take-control-of-targets", returnAtEndPhase: true }]),
  }),
  createNormalSpellScript({
    cardId: BLACK_ILLUSION_RITUAL_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([RELINQUISHED_ID]), requiredLevel: 1 },
    ]),
  }),
  createNormalSpellScript({
    cardId: BLACK_LUSTER_RITUAL_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([BLACK_LUSTER_SOLDIER_ID]), requiredLevel: 8 },
    ]),
  }),
  Object.freeze({
    cardId: SEVEN_COMPLETED_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "equip-atk",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: Object.freeze([faceUpMachineMonsterTarget]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "equip-source-to-target" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "equip-def",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: Object.freeze([faceUpMachineMonsterTarget]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "equip-source-to-target" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "equipped-atk-bonus",
        kind: "continuous",
        implemented: true,
        continuous: Object.freeze({
          statModifiers: Object.freeze([
            Object.freeze({
              stat: "atk" as const,
              amount: 700,
              target: Object.freeze({ attachedToSource: true, sourceEffectIds: Object.freeze(["equip-atk"] as const) }),
            }),
          ]),
        }),
      }),
      Object.freeze({
        id: "equipped-def-bonus",
        kind: "continuous",
        implemented: true,
        continuous: Object.freeze({
          statModifiers: Object.freeze([
            Object.freeze({
              stat: "def" as const,
              amount: 700,
              target: Object.freeze({ attachedToSource: true, sourceEffectIds: Object.freeze(["equip-def"] as const) }),
            }),
          ]),
        }),
      }),
    ]),
  }),
  Object.freeze({
    cardId: SEVEN_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "activate-continuous-seven",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "place-source-in-spell-trap-zone" as const }),
            Object.freeze({
              kind: "draw-then-destroy-controlled-face-up-card-id-if-count" as const,
              cardId: SEVEN_ID,
              count: 3,
              drawCount: 3,
            }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "field-to-graveyard-gain-lp",
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "chain-resolved",
          eventTypes: Object.freeze(["card-moved"] as const),
          sourceEvent: "self" as const,
          fromZones: Object.freeze(["spellTrapZone", "fieldZone"] as const),
          toZones: Object.freeze(["graveyard"] as const),
        }),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "lp-change" as const, player: "self" as const, amount: 700 }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  }),
  createFieldSpellScript({
    cardId: FOREST_ID,
    continuous: Object.freeze({
      statModifiers: fieldTypeStatModifiers(["Insect", "Beast", "Plant", "Beast-Warrior"], 200, 200),
    }),
  }),
  createFieldSpellScript({
    cardId: GAIA_POWER_ID,
    continuous: Object.freeze({
      statModifiers: fieldAttributeStatModifiers("EARTH", 500, -400),
    }),
  }),
  createFieldSpellScript({
    cardId: LUMINOUS_SPARK_ID,
    continuous: Object.freeze({
      statModifiers: fieldAttributeStatModifiers("LIGHT", 500, -400),
    }),
  }),
  createFieldSpellScript({
    cardId: MOLTEN_DESTRUCTION_ID,
    continuous: Object.freeze({
      statModifiers: fieldAttributeStatModifiers("FIRE", 500, -400),
    }),
  }),
  createFieldSpellScript({
    cardId: MOUNTAIN_ID,
    continuous: Object.freeze({
      statModifiers: fieldTypeStatModifiers(["Dragon", "Winged Beast", "Thunder"], 200, 200),
    }),
  }),
  createFieldSpellScript({
    cardId: MYSTIC_PLASMA_ZONE_ID,
    continuous: Object.freeze({
      statModifiers: fieldAttributeStatModifiers("DARK", 500, -400),
    }),
  }),
  createFieldSpellScript({
    cardId: SOGEN_ID,
    continuous: Object.freeze({
      statModifiers: fieldTypeStatModifiers(["Beast-Warrior", "Warrior"], 200, 200),
    }),
  }),
  createFieldSpellScript({
    cardId: UMI_ID,
    continuous: Object.freeze({
      statModifiers: Object.freeze([
        ...fieldTypeStatModifiers(["Fish", "Sea Serpent", "Thunder", "Aqua"], 200, 200),
        ...fieldTypeStatModifiers(["Machine", "Pyro"], -200, -200),
      ]),
    }),
  }),
  createFieldSpellScript({
    cardId: UMIIRUKA_ID,
    continuous: Object.freeze({
      statModifiers: fieldAttributeStatModifiers("WATER", 500, -400),
    }),
  }),
  createFieldSpellScript({
    cardId: RISING_AIR_CURRENT_ID,
    continuous: Object.freeze({
      statModifiers: fieldAttributeStatModifiers("WIND", 500, -400),
    }),
  }),
  createFieldSpellScript({
    cardId: WASTELAND_ID,
    continuous: Object.freeze({
      statModifiers: fieldTypeStatModifiers(["Dinosaur", "Zombie", "Rock"], 200, 200),
    }),
  }),
  createFieldSpellScript({
    cardId: YAMI_ID,
    continuous: Object.freeze({
      statModifiers: Object.freeze([
        ...fieldTypeStatModifiers(["Fiend", "Spellcaster"], 200, 200),
        ...fieldTypeStatModifiers(["Fairy"], -200, -200),
      ]),
    }),
  }),
  createEquipStatSpellScript(BEAST_FANGS_ID, faceUpMonsterTypeTarget("Beast"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatBurnOnGraveyardScript(BLACK_PENDANT_ID, faceUpMonsterTarget, [
    equipStatModifier("atk", 500),
  ], 500),
  createEquipStatSpellScript(BOOK_OF_SECRET_ARTS_ID, faceUpMonsterTypeTarget("Spellcaster"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatSpellScript(BURNING_SPEAR_ID, faceUpMonsterAttributeTarget("FIRE"), [
    equipStatModifier("atk", 400),
    equipStatModifier("def", -200),
  ]),
  createEquipContinuousSpellScript({
    cardId: BALLISTA_OF_RAMPART_SMASHING_ID,
    continuous: Object.freeze({
      statModifiers: Object.freeze([
        Object.freeze({
          stat: "atk" as const,
          amount: 1500,
          target: Object.freeze({
            attachedToSource: true,
            sourceEffectIds: Object.freeze(["equip"] as const),
            attackingFaceDownDefenseMonster: true,
          }),
        }),
      ]),
    }),
  }),
  createEquipContinuousSpellScript({
    cardId: CYCLON_LASER_ID,
    target: faceUpMonsterCardTarget(GRADIUS_ID),
    continuous: Object.freeze({
      statModifiers: Object.freeze([
        equipStatModifier("atk", 300),
      ]),
      piercingDamage: Object.freeze([
        Object.freeze({
          target: Object.freeze({ attachedToSource: true, sourceEffectIds: Object.freeze(["equip"] as const) }),
        }),
      ]),
    }),
  }),
  createEquipContinuousSpellScript({
    cardId: FAIRY_METEOR_CRUSH_ID,
    continuous: Object.freeze({
      piercingDamage: Object.freeze([
        Object.freeze({
          target: Object.freeze({ attachedToSource: true, sourceEffectIds: Object.freeze(["equip"] as const) }),
        }),
      ]),
    }),
  }),
  createEquipStatSpellScript(SALAMANDRA_ID, faceUpMonsterAttributeTarget("FIRE"), [
    equipStatModifier("atk", 700),
  ]),
  createEquipStatSpellScript(DARK_ENERGY_ID, faceUpMonsterTypeTarget("Fiend"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatSpellScript(DRAGON_TREASURE_ID, faceUpMonsterTypeTarget("Dragon"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatSpellScript(ELECTRO_WHIP_ID, faceUpMonsterTypeTarget("Thunder"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatSpellScript(ELFS_LIGHT_ID, faceUpMonsterAttributeTarget("LIGHT"), [
    equipStatModifier("atk", 400),
    equipStatModifier("def", -200),
  ]),
  createEquipStatSpellScript(FOLLOW_WIND_ID, faceUpMonsterTypeTarget("Winged Beast"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatBurnOnGraveyardScript(FUHMA_SHURIKEN_ID, faceUpMonsterCardsTarget(NINJA_MONSTER_IDS), [
    equipStatModifier("atk", 700),
  ], 700),
  createEquipStatSpellScript(FUSION_WEAPON_ID, faceUpMonsterCardsTarget(LEVEL_SIX_OR_LOWER_FUSION_MONSTER_IDS), [
    equipStatModifier("atk", 1500),
    equipStatModifier("def", 1500),
  ]),
  createEquipStatSpellScript(GUST_FAN_ID, faceUpMonsterAttributeTarget("WIND"), [
    equipStatModifier("atk", 400),
    equipStatModifier("def", -200),
  ]),
  createEquipStatSpellScript(INVIGORATION_ID, faceUpMonsterAttributeTarget("EARTH"), [
    equipStatModifier("atk", 400),
    equipStatModifier("def", -200),
  ]),
  createEquipStatSpellScript(LASER_CANNON_ARMOR_ID, faceUpMonsterTypeTarget("Insect"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatSpellScript(LEGENDARY_SWORD_ID, faceUpMonsterTypeTarget("Warrior"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipContinuousSpellScript({
    cardId: LIGHTNING_BLADE_ID,
    target: faceUpMonsterTypeTarget("Warrior"),
    continuous: Object.freeze({
      statModifiers: Object.freeze([
        equipStatModifier("atk", 800),
        Object.freeze({
          stat: "atk" as const,
          amount: -500,
          target: Object.freeze({
            face: "faceUp" as const,
            attribute: "WATER",
          }),
        }),
      ]),
    }),
  }),
  createEquipStatSpellScript(MACHINE_CONVERSION_FACTORY_ID, faceUpMonsterTypeTarget("Machine"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatSpellScript(MYSTICAL_MOON_ID, faceUpMonsterTypeTarget("Beast-Warrior"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipContinuousSpellScript({
    cardId: OPTI_CAMOUFLAGE_ARMOR_ID,
    target: faceUpLevelOneMonsterTarget(),
    continuous: Object.freeze({
      directAttack: Object.freeze([
        Object.freeze({
          target: Object.freeze({ attachedToSource: true, sourceEffectIds: Object.freeze(["equip"] as const) }),
        }),
      ]),
    }),
  }),
  createEquipStatSpellScript(POWER_OF_KAISHIN_ID, faceUpMonsterTypeTarget("Aqua"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatSpellScript(RAISE_BODY_HEAT_ID, faceUpMonsterTypeTarget("Dinosaur"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatSpellScript(RITUAL_WEAPON_ID, faceUpMonsterCardsTarget(LEVEL_SIX_OR_LOWER_RITUAL_MONSTER_IDS), [
    equipStatModifier("atk", 1500),
    equipStatModifier("def", 1500),
  ]),
  createEquipStatSpellScript(SILVER_BOW_AND_ARROW_ID, faceUpMonsterTypeTarget("Fairy"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipContinuousSpellScript({
    cardId: SHOOTING_STAR_BOW_CEAL_ID,
    continuous: Object.freeze({
      statModifiers: Object.freeze([
        equipStatModifier("atk", -1000),
      ]),
      directAttack: Object.freeze([
        Object.freeze({
          target: Object.freeze({ attachedToSource: true, sourceEffectIds: Object.freeze(["equip"] as const) }),
        }),
      ]),
    }),
  }),
  createEquipStatSpellScript(STEEL_SHELL_ID, faceUpMonsterAttributeTarget("WATER"), [
    equipStatModifier("atk", 400),
    equipStatModifier("def", -200),
  ]),
  createEquipStatSpellScript(SWORD_OF_DARK_DESTRUCTION_ID, faceUpMonsterAttributeTarget("DARK"), [
    equipStatModifier("atk", 400),
    equipStatModifier("def", -200),
  ]),
  createEquipStatSpellScript(VILE_GERMS_ID, faceUpMonsterTypeTarget("Plant"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createEquipStatSpellScript(VIOLET_CRYSTAL_ID, faceUpMonsterTypeTarget("Zombie"), [
    equipStatModifier("atk", 300),
    equipStatModifier("def", 300),
  ]),
  createNormalSpellScript({
    cardId: POT_OF_GREED_ID,
    steps: Object.freeze([{ kind: "draw", player: "self", count: 2 }]),
  }),
  withActivationCheck(
    createNormalSpellScript({
      cardId: CHAOS_GREED_ID,
      steps: Object.freeze([{ kind: "draw", player: "self", count: 2 }]),
    }),
    canActivateChaosGreed,
  ),
  createNormalSpellScript({
    cardId: COMMENCEMENT_DANCE_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([PERFORMANCE_OF_SWORD_ID]), requiredLevel: 6 },
    ]),
  }),
  createNormalSpellScript({
    cardId: CONTRACT_WITH_THE_ABYSS_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterAttribute: "DARK", levelRequirement: "exact" },
    ]),
  }),
  createNormalSpellScript({
    cardId: CONTRACT_WITH_THE_DARK_MASTER_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([DARK_MASTER_ZORC_ID]), requiredLevel: 8 },
    ]),
  }),
  createNormalSpellScript({
    cardId: CURSE_OF_THE_MASKED_BEAST_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([THE_MASKED_BEAST_ID]), requiredLevel: 8 },
    ]),
  }),
  createNormalSpellScript({
    cardId: HEAVY_STORM_ID,
    steps: Object.freeze([{ kind: "destroy-all-spells-traps", controller: "all" }]),
  }),
  withActivationCheck(
    createNormalSpellScript({
      cardId: DARK_MAGIC_ATTACK_ID,
      steps: Object.freeze([{ kind: "destroy-all-spells-traps", controller: "opponent" }]),
    }),
    canActivateWithFaceUpDarkMagician,
  ),
  withActivationCheck(
    createNormalSpellScript({
      cardId: DE_SPELL_ID,
      targets: Object.freeze([spellTrapTarget]),
      steps: Object.freeze([{ kind: "destroy-targets-if-spell" }]),
    }),
    canActivateDeSpell,
  ),
  withActivationCheck(
    createNormalSpellScript({
      cardId: ELEGANT_EGOTIST_ID,
      targets: Object.freeze([ownMonsterCardTarget([...HARPIE_LADY_CARD_IDS, "12206212"], ["hand", "mainDeck"])]),
      steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
    }),
    canActivateElegantEgotist,
  ),
  createQuickPlaySpellScript({
    cardId: MYSTICAL_SPACE_TYPHOON_ID,
    targets: Object.freeze([spellTrapTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createQuickPlaySpellScript({
    cardId: BOOK_OF_MOON_ID,
    targets: Object.freeze([faceUpMonsterTarget]),
    steps: Object.freeze([{ kind: "set-face", face: "faceDown", position: "defense" }]),
  }),
  createQuickPlaySpellScript({
    cardId: RUSH_RECKLESSLY_ID,
    targets: Object.freeze([faceUpMonsterTarget]),
    steps: Object.freeze([
      {
        kind: "add-lingering-stat-modifiers-to-targets",
        modifiers: Object.freeze([{ stat: "atk" as const, amount: 700 }]),
      },
    ]),
  }),
  createQuickPlaySpellScript({
    cardId: THE_RELIABLE_GUARDIAN_ID,
    targets: Object.freeze([faceUpMonsterTarget]),
    steps: Object.freeze([
      {
        kind: "add-lingering-stat-modifiers-to-targets",
        modifiers: Object.freeze([{ stat: "def" as const, amount: 700 }]),
      },
    ]),
  }),
  withActivationCheck(
    createNormalSpellScript({
      cardId: BLOCK_ATTACK_ID,
      targets: Object.freeze([opponentFaceUpMonsterTarget]),
      steps: Object.freeze([{ kind: "change-position", position: "defense" }]),
    }),
    canActivateBlockAttack,
  ),
  createNormalSpellScript({
    cardId: DARKNESS_APPROACHES_ID,
    costs: Object.freeze([{ kind: "discard", count: 2 }]),
    targets: Object.freeze([faceUpMonsterTarget]),
    steps: Object.freeze([{ kind: "set-face", face: "faceDown" }]),
  }),
  createNormalSpellScript({
    cardId: DORIADOS_BLESSING_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([ELEMENTAL_MISTRESS_DORIADO_ID]), requiredLevel: 3 },
    ]),
  }),
  createNormalSpellScript({
    cardId: EARTH_CHANT_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterAttribute: "EARTH", levelRequirement: "exact" },
    ]),
  }),
  createNormalSpellScript({
    cardId: UPSTART_GOBLIN_ID,
    steps: Object.freeze([
      { kind: "draw", player: "self", count: 1 },
      { kind: "lp-change", player: "opponent", amount: 1000 },
    ]),
  }),
  createNormalSpellScript({
    cardId: ACID_RAIN_ID,
    steps: Object.freeze([
      { kind: "destroy-face-up-monsters-by-type", monsterType: "Machine" },
    ]),
  }),
  createNormalSpellScript({
    cardId: BLUE_MEDICINE_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "self", amount: 400 }]),
  }),
  createNormalSpellScript({
    cardId: DIAN_KETO_THE_CURE_MASTER_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "self", amount: 1000 }]),
  }),
  createNormalSpellScript({
    cardId: GOBLINS_SECRET_REMEDY_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "self", amount: 600 }]),
  }),
  createNormalSpellScript({
    cardId: RED_MEDICINE_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "self", amount: 500 }]),
  }),
  withActivationCheck(
    createNormalSpellScript({
      cardId: METEOR_OF_DESTRUCTION_ID,
      steps: Object.freeze([{ kind: "lp-change", player: "opponent", amount: -1000 }]),
    }),
    canActivateMeteorOfDestruction,
  ),
  createNormalSpellScript({
    cardId: FINAL_RITUAL_OF_THE_ANCIENTS_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([RESHEF_THE_DARK_BEING_ID]), requiredLevel: 8 },
    ]),
  }),
  createNormalSpellScript({
    cardId: EXILE_OF_THE_WICKED_ID,
    steps: Object.freeze([
      { kind: "destroy-face-up-monsters-by-type", monsterType: "Fiend" },
    ]),
  }),
  createNormalSpellScript({
    cardId: HINOTAMA_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "opponent", amount: -500 }]),
  }),
  createNormalSpellScript({
    cardId: FINAL_FLAME_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "opponent", amount: -600 }]),
  }),
  createNormalSpellScript({
    cardId: FINAL_DESTINY_ID,
    costs: Object.freeze([{ kind: "discard", count: 5 }]),
    steps: Object.freeze([
      { kind: "destroy-all-monsters", controller: "all" },
      { kind: "destroy-all-spells-traps", controller: "all" },
    ]),
  }),
  withActivationCheck(
    createNormalSpellScript({
      cardId: BURST_STREAM_OF_DESTRUCTION_ID,
      steps: Object.freeze([
        { kind: "destroy-all-monsters", controller: "opponent" },
        {
          kind: "add-lingering-effect",
          lingering: Object.freeze({
            duration: "until-end-phase",
            attackRestrictions: Object.freeze([
              Object.freeze({
                target: Object.freeze({
                  controller: "own" as const,
                  cardIds: Object.freeze([BLUE_EYES_WHITE_DRAGON_ID] as const),
                }),
                reason: "Blue-Eyes White Dragon cannot attack this turn after Burst Stream of Destruction resolves.",
              }),
            ]),
          }),
        },
      ]),
    }),
    canActivateWithFaceUpBlueEyesWhiteDragon,
  ),
  withActivationCheck(
    createNormalSpellScript({
      cardId: CHAOS_END_ID,
      steps: Object.freeze([{ kind: "destroy-all-monsters", controller: "all" }]),
    }),
    canActivateChaosEnd,
  ),
  createNormalSpellScript({
    cardId: LIGHTNING_VORTEX_ID,
    costs: Object.freeze([{ kind: "discard", count: 1 }]),
    steps: Object.freeze([{ kind: "destroy-face-up-monsters", controller: "opponent" }]),
  }),
  createNormalSpellScript({
    cardId: OOKAZI_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "opponent", amount: -800 }]),
  }),
  createNormalSpellScript({
    cardId: GOBLIN_THIEF_ID,
    steps: Object.freeze([
      { kind: "lp-change", player: "opponent", amount: -500 },
      { kind: "lp-change", player: "self", amount: 500 },
    ]),
  }),
  createNormalSpellScript({
    cardId: TREMENDOUS_FIRE_ID,
    steps: Object.freeze([
      { kind: "lp-change", player: "opponent", amount: -1000 },
      { kind: "lp-change", player: "self", amount: -500 },
    ]),
  }),
  createNormalSpellScript({
    cardId: RAIMEI_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "opponent", amount: -300 }]),
  }),
  createNormalSpellScript({
    cardId: HAMBURGER_RECIPE_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([HUNGRY_BURGER_ID]), requiredLevel: 6 },
    ]),
  }),
  createNormalSpellScript({
    cardId: INCANDESCENT_ORDEAL_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([LEGENDARY_FLAME_LORD_ID]), requiredLevel: 7 },
    ]),
  }),
  createNormalSpellScript({
    cardId: BOOK_OF_TAIYOU_ID,
    targets: Object.freeze([faceDownMonsterTarget]),
    steps: Object.freeze([{ kind: "set-face", face: "faceUp", position: "attack" }]),
  }),
  createNormalSpellScript({
    cardId: STOP_DEFENSE_ID,
    targets: Object.freeze([opponentMonsterTarget]),
    steps: Object.freeze([{ kind: "set-face", face: "faceUp", position: "attack" }]),
  }),
  createNormalSpellScript({
    cardId: SPARKS_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "opponent", amount: -200 }]),
  }),
  createNormalSpellScript({
    cardId: SOUL_OF_THE_PURE_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "self", amount: 800 }]),
  }),
  createNormalSpellScript({
    cardId: RAIN_OF_MERCY_ID,
    steps: Object.freeze([
      { kind: "lp-change", player: "self", amount: 1000 },
      { kind: "lp-change", player: "opponent", amount: 1000 },
    ]),
  }),
  createNormalSpellScript({
    cardId: REMOVE_TRAP_ID,
    targets: Object.freeze([faceUpTrapTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createNormalSpellScript({
    cardId: RESTRUCTER_REVOLUTION_ID,
    steps: Object.freeze([
      { kind: "lp-change-by-count", player: "opponent", amountPer: -200, count: "opponent-hand-cards" },
    ]),
  }),
  Object.freeze({
    cardId: POISON_OF_THE_OLD_MAN_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "gain-lp",
        kind: "quick" as const,
        implemented: true,
        spellSpeed: 2 as const,
        resolution: Object.freeze({
          steps: Object.freeze([{ kind: "lp-change" as const, player: "self" as const, amount: 1200 }]),
          sendSourceToGraveyard: true,
        }),
      }),
      Object.freeze({
        id: "damage-opponent",
        kind: "quick" as const,
        implemented: true,
        spellSpeed: 2 as const,
        resolution: Object.freeze({
          steps: Object.freeze([{ kind: "lp-change" as const, player: "opponent" as const, amount: -800 }]),
          sendSourceToGraveyard: true,
        }),
      }),
    ]),
  }),
  createContinuousSpellScript({
    cardId: YELLOW_LUSTER_SHIELD_ID,
    continuous: {
      statModifiers: Object.freeze([
        Object.freeze({
          stat: "def" as const,
          amount: 300,
          target: Object.freeze({ controller: "own" as const, face: "faceUp" as const }),
        }),
      ]),
    },
  }),
  createContinuousSpellScript({
    cardId: INSECT_BARRIER_ID,
    continuous: {
      attackRestrictions: Object.freeze([
        Object.freeze({
          target: Object.freeze({ monsterType: "Insect", controller: "opponent" } as const),
          reason: "Your opponent's Insect-Type monsters cannot attack while Insect Barrier is face-up.",
        }),
      ]),
    },
  }),
  Object.freeze({
    cardId: TOON_WORLD_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "activate",
        kind: "ignition" as const,
        implemented: true,
        spellSpeed: 1 as const,
        costs: Object.freeze([{ kind: "pay-lp" as const, amount: 1000 }]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "place-source-in-spell-trap-zone" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  }),
  createNormalSpellScript({
    cardId: NOVOXS_PRAYER_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([SKULL_GUARDIAN_ID]), requiredLevel: 7 },
    ]),
  }),
  createNormalSpellScript({
    cardId: REVIVAL_OF_DOKURORIDER_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([DOKURORIDER_ID]), requiredLevel: 6 },
    ]),
  }),
  createNormalSpellScript({
    cardId: SHINATOS_ARK_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([SHINATO_KING_OF_A_HIGHER_PLANE_ID]), requiredLevel: 8 },
    ]),
  }),
  createNormalSpellScript({
    cardId: EARTHQUAKE_ID,
    steps: Object.freeze([
      { kind: "change-position-all-face-up-monsters", controller: "all", position: "defense" },
    ]),
  }),
  createNormalSpellScript({
    cardId: TRIBUTE_TO_THE_DOOMED_ID,
    costs: Object.freeze([{ kind: "discard", count: 1 }]),
    targets: Object.freeze([anyMonsterTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createNormalSpellScript({
    cardId: BACK_TO_SQUARE_ONE_ID,
    costs: Object.freeze([{ kind: "discard", count: 1 }]),
    targets: Object.freeze([anyMonsterTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-deck-top" }]),
  }),
  createNormalSpellScript({
    cardId: THE_WARRIOR_RETURNING_ALIVE_ID,
    targets: Object.freeze([ownGraveyardWarriorMonsterTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createNormalSpellScript({
    cardId: REINFORCEMENT_OF_THE_ARMY_ID,
    targets: Object.freeze([ownMainDeckLevelFourOrLowerWarriorTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createNormalSpellScript({
    cardId: EMBLEM_OF_DRAGON_DESTROYER_ID,
    targets: Object.freeze([ownMonsterCardTarget([BUSTER_BLADER_ID], ["mainDeck", "graveyard"])]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createNormalSpellScript({
    cardId: TOON_TABLE_OF_CONTENTS_ID,
    targets: Object.freeze([ownMainDeckCardTarget(TOON_TABLE_SEARCH_CARD_IDS)]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createNormalSpellScript({
    cardId: SPIRITUALISM_ID,
    cannotBeNegated: true,
    targets: Object.freeze([opponentSpellTrapTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createNormalSpellScript({
    cardId: TERRAFORMING_ID,
    targets: Object.freeze([ownMainDeckFieldSpellTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createNormalSpellScript({
    cardId: FUSION_SAGE_ID,
    targets: Object.freeze([ownMainDeckSpellCardTarget([POLYMERIZATION_ID])]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createNormalSpellScript({
    cardId: GATHER_YOUR_MIND_ID,
    targets: Object.freeze([ownMainDeckSpellCardTarget([GATHER_YOUR_MIND_ID])]),
    oncePerTurn: Object.freeze({ scope: "card" as const }),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  withActivationCheck(
    createNormalSpellScript({
      cardId: OJAMA_DELTA_HURRICANE_ID,
      steps: Object.freeze([
        { kind: "destroy-all-monsters", controller: "opponent" },
        { kind: "destroy-all-spells-traps", controller: "opponent" },
      ]),
    }),
    canActivateOjamaDeltaHurricane,
  ),
  createNormalSpellScript({
    cardId: RELEASE_RESTRAINT_ID,
    costs: Object.freeze([{ kind: "tribute-matching-face-up-card" as const, cardId: GEARFRIED_THE_IRON_KNIGHT_ID, count: 1 }]),
    targets: Object.freeze([ownMonsterCardTarget([GEARFRIED_THE_SWORDMASTER_ID], ["hand", "mainDeck"])]),
    steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
  }),
  createNormalSpellScript({
    cardId: KNIGHTS_TITLE_ID,
    costs: Object.freeze([{ kind: "tribute-matching-face-up-card" as const, cardId: DARK_MAGICIAN_ID, count: 1 }]),
    targets: Object.freeze([ownMonsterCardTarget([DARK_MAGICIAN_KNIGHT_ID], ["hand", "mainDeck", "graveyard"])]),
    steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
  }),
  withActivationCheck(
    createNormalSpellScript({
      cardId: SAGES_STONE_ID,
      targets: Object.freeze([ownMonsterCardTarget([DARK_MAGICIAN_ID], ["hand", "mainDeck"])]),
      steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
    }),
    canActivateSagesStone,
  ),
  withActivationCheck(
    createNormalSpellScript({
      cardId: CONTRACT_WITH_EXODIA_ID,
      targets: Object.freeze([ownMonsterCardTarget([EXODIA_NECROSS_ID], ["hand"])]),
      steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
    }),
    canActivateContractWithExodia,
  ),
  createNormalSpellScript({
    cardId: MONSTER_REINCARNATION_ID,
    costs: Object.freeze([{ kind: "discard", count: 1 }]),
    targets: Object.freeze([ownGraveyardMonsterTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createNormalSpellScript({
    cardId: BATTERY_CHARGER_ID,
    costs: Object.freeze([{ kind: "pay-lp", amount: 500 }]),
    targets: Object.freeze([ownMonsterCardTarget([BATTERYMAN_AA_ID], ["graveyard"])]),
    steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
  }),
  createQuickPlaySpellScript({
    cardId: DEDICATION_THROUGH_LIGHT_AND_DARKNESS_ID,
    costs: Object.freeze([{ kind: "tribute-matching-face-up-card" as const, cardId: DARK_MAGICIAN_ID, count: 1 }]),
    targets: Object.freeze([ownMonsterCardTarget([DARK_MAGICIAN_OF_CHAOS_ID], ["hand", "mainDeck", "graveyard"])]),
    steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
  }),
  withActivationCheck(
    createNormalSpellScript({
      cardId: THOUSAND_KNIVES_ID,
      targets: Object.freeze([opponentMonsterTarget]),
      steps: Object.freeze([{ kind: "destroy-targets" }]),
    }),
    canActivateWithFaceUpDarkMagician,
  ),
  createNormalSpellScript({
    cardId: TURTLE_OATH_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([CRAB_TURTLE_ID]), requiredLevel: 8 },
    ]),
  }),
  createNormalSpellScript({
    cardId: WHITE_DRAGON_RITUAL_ID,
    targets: Object.freeze([ritualMonsterAndTributesTarget]),
    steps: Object.freeze([
      { kind: "ritual-summon", ritualMonsterCardIds: Object.freeze([PALADIN_OF_WHITE_DRAGON_ID]), requiredLevel: 4 },
    ]),
  }),
]);

export const SPELL_CARD_COVERAGE: CardCoverageRegistry = Object.freeze({
  [A_DEAL_WITH_DARK_RULER_ID]: "goatCustom",
  [A_FEATHER_OF_THE_PHOENIX_ID]: "goatTemplate",
  [A_WINGBEAT_OF_GIANT_DRAGON_ID]: "goatTemplate",
  [BLACK_ILLUSION_RITUAL_ID]: "goatTemplate",
  [BLACK_LUSTER_RITUAL_ID]: "goatTemplate",
  [CHAOS_GREED_ID]: "goatCustom",
  [COMMENCEMENT_DANCE_ID]: "goatTemplate",
  [CONTRACT_WITH_EXODIA_ID]: "goatCustom",
  [CONTRACT_WITH_THE_ABYSS_ID]: "goatTemplate",
  [CONTRACT_WITH_THE_DARK_MASTER_ID]: "goatTemplate",
  [CURSE_OF_THE_MASKED_BEAST_ID]: "goatTemplate",
  [DARK_MAGIC_ATTACK_ID]: "goatCustom",
  [DE_SPELL_ID]: "goatCustom",
  [DEDICATION_THROUGH_LIGHT_AND_DARKNESS_ID]: "goatTemplate",
  [DORIADOS_BLESSING_ID]: "goatTemplate",
  [ELEGANT_EGOTIST_ID]: "goatCustom",
  [EARTH_CHANT_ID]: "goatTemplate",
  [EMBLEM_OF_DRAGON_DESTROYER_ID]: "goatTemplate",
  [SEVEN_COMPLETED_ID]: "goatCustom",
  [SEVEN_ID]: "goatCustom",
  [FOREST_ID]: "goatTemplate",
  [GAIA_POWER_ID]: "goatTemplate",
  [LUMINOUS_SPARK_ID]: "goatTemplate",
  [MOLTEN_DESTRUCTION_ID]: "goatTemplate",
  [MOUNTAIN_ID]: "goatTemplate",
  [MYSTIC_PLASMA_ZONE_ID]: "goatTemplate",
  [SOGEN_ID]: "goatTemplate",
  [UMI_ID]: "goatTemplate",
  [UMIIRUKA_ID]: "goatTemplate",
  [RISING_AIR_CURRENT_ID]: "goatTemplate",
  [WASTELAND_ID]: "goatTemplate",
  [YAMI_ID]: "goatTemplate",
  [BEAST_FANGS_ID]: "goatTemplate",
  [BLACK_PENDANT_ID]: "goatCustom",
  [BOOK_OF_SECRET_ARTS_ID]: "goatTemplate",
  [BRAIN_CONTROL_ID]: "goatTemplate",
  [BURST_STREAM_OF_DESTRUCTION_ID]: "goatCustom",
  [BATTERY_CHARGER_ID]: "goatTemplate",
  [BURNING_SPEAR_ID]: "goatTemplate",
  [DARK_ENERGY_ID]: "goatTemplate",
  [DARKNESS_APPROACHES_ID]: "goatTemplate",
  [DRAGON_TREASURE_ID]: "goatTemplate",
  [ELECTRO_WHIP_ID]: "goatTemplate",
  [ELFS_LIGHT_ID]: "goatTemplate",
  [FAIRY_METEOR_CRUSH_ID]: "goatCustom",
  [FOLLOW_WIND_ID]: "goatTemplate",
  [FUHMA_SHURIKEN_ID]: "goatCustom",
  [FUSION_WEAPON_ID]: "goatTemplate",
  [GUST_FAN_ID]: "goatTemplate",
  [INVIGORATION_ID]: "goatTemplate",
  [LASER_CANNON_ARMOR_ID]: "goatTemplate",
  [LEGENDARY_SWORD_ID]: "goatTemplate",
  [MACHINE_CONVERSION_FACTORY_ID]: "goatTemplate",
  [MYSTICAL_MOON_ID]: "goatTemplate",
  [POWER_OF_KAISHIN_ID]: "goatTemplate",
  [RAISE_BODY_HEAT_ID]: "goatTemplate",
  [RITUAL_WEAPON_ID]: "goatTemplate",
  [SALAMANDRA_ID]: "goatTemplate",
  [SHOOTING_STAR_BOW_CEAL_ID]: "goatCustom",
  [SILVER_BOW_AND_ARROW_ID]: "goatTemplate",
  [SPIRITUALISM_ID]: "goatTemplate",
  [STEEL_SHELL_ID]: "goatTemplate",
  [STOP_DEFENSE_ID]: "goatTemplate",
  [SWORD_OF_DARK_DESTRUCTION_ID]: "goatTemplate",
  [VILE_GERMS_ID]: "goatTemplate",
  [VIOLET_CRYSTAL_ID]: "goatTemplate",
  [POT_OF_GREED_ID]: "goatTemplate",
  [HEAVY_STORM_ID]: "goatTemplate",
  [MYSTICAL_SPACE_TYPHOON_ID]: "goatTemplate",
  [BOOK_OF_MOON_ID]: "goatTemplate",
  [RUSH_RECKLESSLY_ID]: "goatTemplate",
  [THE_RELIABLE_GUARDIAN_ID]: "goatTemplate",
  [BLOCK_ATTACK_ID]: "goatCustom",
  [UPSTART_GOBLIN_ID]: "goatTemplate",
  [ACID_RAIN_ID]: "goatTemplate",
  [BLUE_MEDICINE_ID]: "goatTemplate",
  [DIAN_KETO_THE_CURE_MASTER_ID]: "goatTemplate",
  [GOBLINS_SECRET_REMEDY_ID]: "goatTemplate",
  [RED_MEDICINE_ID]: "goatTemplate",
  [METEOR_OF_DESTRUCTION_ID]: "goatCustom",
  [MONSTER_REINCARNATION_ID]: "goatTemplate",
  [FINAL_DESTINY_ID]: "goatTemplate",
  [CHAOS_END_ID]: "goatCustom",
  [LIGHTNING_VORTEX_ID]: "goatTemplate",
  [FINAL_RITUAL_OF_THE_ANCIENTS_ID]: "goatTemplate",
  [EXILE_OF_THE_WICKED_ID]: "goatTemplate",
  [HINOTAMA_ID]: "goatTemplate",
  [FINAL_FLAME_ID]: "goatTemplate",
  [OOKAZI_ID]: "goatTemplate",
  [GOBLIN_THIEF_ID]: "goatTemplate",
  [TREMENDOUS_FIRE_ID]: "goatTemplate",
  [RAIMEI_ID]: "goatTemplate",
  [HAMBURGER_RECIPE_ID]: "goatTemplate",
  [INCANDESCENT_ORDEAL_ID]: "goatTemplate",
  [BOOK_OF_TAIYOU_ID]: "goatTemplate",
  [SPARKS_ID]: "goatTemplate",
  [SOUL_OF_THE_PURE_ID]: "goatTemplate",
  [RAIN_OF_MERCY_ID]: "goatTemplate",
  [REMOVE_TRAP_ID]: "goatTemplate",
  [RESTRUCTER_REVOLUTION_ID]: "goatTemplate",
  [POISON_OF_THE_OLD_MAN_ID]: "goatCustom",
  [INSECT_BARRIER_ID]: "goatTemplate",
  [KNIGHTS_TITLE_ID]: "goatTemplate",
  [NOVOXS_PRAYER_ID]: "goatTemplate",
  [RELEASE_RESTRAINT_ID]: "goatTemplate",
  [REVIVAL_OF_DOKURORIDER_ID]: "goatTemplate",
  [SAGES_STONE_ID]: "goatCustom",
  [SHINATOS_ARK_ID]: "goatTemplate",
  [EARTHQUAKE_ID]: "goatTemplate",
  [TRIBUTE_TO_THE_DOOMED_ID]: "goatTemplate",
  [BACK_TO_SQUARE_ONE_ID]: "goatTemplate",
  [THE_WARRIOR_RETURNING_ALIVE_ID]: "goatTemplate",
  [REINFORCEMENT_OF_THE_ARMY_ID]: "goatTemplate",
  [TERRAFORMING_ID]: "goatTemplate",
  [FUSION_SAGE_ID]: "goatTemplate",
  [GATHER_YOUR_MIND_ID]: "goatTemplate",
  [OJAMA_DELTA_HURRICANE_ID]: "goatCustom",
  [TOON_TABLE_OF_CONTENTS_ID]: "goatTemplate",
  [TOON_WORLD_ID]: "goatTemplate",
  [THOUSAND_KNIVES_ID]: "goatCustom",
  [TURTLE_OATH_ID]: "goatTemplate",
  [WHITE_DRAGON_RITUAL_ID]: "goatTemplate",
  [YELLOW_LUSTER_SHIELD_ID]: "goatTemplate",
});

function withActivationCheck(script: CardScript, canActivate: CardScript["canActivate"]): CardScript {
  return Object.freeze({
    ...script,
    canActivate,
  });
}

function canActivateBlockAttack({ state, command }: CardEffectContext): boolean {
  const targetRef = command?.type === "activate-card" ? command.targetRefs?.[0] : undefined;

  if (!targetRef || targetRef.zone !== "monsterZone") {
    return false;
  }

  const target = state.players[targetRef.playerId]?.monsterZones[targetRef.index];

  return target?.face === "faceUp" && target.position === "attack";
}

function createEquipStatSpellScript(
  cardId: string,
  target: TargetSpec,
  statModifiers: readonly StatModifierSpec[],
): CardScript {
  return Object.freeze({
    cardId,
    effects: Object.freeze([
      Object.freeze({
        id: "equip",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: Object.freeze([target]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "equip-source-to-target" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "equipped-stat-bonus",
        kind: "continuous",
        implemented: true,
        continuous: Object.freeze({
          statModifiers: Object.freeze([...statModifiers]),
        }),
      }),
    ]),
  });
}

function createEquipStatBurnOnGraveyardScript(
  cardId: string,
  target: TargetSpec,
  statModifiers: readonly StatModifierSpec[],
  burnAmount: number,
): CardScript {
  return Object.freeze({
    cardId,
    effects: Object.freeze([
      Object.freeze({
        id: "equip",
        kind: "ignition" as const,
        implemented: true,
        spellSpeed: 1 as const,
        targets: Object.freeze([target]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "equip-source-to-target" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "equipped-stat-bonus",
        kind: "continuous" as const,
        implemented: true,
        continuous: Object.freeze({
          statModifiers: Object.freeze([...statModifiers]),
        }),
      }),
      Object.freeze({
        id: "field-to-graveyard-burn",
        kind: "trigger" as const,
        implemented: true,
        spellSpeed: 1 as const,
        trigger: Object.freeze({
          timing: "chain-resolved" as const,
          eventTypes: Object.freeze(["card-moved"] as const),
          sourceEvent: "self" as const,
          fromZones: Object.freeze(["spellTrapZone", "fieldZone"] as const),
          toZones: Object.freeze(["graveyard"] as const),
        }),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "lp-change" as const, player: "opponent" as const, amount: -burnAmount }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  });
}

function createEquipContinuousSpellScript(config: {
  readonly cardId: string;
  readonly target?: TargetSpec;
  readonly continuous: NonNullable<CardScript["effects"][number]["continuous"]>;
}): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: "equip",
        kind: "ignition" as const,
        implemented: true,
        spellSpeed: 1 as const,
        targets: Object.freeze([config.target ?? faceUpMonsterTarget]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "equip-source-to-target" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "equipped-continuous-effect",
        kind: "continuous" as const,
        implemented: true,
        continuous: config.continuous,
      }),
    ]),
  });
}

function faceUpMonsterTypeTarget(monsterType: string): TargetSpec {
  return Object.freeze({
    kind: "card" as const,
    controller: "any" as const,
    zones: Object.freeze(["monsterZone"] as const),
    cardKinds: Object.freeze(["monster"] as const),
    face: "faceUp" as const,
    monsterType,
    min: 1,
    max: 1,
  });
}

function faceUpMonsterCardTarget(cardId: string): TargetSpec {
  return faceUpMonsterCardsTarget([cardId]);
}

function faceUpMonsterCardsTarget(cardIds: readonly string[]): TargetSpec {
  return Object.freeze({
    kind: "card" as const,
    controller: "any" as const,
    zones: Object.freeze(["monsterZone"] as const),
    cardKinds: Object.freeze(["monster"] as const),
    face: "faceUp" as const,
    cardIds: Object.freeze([...cardIds]),
    min: 1,
    max: 1,
  });
}

function faceUpMonsterAttributeTarget(attribute: string): TargetSpec {
  return Object.freeze({
    kind: "card" as const,
    controller: "any" as const,
    zones: Object.freeze(["monsterZone"] as const),
    cardKinds: Object.freeze(["monster"] as const),
    face: "faceUp" as const,
    attribute,
    min: 1,
    max: 1,
  });
}

function faceUpLevelOneMonsterTarget(): TargetSpec {
  return Object.freeze({
    kind: "card" as const,
    controller: "any" as const,
    zones: Object.freeze(["monsterZone"] as const),
    cardKinds: Object.freeze(["monster"] as const),
    face: "faceUp" as const,
    levelMax: 1,
    min: 1,
    max: 1,
  });
}

function fieldAttributeStatModifiers(attribute: string, atkAmount: number, defAmount: number): readonly StatModifierSpec[] {
  return Object.freeze([
    fieldStatModifier("atk", atkAmount, Object.freeze({ face: "faceUp" as const, attribute })),
    fieldStatModifier("def", defAmount, Object.freeze({ face: "faceUp" as const, attribute })),
  ]);
}

function fieldTypeStatModifiers(monsterTypes: readonly string[], atkAmount: number, defAmount: number): readonly StatModifierSpec[] {
  return Object.freeze(monsterTypes.flatMap((monsterType) => [
    fieldStatModifier("atk", atkAmount, Object.freeze({ face: "faceUp" as const, monsterType })),
    fieldStatModifier("def", defAmount, Object.freeze({ face: "faceUp" as const, monsterType })),
  ]));
}

function fieldStatModifier(
  stat: StatModifierSpec["stat"],
  amount: number,
  target: StatModifierSpec["target"],
): StatModifierSpec {
  return Object.freeze({
    stat,
    amount,
    target,
  });
}

function equipStatModifier(stat: StatModifierSpec["stat"], amount: number): StatModifierSpec {
  return Object.freeze({
    stat,
    amount,
    target: Object.freeze({ attachedToSource: true, sourceEffectIds: Object.freeze(["equip"] as const) }),
  });
}

function canActivateADealWithDarkRuler({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  return state.players[command.playerId].graveyard.some((card) => {
    const definition = state.cardDefinitions?.[card.cardId];

    return (
      card.sentToGraveyardTurn === state.turn &&
      card.sentToGraveyardFromController === command.playerId &&
      card.sentToGraveyardFromZone === "monsterZone" &&
      definition?.kind === "monster" &&
      (definition.monster.level ?? 0) >= 8
    );
  });
}

function canActivateChaosGreed({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  const player = state.players[command.playerId];

  return player.banished.length >= 4 && player.graveyard.length === 0;
}

function canActivateChaosEnd({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  return state.players[command.playerId].banished.length >= 7;
}

function canActivateMeteorOfDestruction({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  const opponent = command.playerId === "P1" ? "P2" : "P1";

  return state.players[opponent].lp > 3000;
}

function canActivateDeSpell({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  const targetRef = command.targetRefs?.[0];

  if (!targetRef || (targetRef.zone !== "spellTrapZone" && targetRef.zone !== "fieldZone")) {
    return false;
  }

  const target = targetRef.zone === "spellTrapZone"
    ? state.players[targetRef.playerId]?.spellTrapZones[targetRef.index]
    : state.players[targetRef.playerId]?.fieldZone;

  if (!target) {
    return false;
  }

  const definition = state.cardDefinitions?.[target.cardId];

  if (target.face === "faceDown") {
    return definition?.kind === "spell" || definition?.kind === "trap";
  }

  return definition?.kind === "spell";
}

function canActivateElegantEgotist({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  return (["P1", "P2"] as const).some((playerId) =>
    state.players[playerId].monsterZones.some((card) =>
      Boolean(card && card.face === "faceUp" && HARPIE_LADY_CARD_IDS.includes(card.cardId as typeof HARPIE_LADY_CARD_IDS[number])),
    ),
  );
}

function canActivateSagesStone({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  return state.players[command.playerId].monsterZones.some((card) =>
    card?.cardId === DARK_MAGICIAN_GIRL_ID && card.face === "faceUp",
  );
}

function canActivateContractWithExodia({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  const graveyardIds = new Set(state.players[command.playerId].graveyard.map((card) => card.cardId));

  return EXODIA_PIECE_CARD_IDS.every((cardId) => graveyardIds.has(cardId));
}

function canActivateWithFaceUpDarkMagician({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  return controlsFaceUpMonsterCardIds(state, command.playerId, [DARK_MAGICIAN_ID]);
}

function canActivateWithFaceUpBlueEyesWhiteDragon({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  return controlsFaceUpMonsterCardIds(state, command.playerId, [BLUE_EYES_WHITE_DRAGON_ID]);
}

function canActivateOjamaDeltaHurricane({ state, command }: CardEffectContext): boolean {
  if (command?.type !== "activate-card") {
    return false;
  }

  return controlsFaceUpMonsterCardIds(state, command.playerId, [
    OJAMA_BLACK_ID,
    OJAMA_GREEN_ID,
    OJAMA_YELLOW_ID,
  ]);
}

function controlsFaceUpMonsterCardIds(
  state: CardEffectContext["state"],
  playerId: PlayerId,
  cardIds: readonly string[],
): boolean {
  const controlledIds = new Set<string>();

  for (const card of state.players[playerId].monsterZones) {
    if (card?.face === "faceUp") {
      controlledIds.add(card.cardId);
    }
  }

  return cardIds.every((cardId) => controlledIds.has(cardId));
}
