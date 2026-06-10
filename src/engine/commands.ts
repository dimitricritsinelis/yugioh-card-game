import type { Phase } from "../types";
import type { InstanceId, MonsterPosition, ZoneRef } from "./core/cardRefs";
import type { OverrideCardDestination, PlayerId } from "./types";

export type EngineCommand =
  | { readonly type: "start-duel" }
  | { readonly type: "draw-card"; readonly playerId: PlayerId; readonly count?: number }
  | { readonly type: "change-phase"; readonly playerId: PlayerId; readonly phase: Phase }
  | { readonly type: "end-turn"; readonly playerId: PlayerId }
  | {
      readonly type: "normal-summon";
      readonly playerId: PlayerId;
      readonly instanceId: InstanceId;
      readonly zoneIndex: number;
      readonly tributeInstanceIds?: readonly InstanceId[];
    }
  | {
      readonly type: "set-monster";
      readonly playerId: PlayerId;
      readonly instanceId: InstanceId;
      readonly zoneIndex: number;
      readonly tributeInstanceIds?: readonly InstanceId[];
    }
  | {
      readonly type: "flip-summon";
      readonly playerId: PlayerId;
      readonly instanceId: InstanceId;
    }
  | {
      readonly type: "set-spell-trap";
      readonly playerId: PlayerId;
      readonly instanceId: InstanceId;
      readonly zoneIndex: number;
    }
  | {
      readonly type: "activate-card";
      readonly playerId: PlayerId;
      readonly instanceId: InstanceId;
      readonly zoneIndex: number;
    }
  | {
      readonly type: "change-position";
      readonly playerId: PlayerId;
      readonly instanceId: InstanceId;
      readonly position: MonsterPosition;
    }
  | {
      readonly type: "attack";
      readonly playerId: PlayerId;
      readonly attackerInstanceId: InstanceId;
      readonly defenderInstanceId?: InstanceId;
    }
  | {
      readonly type: "move-card";
      readonly playerId: PlayerId;
      readonly instanceId: InstanceId;
      readonly destination: ZoneRef;
    }
  | {
      readonly type: "override-card-location";
      readonly playerId: PlayerId;
      readonly instanceId: InstanceId;
      readonly destination: OverrideCardDestination;
    }
  | {
      // Manual/override LP edit. Like override-card-location this is an
      // out-of-rules correction: it ignores turn order and works after the
      // duel has finished.
      readonly type: "set-life-points";
      readonly playerId: PlayerId;
      readonly targetPlayerId: PlayerId;
      readonly value: number;
    };
