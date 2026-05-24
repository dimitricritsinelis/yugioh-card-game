import type { CardId } from "../data/cardCatalog";
import type { PlayerId } from "../types";

export type InstanceId = string;
export type ZoneKind =
  | "mainDeck"
  | "hand"
  | "monsterZone"
  | "spellTrapZone"
  | "graveyard"
  | "banished"
  | "fieldZone";
export type FaceState = "faceDown" | "faceUp";
export type MonsterPosition = "attack" | "defense";
export type CardVisibility = "public" | "controller" | "owner" | "hidden";
export type AttachmentLeaveBehavior = "destroy-linked" | "return-control";

export interface CardInstance {
  readonly instanceId: InstanceId;
  readonly cardId: CardId;
  readonly owner: PlayerId;
  readonly controller: PlayerId;
}

export interface ZoneCard {
  readonly instanceId: InstanceId;
  readonly cardId: CardId;
  readonly owner: PlayerId;
  readonly controller: PlayerId;
  readonly face: FaceState;
  readonly position: MonsterPosition | null;
  readonly visibility: CardVisibility;
  readonly counters: Readonly<Record<string, number>>;
  readonly attachments: readonly InstanceId[];
  readonly attachmentBehaviors?: Readonly<Record<InstanceId, AttachmentLeaveBehavior>>;
  readonly summonedTurn?: number | null;
  readonly setTurn?: number | null;
  readonly positionChangedTurn?: number | null;
  readonly attackedTurn?: number | null;
}

export type ZoneRef =
  | { readonly playerId: PlayerId; readonly zone: "mainDeck"; readonly index: number }
  | { readonly playerId: PlayerId; readonly zone: "hand"; readonly index: number }
  | { readonly playerId: PlayerId; readonly zone: "monsterZone"; readonly index: number }
  | { readonly playerId: PlayerId; readonly zone: "spellTrapZone"; readonly index: number }
  | { readonly playerId: PlayerId; readonly zone: "graveyard"; readonly index: number }
  | { readonly playerId: PlayerId; readonly zone: "banished"; readonly index: number }
  | { readonly playerId: PlayerId; readonly zone: "fieldZone" };
