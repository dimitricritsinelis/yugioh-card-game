import type { Phase } from "../types";
import type { InstanceId, MonsterPosition, ZoneRef } from "./core/cardRefs";
import type { PlayerId } from "./types";

export type EngineEventType =
  | "duel-started"
  | "turn-started"
  | "phase-changed"
  | "card-drawn"
  | "card-moved"
  | "summon-declared"
  | "summon-successful"
  | "monster-set"
  | "spell-trap-set"
  | "position-changed"
  | "attack-declared"
  | "battle-completed"
  | "battle-damage"
  | "card-destroyed"
  | "card-banished"
  | "lp-changed"
  | "effect-activated"
  | "cost-paid"
  | "targets-chosen"
  | "chain-link-created"
  | "chain-resolved"
  | "effect-resolved-without-effect"
  | "prompt-created"
  | "prompt-resolved"
  | "player-lost"
  | "duel-finished"
  | "illegal-action"
  | "effect-not-implemented";

export interface BaseEngineEvent {
  readonly id: string;
  readonly type: EngineEventType;
  readonly message: string;
  readonly turn?: number;
  readonly playerId?: PlayerId;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface DuelStartedEvent extends BaseEngineEvent {
  readonly type: "duel-started";
  readonly seed: string;
  readonly firstPlayer: PlayerId;
}

export interface TurnStartedEvent extends BaseEngineEvent {
  readonly type: "turn-started";
  readonly playerId: PlayerId;
  readonly turn: number;
}

export interface PhaseChangedEvent extends BaseEngineEvent {
  readonly type: "phase-changed";
  readonly playerId: PlayerId;
  readonly from: Phase;
  readonly to: Phase;
}

export interface CardDrawnEvent extends BaseEngineEvent {
  readonly type: "card-drawn";
  readonly playerId: PlayerId;
  readonly instanceId: InstanceId;
  readonly cardId: string;
}

export interface CardMovedEvent extends BaseEngineEvent {
  readonly type: "card-moved";
  readonly playerId: PlayerId;
  readonly instanceId: InstanceId;
  readonly cardId: string;
  readonly from: ZoneRef;
  readonly to: ZoneRef;
}

export interface SummonDeclaredEvent extends BaseEngineEvent {
  readonly type: "summon-declared";
  readonly playerId: PlayerId;
  readonly instanceId: InstanceId;
  readonly cardId: string;
  readonly summonKind: "normal" | "tribute" | "flip" | "special";
  readonly tributeInstanceIds?: readonly InstanceId[];
}

export interface SummonSuccessfulEvent extends BaseEngineEvent {
  readonly type: "summon-successful";
  readonly playerId: PlayerId;
  readonly instanceId: InstanceId;
  readonly cardId: string;
  readonly zone: ZoneRef;
  readonly summonKind: "normal" | "tribute" | "flip" | "special";
}

export interface MonsterSetEvent extends BaseEngineEvent {
  readonly type: "monster-set";
  readonly playerId: PlayerId;
  readonly instanceId: InstanceId;
  readonly cardId: string;
  readonly zone: ZoneRef;
  readonly tributeInstanceIds?: readonly InstanceId[];
}

export interface SpellTrapSetEvent extends BaseEngineEvent {
  readonly type: "spell-trap-set";
  readonly playerId: PlayerId;
  readonly instanceId: InstanceId;
  readonly cardId: string;
  readonly zone: ZoneRef;
}

export interface PositionChangedEvent extends BaseEngineEvent {
  readonly type: "position-changed";
  readonly playerId: PlayerId;
  readonly instanceId: InstanceId;
  readonly cardId: string;
  readonly from: MonsterPosition;
  readonly to: MonsterPosition;
}

export interface AttackDeclaredEvent extends BaseEngineEvent {
  readonly type: "attack-declared";
  readonly playerId: PlayerId;
  readonly attackerInstanceId: InstanceId;
  readonly attackerCardId: string;
  readonly defenderInstanceId?: InstanceId;
  readonly defenderCardId?: string;
}

export interface BattleCompletedEvent extends BaseEngineEvent {
  readonly type: "battle-completed";
  readonly playerId: PlayerId;
  readonly attackerPlayerId: PlayerId;
  readonly defenderPlayerId: PlayerId;
  readonly attackerInstanceId: InstanceId;
  readonly attackerCardId: string;
  readonly attackerBattleAtk: number;
  readonly attackerBattlePosition: MonsterPosition | null;
  readonly defenderInstanceId: InstanceId;
  readonly defenderCardId: string;
  readonly defenderBattlePosition: MonsterPosition | null;
}

export interface BattleDamageEvent extends BaseEngineEvent {
  readonly type: "battle-damage";
  readonly playerId: PlayerId;
  readonly amount: number;
  readonly sourceInstanceId?: InstanceId;
}

export interface CardDestroyedEvent extends BaseEngineEvent {
  readonly type: "card-destroyed";
  readonly playerId: PlayerId;
  readonly instanceId: InstanceId;
  readonly cardId: string;
  readonly reason: "battle" | "effect" | "rule";
}

export interface CardBanishedEvent extends BaseEngineEvent {
  readonly type: "card-banished";
  readonly playerId: PlayerId;
  readonly instanceId: InstanceId;
  readonly cardId: string;
  readonly reason: "cost" | "effect" | "rule";
}

export interface LpChangedEvent extends BaseEngineEvent {
  readonly type: "lp-changed";
  readonly playerId: PlayerId;
  readonly previous: number;
  readonly next: number;
  readonly delta: number;
}

export interface EffectActivatedEvent extends BaseEngineEvent {
  readonly type: "effect-activated";
  readonly playerId: PlayerId;
  readonly instanceId: InstanceId;
  readonly cardId: string;
  readonly chainLinkId?: string;
}

export interface CostPaidEvent extends BaseEngineEvent {
  readonly type: "cost-paid";
  readonly playerId: PlayerId;
  readonly costKind: "discard" | "tribute" | "banish" | "life-points" | "other";
  readonly instanceIds?: readonly InstanceId[];
  readonly amount?: number;
}

export interface TargetsChosenEvent extends BaseEngineEvent {
  readonly type: "targets-chosen";
  readonly playerId: PlayerId;
  readonly sourceInstanceId: InstanceId;
  readonly targetRefs: readonly ZoneRef[];
}

export interface ChainLinkCreatedEvent extends BaseEngineEvent {
  readonly type: "chain-link-created";
  readonly playerId: PlayerId;
  readonly chainLinkId: string;
  readonly sourceInstanceId: InstanceId;
  readonly cardId: string;
  readonly spellSpeed: 1 | 2 | 3;
}

export interface ChainResolvedEvent extends BaseEngineEvent {
  readonly type: "chain-resolved";
  readonly chainLinkId: string;
  readonly sourceInstanceId?: InstanceId;
}

export interface EffectResolvedWithoutEffectEvent extends BaseEngineEvent {
  readonly type: "effect-resolved-without-effect";
  readonly playerId: PlayerId;
  readonly chainLinkId: string;
  readonly sourceInstanceId: InstanceId;
  readonly cardId: string;
  readonly effectId: string;
  readonly reason: string;
}

export interface PromptCreatedEvent extends BaseEngineEvent {
  readonly type: "prompt-created";
  readonly playerId: PlayerId;
  readonly promptId: string;
  readonly promptKind: "choice" | "target" | "discard" | "tribute" | "chain-response" | "yes-no";
}

export interface PromptResolvedEvent extends BaseEngineEvent {
  readonly type: "prompt-resolved";
  readonly playerId: PlayerId;
  readonly promptId: string;
}

export interface PlayerLostEvent extends BaseEngineEvent {
  readonly type: "player-lost";
  readonly playerId: PlayerId;
  readonly reason: "deck-out" | "lp-zero" | "exodia" | "concession" | "rule";
}

export interface DuelFinishedEvent extends BaseEngineEvent {
  readonly type: "duel-finished";
  readonly winner: PlayerId | null;
  readonly reason: "deck-out" | "lp-zero" | "exodia" | "concession" | "draw" | "rule";
}

export interface IllegalActionEvent extends BaseEngineEvent {
  readonly type: "illegal-action";
  readonly playerId: PlayerId;
  readonly commandType: string;
  readonly reason: string;
}

export interface EffectNotImplementedEvent extends BaseEngineEvent {
  readonly type: "effect-not-implemented";
  readonly playerId: PlayerId;
  readonly cardId: string;
  readonly instanceId?: InstanceId;
}

export type EngineEvent =
  | DuelStartedEvent
  | TurnStartedEvent
  | PhaseChangedEvent
  | CardDrawnEvent
  | CardMovedEvent
  | SummonDeclaredEvent
  | SummonSuccessfulEvent
  | MonsterSetEvent
  | SpellTrapSetEvent
  | PositionChangedEvent
  | AttackDeclaredEvent
  | BattleCompletedEvent
  | BattleDamageEvent
  | CardDestroyedEvent
  | CardBanishedEvent
  | LpChangedEvent
  | EffectActivatedEvent
  | CostPaidEvent
  | TargetsChosenEvent
  | ChainLinkCreatedEvent
  | ChainResolvedEvent
  | EffectResolvedWithoutEffectEvent
  | PromptCreatedEvent
  | PromptResolvedEvent
  | PlayerLostEvent
  | DuelFinishedEvent
  | IllegalActionEvent
  | EffectNotImplementedEvent;

export function assertReadableEventMessage(event: EngineEvent): void {
  if (!event.message.trim()) {
    throw new Error(`Event ${event.id} (${event.type}) is missing a readable message.`);
  }
}
