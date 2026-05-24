import type { CardCoverageRegistry } from "../../coverage";
import type { CardEffectContext, CardScript, EffectDefinition } from "../../CardScript";
import { findCardByInstanceId } from "../../../core/zones";

export const BREAKER_THE_MAGICAL_WARRIOR_ID = "71413901";
export const TRIBE_INFECTING_VIRUS_ID = "33184167";
export const SINISTER_SERPENT_ID = "08131171";
export const DD_WARRIOR_LADY_ID = "07572887";
export const INJECTION_FAIRY_LILY_ID = "79575620";
export const REFLECT_BOUNDER_ID = "02851070";
export const JINZO_ID = "77585513";
export const RING_OF_DESTRUCTION_ID = "83555666";
export const CALL_OF_THE_HAUNTED_ID = "97077563";
export const PREMATURE_BURIAL_ID = "70828912";
export const SNATCH_STEAL_ID = "45986603";
const SPELL_COUNTER = "spell";
const TRIBE_EFFECT_PREFIX = "declare-type";
const MONSTER_TYPES = Object.freeze([
  "Aqua",
  "Beast",
  "Beast-Warrior",
  "Dinosaur",
  "Dragon",
  "Fairy",
  "Fiend",
  "Fish",
  "Insect",
  "Machine",
  "Plant",
  "Pyro",
  "Reptile",
  "Rock",
  "Sea Serpent",
  "Spellcaster",
  "Thunder",
  "Warrior",
  "Winged Beast",
  "Zombie",
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
const opponentFaceUpMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "opponent" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "faceUp" as const,
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

export const CUSTOM_STAPLE_CARD_SCRIPTS: readonly CardScript[] = Object.freeze([
  Object.freeze({
    cardId: BREAKER_THE_MAGICAL_WARRIOR_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "place-spell-counter",
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action",
          eventTypes: Object.freeze(["summon-successful"] as const),
          eventPlayer: "self",
          sourceEvent: "self",
          summonKinds: Object.freeze(["normal"] as const),
        }),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({
              kind: "add-counter-to-source" as const,
              counterType: SPELL_COUNTER,
              count: 1,
              max: 1,
            }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "remove-spell-counter-destroy",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        costs: Object.freeze([
          Object.freeze({
            kind: "remove-counter-from-source" as const,
            counterType: SPELL_COUNTER,
            count: 1,
          }),
        ]),
        targets: Object.freeze([spellTrapTarget]),
        resolution: Object.freeze({
          steps: Object.freeze([Object.freeze({ kind: "destroy-targets" as const })]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "spell-counter-atk",
        kind: "continuous",
        implemented: true,
        continuous: Object.freeze({
          statModifiers: Object.freeze([
            Object.freeze({
              stat: "atk" as const,
              amount: 300,
              target: Object.freeze({
                source: "self" as const,
                face: "faceUp" as const,
                counters: Object.freeze([
                  Object.freeze({
                    counterType: SPELL_COUNTER,
                    min: 1,
                  }),
                ]),
              }),
            }),
          ]),
        }),
      }),
    ]),
    canActivate: canActivateBreaker,
  }),
  Object.freeze({
    cardId: TRIBE_INFECTING_VIRUS_ID,
    effects: Object.freeze(MONSTER_TYPES.map(createTribeEffect)),
    canActivate: canActivateTribe,
  }),
  Object.freeze({
    cardId: SINISTER_SERPENT_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "standby-return",
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action",
          eventTypes: Object.freeze(["phase-changed"] as const),
          eventPlayer: "self",
          phaseTo: Object.freeze(["SP"] as const),
          optional: true,
        }),
        resolution: Object.freeze({
          steps: Object.freeze([Object.freeze({ kind: "return-source-to-hand" as const })]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  }),
  Object.freeze({
    cardId: DD_WARRIOR_LADY_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "banish-battled-monsters",
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action",
          eventTypes: Object.freeze(["battle-completed"] as const),
          sourceEvent: "self",
          optional: true,
        }),
        resolution: Object.freeze({
          steps: Object.freeze([Object.freeze({ kind: "banish-battle-participants" as const })]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  }),
  Object.freeze({
    cardId: REFLECT_BOUNDER_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "attacker-atk-damage-destroy-source",
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action",
          eventTypes: Object.freeze(["battle-completed"] as const),
          sourceEvent: "self",
          battleRole: "defender",
          battlePositions: Object.freeze(["attack"] as const),
        }),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "damage-attacker-by-battle-atk-destroy-source" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  }),
  Object.freeze({
    cardId: JINZO_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "trap-lockdown",
        kind: "continuous",
        implemented: true,
        continuous: Object.freeze({
          activationRestrictions: Object.freeze([
            Object.freeze({
              cardKinds: Object.freeze(["trap"] as const),
              controller: "any" as const,
              reason: "Trap Cards cannot be activated while Jinzo is face-up.",
            }),
          ]),
          effectNegations: Object.freeze([
            Object.freeze({
              cardKinds: Object.freeze(["trap"] as const),
              controller: "any" as const,
            }),
          ]),
        }),
      }),
    ]),
  }),
  Object.freeze({
    cardId: RING_OF_DESTRUCTION_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "destroy-monster-damage-both",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        targets: Object.freeze([faceUpMonsterTarget]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "destroy-targets-damage-both-players-by-monster-atk" as const }),
          ]),
          sendSourceToGraveyard: true,
        }),
      }),
    ]),
  }),
  Object.freeze({
    cardId: CALL_OF_THE_HAUNTED_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "revive-graveyard-monster",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        targets: Object.freeze([ownGraveyardMonsterTarget]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({
              kind: "special-summon-target-from-graveyard" as const,
              position: "attack" as const,
              linkToSource: true,
            }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
    canActivate: canActivateCallOfTheHaunted,
  }),
  Object.freeze({
    cardId: PREMATURE_BURIAL_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "pay-lp-revive-graveyard-monster",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        costs: Object.freeze([Object.freeze({ kind: "pay-lp" as const, amount: 800 })]),
        targets: Object.freeze([ownGraveyardMonsterTarget]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "place-source-in-spell-trap-zone" as const }),
            Object.freeze({
              kind: "special-summon-target-from-graveyard" as const,
              position: "attack" as const,
              linkToSource: true,
            }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
    canActivate: canActivatePrematureBurial,
  }),
  Object.freeze({
    cardId: SNATCH_STEAL_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "take-control-equipped-monster",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: Object.freeze([opponentFaceUpMonsterTarget]),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "place-source-in-spell-trap-zone" as const }),
            Object.freeze({
              kind: "take-control-of-targets" as const,
              linkToSource: true,
              sourceLeaveBehavior: "return-control" as const,
            }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: "opponent-standby-gain-lp",
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action",
          eventTypes: Object.freeze(["phase-changed"] as const),
          eventPlayer: "opponent",
          phaseTo: Object.freeze(["SP"] as const),
        }),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "lp-change" as const, player: "opponent" as const, amount: 1000 }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
    canActivate: canActivateSnatchSteal,
  }),
  Object.freeze({
    cardId: INJECTION_FAIRY_LILY_ID,
    effects: Object.freeze([
      Object.freeze({
        id: "damage-calculation-atk-boost",
        kind: "trigger",
        implemented: true,
        spellSpeed: 2,
        costs: Object.freeze([Object.freeze({ kind: "pay-lp" as const, amount: 2000 })]),
        trigger: Object.freeze({
          timing: "after-action",
          eventTypes: Object.freeze(["attack-declared"] as const),
          sourceEvent: "self",
          optional: true,
        }),
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({
              kind: "modify-pending-battle-atk" as const,
              amount: 3000,
            }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
  }),
]);

export const CUSTOM_STAPLE_CARD_COVERAGE: CardCoverageRegistry = Object.freeze({
  [BREAKER_THE_MAGICAL_WARRIOR_ID]: "goatCustom",
  [TRIBE_INFECTING_VIRUS_ID]: "goatCustom",
  [SINISTER_SERPENT_ID]: "goatCustom",
  [DD_WARRIOR_LADY_ID]: "goatCustom",
  [INJECTION_FAIRY_LILY_ID]: "goatCustom",
  [REFLECT_BOUNDER_ID]: "goatCustom",
  [JINZO_ID]: "goatCustom",
  [RING_OF_DESTRUCTION_ID]: "goatCustom",
  [CALL_OF_THE_HAUNTED_ID]: "goatCustom",
  [PREMATURE_BURIAL_ID]: "goatCustom",
  [SNATCH_STEAL_ID]: "goatCustom",
});

export function tribeEffectId(monsterType: string): string {
  return `${TRIBE_EFFECT_PREFIX}-${monsterType.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function canActivateBreaker({ state, command, sourceInstanceId }: CardEffectContext): boolean {
  if (command?.type !== "activate-card" || command.effectId !== "remove-spell-counter-destroy") {
    return false;
  }

  if (state.phase !== "M1" && state.phase !== "M2") {
    return false;
  }

  const source = sourceInstanceId ? findCardByInstanceId(state, sourceInstanceId) : null;

  return (
    source?.ref.zone === "monsterZone" &&
    "face" in source.card &&
    source.card.face === "faceUp" &&
    (source.card.counters[SPELL_COUNTER] ?? 0) > 0
  );
}

function createTribeEffect(monsterType: string): EffectDefinition {
  return Object.freeze({
    id: tribeEffectId(monsterType),
    kind: "ignition",
    implemented: true,
    spellSpeed: 1,
    costs: Object.freeze([Object.freeze({ kind: "discard" as const, count: 1 })]),
    resolution: Object.freeze({
      steps: Object.freeze([
        Object.freeze({
          kind: "destroy-face-up-monsters-by-type" as const,
          monsterType,
        }),
      ]),
      sendSourceToGraveyard: false,
    }),
  });
}

function canActivateTribe({ state, command, sourceInstanceId }: CardEffectContext): boolean {
  if (command?.type !== "activate-card" || !command.effectId?.startsWith(`${TRIBE_EFFECT_PREFIX}-`)) {
    return false;
  }

  if (state.phase !== "M1" && state.phase !== "M2") {
    return false;
  }

  const source = sourceInstanceId ? findCardByInstanceId(state, sourceInstanceId) : null;

  return source?.ref.zone === "monsterZone" && "face" in source.card && source.card.face === "faceUp";
}

function canActivateCallOfTheHaunted({ state, command }: CardEffectContext): boolean {
  if (
    command?.type !== "activate-card" ||
    (command.effectId !== undefined && command.effectId !== "revive-graveyard-monster")
  ) {
    return false;
  }

  return state.players[command.playerId].monsterZones.some((card) => card === null);
}

function canActivatePrematureBurial({ state, command, sourceInstanceId }: CardEffectContext): boolean {
  if (
    command?.type !== "activate-card" ||
    (command.effectId !== undefined && command.effectId !== "pay-lp-revive-graveyard-monster")
  ) {
    return false;
  }

  if (state.phase !== "M1" && state.phase !== "M2") {
    return false;
  }

  if (!state.players[command.playerId].monsterZones.some((card) => card === null)) {
    return false;
  }

  const source = sourceInstanceId ? findCardByInstanceId(state, sourceInstanceId) : null;

  return source?.ref.zone === "spellTrapZone" || (
    source?.ref.zone === "hand" &&
    state.players[command.playerId].spellTrapZones.some((card) => card === null)
  );
}

function canActivateSnatchSteal({ state, command, sourceInstanceId }: CardEffectContext): boolean {
  if (
    command?.type !== "activate-card" ||
    (command.effectId !== undefined && command.effectId !== "take-control-equipped-monster")
  ) {
    return false;
  }

  if (state.phase !== "M1" && state.phase !== "M2") {
    return false;
  }

  if (!state.players[command.playerId].monsterZones.some((card) => card === null)) {
    return false;
  }

  const source = sourceInstanceId ? findCardByInstanceId(state, sourceInstanceId) : null;

  if (source?.ref.zone === "hand") {
    return state.players[command.playerId].spellTrapZones.some((card) => card === null);
  }

  return source?.ref.zone === "spellTrapZone" && "face" in source.card && source.card.face === "faceDown";
}
