import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import type { OnlineConnectionStatus, OnlineGameView } from "../online/types";

const MAX_NAME_LENGTH = 20;
const MAX_CODE_LENGTH = 12;

interface LobbyScreenProps {
  playerName: string;
  onPlayerName: (name: string) => void;
  codeInput: string;
  onCodeInput: (code: string) => void;
  pending: boolean;
  view: OnlineGameView | null;
  message: string | null;
  connectionStatus: OnlineConnectionStatus;
  onHost: () => void;
  onJoin: () => void;
  onSpectate: () => void;
  onBack: () => void;
}

export function LobbyScreen({
  playerName,
  onPlayerName,
  codeInput,
  onCodeInput,
  pending,
  view,
  message,
  connectionStatus,
  onHost,
  onJoin,
  onSpectate,
  onBack,
}: LobbyScreenProps) {
  const [mode, setMode] = useState<"choose" | "join">(codeInput.trim() ? "join" : "choose");
  const hasCode = codeInput.trim().length > 0;
  const hostName = view?.seats.P1.occupied ? view.seats.P1.playerName : null;

  function handleJoinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending && hasCode) {
      onJoin();
    }
  }

  return (
    <main className="screen lobby-screen">
      <div className="lobby-backdrop" aria-hidden="true" />
      <div className="lobby-stage">
        <header className="lobby-header">
          <p className="lobby-eyebrow">Online Duel</p>
          <h1 className="lobby-title">{mode === "join" ? "Join a duel" : "Start dueling"}</h1>
        </header>

        <section className="lobby-panel" aria-label="Online duel lobby">
          <label className="lobby-field">
            <span className="lobby-field-label">Your name</span>
            <input
              type="text"
              className="lobby-name-input"
              value={playerName}
              onChange={(event) => onPlayerName(event.target.value)}
              placeholder="Duelist"
              maxLength={MAX_NAME_LENGTH}
              aria-label="Your name"
              autoFocus
            />
          </label>

          {mode === "choose" ? (
            <div className="lobby-choice-grid" role="group" aria-label="Choose how to play">
              <button
                type="button"
                className="lobby-choice-card lobby-choice-host"
                onClick={onHost}
                disabled={pending}
              >
                <span className="lobby-choice-title">Host a Duel</span>
                <span className="lobby-choice-sub">
                  Create a duel and share the code with your opponent.
                </span>
              </button>
              <button
                type="button"
                className="lobby-choice-card"
                onClick={() => setMode("join")}
                disabled={pending}
              >
                <span className="lobby-choice-title">Join with Code</span>
                <span className="lobby-choice-sub">
                  Enter a friend's duel code to take the open seat.
                </span>
              </button>
            </div>
          ) : (
            <form className="lobby-join" onSubmit={handleJoinSubmit}>
              <input
                type="text"
                className="lobby-name-input online-code-input"
                value={codeInput}
                onChange={(event) => onCodeInput(event.target.value.toUpperCase())}
                placeholder="DUEL CODE"
                maxLength={MAX_CODE_LENGTH}
                aria-label="Duel code"
              />
              {hostName ? (
                <p className="lobby-join-hint">{hostName} is hosting — take the open seat.</p>
              ) : null}
              <div className="lobby-join-actions">
                <button type="submit" className="lobby-cta" disabled={pending || !hasCode}>
                  Join Duel
                </button>
                <button
                  type="button"
                  className="lobby-cta lobby-cta-ghost"
                  onClick={onSpectate}
                  disabled={pending || !hasCode}
                >
                  Spectate
                </button>
              </div>
              <button type="button" className="lobby-text-link" onClick={() => setMode("choose")}>
                <ArrowLeft size={14} />
                Back
              </button>
            </form>
          )}

          {view && connectionStatus !== "connected" ? (
            <p className="lobby-conn-note">Reconnecting to the duel…</p>
          ) : null}
          {message ? <p className="online-lobby-message">{message}</p> : null}
        </section>

        <button type="button" className="lobby-back-btn" onClick={onBack}>
          Back to Home
        </button>
      </div>
    </main>
  );
}
