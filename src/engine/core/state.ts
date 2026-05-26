import type { Phase } from "../../types";
import type { CardScript, EffectUsageFrequency, OncePerTurnScope } from "../cards/CardScript";
import type { CardDefinition, CardId } from "../data/cardCatalog";
import type { ActiveLingeringEffect } from "../effects/lingering";
import type { DamageStepState } from "../rules/damageStep";
import type { ChainLink } from "../rules/chain";
import type { PriorityState } from "../rules/priority";
import type { EnginePrompt } from "../result";
import type { PlayerId, TurnMode } from "../types";
import type { CardInstance, ZoneCard } from "./cardRefs";

export interface PlayerState {
  readonly id: PlayerId;
  readonly lp: number;
  readonly mainDeck: readonly CardInstance[];
  readonly fusionDeck?: readonly CardInstance[];
  readonly hand: readonly CardInstance[];
  readonly monsterZones: readonly (ZoneCard | null)[];
  readonly spellTrapZones: readonly (ZoneCard | null)[];
  readonly graveyard: readonly ZoneCard[];
  readonly banished: readonly ZoneCard[];
  readonly fieldZone: ZoneCard | null;
  readonly normalSummonUsed: boolean;
  readonly lost: boolean;
}

export interface PendingAttackState {
  readonly attackerPlayerId: PlayerId;
  readonly defenderPlayerId: PlayerId;
  readonly attackerInstanceId: string;
  readonly defenderInstanceId?: string | null;
  readonly atkModifiers?: readonly PendingBattleStatModifier[];
  readonly negated?: boolean;
}

export interface PendingBattleStatModifier {
  readonly instanceId: string;
  readonly amount?: number;
  readonly setTo?: number;
}

export interface EffectUsageRecord {
  readonly turn: number;
  readonly playerId: PlayerId;
  readonly cardId: CardId;
  readonly effectId: string;
  readonly sourceInstanceId: string;
  readonly key: string;
  readonly frequency?: EffectUsageFrequency;
  readonly scope?: OncePerTurnScope;
}

export interface ScheduledControlReturn {
  readonly id: string;
  readonly instanceId: string;
  readonly returnPlayerId: PlayerId;
  readonly expiresAtTurn: number;
  readonly expiresAtPhase: "EP";
}

export interface DuelState {
  readonly id: string;
  readonly seed: string;
  readonly turnMode?: TurnMode;
  readonly turn: number;
  readonly phase: Phase;
  readonly activePlayer: PlayerId;
  readonly priorityPlayer: PlayerId;
  readonly turnFlags?: {
    readonly drawnThisTurn: boolean;
    readonly battlePhaseConducted: boolean;
  };
  readonly priority: PriorityState;
  readonly damageStep?: DamageStepState;
  readonly cardDefinitions?: Readonly<Record<CardId, CardDefinition>>;
  readonly cardScripts?: Readonly<Record<CardId, CardScript>>;
  readonly implementedCardIds?: readonly CardId[];
  readonly players: Readonly<Record<PlayerId, PlayerState>>;
  readonly chain: readonly ChainLink[];
  readonly pendingAttack?: PendingAttackState | null;
  readonly lingeringEffects?: readonly ActiveLingeringEffect[];
  readonly controlChangeReturns?: readonly ScheduledControlReturn[];
  readonly effectUsage?: Readonly<Record<string, EffectUsageRecord>>;
  readonly negatedChainLinkIds?: readonly string[];
  readonly prompts: Readonly<Record<string, EnginePrompt>>;
  readonly pendingPromptIds: readonly string[];
  readonly eventIds: readonly string[];
  readonly winner: PlayerId | null;
}
