import type { EngineCommand } from "../commands";
import type { DuelState } from "../core/state";
import type { CardId } from "../data/cardCatalog";
import type { ContinuousEffectDefinition } from "../effects/continuous";
import type { CostSpec } from "../effects/costs";
import type { LingeringEffectDefinition } from "../effects/lingering";
import type { ReplacementEffectDefinition } from "../effects/replacement";
import type { TargetSpec } from "../effects/targets";
import type { EngineError } from "../errors";
import type { EngineEvent } from "../events";
import type { PromptDefinition } from "../prompts/prompt";
import type { EnginePrompt } from "../result";
import type { DamageStepEffectPermission } from "../rules/damageStep";
import type { TriggerDefinition } from "../rules/triggers";

export type EffectKind =
  | "ignition"
  | "trigger"
  | "quick"
  | "continuous"
  | "replacement"
  | "lingering";

export type SpellSpeed = 1 | 2 | 3;
export type EffectPlayerSelector = "self" | "opponent";
export type EffectControllerSelector = "self" | "opponent" | "all";
export type EffectUsageFrequency = "turn" | "duel";
export type OncePerTurnScope = "source" | "card" | "effect" | "duel";

export interface DeckMonsterFilter {
  readonly attribute?: string;
  readonly maxAtk?: number;
  readonly excludeClassifications?: readonly string[];
}

export interface OncePerTurnDefinition {
  readonly scope?: OncePerTurnScope;
  readonly key?: string;
  readonly frequency?: EffectUsageFrequency;
}

export type EffectResolutionStep =
  | { readonly kind: "add-lingering-effect"; readonly lingering: LingeringEffectDefinition }
  | { readonly kind: "draw"; readonly player: EffectPlayerSelector; readonly count: number }
  | { readonly kind: "add-counter-to-source"; readonly counterType: string; readonly count: number; readonly max?: number }
  | { readonly kind: "modify-pending-battle-atk"; readonly amount: number }
  | { readonly kind: "set-pending-battle-atk"; readonly value: number }
  | { readonly kind: "damage-attacker-by-battle-atk-destroy-source" }
  | { readonly kind: "destroy-targets-damage-both-players-by-monster-atk" }
  | { readonly kind: "destroy-targets" }
  | { readonly kind: "destroy-targets-if-spell" }
  | { readonly kind: "destroy-face-up-monsters-by-type"; readonly monsterType: string }
  | {
      readonly kind: "draw-then-destroy-controlled-face-up-card-id-if-count";
      readonly cardId: CardId;
      readonly count: number;
      readonly drawCount: number;
    }
  | { readonly kind: "destroy-opponent-face-up-monsters-by-level"; readonly level: number }
  | { readonly kind: "banish-battle-participants" }
  | { readonly kind: "destroy-all-spells-traps"; readonly controller: EffectControllerSelector }
  | { readonly kind: "destroy-all-spells-traps-if-targets-returned-to-hand"; readonly controller: EffectControllerSelector }
  | { readonly kind: "destroy-all-monsters"; readonly controller: EffectControllerSelector }
  | { readonly kind: "destroy-face-up-monsters"; readonly controller: EffectControllerSelector }
  | { readonly kind: "destroy-attack-source" }
  | { readonly kind: "destroy-opponent-attack-position-monsters" }
  | { readonly kind: "negate-attack" }
  | { readonly kind: "gain-lp-by-attack-source-atk" }
  | { readonly kind: "negate-previous-chain-link" }
  | { readonly kind: "place-source-in-spell-trap-zone" }
  | { readonly kind: "place-source-in-field-zone" }
  | {
      readonly kind: "add-lingering-stat-modifiers-to-targets";
      readonly modifiers: readonly {
        readonly stat: "atk" | "def";
        readonly amount: number;
      }[];
    }
  | { readonly kind: "search-deck-to-hand"; readonly player: EffectPlayerSelector; readonly cardIds: readonly CardId[]; readonly count: number }
  | { readonly kind: "move-targets-to-deck-top-or-hand-if-field-card"; readonly fieldCardId: CardId }
  | {
      readonly kind: "special-summon-from-deck";
      readonly player: EffectPlayerSelector;
      readonly cardIds?: readonly CardId[];
      readonly monsterFilter?: DeckMonsterFilter;
      readonly count: number;
      readonly position?: "attack" | "defense";
    }
  | {
      readonly kind: "special-summon-target-from-graveyard";
      readonly position?: "attack" | "defense";
      readonly linkToSource?: boolean;
    }
  | {
      readonly kind: "special-summon-targets";
      readonly position?: "attack" | "defense";
      readonly linkToSource?: boolean;
      readonly maxLevel?: number;
      readonly preventDirectAttacks?: boolean;
    }
  | { readonly kind: "random-own-hand-card-special-summon-or-send-to-graveyard"; readonly position?: "attack" | "defense" }
  | {
      readonly kind: "create-tokens";
      readonly player: EffectPlayerSelector;
      readonly count: number;
      readonly name: string;
      readonly monsterType: string;
      readonly attribute: string;
      readonly level: number;
      readonly atk: number;
      readonly def: number;
      readonly position?: "attack" | "defense";
      readonly cannotBeTributedForTributeSummon?: boolean;
    }
  | {
      readonly kind: "fusion-summon";
      readonly fusionCardId: CardId;
      readonly materialCardIds: readonly CardId[];
      readonly materialZones?: readonly ("hand" | "monsterZone")[];
      readonly position?: "attack" | "defense";
    }
  | {
      readonly kind: "ritual-summon";
      readonly ritualMonsterCardIds?: readonly CardId[];
      readonly ritualMonsterAttribute?: string;
      readonly levelRequirement?: "at-least" | "exact";
      readonly requiredLevel?: number;
      readonly position?: "attack" | "defense";
    }
  | {
      readonly kind: "special-summon-fusion-by-tributed-level";
      readonly position?: "attack" | "defense";
      readonly maxLevel?: number;
      readonly preventDirectAttacks?: boolean;
    }
  | { readonly kind: "return-targets-to-fusion-deck" }
  | {
      readonly kind: "take-control-of-targets";
      readonly linkToSource?: boolean;
      readonly sourceLeaveBehavior?: "destroy-linked" | "return-control";
      readonly returnAtEndPhase?: boolean;
    }
  | { readonly kind: "swap-control-targets" }
  | { readonly kind: "equip-source-to-target" }
  | { readonly kind: "return-source-to-hand" }
  | { readonly kind: "change-position"; readonly position: "attack" | "defense" }
  | {
      readonly kind: "change-position-all-face-up-monsters";
      readonly controller: EffectControllerSelector;
      readonly position?: "attack" | "defense";
    }
  | { readonly kind: "set-source-face"; readonly face: "faceUp" | "faceDown"; readonly position?: "attack" | "defense" }
  | { readonly kind: "set-face"; readonly face: "faceUp" | "faceDown"; readonly position?: "attack" | "defense" }
  | { readonly kind: "return-targets-to-hand" }
  | { readonly kind: "return-targets-to-deck-top" }
  | {
      readonly kind: "lp-change-by-count";
      readonly player: EffectPlayerSelector;
      readonly amountPer: number;
      readonly count:
        | "opponent-graveyard-cards"
        | "opponent-banished-cards"
        | "opponent-monsters"
        | "opponent-hand-cards"
        | "own-face-up-light-monsters"
        | "all-monsters-on-field"
        | "opponent-spell-trap-cards";
    }
  | { readonly kind: "lp-change"; readonly player: EffectPlayerSelector; readonly amount: number };

export interface EffectResolutionDefinition {
  readonly steps: readonly EffectResolutionStep[];
  readonly sendSourceToGraveyard?: boolean;
}

export interface EffectDefinition {
  readonly id: string;
  readonly kind: EffectKind;
  readonly implemented: boolean;
  readonly spellSpeed?: SpellSpeed;
  readonly costs?: readonly CostSpec[];
  readonly targets?: readonly TargetSpec[];
  readonly prompts?: readonly PromptDefinition[];
  readonly oncePerTurn?: OncePerTurnDefinition;
  readonly cannotBeNegated?: boolean;
  readonly trigger?: TriggerDefinition;
  readonly damageStep?: DamageStepEffectPermission;
  readonly continuous?: ContinuousEffectDefinition;
  readonly replacement?: ReplacementEffectDefinition;
  readonly lingering?: LingeringEffectDefinition;
  readonly resolution?: EffectResolutionDefinition;
}

export interface CardEffectContext {
  readonly state: DuelState;
  readonly command?: EngineCommand;
  readonly sourceInstanceId?: string;
}

export interface CardEffectResult {
  readonly state: DuelState;
  readonly events: readonly EngineEvent[];
  readonly prompts: readonly EnginePrompt[];
  readonly errors: readonly EngineError[];
}

export interface CardScript {
  readonly cardId: CardId;
  readonly effects: readonly EffectDefinition[];
  readonly canActivate?: (context: CardEffectContext) => boolean;
  readonly resolve?: (context: CardEffectContext) => CardEffectResult;
}
