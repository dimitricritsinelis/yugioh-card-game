import type { PlayerId } from "../types";

export const PASS_PRIORITY = "pass-priority" as const;

export type PriorityWindowReason = "phase-start" | "summon-successful" | "chain-resolved";
export type PriorityWindowStatus = "open" | "closed";

export interface PriorityState {
  readonly holder: PlayerId;
  readonly passedPlayerIds: readonly PlayerId[];
  readonly reason: PriorityWindowReason;
  readonly status: PriorityWindowStatus;
}

export function createPriorityWindow(holder: PlayerId, reason: PriorityWindowReason): PriorityState {
  return Object.freeze({
    holder,
    passedPlayerIds: Object.freeze([]),
    reason,
    status: "open",
  });
}

export function createChainResolvedPriorityWindow(holder: PlayerId): PriorityState {
  return createPriorityWindow(holder, "chain-resolved");
}

export function validatePriorityPass(priority: PriorityState, playerId: PlayerId): string | null {
  if (priority.status !== "open") {
    return "No priority window is open.";
  }

  if (priority.holder !== playerId) {
    return "Only the current priority holder can pass priority.";
  }

  return null;
}

export function passPriority(
  priority: PriorityState,
  playerId: PlayerId,
  turnPlayer: PlayerId,
): PriorityState {
  const passedPlayerIds = uniquePlayerIds([...priority.passedPlayerIds, playerId]);
  const nextHolder = opponentOf(playerId);

  if (passedPlayerIds.includes(nextHolder)) {
    return Object.freeze({
      holder: turnPlayer,
      passedPlayerIds: Object.freeze([]),
      reason: priority.reason,
      status: "closed",
    });
  }

  return Object.freeze({
    ...priority,
    holder: nextHolder,
    passedPlayerIds: Object.freeze(passedPlayerIds),
  });
}

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}

function uniquePlayerIds(playerIds: readonly PlayerId[]): readonly PlayerId[] {
  return playerIds.filter((playerId, index) => playerIds.indexOf(playerId) === index);
}
