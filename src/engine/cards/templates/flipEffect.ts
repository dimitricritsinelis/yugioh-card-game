import type {
  CardScript,
  EffectResolutionDefinition,
  EffectResolutionStep,
} from "../CardScript";
import type { TargetSpec } from "../../effects/targets";

export interface FlipEffectTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
  readonly targets?: readonly TargetSpec[];
  readonly steps: readonly EffectResolutionStep[];
}

export function createFlipEffectScript(config: FlipEffectTemplateConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: config.effectId ?? "flip",
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        targets: config.targets,
        trigger: Object.freeze({
          timing: "after-action",
          eventTypes: Object.freeze(["summon-successful"] as const),
          eventPlayer: "self",
          sourceEvent: "self",
          summonKinds: Object.freeze(["flip"] as const),
        }),
        resolution: createMonsterResolution(config.steps),
      }),
    ]),
  });
}

function createMonsterResolution(steps: readonly EffectResolutionStep[]): EffectResolutionDefinition {
  return Object.freeze({
    steps: Object.freeze([...steps]),
    sendSourceToGraveyard: false,
  });
}
