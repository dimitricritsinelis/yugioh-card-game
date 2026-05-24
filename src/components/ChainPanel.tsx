import { Link, Play } from "lucide-react";
import type { ChainView } from "../gameLogic";

interface ChainPanelProps {
  chain: ChainView;
  onResolveChain: () => void;
}

export function ChainPanel({ chain, onResolveChain }: ChainPanelProps) {
  return (
    <section className="engine-panel chain-panel" aria-label="Chain">
      <div className="engine-panel-head">
        <span className="eyebrow">Chain</span>
        <strong>{chain.links.length}</strong>
      </div>
      {chain.links.length > 0 ? (
        <ol className="chain-list">
          {chain.links.map((link) => (
            <li key={link.id}>
              <Link size={12} />
              <span>
                {link.id} · {link.playerId} · SS{link.spellSpeed}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="engine-panel-empty">No active links</p>
      )}
      <button
        type="button"
        className="engine-panel-btn"
        onClick={onResolveChain}
        disabled={!chain.canResolve}
      >
        <Play size={14} />
        Resolve Chain
      </button>
    </section>
  );
}
