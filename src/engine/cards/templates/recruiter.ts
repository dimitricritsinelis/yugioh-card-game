import type { CardScript, DeckMonsterFilter, EffectResolutionDefinition } from "../CardScript";
import type { CardId } from "../../data/cardCatalog";

export interface BattleRecruiterTemplateConfig {
  readonly cardId: string;
  readonly effectId?: string;
  readonly recruitCardIds?: readonly CardId[];
  readonly recruitMonsterFilter?: DeckMonsterFilter;
}

export function createBattleRecruiterScript(config: BattleRecruiterTemplateConfig): CardScript {
  if (!config.recruitCardIds && !config.recruitMonsterFilter) {
    throw new Error(`Battle recruiter ${config.cardId} requires card IDs or a monster filter.`);
  }

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
        resolution: createRecruiterResolution(config.recruitCardIds, config.recruitMonsterFilter),
      }),
    ]),
  });
}

function createRecruiterResolution(
  cardIds: readonly CardId[] | undefined,
  monsterFilter: DeckMonsterFilter | undefined,
): EffectResolutionDefinition {
  return Object.freeze({
    steps: Object.freeze([
      {
        kind: "special-summon-from-deck" as const,
        player: "self" as const,
        ...(cardIds ? { cardIds: Object.freeze([...cardIds]) } : {}),
        ...(monsterFilter ? { monsterFilter: freezeDeckMonsterFilter(monsterFilter) } : {}),
        count: 1,
        position: "attack" as const,
      },
    ]),
    sendSourceToGraveyard: false,
  });
}

function freezeDeckMonsterFilter(filter: DeckMonsterFilter): DeckMonsterFilter {
  return Object.freeze({
    ...filter,
    ...(filter.excludeClassifications
      ? { excludeClassifications: Object.freeze([...filter.excludeClassifications]) }
      : {}),
  });
}
