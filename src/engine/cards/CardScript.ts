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

export type EffectResolutionStep =
  | { readonly kind: "draw"; readonly player: EffectPlayerSelector; readonly count: number }
  | { readonly kind: "add-counter-to-source"; readonly counterType: string; readonly count: number; readonly max?: number }
  | { readonly kind: "modify-pending-battle-atk"; readonly amount: number }
  | { readonly kind: "damage-attacker-by-battle-atk-destroy-source" }
  | { readonly kind: "destroy-targets-damage-both-players-by-monster-atk" }
  | { readonly kind: "destroy-targets" }
  | { readonly kind: "destroy-face-up-monsters-by-type"; readonly monsterType: string }
  | { readonly kind: "banish-battle-participants" }
  | { readonly kind: "destroy-all-spells-traps"; readonly controller: EffectControllerSelector }
  | { readonly kind: "destroy-all-monsters"; readonly controller: EffectControllerSelector }
  | { readonly kind: "destroy-attack-source" }
  | { readonly kind: "destroy-opponent-attack-position-monsters" }
  | { readonly kind: "negate-attack" }
  | { readonly kind: "place-source-in-spell-trap-zone" }
  | { readonly kind: "search-deck-to-hand"; readonly player: EffectPlayerSelector; readonly cardIds: readonly CardId[]; readonly count: number }
  | {
      readonly kind: "special-summon-from-deck";
      readonly player: EffectPlayerSelector;
      readonly cardIds: readonly CardId[];
      readonly count: number;
      readonly position?: "attack" | "defense";
    }
  | {
      readonly kind: "special-summon-target-from-graveyard";
      readonly position?: "attack" | "defense";
      readonly linkToSource?: boolean;
    }
  | {
      readonly kind: "take-control-of-targets";
      readonly linkToSource?: boolean;
      readonly sourceLeaveBehavior?: "destroy-linked" | "return-control";
    }
  | { readonly kind: "return-source-to-hand" }
  | { readonly kind: "change-position"; readonly position: "attack" | "defense" }
  | { readonly kind: "set-face"; readonly face: "faceUp" | "faceDown"; readonly position?: "attack" | "defense" }
  | { readonly kind: "return-targets-to-hand" }
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
