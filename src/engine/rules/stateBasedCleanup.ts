import type { DuelState } from "../core/state";
import { expireLingeringEffectsForEndPhase } from "../effects/lingering";
import { isSourceOnField } from "../effects/continuous";

export function applyStateBasedCleanup(state: DuelState): DuelState {
  return expireLingeringEffectsForEndPhase(removeDetachedLingeringEffects(state));
}

function removeDetachedLingeringEffects(state: DuelState): DuelState {
  const existing = state.lingeringEffects ?? [];
  const lingeringEffects = existing.filter(
    (effect) => !effect.definition.removeWhenSourceLeavesField || isSourceOnField(state, effect.sourceInstanceId),
  );

  if (lingeringEffects.length === existing.length) {
    return state;
  }

  return {
    ...state,
    lingeringEffects,
  };
}
