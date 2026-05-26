import type { CardScript } from "../CardScript";
import type { ContinuousEffectDefinition } from "../../effects/continuous";

export interface ContinuousSpellTemplateConfig {
  readonly cardId: string;
  readonly activationEffectId?: string;
  readonly continuousEffectId?: string;
  readonly continuous: ContinuousEffectDefinition;
}

export function createContinuousSpellScript(config: ContinuousSpellTemplateConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: config.activationEffectId ?? "activate",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        resolution: Object.freeze({
          steps: Object.freeze([
            Object.freeze({ kind: "place-source-in-spell-trap-zone" as const }),
          ]),
          sendSourceToGraveyard: false,
        }),
      }),
      Object.freeze({
        id: config.continuousEffectId ?? "continuous",
        kind: "continuous",
        implemented: true,
        continuous: config.continuous,
      }),
    ]),
  });
}
