import type { CSSProperties } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { CardInstance } from "../types";
import { CardView } from "./CardView";

interface HandProps {
  cards: CardInstance[];
  selectedCardId: string | null;
  lastDrawnCardId: string | null;
  unavailableCardIds: string[];
  onSelectCard: (cardId: string) => void;
  onOpenOverride: () => void;
}

export function Hand({
  cards,
  selectedCardId,
  lastDrawnCardId,
  unavailableCardIds,
  onSelectCard,
  onOpenOverride,
}: HandProps) {
  const fanCenter = (cards.length - 1) / 2;
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
      <div className="hand-actions" aria-label="Manual card tools">
        <button type="button" className="hand-action-btn" onClick={onOpenOverride}>
          <SlidersHorizontal size={15} />
          Override
        </button>
      </div>

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
