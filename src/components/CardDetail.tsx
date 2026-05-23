import { getCardImageUrl, getSummonProfile } from "../cardData";
import type { CardInstance } from "../types";

interface CardDetailProps {
  selectedCard: CardInstance | null;
}

export function CardDetail({ selectedCard }: CardDetailProps) {
  if (!selectedCard) {
    return (
      <section className="stone-panel detail-panel empty-detail">
        <h2>No card selected</h2>
        <p>Select a visible card to inspect it.</p>
      </section>
    );
  }

  const card = selectedCard.card;
  const summon = getSummonProfile(card);

  return (
    <section className="stone-panel detail-panel" aria-label="Selected card detail">
      <div className="detail-card">
        <img src={getCardImageUrl(card)} alt={card.name} />
      </div>
      {card.monster ? (
        <div className="detail-stats">
          <div>
            <span>Level</span>
            <strong>{card.monster.level ?? "—"}</strong>
          </div>
          <div>
            <span>ATK</span>
            <strong>{card.monster.atk ?? "?"}</strong>
          </div>
          <div>
            <span>DEF</span>
            <strong>{card.monster.def ?? "?"}</strong>
          </div>
        </div>
      ) : null}
      {summon ? (
        <div className="summon-pills" role="group" aria-label="Summon method">
          <div className={`summon-pill ${summon.kind !== "special" ? "active" : ""}`}>
            <span className="summon-pill-type">
              {summon.kind === "tribute" ? "Tribute Summon" : "Normal Summon"}
            </span>
            {summon.kind === "tribute" ? (
              <span className="summon-pill-detail">
                {summon.tributes} {summon.tributes === 1 ? "Tribute" : "Tributes"}
              </span>
            ) : null}
          </div>
          <div className={`summon-pill ${summon.kind === "special" ? "active" : ""}`}>
            <span className="summon-pill-type">Special Summon</span>
            {summon.kind === "special" && summon.specialType ? (
              <span className="summon-pill-detail">{summon.specialType}</span>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="detail-text">
        <p>{card.text}</p>
      </div>
    </section>
  );
}
