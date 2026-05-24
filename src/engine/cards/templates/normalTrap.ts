import type {
  CardScript,
  EffectPlayerSelector,
  EffectResolutionDefinition,
  EffectResolutionStep,
} from "../CardScript";
import type { CostSpec } from "../../effects/costs";
import type { TargetSpec } from "../../effects/targets";
import type { EngineEventType } from "../../events";
import type { TriggerTiming } from "../../rules/triggers";

export interface NormalTrapTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
  readonly timing: TriggerTiming;
  readonly eventTypes: readonly EngineEventType[];
  readonly eventPlayer?: EffectPlayerSelector | "any";
  readonly costs?: readonly CostSpec[];
  readonly targets?: readonly TargetSpec[];
  readonly steps: readonly EffectResolutionStep[];
}

export function createNormalTrapScript(config: NormalTrapTemplateConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: config.effectId ?? "activate",
        kind: "trigger",
        implemented: true,
        spellSpeed: 2,
        costs: config.costs,
        targets: config.targets,
        trigger: Object.freeze({
          timing: config.timing,
          eventTypes: Object.freeze([...config.eventTypes]),
          eventPlayer: config.eventPlayer ?? "any",
        }),
        resolution: createTrapResolution(config.steps),
      }),
    ]),
  });
}

function createTrapResolution(steps: readonly EffectResolutionStep[]): EffectResolutionDefinition {
  return Object.freeze({
    steps: Object.freeze([...steps]),
    sendSourceToGraveyard: true,
  });
}
