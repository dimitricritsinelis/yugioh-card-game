import type { CardCoverageRegistry } from "../coverage";
import type { CardEffectContext, CardScript, EffectResolutionStep } from "../CardScript";
import type { StatModifierSpec } from "../../effects/continuous";
import type { TargetSpec } from "../../effects/targets";
import { findCardByInstanceId } from "../../core/zones";
import { createFlipEffectScript } from "../templates/flipEffect";
import { createBattleRecruiterScript } from "../templates/recruiter";
import {
  createDirectAttackScript,
  createMonsterIgnitionScript,
  createPiercingDamageScript,
} from "../templates/statModifier";

export const THREE_HUMP_LACOODA_ID = "86988864";
export const FOUR_STARRED_LADYBUG_OF_DOOM_ID = "83994646";
export const EIGHT_CLAWS_SCORPION_ID = "14261867";
export const A_CAT_OF_ILL_OMEN_ID = "24140059";
export const A_TEAM_TRAP_DISPOSAL_UNIT_ID = "13026402";
export const AN_OWL_OF_LUCK_ID = "23927567";
export const AIRKNIGHT_PARSHATH_ID = "18036057";
export const ARMED_NINJA_ID = "09076207";
export const BLADEFLY_ID = "28470714";
export const BLUE_EYES_WHITE_DRAGON_ID = "89631139";
export const BOWGANIAN_ID = "52090844";
export const CRIMSON_NINJA_ID = "14618326";
export const CURE_MERMAID_ID = "85802526";
export const CYBER_STEIN_ID = "69015963";
export const DANCING_FAIRY_ID = "90925163";
export const MAGICIAN_OF_FAITH_ID = "31560081";
export const DEKOICHI_ID = "87621407";
export const DES_LACOODA_ID = "02326738";
export const ENRAGED_BATTLE_OX_ID = "76909279";
export const OLD_VINDICTIVE_MAGICIAN_ID = "45141844";
export const EXILED_FORCE_ID = "74131780";
export const CANNON_SOLDIER_ID = "11384280";
export const AMAZONESS_ARCHER_ID = "91869203";
export const DRAGON_MANIPULATOR_ID = "63018132";
export const FLYING_KAMAKIRI_1_ID = "84834865";
export const HANE_HANE_ID = "07089711";
export const GRAVEKEEPERS_GUARD_ID = "37101832";
export const GALE_LIZARD_ID = "77491079";
export const GIANT_RAT_ID = "97017120";
export const GOLEM_SENTRY_ID = "52323207";
export const GREENKAPPA_ID = "61831093";
export const GUARDIAN_STATUE_ID = "75209824";
export const HADE_HANE_ID = "28357177";
export const HYSTERIC_FAIRY_ID = "21297224";
export const HOWLING_INSECT_ID = "93107608";
export const HOSHININGEN_ID = "67629977";
export const KAIBAMAN_ID = "34627841";
export const LEGHUL_ID = "12472242";
export const LITTLE_CHIMERA_ID = "68658728";
export const BLACK_LUSTER_SOLDIER_ID = "05405694";
export const CRAB_TURTLE_ID = "91782219";
export const DOKURORIDER_ID = "99721536";
export const HUNGRY_BURGER_ID = "30243636";
export const MAN_EATER_BUG_ID = "54652250";
export const MASK_OF_DARKNESS_ID = "28933734";
export const MASKED_DRAGON_ID = "39191307";
export const MEDUSA_WORM_ID = "02694423";
export const MILUS_RADIANT_ID = "07489323";
export const MIRAGE_DRAGON_ID = "15960641";
export const MOAI_INTERCEPTOR_CANNONS_ID = "45159319";
export const MOLTEN_ZOMBIE_ID = "04732017";
export const NOBLEMAN_EATER_BUG_ID = "65878864";
export const DARK_DRICERATOPS_ID = "65287621";
export const GRAVEKEEPERS_SPEAR_SOLDIER_ID = "63695531";
export const JINZO_7_ID = "32809211";
export const MAD_SWORD_BEAST_ID = "79870141";
export const MYSTIC_LAMP_ID = "98049915";
export const MOTHER_GRIZZLY_ID = "57839750";
export const MYSTIC_TOMATO_ID = "83011277";
export const MYSTICAL_SHINE_BALL_ID = "39552864";
export const NIGHTMARE_HORSE_ID = "59290628";
export const OOGUCHI_ID = "58861941";
export const PENGUIN_SOLDIER_ID = "93920745";
export const PERFORMANCE_OF_SWORD_ID = "04849037";
export const PITCH_BLACK_WARWOLF_ID = "88975532";
export const POISON_MUMMY_ID = "43716289";
export const PRINCESS_OF_TSURUGI_ID = "51371017";
export const QUEENS_DOUBLE_ID = "05901497";
export const RAFFLESIA_SEDUCTION_ID = "31440542";
export const RAINBOW_FLOWER_ID = "21347810";
export const REAPER_OF_THE_CARDS_ID = "33066139";
export const SERVANT_OF_CATABOLISM_ID = "02792265";
export const SHADOW_TAMER_ID = "37620434";
export const SHINING_ANGEL_ID = "95956346";
export const SKULL_GUARDIAN_ID = "03627449";
export const SPEAR_DRAGON_ID = "31553716";
export const STAR_BOY_ID = "08201910";
export const STEALTH_BIRD_ID = "03510565";
export const SWARM_OF_LOCUSTS_ID = "41872150";
export const SWARM_OF_SCARABS_ID = "15383415";
export const THE_AGENT_OF_CREATION_VENUS_ID = "64734921";
export const THE_CREATOR_ID = "61505339";
export const THE_CREATOR_INCARNATE_ID = "97093037";
export const THE_IMMORTAL_OF_THUNDER_ID = "84926738";
export const THE_MASKED_BEAST_ID = "49064413";
export const TORNADO_BIRD_ID = "71283180";
export const TRAP_MASTER_ID = "46461247";
export const TROOP_DRAGON_ID = "55013285";
export const UFO_TURTLE_ID = "60806437";
export const WITCHS_APPRENTICE_ID = "80741828";

const mainDeckRecruitMonsterFilter = (attribute: string) => Object.freeze({
  attribute,
  maxAtk: 1500,
  excludeClassifications: Object.freeze(["Fusion", "Ritual"] as const),
});

const INSECT_RECRUITER_CARD_IDS = Object.freeze([
  "83994646", "14261867", "87340664", "89091579", "28470714", "57409948", "33413638",
  "40240595", "88733579", "26566878", "84834865", "03134241", "41762634", "52584282",
  "93107608", "07019529", "88979991", "56283725", "60802233", "87756343", "12472242",
  "32362575", "54652250", "32539892", "81843628", "65878864", "27911549", "58192742",
  "26185991", "64306248", "41872150", "15383415", "49441499", "34088136",
] as const);

const DRAGON_RECRUITER_CARD_IDS = Object.freeze([
  "00980973", "88819587", "36262024", "87564352", "50939127", "62113340", "30314994",
  "29618570", "67724379", "55444629", "20831168", "39191307", "33064647", "75356564",
  "47415292", "67957315", "93346024", "55013285", "43586926", "87796900",
] as const);

const anyMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const upToTwoMonstersTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any" as const,
  min: 1,
  max: 2,
});

const twoMonstersTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any" as const,
  min: 2,
  max: 2,
});

const upToThreeMonstersTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any" as const,
  min: 1,
  max: 3,
});

const twoSpellTrapCardsTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["spellTrapZone", "fieldZone"] as const),
  cardKinds: Object.freeze(["spell", "trap"] as const),
  face: "any" as const,
  min: 2,
  max: 2,
});

const twoSetSpellTrapCardsTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["spellTrapZone", "fieldZone"] as const),
  cardKinds: Object.freeze(["spell", "trap"] as const),
  face: "faceDown" as const,
  min: 2,
  max: 2,
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

const opponentMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "opponent" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
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

const opponentFaceUpDragonMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "opponent" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "faceUp" as const,
  monsterType: "Dragon",
  min: 1,
  max: 1,
});

const opponentFaceUpFiendMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "opponent" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "faceUp" as const,
  monsterType: "Fiend",
  min: 1,
  max: 1,
});

const anySpellTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["spellTrapZone", "fieldZone"] as const),
  cardKinds: Object.freeze(["spell"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const anyTrapTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["spellTrapZone"] as const),
  cardKinds: Object.freeze(["trap"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const ownGraveyardSpellTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["graveyard"] as const),
  cardKinds: Object.freeze(["spell"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const ownGraveyardTrapTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["graveyard"] as const),
  cardKinds: Object.freeze(["trap"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const ownMainDeckTrapTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["mainDeck"] as const),
  cardKinds: Object.freeze(["trap"] as const),
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

function ownHandMonsterCardTarget(cardId: string): TargetSpec {
  return Object.freeze({
    kind: "card" as const,
    controller: "own" as const,
    zones: Object.freeze(["hand"] as const),
    cardKinds: Object.freeze(["monster"] as const),
    cardIds: Object.freeze([cardId]),
    face: "any" as const,
    min: 1,
    max: 1,
  });
}

function ownHandOrMainDeckMonsterCardTarget(cardId: string): TargetSpec {
  return Object.freeze({
    kind: "card" as const,
    controller: "own" as const,
    zones: Object.freeze(["hand", "mainDeck"] as const),
    cardKinds: Object.freeze(["monster"] as const),
    cardIds: Object.freeze([cardId]),
    face: "any" as const,
    min: 1,
    max: 1,
  });
}

const ownFusionDeckMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["fusionDeck"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const NECROVALLEY_ID = "47355498";

function createRitualMonsterProcedureScript(cardId: string): CardScript {
  return Object.freeze({
    cardId,
    effects: Object.freeze([]),
  });
}

export const MONSTER_CARD_SCRIPTS: readonly CardScript[] = Object.freeze([
  createRitualMonsterProcedureScript(BLACK_LUSTER_SOLDIER_ID),
  createRitualMonsterProcedureScript(CRAB_TURTLE_ID),
  createRitualMonsterProcedureScript(DOKURORIDER_ID),
  createRitualMonsterProcedureScript(HUNGRY_BURGER_ID),
  createRitualMonsterProcedureScript(PERFORMANCE_OF_SWORD_ID),
  createRitualMonsterProcedureScript(SKULL_GUARDIAN_ID),
  createRitualMonsterProcedureScript(THE_MASKED_BEAST_ID),
  createThreeHumpLacoodaScript(),
  createEightClawsScorpionScript(),
  createATeamTrapDisposalUnitScript(),
  createFlipEffectScript({
    cardId: A_CAT_OF_ILL_OMEN_ID,
    targets: Object.freeze([ownMainDeckTrapTarget]),
    steps: Object.freeze([
      { kind: "move-targets-to-deck-top-or-hand-if-field-card", fieldCardId: NECROVALLEY_ID },
    ]),
  }),
  createFlipEffectScript({
    cardId: AN_OWL_OF_LUCK_ID,
    targets: Object.freeze([ownMainDeckFieldSpellTarget]),
    steps: Object.freeze([
      { kind: "move-targets-to-deck-top-or-hand-if-field-card", fieldCardId: NECROVALLEY_ID },
    ]),
  }),
  createFlipEffectScript({
    cardId: FOUR_STARRED_LADYBUG_OF_DOOM_ID,
    steps: Object.freeze([
      { kind: "destroy-opponent-face-up-monsters-by-level", level: 4 },
    ]),
  }),
  createStandbyLpTriggerScript(BOWGANIAN_ID, "standby-damage", "opponent", -600),
  createStandbyLpTriggerScript(CURE_MERMAID_ID, "standby-gain", "self", 800),
  createStandbyLpTriggerScript(DANCING_FAIRY_ID, "standby-defense-gain", "self", 1000, "defense"),
  createOpponentBattlePhaseTrapLockScript(MIRAGE_DRAGON_ID),
  createOpponentBattlePhaseTrapLockScript(PITCH_BLACK_WARWOLF_ID),
  createAttributeAuraScript(BLADEFLY_ID, "WIND", "EARTH"),
  createFlipEffectScript({
    cardId: DEKOICHI_ID,
    steps: Object.freeze([{ kind: "draw", player: "self", count: 1 }]),
  }),
  createFlipEffectScript({
    cardId: DRAGON_MANIPULATOR_ID,
    targets: Object.freeze([opponentFaceUpDragonMonsterTarget]),
    steps: Object.freeze([{ kind: "take-control-of-targets", returnAtEndPhase: true }]),
  }),
  createFlipEffectScript({
    cardId: ARMED_NINJA_ID,
    targets: Object.freeze([anySpellTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createFlipEffectScript({
    cardId: CRIMSON_NINJA_ID,
    targets: Object.freeze([anyTrapTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createMonsterIgnitionScript({
    cardId: CYBER_STEIN_ID,
    effectId: "pay-lp-summon-fusion",
    costs: Object.freeze([{ kind: "pay-lp" as const, amount: 5000 }]),
    targets: Object.freeze([ownFusionDeckMonsterTarget]),
    steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
  }),
  createSelfSetAndFlipTriggerScript({
    cardId: DES_LACOODA_ID,
    flipSteps: Object.freeze([{ kind: "draw", player: "self", count: 1 }]),
  }),
  createFlipEffectScript({
    cardId: MAGICIAN_OF_FAITH_ID,
    targets: Object.freeze([ownGraveyardSpellTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createFlipEffectScript({
    cardId: MASK_OF_DARKNESS_ID,
    targets: Object.freeze([ownGraveyardTrapTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createAirknightParshathScript(),
  createFlipEffectScript({
    cardId: OLD_VINDICTIVE_MAGICIAN_ID,
    targets: Object.freeze([anyMonsterTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createFlipEffectScript({
    cardId: MAN_EATER_BUG_ID,
    targets: Object.freeze([anyMonsterTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createFlipEffectScript({
    cardId: NOBLEMAN_EATER_BUG_ID,
    targets: Object.freeze([twoMonstersTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createMonsterIgnitionScript({
    cardId: EXILED_FORCE_ID,
    costs: Object.freeze([{ kind: "tribute-source" }]),
    targets: Object.freeze([anyMonsterTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createMonsterIgnitionScript({
    cardId: CANNON_SOLDIER_ID,
    costs: Object.freeze([{ kind: "tribute", count: 1 }]),
    steps: Object.freeze([{ kind: "lp-change", player: "opponent", amount: -500 }]),
  }),
  createMonsterIgnitionScript({
    cardId: AMAZONESS_ARCHER_ID,
    costs: Object.freeze([{ kind: "tribute", count: 2 }]),
    steps: Object.freeze([{ kind: "lp-change", player: "opponent", amount: -1200 }]),
  }),
  createFlipEffectScript({
    cardId: HANE_HANE_ID,
    targets: Object.freeze([anyMonsterTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createFlipEffectScript({
    cardId: GRAVEKEEPERS_GUARD_ID,
    targets: Object.freeze([
      Object.freeze({
        kind: "card" as const,
        controller: "opponent" as const,
        zones: Object.freeze(["monsterZone"] as const),
        cardKinds: Object.freeze(["monster"] as const),
        face: "any" as const,
        min: 1,
        max: 1,
      }),
    ]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createFlipEffectScript({
    cardId: GALE_LIZARD_ID,
    targets: Object.freeze([opponentMonsterTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createFlipEffectScript({
    cardId: PENGUIN_SOLDIER_ID,
    targets: Object.freeze([upToTwoMonstersTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createFlipEffectScript({
    cardId: HADE_HANE_ID,
    targets: Object.freeze([upToThreeMonstersTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createFlipEffectScript({
    cardId: POISON_MUMMY_ID,
    steps: Object.freeze([{ kind: "lp-change", player: "opponent", amount: -500 }]),
  }),
  createFlipEffectScript({
    cardId: PRINCESS_OF_TSURUGI_ID,
    steps: Object.freeze([
      { kind: "lp-change-by-count", player: "opponent", amountPer: -500, count: "opponent-spell-trap-cards" },
    ]),
  }),
  createTheImmortalOfThunderScript(),
  createSelfSetOnlyScript(MOAI_INTERCEPTOR_CANNONS_ID),
  createMoltenZombieScript(),
  createFlipEffectScript({
    cardId: GREENKAPPA_ID,
    targets: Object.freeze([twoSetSpellTrapCardsTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createFlipEffectScript({
    cardId: TORNADO_BIRD_ID,
    targets: Object.freeze([twoSpellTrapCardsTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createFlipEffectScript({
    cardId: REAPER_OF_THE_CARDS_ID,
    targets: Object.freeze([anyTrapTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createFlipEffectScript({
    cardId: TRAP_MASTER_ID,
    targets: Object.freeze([anyTrapTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createMonsterIgnitionScript({
    cardId: HYSTERIC_FAIRY_ID,
    costs: Object.freeze([{ kind: "tribute", count: 2 }]),
    steps: Object.freeze([{ kind: "lp-change", player: "self", amount: 1000 }]),
  }),
  createSelfSetAndFlipTriggerScript({
    cardId: STEALTH_BIRD_ID,
    flipSteps: Object.freeze([{ kind: "lp-change", player: "opponent", amount: -1000 }]),
  }),
  createSelfSetAndFlipTriggerScript({
    cardId: GOLEM_SENTRY_ID,
    flipTargets: Object.freeze([opponentMonsterTarget]),
    flipSteps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createSelfSetAndFlipTriggerScript({
    cardId: GUARDIAN_STATUE_ID,
    flipTargets: Object.freeze([opponentMonsterTarget]),
    flipSteps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createFlipEffectScript({
    cardId: RAFFLESIA_SEDUCTION_ID,
    targets: Object.freeze([opponentFaceUpMonsterTarget]),
    steps: Object.freeze([{ kind: "take-control-of-targets", returnAtEndPhase: true }]),
  }),
  createFlipEffectScript({
    cardId: SHADOW_TAMER_ID,
    targets: Object.freeze([opponentFaceUpFiendMonsterTarget]),
    steps: Object.freeze([{ kind: "take-control-of-targets", returnAtEndPhase: true }]),
  }),
  createSelfSetAndFlipTriggerScript({
    cardId: SWARM_OF_LOCUSTS_ID,
    flipTargets: Object.freeze([opponentSpellTrapTarget]),
    flipSteps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createSelfSetAndFlipTriggerScript({
    cardId: SWARM_OF_SCARABS_ID,
    flipTargets: Object.freeze([opponentMonsterTarget]),
    flipSteps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createBattleRecruiterScript({
    cardId: FLYING_KAMAKIRI_1_ID,
    recruitMonsterFilter: mainDeckRecruitMonsterFilter("WIND"),
  }),
  createBattleRecruiterScript({
    cardId: GIANT_RAT_ID,
    recruitMonsterFilter: mainDeckRecruitMonsterFilter("EARTH"),
  }),
  createBattleRecruiterScript({
    cardId: HOWLING_INSECT_ID,
    recruitCardIds: INSECT_RECRUITER_CARD_IDS,
  }),
  createAttributeAuraScript(HOSHININGEN_ID, "LIGHT", "DARK"),
  createMonsterIgnitionScript({
    cardId: KAIBAMAN_ID,
    costs: Object.freeze([{ kind: "tribute-source" as const }]),
    targets: Object.freeze([ownHandMonsterCardTarget(BLUE_EYES_WHITE_DRAGON_ID)]),
    steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
  }),
  createAttributeAuraScript(LITTLE_CHIMERA_ID, "FIRE", "WATER"),
  createBattleRecruiterScript({
    cardId: MASKED_DRAGON_ID,
    recruitCardIds: DRAGON_RECRUITER_CARD_IDS,
  }),
  createSelfSetAndFlipTriggerScript({
    cardId: MEDUSA_WORM_ID,
    flipTargets: Object.freeze([opponentMonsterTarget]),
    flipSteps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createAttributeAuraScript(MILUS_RADIANT_ID, "EARTH", "WIND"),
  createBattleRecruiterScript({
    cardId: MOTHER_GRIZZLY_ID,
    recruitMonsterFilter: mainDeckRecruitMonsterFilter("WATER"),
  }),
  createBattleRecruiterScript({
    cardId: MYSTIC_TOMATO_ID,
    recruitMonsterFilter: mainDeckRecruitMonsterFilter("DARK"),
  }),
  createBattleRecruiterScript({
    cardId: SHINING_ANGEL_ID,
    recruitMonsterFilter: mainDeckRecruitMonsterFilter("LIGHT"),
  }),
  createAttributeAuraScript(STAR_BOY_ID, "WATER", "FIRE"),
  createBattleRecruiterScript({
    cardId: TROOP_DRAGON_ID,
    recruitCardIds: Object.freeze([TROOP_DRAGON_ID] as const),
  }),
  createBattleRecruiterScript({
    cardId: UFO_TURTLE_ID,
    recruitMonsterFilter: mainDeckRecruitMonsterFilter("FIRE"),
  }),
  createAttributeAuraScript(WITCHS_APPRENTICE_ID, "DARK", "LIGHT"),
  createPiercingDamageScript(DARK_DRICERATOPS_ID),
  createEnragedBattleOxScript(),
  createPiercingDamageScript(GRAVEKEEPERS_SPEAR_SOLDIER_ID),
  createPiercingDamageScript(MAD_SWORD_BEAST_ID),
  createSpearDragonScript(),
  createDirectAttackScript(JINZO_7_ID),
  createDirectAttackScript(LEGHUL_ID),
  createDirectAttackScript(MYSTIC_LAMP_ID),
  createDirectAttackScript(NIGHTMARE_HORSE_ID),
  createDirectAttackScript(OOGUCHI_ID),
  createDirectAttackScript(QUEENS_DOUBLE_ID),
  createDirectAttackScript(RAINBOW_FLOWER_ID),
  createDirectAttackScript(SERVANT_OF_CATABOLISM_ID),
  createMonsterIgnitionScript({
    cardId: THE_AGENT_OF_CREATION_VENUS_ID,
    costs: Object.freeze([{ kind: "pay-lp" as const, amount: 500 }]),
    targets: Object.freeze([ownHandOrMainDeckMonsterCardTarget(MYSTICAL_SHINE_BALL_ID)]),
    steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
  }),
  createMonsterIgnitionScript({
    cardId: THE_CREATOR_INCARNATE_ID,
    costs: Object.freeze([{ kind: "tribute-source" as const }]),
    targets: Object.freeze([ownHandMonsterCardTarget(THE_CREATOR_ID)]),
    steps: Object.freeze([{ kind: "special-summon-targets" as const, position: "attack" as const }]),
  }),
]);

export const MONSTER_CARD_COVERAGE: CardCoverageRegistry = Object.freeze({
  [BLACK_LUSTER_SOLDIER_ID]: "goatTemplate",
  [CRAB_TURTLE_ID]: "goatTemplate",
  [DOKURORIDER_ID]: "goatTemplate",
  [HUNGRY_BURGER_ID]: "goatTemplate",
  [PERFORMANCE_OF_SWORD_ID]: "goatTemplate",
  [SKULL_GUARDIAN_ID]: "goatTemplate",
  [THE_MASKED_BEAST_ID]: "goatTemplate",
  [THREE_HUMP_LACOODA_ID]: "goatCustom",
  [EIGHT_CLAWS_SCORPION_ID]: "goatCustom",
  [A_TEAM_TRAP_DISPOSAL_UNIT_ID]: "goatCustom",
  [ARMED_NINJA_ID]: "goatTemplate",
  [BLADEFLY_ID]: "goatTemplate",
  [BOWGANIAN_ID]: "goatTemplate",
  [CRIMSON_NINJA_ID]: "goatTemplate",
  [CURE_MERMAID_ID]: "goatTemplate",
  [CYBER_STEIN_ID]: "goatTemplate",
  [DANCING_FAIRY_ID]: "goatTemplate",
  [A_CAT_OF_ILL_OMEN_ID]: "goatTemplate",
  [AN_OWL_OF_LUCK_ID]: "goatTemplate",
  [AIRKNIGHT_PARSHATH_ID]: "goatCustom",
  [FOUR_STARRED_LADYBUG_OF_DOOM_ID]: "goatTemplate",
  [DEKOICHI_ID]: "goatTemplate",
  [DRAGON_MANIPULATOR_ID]: "goatCustom",
  [DES_LACOODA_ID]: "goatCustom",
  [ENRAGED_BATTLE_OX_ID]: "goatCustom",
  [MAGICIAN_OF_FAITH_ID]: "goatTemplate",
  [OLD_VINDICTIVE_MAGICIAN_ID]: "goatTemplate",
  [EXILED_FORCE_ID]: "goatTemplate",
  [CANNON_SOLDIER_ID]: "goatTemplate",
  [AMAZONESS_ARCHER_ID]: "goatTemplate",
  [FLYING_KAMAKIRI_1_ID]: "goatTemplate",
  [HANE_HANE_ID]: "goatTemplate",
  [GRAVEKEEPERS_GUARD_ID]: "goatTemplate",
  [GALE_LIZARD_ID]: "goatTemplate",
  [GIANT_RAT_ID]: "goatTemplate",
  [GOLEM_SENTRY_ID]: "goatCustom",
  [GREENKAPPA_ID]: "goatTemplate",
  [GUARDIAN_STATUE_ID]: "goatCustom",
  [HADE_HANE_ID]: "goatTemplate",
  [HOWLING_INSECT_ID]: "goatTemplate",
  [HOSHININGEN_ID]: "goatTemplate",
  [HYSTERIC_FAIRY_ID]: "goatTemplate",
  [KAIBAMAN_ID]: "goatTemplate",
  [LEGHUL_ID]: "goatTemplate",
  [LITTLE_CHIMERA_ID]: "goatTemplate",
  [MAN_EATER_BUG_ID]: "goatTemplate",
  [MASK_OF_DARKNESS_ID]: "goatTemplate",
  [MASKED_DRAGON_ID]: "goatTemplate",
  [MEDUSA_WORM_ID]: "goatCustom",
  [MILUS_RADIANT_ID]: "goatTemplate",
  [MIRAGE_DRAGON_ID]: "goatTemplate",
  [MOAI_INTERCEPTOR_CANNONS_ID]: "goatCustom",
  [MOLTEN_ZOMBIE_ID]: "goatCustom",
  [NOBLEMAN_EATER_BUG_ID]: "goatTemplate",
  [DARK_DRICERATOPS_ID]: "goatTemplate",
  [GRAVEKEEPERS_SPEAR_SOLDIER_ID]: "goatTemplate",
  [JINZO_7_ID]: "goatTemplate",
  [MAD_SWORD_BEAST_ID]: "goatTemplate",
  [MYSTIC_LAMP_ID]: "goatTemplate",
  [MOTHER_GRIZZLY_ID]: "goatTemplate",
  [MYSTIC_TOMATO_ID]: "goatTemplate",
  [NIGHTMARE_HORSE_ID]: "goatTemplate",
  [OOGUCHI_ID]: "goatTemplate",
  [PENGUIN_SOLDIER_ID]: "goatTemplate",
  [PITCH_BLACK_WARWOLF_ID]: "goatTemplate",
  [POISON_MUMMY_ID]: "goatTemplate",
  [PRINCESS_OF_TSURUGI_ID]: "goatTemplate",
  [QUEENS_DOUBLE_ID]: "goatTemplate",
  [RAFFLESIA_SEDUCTION_ID]: "goatCustom",
  [RAINBOW_FLOWER_ID]: "goatTemplate",
  [REAPER_OF_THE_CARDS_ID]: "goatTemplate",
  [SERVANT_OF_CATABOLISM_ID]: "goatTemplate",
  [SHADOW_TAMER_ID]: "goatCustom",
  [SHINING_ANGEL_ID]: "goatTemplate",
  [SPEAR_DRAGON_ID]: "goatCustom",
  [STAR_BOY_ID]: "goatTemplate",
  [STEALTH_BIRD_ID]: "goatCustom",
  [SWARM_OF_LOCUSTS_ID]: "goatCustom",
  [SWARM_OF_SCARABS_ID]: "goatCustom",
  [THE_AGENT_OF_CREATION_VENUS_ID]: "goatTemplate",
  [THE_CREATOR_INCARNATE_ID]: "goatTemplate",
  [THE_IMMORTAL_OF_THUNDER_ID]: "goatCustom",
  [TORNADO_BIRD_ID]: "goatTemplate",
  [TRAP_MASTER_ID]: "goatTemplate",
  [TROOP_DRAGON_ID]: "goatTemplate",
  [UFO_TURTLE_ID]: "goatTemplate",
  [WITCHS_APPRENTICE_ID]: "goatTemplate",
});

interface SelfSetAndFlipTriggerConfig {
  readonly cardId: string;
  readonly flipTargets?: readonly TargetSpec[];
  readonly flipSteps: readonly EffectResolutionStep[];
}

function createThreeHumpLacoodaScript(): CardScript {
  const script = createMonsterIgnitionScript({
    cardId: THREE_HUMP_LACOODA_ID,
    effectId: "tribute-two-draw-three",
    costs: Object.freeze([
      Object.freeze({
        kind: "tribute-matching-face-up-card" as const,
        cardId: THREE_HUMP_LACOODA_ID,
        count: 2,
      }),
    ]),
    steps: Object.freeze([{ kind: "draw", player: "self", count: 3 }]),
  });

  return Object.freeze({
    ...script,
    canActivate: canActivateThreeHumpLacooda,
  });
}

function createEightClawsScorpionScript(): CardScript {
  return Object.freeze({
    cardId: EIGHT_CLAWS_SCORPION_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "set-self-face-down",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        oncePerTurn: Object.freeze({ scope: "source" as const }),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "set-source-face" as const, face: "faceDown" as const, position: "defense" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "face-down-defense-battle-atk",
        kind: "continuous",
        implemented: true,
        continuous: Object.freeze({
          statModifiers: Object.freeze([
            Object.freeze({
              stat: "atk" as const,
              setTo: 2400,
              target: Object.freeze({
                source: "self" as const,
                attackingFaceDownDefenseMonster: true,
              }),
            }),
          ]),
        }),
      }),
    ]),
    canActivate: canActivateEightClawsScorpion,
  });
}

function createAirknightParshathScript(): CardScript {
  return Object.freeze({
    cardId: AIRKNIGHT_PARSHATH_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "piercing",
        kind: "continuous" as const,
        implemented: true,
        continuous: Object.freeze({
          piercingDamage: Object.freeze([
            Object.freeze({
              target: Object.freeze({ source: "self" as const, face: "faceUp" as const }),
            }),
          ]),
        }),
      }),
      Object.freeze({
        id: "draw-on-battle-damage",
        kind: "trigger" as const,
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action" as const,
          eventTypes: Object.freeze(["battle-damage"] as const),
          eventPlayer: "opponent" as const,
          sourceEvent: "self" as const,
        }),
        resolution: Object.freeze({
          steps: Object.freeze([{ kind: "draw" as const, player: "self" as const, count: 1 }]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  });
}

function createStandbyLpTriggerScript(
  cardId: string,
  effectId: string,
  player: "self" | "opponent",
  amount: number,
  sourcePosition?: "attack" | "defense",
): CardScript {
  return Object.freeze({
    cardId,
    effects: Object.freeze([
      Object.freeze({
        id: effectId,
        kind: "trigger" as const,
        implemented: true,
        spellSpeed: 1 as const,
        trigger: Object.freeze({
          timing: "after-action" as const,
          eventTypes: Object.freeze(["phase-changed"] as const),
          eventPlayer: "self" as const,
          phaseTo: Object.freeze(["SP"] as const),
          sourceFace: "faceUp" as const,
          ...(sourcePosition ? { sourcePosition } : {}),
        }),
        resolution: Object.freeze({
          steps: Object.freeze([{ kind: "lp-change" as const, player, amount }]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  });
}

function createOpponentBattlePhaseTrapLockScript(cardId: string): CardScript {
  return Object.freeze({
    cardId,
    effects: Object.freeze([
      Object.freeze({
        id: "opponent-battle-phase-trap-lock",
        kind: "continuous" as const,
        implemented: true,
        continuous: Object.freeze({
          activationRestrictions: Object.freeze([
            Object.freeze({
              cardKinds: Object.freeze(["trap"] as const),
              controller: "opponent" as const,
              phases: Object.freeze(["BP"] as const),
              reason: "Your opponent cannot activate Trap Cards during the Battle Phase.",
            }),
          ]),
        }),
      }),
    ]),
  });
}

function createAttributeAuraScript(cardId: string, boostedAttribute: string, weakenedAttribute: string): CardScript {
  return Object.freeze({
    cardId,
    effects: Object.freeze([
      Object.freeze({
        id: "attribute-atk-aura",
        kind: "continuous" as const,
        implemented: true,
        continuous: Object.freeze({
          statModifiers: Object.freeze([
            attributeAuraModifier(boostedAttribute, 500),
            attributeAuraModifier(weakenedAttribute, -400),
          ]),
        }),
      }),
    ]),
  });
}

function createEnragedBattleOxScript(): CardScript {
  const piercingTypes = ["Beast", "Beast-Warrior", "Winged Beast"] as const;

  return Object.freeze({
    cardId: ENRAGED_BATTLE_OX_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "grant-piercing",
        kind: "continuous" as const,
        implemented: true,
        continuous: Object.freeze({
          piercingDamage: Object.freeze(
            piercingTypes.map((monsterType) =>
              Object.freeze({
                target: Object.freeze({
                  controller: "own" as const,
                  face: "faceUp" as const,
                  monsterType,
                }),
              }),
            ),
          ),
        }),
      }),
    ]),
  });
}

function createSpearDragonScript(): CardScript {
  return Object.freeze({
    cardId: SPEAR_DRAGON_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "piercing",
        kind: "continuous" as const,
        implemented: true,
        continuous: Object.freeze({
          piercingDamage: Object.freeze([
            Object.freeze({
              target: Object.freeze({ source: "self" as const, face: "faceUp" as const }),
            }),
          ]),
        }),
      }),
      Object.freeze({
        id: "change-to-defense-after-attacking",
        kind: "trigger" as const,
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action" as const,
          eventTypes: Object.freeze(["battle-completed"] as const),
          sourceEvent: "self" as const,
          battleRole: "attacker" as const,
        }),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "set-source-face" as const, face: "faceUp" as const, position: "defense" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  });
}

function attributeAuraModifier(attribute: string, amount: number): StatModifierSpec {
  return Object.freeze({
    stat: "atk" as const,
    amount,
    target: Object.freeze({
      face: "faceUp" as const,
      attribute,
    }),
  });
}

function createSelfSetAndFlipTriggerScript(config: SelfSetAndFlipTriggerConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: "set-self-face-down",
        kind: "ignition" as const,
        implemented: true,
        spellSpeed: 1,
        oncePerTurn: Object.freeze({ scope: "source" as const }),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "set-source-face" as const, face: "faceDown" as const, position: "defense" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "flip",
        kind: "trigger" as const,
        implemented: true,
        spellSpeed: 1,
        targets: config.flipTargets,
        trigger: Object.freeze({
          timing: "after-action" as const,
          timings: Object.freeze(["after-action", "chain-resolved"] as const),
          eventTypes: Object.freeze(["summon-successful", "monster-flipped-face-up"] as const),
          eventPlayer: "self" as const,
          sourceEvent: "self" as const,
          summonKinds: Object.freeze(["flip"] as const),
        }),
        resolution: Object.freeze({
          steps: Object.freeze([...config.flipSteps]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
    canActivate: canActivateFaceUpMonster,
  });
}

function createSelfSetOnlyScript(cardId: string): CardScript {
  return Object.freeze({
    cardId,
    effects: Object.freeze([
      Object.freeze({
        id: "set-self-face-down",
        kind: "ignition" as const,
        implemented: true,
        spellSpeed: 1,
        oncePerTurn: Object.freeze({ scope: "source" as const }),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "set-source-face" as const, face: "faceDown" as const, position: "defense" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
    canActivate: canActivateFaceUpMonster,
  });
}

function createMoltenZombieScript(): CardScript {
  return Object.freeze({
    cardId: MOLTEN_ZOMBIE_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "draw-when-special-summoned-from-graveyard",
        kind: "trigger" as const,
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "chain-resolved" as const,
          timings: Object.freeze(["after-action", "chain-resolved"] as const),
          eventTypes: Object.freeze(["card-moved"] as const),
          eventPlayer: "self" as const,
          sourceEvent: "self" as const,
          fromZones: Object.freeze(["graveyard"] as const),
          toZones: Object.freeze(["monsterZone"] as const),
          moveReasons: Object.freeze(["effect-special-summon"] as const),
        }),
        resolution: Object.freeze({
          steps: Object.freeze([{ kind: "draw" as const, player: "self" as const, count: 1 }]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  });
}

function createTheImmortalOfThunderScript(): CardScript {
  return Object.freeze({
    cardId: THE_IMMORTAL_OF_THUNDER_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "flip",
        kind: "trigger" as const,
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action" as const,
          timings: Object.freeze(["after-action", "chain-resolved"] as const),
          eventTypes: Object.freeze(["summon-successful", "monster-flipped-face-up"] as const),
          eventPlayer: "self" as const,
          sourceEvent: "self" as const,
          summonKinds: Object.freeze(["flip"] as const),
        }),
        resolution: Object.freeze({
          steps: Object.freeze([{ kind: "lp-change" as const, player: "self" as const, amount: 3000 }]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "field-to-graveyard-lose-lp",
        kind: "trigger" as const,
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action" as const,
          eventTypes: Object.freeze(["card-moved"] as const),
          sourceEvent: "self" as const,
          fromZones: Object.freeze(["monsterZone"] as const),
          toZones: Object.freeze(["graveyard"] as const),
        }),
        resolution: Object.freeze({
          steps: Object.freeze([{ kind: "lp-change" as const, player: "self" as const, amount: -5000 }]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  });
}

function createATeamTrapDisposalUnitScript(): CardScript {
  return Object.freeze({
    cardId: A_TEAM_TRAP_DISPOSAL_UNIT_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "tribute-negate-trap",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        costs: Object.freeze([{ kind: "tribute-source" as const }]),
        resolution: Object.freeze({
          steps: Object.freeze([{ kind: "negate-previous-chain-link" as const }]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
    canActivate: canActivateATeamTrapDisposalUnit,
  });
}

function canActivateATeamTrapDisposalUnit({ state, command, sourceInstanceId }: CardEffectContext): boolean {
  const topLink = state.chain[state.chain.length - 1];

  if (command?.type !== "activate-card" || !sourceInstanceId || !topLink || topLink.playerId === command.playerId) {
    return false;
  }

  const source = findCardByInstanceId(state, sourceInstanceId);
  const chainedCard = state.cardDefinitions?.[topLink.cardId];

  return Boolean(
    source &&
      source.ref.playerId === command.playerId &&
      source.ref.zone === "monsterZone" &&
      "face" in source.card &&
      source.card.face === "faceUp" &&
      chainedCard?.kind === "trap",
  );
}

function canActivateEightClawsScorpion({ state, sourceInstanceId }: CardEffectContext): boolean {
  return canActivateFaceUpMonster({ state, sourceInstanceId });
}

function canActivateFaceUpMonster({ state, sourceInstanceId }: Pick<CardEffectContext, "state" | "sourceInstanceId">): boolean {
  const source = sourceInstanceId ? findCardByInstanceId(state, sourceInstanceId) : null;

  return Boolean(
    source &&
      source.ref.zone === "monsterZone" &&
      "face" in source.card &&
      source.card.face === "faceUp",
  );
}

function canActivateThreeHumpLacooda({ state, sourceInstanceId }: CardEffectContext): boolean {
  if (state.phase !== "M1" && state.phase !== "M2") {
    return false;
  }

  const source = sourceInstanceId ? findCardByInstanceId(state, sourceInstanceId) : null;

  if (!source || source.ref.zone !== "monsterZone" || !("face" in source.card) || source.card.face !== "faceUp") {
    return false;
  }

  const controlledFaceUpCopies = state.players[source.ref.playerId].monsterZones.filter(
    (card) => card?.cardId === THREE_HUMP_LACOODA_ID && card.face === "faceUp",
  );

  return controlledFaceUpCopies.length === 3;
}
