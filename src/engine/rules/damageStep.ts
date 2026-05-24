import type { InstanceId } from "../core/cardRefs";

export type DamageStepSubstep =
  | "none"
  | "start"
  | "before-damage-calculation"
  | "damage-calculation"
  | "after-damage-calculation"
  | "end";

export type DamageStepEffectKind = "counter" | "atk-def-modifier";

export interface DamageStepEffectPermission {
  readonly kind: DamageStepEffectKind;
}

export interface DamageStepState {
  readonly substep: DamageStepSubstep;
  readonly attackerInstanceId?: InstanceId;
  readonly defenderInstanceId?: InstanceId;
}

export const DAMAGE_STEP_ACTIVATION_ERROR =
  "Only Counter Trap effects and scripted ATK/DEF modifiers can activate during the Damage Step.";

const CLOSED_DAMAGE_STEP: DamageStepState = Object.freeze({ substep: "none" });

export function closeDamageStep(): DamageStepState {
  return CLOSED_DAMAGE_STEP;
}

export function createDamageStepState(input: Omit<DamageStepState, "substep"> & { readonly substep: Exclude<DamageStepSubstep, "none"> }): DamageStepState {
  return Object.freeze({
    substep: input.substep,
    attackerInstanceId: input.attackerInstanceId,
    defenderInstanceId: input.defenderInstanceId,
  });
}

export function isDamageStepActive(state: { readonly damageStep?: DamageStepState }): boolean {
  return (state.damageStep ?? CLOSED_DAMAGE_STEP).substep !== "none";
}

export function validateDamageStepActivation(
  state: { readonly damageStep?: DamageStepState },
  effect: {
    readonly spellSpeed?: 1 | 2 | 3;
    readonly damageStep?: DamageStepEffectPermission;
  },
): string | null {
  if (!isDamageStepActive(state)) {
    return null;
  }

  if (effect.spellSpeed === 3) {
    return null;
  }

  if (effect.damageStep?.kind === "atk-def-modifier") {
    return null;
  }

  return DAMAGE_STEP_ACTIVATION_ERROR;
}
