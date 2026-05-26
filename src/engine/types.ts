import type { CardAction, CardRecord, Phase, ZoneKind } from "../types";
import type { ZoneRef } from "./core/cardRefs";

export type PlayerId = "P1" | "P2";
export type TurnMode = "match" | "solo";
export type OpponentBehavior = "none" | "passive-board-filler";
export type BattlePosition = "attack" | "defense";
export type BattleSubstep =
  | "none"
  | "start"
  | "beforeDamageCalculation"
  | "damageCalculation1"
  | "damageCalculation2"
  | "afterDamageCalculation"
  | "end";

export interface DeckList {
  main: string[];
  side?: string[];
  extra?: string[];
}

export interface CreateDuelConfig {
  cards: CardRecord[];
  seed?: string;
  firstPlayer?: PlayerId;
  mode?: TurnMode;
  decks?: Partial<Record<PlayerId, DeckList>>;
  allowUnsupportedCards?: boolean;
}

export interface DuelCardInstance {
  instanceId: string;
  card: CardRecord;
  owner: PlayerId;
  controller: PlayerId;
  createdTurn: number;
  summonedTurn: number | null;
  positionChangedTurn: number | null;
  attackedThisTurn: boolean;
}

export interface DuelZoneCard {
  instance: DuelCardInstance;
  faceDown: boolean;
  position: BattlePosition;
  status: "set" | "summoned" | "activated" | "token";
  counters?: Readonly<Record<string, number>>;
}

export interface DuelPlayerState {
  id: PlayerId;
  lp: number;
  deck: DuelCardInstance[];
  hand: DuelCardInstance[];
  monsterZones: Array<DuelZoneCard | null>;
  spellTrapZones: Array<DuelZoneCard | null>;
  graveyard: DuelZoneCard[];
  banished: DuelZoneCard[];
  sideDeck: CardRecord[];
  extraDeck: CardRecord[];
  normalSummonUsed: boolean;
  lost: boolean;
}

export interface ChainLink {
  id: string;
  playerId: PlayerId;
  sourceInstanceId: string;
  cardId?: string;
  effectId?: string;
  spellSpeed: 1 | 2 | 3;
  targetInstanceIds: string[];
}

export interface DuelPrompt {
  id: string;
  playerId: PlayerId;
  kind: "priority" | "target" | "discard" | "tribute" | "choice" | "chain-response" | "yes-no";
  message: string;
  min: number;
  max: number;
  metadata?: Readonly<Record<string, string>>;
}

export interface DuelEvent {
  id: string;
  type: string;
  message: string;
}

export interface DuelState {
  id: string;
  seed: string;
  mode: TurnMode;
  coreState?: import("./core/state").DuelState;
  turn: number;
  phase: Phase;
  activePlayer: PlayerId;
  priorityPlayer: PlayerId;
  battleSubstep: BattleSubstep;
  players: Record<PlayerId, DuelPlayerState>;
  chain: ChainLink[];
  pendingPrompts: DuelPrompt[];
  events: DuelEvent[];
  turnFlags: {
    drawnThisTurn: boolean;
    battlePhaseConducted: boolean;
  };
  winner: PlayerId | null;
}

export type DuelAction =
  | { type: "draw"; playerId: PlayerId }
  | { type: "advance-phase"; playerId: PlayerId }
  | { type: "set-phase"; playerId: PlayerId; phase: Phase }
  | { type: "end-turn"; playerId: PlayerId }
  | {
      type: "play-card";
      playerId: PlayerId;
      instanceId: string;
      intent: CardAction;
      zoneKind: ZoneKind;
      zoneIndex: number;
      tributeInstanceIds?: string[];
      tributeCount?: number;
      requiredTributeInstanceIds?: string[];
      targetRefs?: ZoneRef[];
      targetPlayerIds?: PlayerId[];
    }
  | {
      type: "move-card";
      playerId: PlayerId;
      instanceId: string;
      destination: "graveyard" | "banished";
    }
  | {
      type: "attack";
      playerId: PlayerId;
      attackerInstanceId: string;
      defenderInstanceId?: string;
    }
  | { type: "pass-priority"; playerId: PlayerId }
  | { type: "resolve-chain"; playerId: PlayerId }
  | {
      type: "answer-prompt";
      playerId: PlayerId;
      promptId: string;
      choiceIds?: string[];
      targetRefs?: ZoneRef[];
      targetPlayerIds?: PlayerId[];
      discardInstanceIds?: string[];
      tributeInstanceIds?: string[];
    }
  | { type: "set-life-points"; playerId: PlayerId; targetPlayerId: PlayerId; value: number };

export interface DuelResult {
  state: DuelState;
  events: DuelEvent[];
  prompts: DuelPrompt[];
}

export interface PassiveBoardFillerOptions {
  targetMonsterCount?: number;
}

export interface SerializedCard {
  instanceId: string;
  owner: PlayerId;
  controller: PlayerId;
  card: CardRecord | null;
  faceDown: boolean;
  position: BattlePosition;
  status: DuelZoneCard["status"];
  counters: Readonly<Record<string, number>>;
}

export interface SerializedPlayerState {
  id: PlayerId;
  lp: number;
  deckCount: number;
  hand: Array<{ instanceId: string; card: CardRecord | null }>;
  monsterZones: Array<SerializedCard | null>;
  spellTrapZones: Array<SerializedCard | null>;
  graveyard: SerializedCard[];
  banished: SerializedCard[];
  sideDeckCount: number;
  extraDeckCount: number;
  normalSummonUsed: boolean;
}

export interface SerializedDuelState {
  id: string;
  viewerId: PlayerId;
  turn: number;
  phase: Phase;
  activePlayer: PlayerId;
  priorityPlayer: PlayerId;
  battleSubstep: BattleSubstep;
  players: Record<PlayerId, SerializedPlayerState>;
  chain: ChainLink[];
  pendingPrompts: DuelPrompt[];
  events: DuelEvent[];
  winner: PlayerId | null;
}

export interface DeckValidationResult {
  valid: boolean;
  errors: string[];
}

export type {
  LocatedCardRef as CoreLocatedCardRef,
  InvariantResult as CoreInvariantResult,
} from "./core/invariants";
export type {
  CardInZone as CoreCardInZone,
  LocatedCard as CoreLocatedCard,
  RemoveFromZoneResult as CoreRemoveFromZoneResult,
  ZoneCardOptions as CoreZoneCardOptions,
} from "./core/zones";
export type {
  CardInstance as CoreCardInstance,
  CardVisibility as CoreCardVisibility,
  FaceState as CoreFaceState,
  InstanceId as CoreInstanceId,
  MonsterPosition as CoreMonsterPosition,
  ZoneCard as CoreZoneCard,
  ZoneKind as CoreZoneKind,
  ZoneRef as CoreZoneRef,
} from "./core/cardRefs";
export type {
  DuelState as CoreDuelState,
  PlayerState as CorePlayerState,
} from "./core/state";
export type { ChainLink as CoreChainLink } from "./rules/chain";
export type {
  ActivationRestrictionSpec as CoreActivationRestrictionSpec,
  AttackRestrictionSpec as CoreAttackRestrictionSpec,
  BattleStat as CoreBattleStat,
  ContinuousEffectDefinition as CoreContinuousEffectDefinition,
  ContinuousEffectSource as CoreContinuousEffectSource,
  EffectNegationSpec as CoreEffectNegationSpec,
  EffectTargetController as CoreEffectTargetController,
  EffectTargetFilter as CoreEffectTargetFilter,
  MonsterStatInput as CoreMonsterStatInput,
  StatModifierSpec as CoreStatModifierSpec,
} from "./effects/continuous";
export type {
  ActiveLingeringEffect as CoreActiveLingeringEffect,
  LingeringEffectDefinition as CoreLingeringEffectDefinition,
} from "./effects/lingering";
export type {
  DestructionReason as CoreDestructionReason,
  DestructionReplacementAction as CoreDestructionReplacementAction,
  DestructionReplacementInput as CoreDestructionReplacementInput,
  DestructionReplacementResult as CoreDestructionReplacementResult,
  DestructionReplacementSpec as CoreDestructionReplacementSpec,
  PreventionReplacementKind as CorePreventionReplacementKind,
  PreventionReplacementSpec as CorePreventionReplacementSpec,
  ReplacementAction as CoreReplacementAction,
  ReplacementEffectDefinition as CoreReplacementEffectDefinition,
  ReplacementInput as CoreReplacementInput,
  ReplacementKind as CoreReplacementKind,
  ReplacementResult as CoreReplacementResult,
} from "./effects/replacement";
export type {
  DamageStepEffectKind as CoreDamageStepEffectKind,
  DamageStepEffectPermission as CoreDamageStepEffectPermission,
  DamageStepState as CoreDamageStepState,
  DamageStepSubstep as CoreDamageStepSubstep,
} from "./rules/damageStep";
export type {
  PriorityState as CorePriorityState,
  PriorityWindowReason as CorePriorityWindowReason,
  PriorityWindowStatus as CorePriorityWindowStatus,
} from "./rules/priority";
export type { EngineCommand as CoreEngineCommand } from "./commands";
export type { EngineError as CoreEngineError, EngineErrorCode as CoreEngineErrorCode } from "./errors";
export type {
  EngineEvent as CoreTypedEngineEvent,
  EngineEventType as CoreTypedEngineEventType,
} from "./events";
export type {
  EngineEvent as CoreEngineEvent,
  EnginePrompt as CoreEnginePrompt,
  EngineResult as CoreEngineResult,
} from "./result";
