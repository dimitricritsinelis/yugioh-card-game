import { Check, X } from "lucide-react";

interface HandStatusCardProps {
  handCount: number;
  handLimit: number;
  discard: { requiredCount: number; selectedIds: string[] } | null;
  onConfirmDiscard: () => void;
  onCancelDiscard: () => void;
}

export function HandStatusCard({
  handCount,
  handLimit,
  discard,
  onConfirmDiscard,
  onCancelDiscard,
}: HandStatusCardProps) {
  const discarding = discard !== null;
  const required = discard?.requiredCount ?? 0;
  const selected = discard?.selectedIds.length ?? 0;
  const remaining = required - selected;
  const overLimit = handCount > handLimit;

  return (
    <section className={`hand-status${discarding ? " is-discard" : ""}`} aria-label="Hand status">
      <header className="hand-status-head">
        <span className="eyebrow">Hand</span>
        <strong className={overLimit ? "over-limit" : ""}>
          {handCount}
          <span className="hand-status-limit">/ {handLimit}</span>
        </strong>
      </header>

      {discarding ? (
        <div className="hand-status-discard" role="status">
          <p className="hand-status-prompt">
            {remaining > 0
              ? `Select ${remaining} more card${remaining === 1 ? "" : "s"} to discard`
              : "Ready to discard"}
          </p>
          <span className="hand-status-count">
            {selected}/{required}
          </span>
          <div className="hand-status-actions">
            <button type="button" className="hand-status-cancel" onClick={onCancelDiscard}>
              <X size={14} />
              Cancel
            </button>
            <button
              type="button"
              className="hand-status-confirm"
              onClick={onConfirmDiscard}
              disabled={remaining !== 0}
            >
              <Check size={14} />
              Discard &amp; end turn
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
