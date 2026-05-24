import { ChevronsRight } from "lucide-react";
import type { PriorityView } from "../gameLogic";

interface PriorityPanelProps {
  priority: PriorityView;
  onPassPriority: () => void;
}

export function PriorityPanel({ priority, onPassPriority }: PriorityPanelProps) {
  return (
    <section className="engine-panel priority-panel" aria-label="Priority">
      <div className="engine-panel-head">
        <span className="eyebrow">Priority</span>
        <strong>{priority.currentPlayerId}</strong>
      </div>
      <button
        type="button"
        className="engine-panel-btn"
        onClick={onPassPriority}
        disabled={!priority.canPass}
      >
        <ChevronsRight size={14} />
        Pass Priority
      </button>
    </section>
  );
}
