import type { ActionLogEntry } from "../types";

interface ActionLogProps {
  entries: ActionLogEntry[];
}

export function ActionLog({ entries }: ActionLogProps) {
  return (
    <section className="stone-panel log-panel" aria-label="Action log">
      <p className="eyebrow">Action Log</p>
      <ol>
        {entries.map((entry) => (
          <li key={entry.id}>{entry.message}</li>
        ))}
      </ol>
    </section>
  );
}
