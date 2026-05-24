import type { CardScript, EffectResolutionDefinition } from "../CardScript";
import type { CardId } from "../../data/cardCatalog";

export interface SentToGraveyardSearcherTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
  readonly searchCardIds: readonly CardId[];
}

export function createSentToGraveyardSearcherScript(config: SentToGraveyardSearcherTemplateConfig): CardScript {
  return Object.freeze({
    cardId: config.cardId,
    effects: Object.freeze([
      Object.freeze({
        id: config.effectId ?? "sent-to-graveyard-search",
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: Object.freeze({
          timing: "after-action",
          eventTypes: Object.freeze(["card-moved"] as const),
          sourceEvent: "self",
          fromZones: Object.freeze(["monsterZone"] as const),
          toZones: Object.freeze(["graveyard"] as const),
        }),
        resolution: createSearchResolution(config.searchCardIds),
      }),
    ]),
  });
}

function createSearchResolution(cardIds: readonly CardId[]): EffectResolutionDefinition {
  return Object.freeze({
    steps: Object.freeze([
      {
        kind: "search-deck-to-hand" as const,
        player: "self" as const,
        cardIds: Object.freeze([...cardIds]),
        count: 1,
      },
    ]),
    sendSourceToGraveyard: false,
  });
}
