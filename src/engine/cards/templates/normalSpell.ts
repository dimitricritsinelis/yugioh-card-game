import type {
  CardScript,
  EffectResolutionDefinition,
  EffectResolutionStep,
} from "../CardScript";
import type { CostSpec } from "../../effects/costs";
import type { TargetSpec } from "../../effects/targets";

export interface NormalSpellTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
  readonly costs?: readonly CostSpec[];
  readonly targets?: readonly TargetSpec[];
  readonly steps: readonly EffectResolutionStep[];
}

export function createNormalSpellScript(config: NormalSpellTemplateConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: config.effectId ?? "activate",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        costs: config.costs,
        targets: config.targets,
        resolution: createSpellResolution(config.steps),
      }),
    ]),
  });
}

function createSpellResolution(steps: readonly EffectResolutionStep[]): EffectResolutionDefinition {
  return Object.freeze({
    steps: Object.freeze([...steps]),
    sendSourceToGraveyard: true,
  });
}
