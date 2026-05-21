import type { CSSProperties } from "react";
import { Ban, Send } from "lucide-react";
import type { CardInstance } from "../types";
import { CardView } from "./CardView";

interface HandProps {
  cards: CardInstance[];
  selectedCardId: string | null;
  lastDrawnCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onSendToGraveyard: () => void;
  onBanish: () => void;
}

export function Hand({
  cards,
  selectedCardId,
  lastDrawnCardId,
  onSelectCard,
  onSendToGraveyard,
  onBanish,
}: HandProps) {
  const fanCenter = (cards.length - 1) / 2;
  const hasSelection = Boolean(selectedCardId);

  function fanStyle(index: number): CSSProperties & Record<string, string> {
    const offset = index - fanCenter;

    return {
      "--fan-rotate": `${offset * 2.8}deg`,
      "--fan-lift": `${Math.abs(offset) * 2}px`,
    };
  }

  return (
    <section className="hand-dock player-accent" aria-label="Player hand">
      <div className="hand-actions">
        <button
          type="button"
          className="hand-action-btn"
          onClick={onSendToGraveyard}
          disabled={!hasSelection}
        >
          <Send size={15} />
          Graveyard
        </button>
        <button
          type="button"
          className="hand-action-btn"
          onClick={onBanish}
          disabled={!hasSelection}
        >
          <Ban size={15} />
          Banish
        </button>
      </div>

      <div className="hand-main">
        <div className="hand-fan">
          {cards.map((card, index) => (
            <div
              className={`hand-card ${card.instanceId === lastDrawnCardId ? "drawn" : ""}`}
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
