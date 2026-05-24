import type { CardEffectContext, CardScript, EffectResolutionStep } from "../CardScript";
import type { ContinuousEffectDefinition } from "../../effects/continuous";
import type { CostSpec } from "../../effects/costs";
import type { TargetSpec } from "../../effects/targets";
import { findCardByInstanceId } from "../../core/zones";

export interface MonsterIgnitionTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
  readonly costs?: readonly CostSpec[];
  readonly targets?: readonly TargetSpec[];
  readonly steps: readonly EffectResolutionStep[];
}

export interface MonsterContinuousTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
  readonly continuous: ContinuousEffectDefinition;
}

export function createMonsterIgnitionScript(config: MonsterIgnitionTemplateConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: config.effectId ?? "ignition",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        costs: config.costs,
        targets: config.targets,
        resolution: Object.freeze({
          steps: Object.freeze([...config.steps]),
          sendSourceToGraveyard: false,
        }),
      }),
    ]),
    canActivate: ({ state, sourceInstanceId }: CardEffectContext) => {
      if (state.phase !== "M1" && state.phase !== "M2") {
        return false;
      }

      const source = sourceInstanceId ? findCardByInstanceId(state, sourceInstanceId) : null;

      return source?.ref.zone === "monsterZone" && "face" in source.card && source.card.face === "faceUp";
    },
  });
}

export function createMonsterContinuousScript(config: MonsterContinuousTemplateConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: config.effectId ?? "continuous",
        kind: "continuous",
        implemented: true,
        continuous: config.continuous,
      }),
    ]),
  });
}

export function createPiercingDamageScript(cardId: string): CardScript {
  return createMonsterContinuousScript({
    cardId,
    effectId: "piercing",
    continuous: {
      piercingDamage: Object.freeze([
        Object.freeze({
          target: Object.freeze({ source: "self", face: "faceUp" }),
        }),
      ]),
    },
  });
}

export function createDirectAttackScript(cardId: string): CardScript {
  return createMonsterContinuousScript({
    cardId,
    effectId: "direct-attack",
    continuous: {
      directAttack: Object.freeze([
        Object.freeze({
          target: Object.freeze({ source: "self", face: "faceUp" }),
        }),
      ]),
    },
  });
}
