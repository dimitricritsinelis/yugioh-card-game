import type { CardAction, CardRecord, Phase, ZoneKind } from "../types";

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
  spellSpeed: 1 | 2 | 3;
  targetInstanceIds: string[];
}

export interface DuelPrompt {
  id: string;
  playerId: PlayerId;
  kind: "priority" | "target" | "discard" | "choice";
  message: string;
  min: number;
  max: number;
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
