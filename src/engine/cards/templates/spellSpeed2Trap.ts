import type {
  CardScript,
  EffectResolutionDefinition,
  EffectResolutionStep,
} from "../CardScript";
import type { CostSpec } from "../../effects/costs";
import type { TargetSpec } from "../../effects/targets";

export interface SpellSpeed2TrapTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
  readonly costs?: readonly CostSpec[];
  readonly targets?: readonly TargetSpec[];
  readonly steps: readonly EffectResolutionStep[];
}

export function createSpellSpeed2TrapScript(config: SpellSpeed2TrapTemplateConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: config.effectId ?? "activate",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        costs: config.costs,
        targets: config.targets,
        resolution: Object.freeze({
          steps: Object.freeze([...config.steps]),
          sendSourceToGraveyard: true,
        }),
      }),
    ]),
  });
}
