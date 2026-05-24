import type { ChainLink } from "../rules/chain";
import type { DuelState } from "../core/state";
import type { PlayerId } from "../types";
import type { ContinuousEffectDefinition } from "./continuous";

export interface LingeringEffectDefinition extends ContinuousEffectDefinition {
  readonly duration: "until-end-phase";
  readonly removeWhenSourceLeavesField?: boolean;
}

export interface ActiveLingeringEffect {
  readonly id: string;
  readonly playerId: PlayerId;
  readonly sourceInstanceId: string;
  readonly sourceCardId: string;
  readonly effectId: string;
  readonly definition: LingeringEffectDefinition;
  readonly expiresAtTurn: number;
  readonly expiresAtPhase: "EP";
}

export function addLingeringEffect(
  state: DuelState,
  chainLink: ChainLink,
  definition: LingeringEffectDefinition,
): DuelState {
  const existing = state.lingeringEffects ?? [];
  const lingering: ActiveLingeringEffect = Object.freeze({
    id: `lingering-${state.eventIds.length + existing.length + 1}`,
    playerId: chainLink.playerId,
    sourceInstanceId: chainLink.sourceInstanceId,
    sourceCardId: chainLink.cardId,
    effectId: chainLink.effectId,
    definition,
    expiresAtTurn: state.turn,
    expiresAtPhase: "EP",
  });

  return {
    ...state,
    lingeringEffects: [...existing, lingering],
  };
}

export function expireLingeringEffectsForEndPhase(state: DuelState): DuelState {
  const lingeringEffects = (state.lingeringEffects ?? []).filter(
    (effect) => !(effect.expiresAtPhase === "EP" && state.phase === "EP" && effect.expiresAtTurn <= state.turn),
  );

  if (lingeringEffects.length === (state.lingeringEffects ?? []).length) {
    return state;
  }

  return {
    ...state,
    lingeringEffects,
  };
}
