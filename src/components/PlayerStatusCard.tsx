import { useEffect, useRef, useState } from "react";

interface PlayerStatusCardProps {
  name: string;
  lp: number;
  accent: "player" | "opponent";
  onEditLp: (value: number) => void;
}

export function PlayerStatusCard({ name, lp, accent, onEditLp }: PlayerStatusCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  function beginEdit() {
    setDraft(String(lp));
    setEditing(true);
  }

  // Commits on Enter or blur; Escape cancels. setLifePoints clamps out-of-range input.
  function commit() {
    setEditing(false);
    const next = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(next)) {
      onEditLp(next);
    }
  }

  return (
    <section className={`player-status-card ${accent}-status`}>
      <p className="player-status-name">{name}</p>
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min={0}
          className="lp-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commit();
            } else if (event.key === "Escape") {
              setEditing(false);
            }
          }}
          aria-label={`${name} Life Points`}
        />
      ) : (
        <p
          className="lp-readout"
          role="button"
          tabIndex={0}
          aria-label={`${name} Life Points — double-click to edit`}
          onDoubleClick={beginEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              beginEdit();
            }
          }}
        >
          <strong>{lp.toLocaleString()}</strong>
          <span>LP</span>
        </p>
      )}
    </section>
  );
}
