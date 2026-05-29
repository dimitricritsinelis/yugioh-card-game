import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { CardInstance } from "../types";
import { CardView } from "./CardView";

interface HandProps {
  cards: CardInstance[];
  selectedCardId: string | null;
  lastDrawnCardId: string | null;
  unavailableCardIds: string[];
  onSelectCard: (cardId: string) => void;
  onOpenOverride?: () => void;
  discardMode?: boolean;
  discardSelectedIds?: string[];
  onToggleDiscard?: (cardId: string) => void;
}

const BASE_GAP = 10;
const MAX_SPREAD_DEG = 16;

export function Hand({
  cards,
  selectedCardId,
  lastDrawnCardId,
  unavailableCardIds,
  onSelectCard,
  onOpenOverride,
  discardMode = false,
  discardSelectedIds = [],
  onToggleDiscard,
}: HandProps) {
  const fanRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ containerWidth: 0, cardWidth: 0 });

  useLayoutEffect(() => {
    const fan = fanRef.current;
    if (!fan) {
      return;
    }

    function measure() {
      const node = fanRef.current;
      if (!node) {
        return;
      }
      const card = node.querySelector<HTMLElement>(".hand-card");
      setMetrics({
        containerWidth: node.clientWidth,
        // offsetWidth is the layout width, unaffected by the rotate transform.
        cardWidth: card?.offsetWidth ?? 0,
      });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(fan);
    return () => observer.disconnect();
  }, [cards.length]);

  const count = cards.length;
  const fanCenter = (count - 1) / 2;
  const unavailableCards = new Set(unavailableCardIds);
  const discardSelected = new Set(discardSelectedIds);

  const { containerWidth, cardWidth } = metrics;
  const measured = containerWidth > 0 && cardWidth > 0;
  // Step is the horizontal distance between adjacent card origins. When the
  // hand is small, cards keep their natural spacing; when it grows past the
  // container, the step shrinks below card width so cards tuck behind each
  // other (negative margin) and the whole fan still fits one screen.
  const desiredStep = cardWidth + BASE_GAP;
  const maxStep = count > 1 ? (containerWidth - cardWidth) / (count - 1) : desiredStep;
  const step = measured ? Math.min(desiredStep, maxStep) : desiredStep;
  const overlapMargin = measured ? step - cardWidth : null;
  const perCardRotate = count > 1 ? Math.min(2.8, MAX_SPREAD_DEG / (count - 1)) : 2.8;

  function fanStyle(index: number): CSSProperties & Record<string, string> {
    const offset = index - fanCenter;
    const style: CSSProperties & Record<string, string> = {
      "--fan-rotate": `${offset * perCardRotate}deg`,
      "--fan-lift": `${Math.abs(offset) * 2}px`,
    };

    if (overlapMargin !== null && index > 0) {
      style.marginLeft = `${overlapMargin}px`;
    }

    return style;
  }

  return (
    <section
      className={["hand-dock", "player-accent", discardMode ? "discard-mode" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label="Player hand"
    >
      {onOpenOverride ? (
        <div className="hand-actions" aria-label="Manual card tools">
          <button
            type="button"
            className="hand-action-btn"
            onClick={onOpenOverride}
            disabled={discardMode}
          >
            <SlidersHorizontal size={15} />
            Override
          </button>
        </div>
      ) : null}

      <div className="hand-main">
        <div className="hand-fan" ref={fanRef}>
          {cards.map((card, index) => {
            const marked = discardSelected.has(card.instanceId);
            return (
              <div
                className={[
                  "hand-card",
                  card.instanceId === lastDrawnCardId ? "drawn" : "",
                  !discardMode && unavailableCards.has(card.instanceId) ? "unavailable" : "",
                  marked ? "discarding" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={card.instanceId}
                style={fanStyle(index)}
              >
                <CardView
                  card={card}
                  selected={!discardMode && card.instanceId === selectedCardId}
                  onClick={() =>
                    discardMode
                      ? onToggleDiscard?.(card.instanceId)
                      : onSelectCard(card.instanceId)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
