import { Check, X } from "lucide-react";
import type { PromptView } from "../gameLogic";

interface PromptPanelProps {
  prompt: PromptView;
  selectedCandidateCount: number;
  onChoice: (choiceIds: string[]) => void;
  onConfirmSelection: () => void;
  onClearSelection: () => void;
}

export function PromptPanel({
  prompt,
  selectedCandidateCount,
  onChoice,
  onConfirmSelection,
  onClearSelection,
}: PromptPanelProps) {
  const activePrompt = prompt.activePrompt;

  if (!activePrompt) {
    return (
      <section className="engine-panel prompt-panel" aria-label="Prompt">
        <div className="engine-panel-head">
          <span className="eyebrow">Prompt</span>
          <strong>Idle</strong>
        </div>
        <p className="engine-panel-empty">No pending choices</p>
      </section>
    );
  }

  const usesSelection =
    activePrompt.kind === "target" || activePrompt.kind === "discard" || activePrompt.kind === "tribute";
  const canConfirm =
    usesSelection && selectedCandidateCount >= activePrompt.min && selectedCandidateCount <= activePrompt.max;
  const choices = activePrompt.kind === "chain-response"
    ? [{ label: "Pass", choiceIds: ["pass"], subtle: true }]
    : [
        { label: "Yes", choiceIds: ["yes"], subtle: false },
        { label: "No", choiceIds: ["no"], subtle: true },
      ];

  return (
    <section className="engine-panel prompt-panel active" aria-label="Prompt">
      <div className="engine-panel-head">
        <span className="eyebrow">Prompt</span>
        <strong>{activePrompt.kind}</strong>
      </div>
      <p className="prompt-message">{activePrompt.message}</p>
      {usesSelection ? (
        <div className="prompt-actions">
          <span className="prompt-count">
            {selectedCandidateCount}/{activePrompt.max}
          </span>
          <button
            type="button"
            className="engine-panel-btn"
            disabled={!canConfirm}
            onClick={onConfirmSelection}
          >
            <Check size={14} />
            Confirm
          </button>
          <button type="button" className="engine-panel-btn subtle" onClick={onClearSelection}>
            <X size={14} />
            Clear
          </button>
        </div>
      ) : (
        <div className={choices.length > 1 ? "prompt-actions two-col" : "prompt-actions one-col"}>
          {choices.map((choice) => (
            <button
              key={choice.label}
              type="button"
              className={choice.subtle ? "engine-panel-btn subtle" : "engine-panel-btn"}
              onClick={() => onChoice(choice.choiceIds)}
            >
              {choice.subtle ? <X size={14} /> : <Check size={14} />}
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
