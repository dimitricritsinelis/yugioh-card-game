import type { CardScript, EffectResolutionDefinition } from "../CardScript";

export interface SpiritTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
}

export function createSpiritReturnScript(config: SpiritTemplateConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: config.effectId ?? "spirit-return",
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action",
          eventTypes: Object.freeze(["phase-changed"] as const),
          phaseFrom: Object.freeze(["EP"] as const),
          phaseTo: Object.freeze(["DP"] as const),
        }),
        resolution: createSpiritResolution(),
      }),
    ]),
  });
}

function createSpiritResolution(): EffectResolutionDefinition {
  return Object.freeze({
    steps: Object.freeze([{ kind: "return-source-to-hand" as const }]),
    sendSourceToGraveyard: false,
  });
}
