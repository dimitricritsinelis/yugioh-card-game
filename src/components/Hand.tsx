import type { CSSProperties } from "react";
import { MAX_HAND_SLOTS } from "../gameLogic";
import type { CardInstance } from "../types";
import { CardView } from "./CardView";

interface HandProps {
  cards: CardInstance[];
  selectedCardId: string | null;
  lastDrawnCardId: string | null;
  onSelectCard: (cardId: string) => void;
}

export function Hand({ cards, selectedCardId, lastDrawnCardId, onSelectCard }: HandProps) {
  const slots = Array.from({ length: MAX_HAND_SLOTS }, (_, index) => cards[index] ?? null);
  const fanCenter = (MAX_HAND_SLOTS - 1) / 2;

  function fanStyle(index: number): CSSProperties & Record<string, string> {
    const offset = index - fanCenter;

    return {
      "--fan-rotate": `${offset * 2.8}deg`,
      "--fan-lift": `${Math.abs(offset) * 2}px`,
    };
  }

  return (
    <section className="hand-dock player-accent" aria-label="Player hand">
      <div className="hand-label">
        <span>Player Hand</span>
        <strong>{cards.length}/{MAX_HAND_SLOTS}</strong>
      </div>
      <div className="hand-fan">
        {slots.map((card, index) =>
          card ? (
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
          ) : (
            <div
              className="hand-card"
              key={`empty-${index}`}
              style={fanStyle(index)}
            >
              <CardView placeholder label="Slot" />
            </div>
          ),
        )}
      </div>
    </section>
  );
}
