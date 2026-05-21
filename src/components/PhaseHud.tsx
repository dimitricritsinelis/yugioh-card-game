import { ChevronRight, SkipForward } from "lucide-react";
import { PHASE_INFO, PHASES } from "../gameLogic";
import type { Phase } from "../types";

interface PhaseHudProps {
  phase: Phase;
  turn: number;
  onSelectPhase: (phase: Phase) => void;
  onAdvance: () => void;
}

export function PhaseHud({ phase, turn, onSelectPhase, onAdvance }: PhaseHudProps) {
  const currentIndex = PHASES.indexOf(phase);
  const atEndPhase = phase === "EP";

  return (
    <section className="stone-panel phase-hud" aria-label="Turn phases">
      <header className="phase-hud-head">
        <span className="eyebrow">Turn</span>
        <strong>{turn}</strong>
      </header>

      <ol className="phase-list">
        {PHASES.map((p, index) => {
          const status =
            index === currentIndex ? "current" : index < currentIndex ? "done" : "upcoming";

          return (
            <li key={p}>
              <button
                type="button"
                className={`phase-step ${status}`}
                aria-current={status === "current" ? "step" : undefined}
                onClick={() => onSelectPhase(p)}
              >
                <span className="phase-step-dot" aria-hidden="true" />
                <span className="phase-step-name">{PHASE_INFO[p].full}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        className={`phase-advance ${atEndPhase ? "end-turn" : ""}`}
        onClick={onAdvance}
      >
        {atEndPhase ? "End Turn" : "Next Phase"}
        {atEndPhase ? <SkipForward size={14} /> : <ChevronRight size={15} />}
      </button>
    </section>
  );
}
