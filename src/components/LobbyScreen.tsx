import type { FormEvent } from "react";
import type { SessionState } from "../types";

const MAX_NAME_LENGTH = 20;

interface LobbyScreenProps {
  session: SessionState;
  onUpdateSession: (changes: Partial<SessionState>) => void;
  onEnterGame: (role: "P1" | "P2") => void;
  onEnterSpectator: () => void;
  onBack: () => void;
}

export function LobbyScreen({
  session,
  onUpdateSession,
  onEnterGame,
  onEnterSpectator,
  onBack,
}: LobbyScreenProps) {
  return (
    <main className="screen lobby-screen">
      <div className="lobby-backdrop" aria-hidden="true" />
      <div className="lobby-stage">
        <header className="lobby-header">
          <p className="lobby-eyebrow">Lobby</p>
          <h1 className="lobby-title">Choose your seat</h1>
        </header>

        <div className="lobby-seats" role="group" aria-label="Player seats">
          <SeatCard
            accent="player"
            label="Player 1"
            defaultName="Player 1"
            name={session.p1Name}
            onChangeName={(name) => onUpdateSession({ p1Name: name })}
            onEnter={() => onEnterGame("P1")}
            autoFocus
          />
          <SeatCard
            accent="opponent"
            label="Player 2"
            defaultName="Player 2"
            name={session.p2Name}
            onChangeName={(name) => onUpdateSession({ p2Name: name })}
            onEnter={() => onEnterGame("P2")}
          />
        </div>

        <div className="lobby-divider" role="presentation">
          <span>or just watch</span>
        </div>

        <button
          type="button"
          className="lobby-cta lobby-cta-ghost lobby-spectator-btn"
          onClick={onEnterSpectator}
        >
          Enter as Spectator
        </button>

        <button type="button" className="lobby-back-btn" onClick={onBack}>
          Back to Home
        </button>
      </div>
    </main>
  );
}

interface SeatCardProps {
  accent: "player" | "opponent";
  label: string;
  defaultName: string;
  name: string;
  onChangeName: (name: string) => void;
  onEnter: () => void;
  autoFocus?: boolean;
}

function SeatCard({
  accent,
  label,
  defaultName,
  name,
  onChangeName,
  onEnter,
  autoFocus,
}: SeatCardProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onEnter();
  }

  return (
    <form className={`lobby-seat-card lobby-seat-${accent}`} onSubmit={handleSubmit}>
      <p className="lobby-seat-eyebrow">{label}</p>
      <input
        type="text"
        className="lobby-name-input"
        placeholder={defaultName}
        value={name}
        onChange={(event) => onChangeName(event.target.value)}
        maxLength={MAX_NAME_LENGTH}
        aria-label={`${label} name`}
        autoFocus={autoFocus}
      />
      <button type="submit" className="lobby-cta">
        Enter as {label}
      </button>
    </form>
  );
}

