import { assertDuelStateInvariants } from "./core/invariants";
import type { DuelState } from "./core/state";

export type SerializedCoreDuelState = DuelState;

export function serializeDuelState(state: DuelState): SerializedCoreDuelState {
  return cloneSerializableState(state);
}

export function deserializeDuelState(serialized: SerializedCoreDuelState): DuelState {
  const state = cloneSerializableState(serialized);

  assertDuelStateInvariants(state);

  return state;
}

function cloneSerializableState(state: DuelState): DuelState {
  return JSON.parse(JSON.stringify(state)) as DuelState;
}
