import { ChevronRight, SkipForward } from "lucide-react";
import { ACTION_PHASES, PHASE_INFO } from "../gameLogic";
import type { Phase } from "../types";

interface PhaseHudProps {
  phase: Phase;
  turn: number;
  canEnterBattle: boolean;
  actionLabel: string;
  onAdvance: () => void;
}

export function PhaseHud({ phase, turn, canEnterBattle, actionLabel, onAdvance }: PhaseHudProps) {
  const currentIndex = ACTION_PHASES.indexOf(phase);
  const endingTurn = actionLabel === "End Turn";
  const actionAriaLabel = phase === "M1" && canEnterBattle ? "Enter Battle Phase" : actionLabel;

  return (
    <section className="stone-panel phase-hud" aria-label="Turn phases">
      <header className="phase-hud-head">
        <span className="eyebrow">Turn</span>
        <strong>{turn}</strong>
      </header>

      <ol className="phase-list">
        {ACTION_PHASES.map((p, index) => {
          const status =
            index === currentIndex ? "current" : index < currentIndex ? "done" : "upcoming";

          return (
            <li key={p}>
              <span
                className={`phase-step phase-marker ${status}`}
                aria-current={status === "current" ? "step" : undefined}
              >
                <span className="phase-step-dot" aria-hidden="true" />
                <span className="phase-step-name">{PHASE_INFO[p].full}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        className={`phase-advance ${endingTurn ? "end-turn" : ""}`}
        onClick={onAdvance}
        aria-label={actionAriaLabel}
      >
        {actionLabel}
        {endingTurn ? <SkipForward size={14} /> : <ChevronRight size={15} />}
      </button>
    </section>
  );
}
