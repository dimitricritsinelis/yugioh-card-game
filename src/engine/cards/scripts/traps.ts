import type { CardCoverageRegistry } from "../coverage";
import type { CardEffectContext, CardScript } from "../CardScript";
import { createContinuousTrapScript } from "../templates/continuousTrap";
import { createCounterTrapScript } from "../templates/counterTrap";
import { createNormalTrapScript } from "../templates/normalTrap";
import { createSpellSpeed2TrapScript } from "../templates/spellSpeed2Trap";

export const A_FEINT_PLAN_ID = "68170903";
export const A_HERO_EMERGES_ID = "21597117";
export const ABSOLUTE_END_ID = "27744077";
export const MIRROR_FORCE_ID = "44095762";
export const TORRENTIAL_TRIBUTE_ID = "53582587";
export const SAKURETSU_ARMOR_ID = "56120475";
export const JAR_OF_GREED_ID = "83968380";
export const COMPULSORY_EVACUATION_DEVICE_ID = "94192409";
export const GRAVITY_BIND_ID = "85742772";
export const NEGATE_ATTACK_ID = "14315573";
export const DESERT_SUNLIGHT_ID = "93747864";
export const DRAGONS_RAGE_ID = "54178050";
export const WINDSTORM_OF_ETAQUA_ID = "59744639";
export const ZERO_GRAVITY_ID = "83133491";
export const RAIGEKI_BREAK_ID = "04178474";
export const PHOENIX_WING_WIND_BLAST_ID = "63356631";
export const THREATENING_ROAR_ID = "36361633";
export const MAGIC_JAMMER_ID = "77414722";
export const METEORAIN_ID = "64274292";
export const NEEDLE_CEILING_ID = "38411870";
export const SEVEN_TOOLS_OF_THE_BANDIT_ID = "03819470";
export const TRAP_JAMMER_ID = "19252988";
export const ARMOR_BREAK_ID = "79649195";
export const ROYAL_SURRENDER_ID = "56058888";
export const SPELL_STOPPING_STATUTE_ID = "10069180";
export const RIRYOKU_FIELD_ID = "70344351";
export const FORCED_CEASEFIRE_ID = "97806240";
export const CASTLE_WALLS_ID = "44209392";
export const CEMETARY_BOMB_ID = "51394546";
export const DD_DYNAMITE_ID = "08628798";
export const DRAINING_SHIELD_ID = "43250041";
export const ENCHANTED_JAVELIN_ID = "96355986";
export const GIFT_OF_THE_MYSTICAL_ELF_ID = "98299011";
export const JUST_DESSERTS_ID = "24068492";
export const REINFORCEMENTS_ID = "17814387";
export const SNAKE_FANG_ID = "00596051";
export const SOLAR_RAY_ID = "44472639";

const anyMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
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

const opponentFieldCardTarget = Object.freeze({
  kind: "card" as const,
  controller: "opponent" as const,
  zones: Object.freeze(["monsterZone", "spellTrapZone", "fieldZone"] as const),
  cardKinds: Object.freeze(["monster", "spell", "trap"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

export const TRAP_CARD_SCRIPTS: readonly CardScript[] = Object.freeze([
  Object.freeze({
    cardId: A_FEINT_PLAN_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "prevent-face-down-monster-attacks",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({
              kind: "add-lingering-effect" as const,
              lingering: Object.freeze({
                duration: "until-end-phase" as const,
                attackRestrictions: Object.freeze([
                  Object.freeze({
                    target: Object.freeze({ controller: "any" as const }),
                    defender: Object.freeze({ controller: "any" as const, face: "faceDown" as const }),
                    reason: "A Feint Plan prevents attacks on face-down monsters this turn.",
                  }),
                ]),
              }),
            }),
          ]),
          sendSourceToGraveyard: true,
        }),
      }),
    ]),
  }),
  createNormalTrapScript({
    cardId: A_HERO_EMERGES_ID,
    timing: "after-action",
    eventTypes: Object.freeze(["attack-declared"]),
    eventPlayer: "opponent",
    steps: Object.freeze([
      { kind: "random-own-hand-card-special-summon-or-send-to-graveyard", position: "attack" },
    ]),
  }),
  Object.freeze({
    cardId: ABSOLUTE_END_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "make-opponent-attacks-direct",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({
              kind: "add-lingering-effect" as const,
              lingering: Object.freeze({
                duration: "until-end-phase" as const,
                directAttack: Object.freeze([
                  Object.freeze({
                    target: Object.freeze({ controller: "opponent" as const }),
                  }),
                ]),
              }),
            }),
          ]),
          sendSourceToGraveyard: true,
        }),
      }),
    ]),
    canActivate: canActivateAbsoluteEnd,
  }),
  createNormalTrapScript({
    cardId: MIRROR_FORCE_ID,
    timing: "after-action",
    eventTypes: Object.freeze(["attack-declared"]),
    eventPlayer: "opponent",
    steps: Object.freeze([{ kind: "destroy-opponent-attack-position-monsters" }]),
  }),
  createNormalTrapScript({
    cardId: TORRENTIAL_TRIBUTE_ID,
    timing: "after-action",
    eventTypes: Object.freeze(["summon-successful"]),
    eventPlayer: "any",
    steps: Object.freeze([{ kind: "destroy-all-monsters", controller: "all" }]),
  }),
  Object.freeze({
    ...createSpellSpeed2TrapScript({
      cardId: NEEDLE_CEILING_ID,
      steps: Object.freeze([{ kind: "destroy-face-up-monsters", controller: "all" }]),
    }),
    canActivate: canActivateNeedleCeiling,
  }),
  createNormalTrapScript({
    cardId: SAKURETSU_ARMOR_ID,
    timing: "after-action",
    eventTypes: Object.freeze(["attack-declared"]),
    eventPlayer: "opponent",
    steps: Object.freeze([{ kind: "destroy-attack-source" }]),
  }),
  createNormalTrapScript({
    cardId: DRAINING_SHIELD_ID,
    timing: "after-action",
    eventTypes: Object.freeze(["attack-declared"]),
    eventPlayer: "opponent",
    steps: Object.freeze([
      { kind: "negate-attack" },
      { kind: "gain-lp-by-attack-source-atk" },
    ]),
  }),
  createNormalTrapScript({
    cardId: ENCHANTED_JAVELIN_ID,
    timing: "after-action",
    eventTypes: Object.freeze(["attack-declared"]),
    eventPlayer: "opponent",
    steps: Object.freeze([{ kind: "gain-lp-by-attack-source-atk" }]),
  }),
  createSpellSpeed2TrapScript({
    cardId: JAR_OF_GREED_ID,
    steps: Object.freeze([{ kind: "draw", player: "self", count: 1 }]),
  }),
  createSpellSpeed2TrapScript({
    cardId: COMPULSORY_EVACUATION_DEVICE_ID,
    targets: Object.freeze([anyMonsterTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createSpellSpeed2TrapScript({
    cardId: CASTLE_WALLS_ID,
    targets: Object.freeze([faceUpMonsterTarget]),
    steps: Object.freeze([
      {
        kind: "add-lingering-stat-modifiers-to-targets",
        modifiers: Object.freeze([{ stat: "def" as const, amount: 500 }]),
      },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: REINFORCEMENTS_ID,
    targets: Object.freeze([faceUpMonsterTarget]),
    steps: Object.freeze([
      {
        kind: "add-lingering-stat-modifiers-to-targets",
        modifiers: Object.freeze([{ stat: "atk" as const, amount: 500 }]),
      },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: SNAKE_FANG_ID,
    targets: Object.freeze([faceUpMonsterTarget]),
    steps: Object.freeze([
      {
        kind: "add-lingering-stat-modifiers-to-targets",
        modifiers: Object.freeze([{ stat: "def" as const, amount: -500 }]),
      },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: CEMETARY_BOMB_ID,
    steps: Object.freeze([
      { kind: "lp-change-by-count", player: "opponent", amountPer: -100, count: "opponent-graveyard-cards" },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: DD_DYNAMITE_ID,
    steps: Object.freeze([
      { kind: "lp-change-by-count", player: "opponent", amountPer: -300, count: "opponent-banished-cards" },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: GIFT_OF_THE_MYSTICAL_ELF_ID,
    steps: Object.freeze([
      { kind: "lp-change-by-count", player: "self", amountPer: 300, count: "all-monsters-on-field" },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: JUST_DESSERTS_ID,
    steps: Object.freeze([
      { kind: "lp-change-by-count", player: "opponent", amountPer: -500, count: "opponent-monsters" },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: SOLAR_RAY_ID,
    steps: Object.freeze([
      { kind: "lp-change-by-count", player: "opponent", amountPer: -600, count: "own-face-up-light-monsters" },
    ]),
  }),
  createCounterTrapScript({
    cardId: NEGATE_ATTACK_ID,
    timing: "after-action",
    eventTypes: Object.freeze(["attack-declared"]),
    eventPlayer: "opponent",
    steps: Object.freeze([{ kind: "negate-attack" }]),
  }),
  createContinuousTrapScript({
    cardId: GRAVITY_BIND_ID,
    continuous: {
      attackRestrictions: Object.freeze([
        Object.freeze({
          target: Object.freeze({ levelMin: 4 } as const),
          reason: "Level 4 or higher monsters cannot attack while Gravity Bind is face-up.",
        }),
      ]),
    },
  }),
  createContinuousTrapScript({
    cardId: DRAGONS_RAGE_ID,
    continuous: {
      piercingDamage: Object.freeze([
        Object.freeze({
          target: Object.freeze({ controller: "own" as const, face: "faceUp" as const, monsterType: "Dragon" }),
        }),
      ]),
    },
  }),
  createSpellSpeed2TrapScript({
    cardId: METEORAIN_ID,
    steps: Object.freeze([
      {
        kind: "add-lingering-effect" as const,
        lingering: Object.freeze({
          duration: "until-end-phase" as const,
          piercingDamage: Object.freeze([
            Object.freeze({
              target: Object.freeze({ controller: "own" as const, face: "faceUp" as const }),
            }),
          ]),
        }),
      },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: DESERT_SUNLIGHT_ID,
    steps: Object.freeze([
      { kind: "change-position-all-face-up-monsters", controller: "self", position: "defense" },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: WINDSTORM_OF_ETAQUA_ID,
    steps: Object.freeze([
      { kind: "change-position-all-face-up-monsters", controller: "opponent" },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: ZERO_GRAVITY_ID,
    steps: Object.freeze([
      { kind: "change-position-all-face-up-monsters", controller: "all" },
    ]),
  }),
  createSpellSpeed2TrapScript({
    cardId: RAIGEKI_BREAK_ID,
    costs: Object.freeze([{ kind: "discard", count: 1 }]),
    targets: Object.freeze([
      Object.freeze({
        kind: "card" as const,
        controller: "any" as const,
        zones: Object.freeze(["monsterZone", "spellTrapZone", "fieldZone"] as const),
        cardKinds: Object.freeze(["monster", "spell", "trap"] as const),
        face: "any" as const,
        min: 1,
        max: 1,
      }),
    ]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createSpellSpeed2TrapScript({
    cardId: PHOENIX_WING_WIND_BLAST_ID,
    costs: Object.freeze([{ kind: "discard", count: 1 }]),
    targets: Object.freeze([opponentFieldCardTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-deck-top" }]),
  }),
  Object.freeze({
    cardId: THREATENING_ROAR_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "prevent-opponent-attacks",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({
              kind: "add-lingering-effect" as const,
              lingering: Object.freeze({
                duration: "until-end-phase" as const,
                attackRestrictions: Object.freeze([
                  Object.freeze({
                    target: Object.freeze({ controller: "opponent" as const }),
                    reason: "Threatening Roar prevents your opponent from declaring attacks this turn.",
                  }),
                ]),
              }),
            }),
          ]),
          sendSourceToGraveyard: true,
        }),
      }),
    ]),
  }),
  createActivationNegatingCounterTrapScript({
    cardId: MAGIC_JAMMER_ID,
    costs: Object.freeze([{ kind: "discard" as const, count: 1 }]),
    canNegate: canNegateSpellActivation,
  }),
  createActivationNegatingCounterTrapScript({
    cardId: SEVEN_TOOLS_OF_THE_BANDIT_ID,
    costs: Object.freeze([{ kind: "pay-lp" as const, amount: 1000 }]),
    canNegate: canNegateTrapActivation,
  }),
  createActivationNegatingCounterTrapScript({
    cardId: TRAP_JAMMER_ID,
    canNegate: canNegateOpponentTrapActivationDuringBattlePhase,
  }),
  createActivationNegatingCounterTrapScript({
    cardId: ARMOR_BREAK_ID,
    canNegate: canNegateEquipSpellActivation,
  }),
  createActivationNegatingCounterTrapScript({
    cardId: ROYAL_SURRENDER_ID,
    canNegate: canNegateOpponentContinuousTrapActivation,
  }),
  createActivationNegatingCounterTrapScript({
    cardId: SPELL_STOPPING_STATUTE_ID,
    canNegate: canNegateOpponentContinuousSpellActivation,
  }),
  createActivationNegatingCounterTrapScript({
    cardId: RIRYOKU_FIELD_ID,
    canNegate: canNegateSpellTargetingOneMonster,
  }),
  Object.freeze({
    cardId: FORCED_CEASEFIRE_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "prevent-trap-activations",
        kind: "quick" as const,
        implemented: true,
        spellSpeed: 2 as const,
        costs: Object.freeze([{ kind: "discard" as const, count: 1 }]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({
              kind: "add-lingering-effect" as const,
              lingering: Object.freeze({
                duration: "until-end-phase" as const,
                activationRestrictions: Object.freeze([
                  Object.freeze({
                    cardKinds: Object.freeze(["trap"] as const),
                    controller: "any" as const,
                    reason: "Forced Ceasefire prevents Trap Cards from being activated until the End Phase.",
                  }),
                ]),
              }),
            }),
          ]),
          sendSourceToGraveyard: true,
        }),
      }),
    ]),
  }),
]);

export const TRAP_CARD_COVERAGE: CardCoverageRegistry = Object.freeze({
  [A_FEINT_PLAN_ID]: "goatCustom",
  [A_HERO_EMERGES_ID]: "goatTemplate",
  [ABSOLUTE_END_ID]: "goatCustom",
  [MIRROR_FORCE_ID]: "goatTemplate",
  [TORRENTIAL_TRIBUTE_ID]: "goatTemplate",
  [SAKURETSU_ARMOR_ID]: "goatTemplate",
  [JAR_OF_GREED_ID]: "goatTemplate",
  [COMPULSORY_EVACUATION_DEVICE_ID]: "goatTemplate",
  [CASTLE_WALLS_ID]: "goatTemplate",
  [CEMETARY_BOMB_ID]: "goatTemplate",
  [DD_DYNAMITE_ID]: "goatTemplate",
  [DRAINING_SHIELD_ID]: "goatTemplate",
  [ENCHANTED_JAVELIN_ID]: "goatTemplate",
  [GIFT_OF_THE_MYSTICAL_ELF_ID]: "goatTemplate",
  [JUST_DESSERTS_ID]: "goatTemplate",
  [REINFORCEMENTS_ID]: "goatTemplate",
  [SNAKE_FANG_ID]: "goatTemplate",
  [SOLAR_RAY_ID]: "goatTemplate",
  [GRAVITY_BIND_ID]: "goatTemplate",
  [DRAGONS_RAGE_ID]: "goatTemplate",
  [METEORAIN_ID]: "goatCustom",
  [NEEDLE_CEILING_ID]: "goatTemplate",
  [NEGATE_ATTACK_ID]: "goatTemplate",
  [DESERT_SUNLIGHT_ID]: "goatTemplate",
  [WINDSTORM_OF_ETAQUA_ID]: "goatTemplate",
  [ZERO_GRAVITY_ID]: "goatTemplate",
  [RAIGEKI_BREAK_ID]: "goatTemplate",
  [PHOENIX_WING_WIND_BLAST_ID]: "goatTemplate",
  [THREATENING_ROAR_ID]: "goatCustom",
  [MAGIC_JAMMER_ID]: "goatCustom",
  [SEVEN_TOOLS_OF_THE_BANDIT_ID]: "goatCustom",
  [TRAP_JAMMER_ID]: "goatCustom",
  [ARMOR_BREAK_ID]: "goatCustom",
  [ROYAL_SURRENDER_ID]: "goatCustom",
  [SPELL_STOPPING_STATUTE_ID]: "goatCustom",
  [RIRYOKU_FIELD_ID]: "goatCustom",
  [FORCED_CEASEFIRE_ID]: "goatCustom",
});

function canActivateAbsoluteEnd({ state, command }: CardEffectContext): boolean {
  return command?.type === "activate-card" && state.activePlayer !== command.playerId;
}

function createActivationNegatingCounterTrapScript(config: {
  readonly cardId: string;
  readonly costs?: CardScript["effects"][number]["costs"];
  readonly canNegate: (context: CardEffectContext) => boolean;
}): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: "negate-activation",
        kind: "quick" as const,
        implemented: true,
        spellSpeed: 3 as const,
        costs: config.costs,
        resolution: Object.freeze({
          steps: Object.freeze([{ kind: "negate-previous-chain-link" as const }]),
          sendSourceToGraveyard: true,
        }),
      }),
    ]),
    canActivate: config.canNegate,
  });
}

function canNegateSpellActivation(context: CardEffectContext): boolean {
  return canNegatePreviousActivationOfKind(context, "spell");
}

function canNegateTrapActivation(context: CardEffectContext): boolean {
  return canNegatePreviousActivationOfKind(context, "trap");
}

function canNegateOpponentTrapActivationDuringBattlePhase(context: CardEffectContext): boolean {
  return context.state.phase === "BP" && canNegatePreviousActivationOfKind(context, "trap", { opponentOnly: true });
}

function canActivateNeedleCeiling({ state }: CardEffectContext): boolean {
  return state.players.P1.monsterZones.filter((card) => card !== null).length +
    state.players.P2.monsterZones.filter((card) => card !== null).length >= 4;
}

function canNegateEquipSpellActivation(context: CardEffectContext): boolean {
  return canNegatePreviousActivationOfKind(context, "spell", { spellTrapIcon: "Equip" });
}

function canNegateOpponentContinuousTrapActivation(context: CardEffectContext): boolean {
  return canNegatePreviousActivationOfKind(context, "trap", { opponentOnly: true, spellTrapIcon: "Continuous" });
}

function canNegateOpponentContinuousSpellActivation(context: CardEffectContext): boolean {
  return canNegatePreviousActivationOfKind(context, "spell", { opponentOnly: true, spellTrapIcon: "Continuous" });
}

function canNegateSpellTargetingOneMonster(context: CardEffectContext): boolean {
  return canNegatePreviousActivationOfKind(context, "spell", { targetOneMonster: true });
}

function canNegatePreviousActivationOfKind(
  { state, command, sourceInstanceId }: CardEffectContext,
  kind: "spell" | "trap",
  options: { readonly opponentOnly?: boolean; readonly spellTrapIcon?: string; readonly targetOneMonster?: boolean } = {},
): boolean {
  const topLink = state.chain[state.chain.length - 1];

  if (command?.type !== "activate-card" || !sourceInstanceId || !topLink) {
    return false;
  }
  if (topLink.sourceInstanceId === sourceInstanceId) {
    return false;
  }
  if (options.opponentOnly === true && topLink.playerId === command.playerId) {
    return false;
  }

  const chainedCard = state.cardDefinitions?.[topLink.cardId];

  if (chainedCard?.kind !== kind) {
    return false;
  }
  if (options.targetOneMonster === true) {
    const targetRefs = topLink.selectedTargets?.targetRefs ?? [];

    if (targetRefs.length !== 1 || targetRefs[0]?.zone !== "monsterZone") {
      return false;
    }
  }

  return options.spellTrapIcon === undefined || chainedCard.spellTrap.icon === options.spellTrapIcon;
}
