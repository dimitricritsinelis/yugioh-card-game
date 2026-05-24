import type { CardScript, EffectResolutionDefinition } from "../CardScript";
import type { CardId } from "../../data/cardCatalog";

export interface BattleRecruiterTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
  readonly recruitCardIds: readonly CardId[];
}

export function createBattleRecruiterScript(config: BattleRecruiterTemplateConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: config.effectId ?? "battle-recruit",
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action",
          eventTypes: Object.freeze(["card-moved"] as const),
          sourceEvent: "self",
          fromZones: Object.freeze(["monsterZone"] as const),
          toZones: Object.freeze(["graveyard"] as const),
          moveReasons: Object.freeze(["battle-destruction"] as const),
        }),
        resolution: createRecruiterResolution(config.recruitCardIds),
      }),
    ]),
  });
}

function createRecruiterResolution(cardIds: readonly CardId[]): EffectResolutionDefinition {
  return Object.freeze({
    steps: Object.freeze([
      {
        kind: "special-summon-from-deck" as const,
        player: "self" as const,
        cardIds: Object.freeze([...cardIds]),
        count: 1,
        position: "attack" as const,
      },
    ]),
    sendSourceToGraveyard: false,
  });
}
