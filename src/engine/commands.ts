import type { Phase } from "../types";
import type { InstanceId, MonsterPosition, ZoneRef } from "./core/cardRefs";
import { PASS_PRIORITY } from "./rules/priority";
import type { PlayerId } from "./types";

export type EngineCommand =
  | { readonly type: "start-duel" }
  | { readonly type: "draw-card"; readonly playerId: PlayerId; readonly count?: number }
  | { readonly type: "change-phase"; readonly playerId: PlayerId; readonly phase: Phase }
  | { readonly type: "end-turn"; readonly playerId: PlayerId }
  | { readonly type: typeof PASS_PRIORITY; readonly playerId: PlayerId }
  | { readonly type: "resolve-chain"; readonly playerId: PlayerId }
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
      readonly effectId?: string;
      readonly costInstanceIds?: readonly InstanceId[];
      readonly targetRefs?: readonly ZoneRef[];
      readonly targetPlayerIds?: readonly PlayerId[];
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
      readonly type: "answer-prompt";
      readonly playerId: PlayerId;
      readonly promptId: string;
      readonly choiceIds?: readonly string[];
      readonly targetRefs?: readonly ZoneRef[];
      readonly targetPlayerIds?: readonly PlayerId[];
      readonly discardInstanceIds?: readonly InstanceId[];
      readonly tributeInstanceIds?: readonly InstanceId[];
    };
