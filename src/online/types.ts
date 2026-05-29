import type {
  ActionLogEntry,
  CardAction,
  CardInstance,
  OpponentState,
  Phase,
  PlayerState,
  ZoneCard,
  ZoneKind,
} from "../types";
import type { DuelAction, DuelEvent, DuelState, PlayerId } from "../engine";

export type OnlineViewerRole = PlayerId | "spectator";
export type OnlineGameStatus = "waiting" | "active" | "finished" | "abandoned";
export type OnlineConnectionStatus = "connected" | "reconnecting" | "stale" | "conflict";

export interface OnlineSeatPublicStatus {
  readonly role: PlayerId;
  readonly occupied: boolean;
  readonly playerName: string | null;
  readonly heartbeatAt: string | null;
  readonly disconnectedAt: string | null;
}

export interface OnlineSeatsView {
  readonly P1: OnlineSeatPublicStatus;
  readonly P2: OnlineSeatPublicStatus;
}

export type OnlineBoardZone = ZoneCard | boolean | null;

export interface OnlinePublicPlayerBoard {
  readonly lp: number;
  readonly deckCount: number;
  readonly handCount: number;
  readonly monsterZones: readonly OnlineBoardZone[];
  readonly spellTrapZones: readonly OnlineBoardZone[];
  readonly graveyard: readonly ZoneCard[];
  readonly banished: readonly ZoneCard[];
}

export interface OnlineSpectatorBoard {
  readonly P1: OnlinePublicPlayerBoard;
  readonly P2: OnlinePublicPlayerBoard;
}

export type OnlineLegalPlacementAction = Extract<DuelAction, { type: "play-card" }>;

export interface OnlineLegalAttackAction {
  readonly type: "attack";
  readonly playerId: PlayerId;
  readonly attackerInstanceId: string;
}

export interface OnlineLegalAttackTarget {
  readonly attackerInstanceId: string;
  readonly target: { readonly kind: "direct" } | { readonly kind: "monster"; readonly zoneIndex: number };
  readonly command: OnlineLegalAttackAction;
}

export interface OnlineLegalState {
  readonly placements: readonly OnlineLegalPlacementAction[];
  readonly attacks: readonly OnlineLegalAttackTarget[];
  readonly activateSetCardIds: readonly string[];
  readonly unavailableHandCardIds: readonly string[];
  readonly canAdvance: boolean;
  readonly advanceLabel: string;
  readonly discardRequiredCount: number;
}

export interface OnlineGameView {
  readonly gameId: string;
  readonly code: string;
  readonly realtimeTopic: string;
  readonly version: number;
  readonly status: OnlineGameStatus;
  readonly seats: OnlineSeatsView;
  readonly viewerRole: OnlineViewerRole;
  readonly viewerId?: PlayerId;
  readonly phase: Phase;
  readonly turn: number;
  readonly activePlayer: PlayerId;
  readonly winner: PlayerId | null;
  readonly player?: PlayerState;
  readonly playerDeckCount?: number;
  readonly opponent?: OpponentState;
  readonly spectator?: OnlineSpectatorBoard;
  readonly actionLog: readonly ActionLogEntry[];
  readonly legal: OnlineLegalState;
}

export type OnlineCommand =
  | {
      readonly type: "play-card";
      readonly instanceId: string;
      readonly intent: CardAction;
      readonly zoneKind: ZoneKind;
      readonly zoneIndex: number;
      readonly tributeInstanceIds?: readonly string[];
    }
  | { readonly type: "activate-set-card"; readonly instanceId: string }
  | {
      readonly type: "attack";
      readonly attackerInstanceId: string;
      readonly target:
        | { readonly kind: "direct" }
        | { readonly kind: "monster-zone"; readonly zoneIndex: number };
    }
  | { readonly type: "advance-turn-flow" }
  | { readonly type: "discard-and-advance"; readonly discardInstanceIds: readonly string[] };

export interface PublicMoveRealtimePayload {
  readonly realtimeTopic: string;
  readonly version: number;
  readonly actorRole: PlayerId | null;
  readonly publicSummary: string;
  readonly createdAt: string;
}

export interface GameRecord {
  readonly id: string;
  readonly code: string;
  readonly realtimeTopic: string;
  readonly status: OnlineGameStatus;
  readonly version: number;
  readonly seed: string;
  readonly activePlayer: PlayerId | null;
  readonly phase: Phase | null;
  readonly turn: number | null;
  readonly winner: PlayerId | null;
  readonly engineState: DuelState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastMoveAt: string | null;
}

export interface SeatRecord {
  readonly gameId: string;
  readonly role: PlayerId;
  readonly playerName: string;
  readonly seatTokenHash: string;
  readonly clientId: string;
  readonly claimedAt: string;
  readonly heartbeatAt: string;
  readonly disconnectedAt: string | null;
}

export interface MoveRecord {
  readonly gameId: string;
  readonly realtimeTopic: string;
  readonly version: number;
  readonly actorRole: PlayerId;
  readonly privateAction: unknown;
  readonly publicEvents: readonly DuelEvent[];
  readonly publicSummary: string;
  readonly createdAt: string;
}
