import type { CSSProperties } from "react";
import { Ban, Send } from "lucide-react";
import type { CardInstance } from "../types";
import { CardView } from "./CardView";

interface HandProps {
  cards: CardInstance[];
  selectedCardId: string | null;
  lastDrawnCardId: string | null;
  unavailableCardIds: string[];
  debugMoveEnabled?: boolean;
  onSelectCard: (cardId: string) => void;
  onSendToGraveyard: () => void;
  onBanish: () => void;
}

export function Hand({
  cards,
  selectedCardId,
  lastDrawnCardId,
  unavailableCardIds,
  debugMoveEnabled = false,
  onSelectCard,
  onSendToGraveyard,
  onBanish,
}: HandProps) {
  const fanCenter = (cards.length - 1) / 2;
  const hasSelection = Boolean(selectedCardId);
  const unavailableCards = new Set(unavailableCardIds);

  function fanStyle(index: number): CSSProperties & Record<string, string> {
    const offset = index - fanCenter;

    return {
      "--fan-rotate": `${offset * 2.8}deg`,
      "--fan-lift": `${Math.abs(offset) * 2}px`,
    };
  }

  return (
    <section className="hand-dock player-accent" aria-label="Player hand">
      {debugMoveEnabled ? (
        <div className="hand-actions" aria-label="Debug card movement actions">
          <button
            type="button"
            className="hand-action-btn"
            onClick={onSendToGraveyard}
            disabled={!hasSelection}
          >
            <Send size={15} />
            Debug GY
          </button>
          <button
            type="button"
            className="hand-action-btn"
            onClick={onBanish}
            disabled={!hasSelection}
          >
            <Ban size={15} />
            Debug Banish
          </button>
        </div>
      ) : null}

      <div className="hand-main">
        <div className="hand-fan">
          {cards.map((card, index) => (
            <div
              className={[
                "hand-card",
                card.instanceId === lastDrawnCardId ? "drawn" : "",
                unavailableCards.has(card.instanceId) ? "unavailable" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={card.instanceId}
              style={fanStyle(index)}
            >
              <CardView
                card={card}
                selected={card.instanceId === selectedCardId}
                onClick={() => onSelectCard(card.instanceId)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
