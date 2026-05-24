import type { Phase } from "../../types";

export const TURN_PHASES: readonly Phase[] = ["DP", "SP", "M1", "BP", "M2", "EP"];

export function getNextPhase(phase: Phase): Phase | null {
  const index = TURN_PHASES.indexOf(phase);

  if (index < 0 || index === TURN_PHASES.length - 1) {
    return null;
  }

  return TURN_PHASES[index + 1];
}

export function isNextPhase(from: Phase, to: Phase): boolean {
  return getNextPhase(from) === to;
}

export function phaseLabel(phase: Phase): string {
  return (
    {
      DP: "Draw Phase",
      SP: "Standby Phase",
      M1: "Main Phase 1",
      BP: "Battle Phase",
      M2: "Main Phase 2",
      EP: "End Phase",
    } satisfies Record<Phase, string>
  )[phase];
}
