import { CheckSquare, Square } from "lucide-react";
import type { PromptSelectionCandidate, PromptView } from "../gameLogic";

interface TargetSelectionOverlayProps {
  prompt: PromptView;
  selectedCandidateIds: string[];
  onToggleCandidate: (candidateId: string) => void;
}

export function TargetSelectionOverlay({
  prompt,
  selectedCandidateIds,
  onToggleCandidate,
}: TargetSelectionOverlayProps) {
  const activePrompt = prompt.activePrompt;

  if (
    !activePrompt ||
    (activePrompt.kind !== "target" && activePrompt.kind !== "discard" && activePrompt.kind !== "tribute")
  ) {
    return null;
  }

  return (
    <section className="target-selection-overlay" aria-label="Prompt selection">
      <div className="target-selection-head">
        <span className="eyebrow">{activePrompt.kind}</span>
        <strong>
          Choose {activePrompt.min}-{activePrompt.max}
        </strong>
      </div>
      <div className="target-selection-list">
        {prompt.candidates.map((candidate) => (
          <SelectionCandidateButton
            key={candidate.id}
            candidate={candidate}
            selected={selectedCandidateIds.includes(candidate.id)}
            onToggleCandidate={onToggleCandidate}
          />
        ))}
      </div>
    </section>
  );
}

function SelectionCandidateButton({
  candidate,
  selected,
  onToggleCandidate,
}: {
  candidate: PromptSelectionCandidate;
  selected: boolean;
  onToggleCandidate: (candidateId: string) => void;
}) {
  return (
    <button
      type="button"
      className={selected ? "target-selection-option selected" : "target-selection-option"}
      onClick={() => onToggleCandidate(candidate.id)}
    >
      {selected ? <CheckSquare size={14} /> : <Square size={14} />}
      <span>{candidate.label}</span>
    </button>
  );
}
