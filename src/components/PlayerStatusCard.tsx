import { useEffect, useRef, useState } from "react";
import { Pencil, UserRound } from "lucide-react";

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

  // Commits on Enter or blur; Escape cancels (handled inline). drawCard-style
  // clamping lives in setLifePoints, so an out-of-range number is safe here.
  function commit() {
    setEditing(false);
    const next = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(next)) {
      onEditLp(next);
    }
  }

  return (
    <section className={`player-status-card ${accent}-status`}>
      <div className="avatar-frame">
        <UserRound size={26} strokeWidth={1.6} />
      </div>
      <div className="player-status-body">
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
          <p className="lp-readout">
            <strong>{lp.toLocaleString()}</strong>
            <span>LP</span>
            <button
              type="button"
              className="lp-edit-btn"
              onClick={beginEdit}
              aria-label={`Edit ${name} Life Points`}
            >
              <Pencil size={11} />
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
