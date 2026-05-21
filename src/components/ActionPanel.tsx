import { RotateCcw } from "lucide-react";

interface ActionPanelProps {
  onReset: () => void;
}

export function ActionPanel({ onReset }: ActionPanelProps) {
  return (
    <section className="stone-panel action-panel" aria-label="Actions">
      <div className="panel-title">
        <p className="eyebrow">Command</p>
      </div>

      <div className="action-grid">
        <button type="button" onClick={onReset}>
          <RotateCcw size={16} />
          Reset
        </button>
      </div>
    </section>
  );
}
