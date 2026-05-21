import { CARD_BACK_IMAGE_URL, getCardImageUrl } from "../cardData";
import type { CardInstance } from "../types";

interface CardViewProps {
  card?: CardInstance | null;
  faceDown?: boolean;
  faceDownImageUrl?: string;
  selected?: boolean;
  compact?: boolean;
  placeholder?: boolean;
  className?: string;
  label?: string;
  onClick?: () => void;
}

export function CardView({
  card,
  faceDown = false,
  faceDownImageUrl = CARD_BACK_IMAGE_URL,
  selected = false,
  compact = false,
  placeholder = false,
  className = "",
  label,
  onClick,
}: CardViewProps) {
  const classes = [
    "card-view",
    compact ? "compact" : "",
    selected ? "selected" : "",
    placeholder ? "placeholder" : "",
    faceDown ? "face-down" : "",
    onClick ? "clickable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (placeholder) {
    return (
      <div className={classes} aria-label={label ?? "Empty card slot"}>
        <span>{label ?? "Empty"}</span>
      </div>
    );
  }

  if (faceDown || !card) {
    return (
      <button className={classes} type="button" onClick={onClick} aria-label={label ?? "Face-down card"}>
        <img src={faceDownImageUrl} alt="" loading="lazy" />
      </button>
    );
  }

  return (
    <button className={classes} type="button" onClick={onClick} aria-label={`Select ${card.card.name}`}>
      <img src={getCardImageUrl(card.card)} alt={card.card.name} loading="lazy" />
    </button>
  );
}
