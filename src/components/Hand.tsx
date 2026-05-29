import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";
import type { CardInstance } from "../types";
import { CardView } from "./CardView";

interface HandProps {
  cards: CardInstance[];
  selectedCardId: string | null;
  lastDrawnCardId: string | null;
  unavailableCardIds: string[];
  onSelectCard: (cardId: string) => void;
  onOpenOverride: () => void;
  discardMode?: boolean;
  discardSelectedIds?: string[];
  discardRequiredCount?: number;
  onToggleDiscard?: (cardId: string) => void;
  onConfirmDiscard?: () => void;
  onCancelDiscard?: () => void;
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
  discardRequiredCount = 0,
  onToggleDiscard,
  onConfirmDiscard,
  onCancelDiscard,
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

  const remaining = discardRequiredCount - discardSelected.size;

  return (
    <section
      className={["hand-dock", "player-accent", discardMode ? "discard-mode" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label="Player hand"
    >
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

      <div className="hand-main">
        {discardMode ? (
          <div className="hand-discard-bar" role="status">
            <span className="hand-discard-summary">
              {remaining > 0
                ? `Select ${remaining} more card${remaining === 1 ? "" : "s"} to discard`
                : "Ready to discard"}
              <span className="hand-discard-count">
                {discardSelected.size}/{discardRequiredCount}
              </span>
            </span>
            <div className="hand-discard-actions">
              <button type="button" className="hand-discard-cancel" onClick={onCancelDiscard}>
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                className="hand-discard-confirm"
                onClick={onConfirmDiscard}
                disabled={remaining !== 0}
              >
                <Check size={14} />
                Discard &amp; end turn
              </button>
            </div>
          </div>
        ) : null}

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
