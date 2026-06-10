import { assertDuelStateInvariants } from "./core/invariants";
import type { DuelState } from "./core/state";
import { projectDuelFromCore } from "./duel";
import type { CardRecord } from "../types";
import type { DuelEvent, DuelState as LegacyDuelState } from "./types";

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

// Persisted online engine state. The core DuelState is the single source of
// truth; the legacy UI shape is re-projected from it on load and is never
// stored. `events` is the rolling action-log window (view data, not rules
// state) and `mode` is the turn mode the projection needs.
export const ENGINE_STATE_VERSION = 2;

export interface PersistedEngineState {
  readonly engineStateVersion: typeof ENGINE_STATE_VERSION;
  readonly mode: LegacyDuelState["mode"];
  readonly events: readonly DuelEvent[];
  readonly core: DuelState;
}

export function packEngineStateForStorage(state: LegacyDuelState): PersistedEngineState {
  if (!state.coreState) {
    throw new Error("Cannot persist a duel state without its embedded core state.");
  }

  return {
    engineStateVersion: ENGINE_STATE_VERSION,
    mode: state.mode,
    events: state.events,
    core: state.coreState,
  };
}

export function unpackEngineStateFromStorage(
  raw: unknown,
  cards: readonly CardRecord[],
): LegacyDuelState {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Persisted engine state is not an object.");
  }

  const versioned = raw as Partial<PersistedEngineState>;

  if (versioned.engineStateVersion === ENGINE_STATE_VERSION) {
    if (!versioned.core) {
      throw new Error("Persisted engine state v2 is missing its core state.");
    }

    return projectStoredCore(versioned.core, cards, versioned.mode ?? "match", versioned.events ?? []);
  }

  if (versioned.engineStateVersion !== undefined) {
    throw new Error(`Unsupported persisted engine state version: ${String(versioned.engineStateVersion)}.`);
  }

  // Pre-versioning rows stored the full legacy projection with the core state
  // embedded under `coreState`. Lift the source data and re-project.
  const legacy = raw as Partial<LegacyDuelState>;

  if (!legacy.coreState) {
    throw new Error("Persisted engine state predates core-state embedding and cannot be loaded.");
  }

  return projectStoredCore(legacy.coreState, cards, legacy.mode ?? "match", legacy.events ?? []);
}

function projectStoredCore(
  core: DuelState,
  cards: readonly CardRecord[],
  mode: LegacyDuelState["mode"],
  events: readonly DuelEvent[],
): LegacyDuelState {
  const validated = deserializeDuelState(core);

  return {
    ...projectDuelFromCore(validated, cards, mode, []),
    events: [...events],
  };
}
