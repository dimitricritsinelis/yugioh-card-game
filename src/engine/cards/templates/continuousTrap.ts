import type { CardScript } from "../CardScript";
import type { ContinuousEffectDefinition } from "../../effects/continuous";

export interface ContinuousTrapTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
  readonly continuous: ContinuousEffectDefinition;
}

export function createContinuousTrapScript(config: ContinuousTrapTemplateConfig): CardScript {
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
