import type { Phase } from "../../types";
import type { MonsterPosition, ZoneCard } from "../core/cardRefs";
import { isMainPhase } from "./summons";

export function validateManualPositionChange(
  phase: Phase,
  turn: number,
  card: ZoneCard,
  nextPosition: MonsterPosition,
): string | null {
  if (!isMainPhase(phase)) {
    return "Manual battle position changes are only allowed during Main Phase 1 or Main Phase 2.";
  }

  if (card.face !== "faceUp") {
    return "Face-down monsters cannot be manually changed by position-change commands.";
  }

  if (!card.position) {
    return "Only monsters can manually change battle position.";
  }

  if (card.position === nextPosition) {
    return "That monster is already in that battle position.";
  }

  if (card.summonedTurn === turn) {
    return "A monster cannot manually change battle position the turn it was Summoned or Set.";
  }

  if (card.attackedTurn === turn) {
    return "A monster cannot manually change battle position after attacking this turn.";
  }

  if (card.positionChangedTurn === turn) {
    return "A monster can only manually change battle position once per turn.";
  }

  return null;
}
