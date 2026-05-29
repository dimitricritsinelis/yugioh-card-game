import type { DuelState } from "../core/state";

/**
 * Manual-play mode has no lingering/continuous effects, so there is no state-based
 * cleanup to perform. Kept as an identity function so existing battle call sites are
 * unaffected.
 */
export function applyStateBasedCleanup(state: DuelState): DuelState {
  return state;
}
