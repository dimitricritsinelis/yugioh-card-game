import type { Phase } from "../../types";
import type { CardDefinition, CardId } from "../data/cardCatalog";
import type { DamageStepState } from "../rules/damageStep";
import type { PlayerId, TurnMode } from "../types";
import type { CardInstance, ZoneCard } from "./cardRefs";

export interface PlayerState {
  readonly id: PlayerId;
  readonly lp: number;
  readonly mainDeck: readonly CardInstance[];
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
  readonly amount: number;
}

export interface DuelState {
  readonly id: string;
  readonly seed: string;
  readonly turnMode?: TurnMode;
  readonly turn: number;
  readonly phase: Phase;
  readonly activePlayer: PlayerId;
  readonly turnFlags?: {
    readonly drawnThisTurn: boolean;
    readonly battlePhaseConducted: boolean;
  };
  readonly damageStep?: DamageStepState;
  readonly cardDefinitions?: Readonly<Record<CardId, CardDefinition>>;
  readonly players: Readonly<Record<PlayerId, PlayerState>>;
  readonly pendingAttack?: PendingAttackState | null;
  readonly eventIds: readonly string[];
  readonly winner: PlayerId | null;
}
