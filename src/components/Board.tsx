import { CARD_DECK_IMAGE_URL } from "../cardData";
import { PHASES, isOpenTargetZone } from "../gameLogic";
import type { CardInstance, GameState, Phase, ZoneKind } from "../types";
import { CardView } from "./CardView";

interface BoardProps {
  game: GameState;
  onSelectCard: (cardId: string) => void;
  onZoneClick: (zoneKind: ZoneKind, index: number) => void;
  onPhaseSelect: (phase: Phase) => void;
}

export function Board({ game, onSelectCard, onZoneClick, onPhaseSelect }: BoardProps) {
  return (
    <section className="board-frame" aria-label="Duel board">
      <div className="board-side opponent-side">
        <MainPileStack
          deckCount={game.opponent.deckCount}
          graveyardCount={game.opponent.graveyardCount}
          hidden
        />
        <div className="zone-grid">
          <ZoneRow label="Spell / Trap" accent="opponent" hiddenZones={game.opponent.spellTrapZones} />
          <ZoneRow label="Monster" accent="opponent" hiddenZones={game.opponent.monsterZones} />
        </div>
        <SidePileStack banishedCount={game.opponent.banishedCount} hidden />
      </div>

      <div className="board-side player-side">
        <MainPileStack
          deckCount={game.player.deck.length}
          graveyardCount={game.player.graveyard.length}
          graveyardTop={game.player.graveyard[0]?.instance ?? null}
          selectedCardId={game.selectedCardId}
          onSelectCard={onSelectCard}
        />
        <div className="zone-grid">
          <ZoneRow
            label="Monster"
            accent="player"
            zoneKind="monster"
            cards={game.player.monsterZones}
            selectedCardId={game.selectedCardId}
            lastPlacedCardId={game.lastPlacedCardId}
            game={game}
            onSelectCard={onSelectCard}
            onZoneClick={onZoneClick}
          />
          <ZoneRow
            label="Spell / Trap"
            accent="player"
            zoneKind="spellTrap"
            cards={game.player.spellTrapZones}
            selectedCardId={game.selectedCardId}
            lastPlacedCardId={game.lastPlacedCardId}
            game={game}
            onSelectCard={onSelectCard}
            onZoneClick={onZoneClick}
          />
        </div>
        <SidePileStack
          banishedCount={game.player.banished.length}
          banishedTop={game.player.banished[0]?.instance ?? null}
          selectedCardId={game.selectedCardId}
          onSelectCard={onSelectCard}
        />
      </div>
      <PhaseTracker activePhase={game.phase} onPhaseSelect={onPhaseSelect} />
    </section>
  );
}

interface MainPileStackProps {
  deckCount: number;
  graveyardCount: number;
  hidden?: boolean;
  graveyardTop?: CardInstance | null;
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string) => void;
}

function MainPileStack({
  deckCount,
  graveyardCount,
  hidden = false,
  graveyardTop,
  selectedCardId,
  onSelectCard,
}: MainPileStackProps) {
  return (
    <div className="utility-stack">
      <div className="utility-slot">
        <CardView faceDown compact label="Deck" faceDownImageUrl={CARD_DECK_IMAGE_URL} />
        <span className="pile-badge">DECK {deckCount}</span>
      </div>
      <div className="utility-slot">
        {graveyardTop && !hidden ? (
          <CardView
            card={graveyardTop}
            compact
            selected={graveyardTop.instanceId === selectedCardId}
            onClick={() => onSelectCard?.(graveyardTop.instanceId)}
          />
        ) : (
          <CardView placeholder compact label="GY" />
        )}
        <span className="pile-badge">GY {graveyardCount}</span>
      </div>
    </div>
  );
}

interface SidePileStackProps {
  banishedCount: number;
  hidden?: boolean;
  banishedTop?: CardInstance | null;
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string) => void;
}

function SidePileStack({
  banishedCount,
  hidden = false,
  banishedTop,
  selectedCardId,
  onSelectCard,
}: SidePileStackProps) {
  return (
    <div className="side-pile-stack">
      <div className="utility-slot">
        {banishedTop && !hidden ? (
          <CardView
            card={banishedTop}
            compact
            selected={banishedTop.instanceId === selectedCardId}
            onClick={() => onSelectCard?.(banishedTop.instanceId)}
          />
        ) : (
          <CardView placeholder compact label="Banish" />
        )}
        <span className="pile-badge">BANISHED {banishedCount}</span>
      </div>
    </div>
  );
}

interface ZoneRowProps {
  label: string;
  accent: "player" | "opponent";
  hiddenZones?: boolean[];
  zoneKind?: ZoneKind;
  cards?: GameState["player"]["monsterZones"];
  selectedCardId?: string | null;
  lastPlacedCardId?: string | null;
  game?: GameState;
  onSelectCard?: (cardId: string) => void;
  onZoneClick?: (zoneKind: ZoneKind, index: number) => void;
}

function ZoneRow({
  label,
  accent,
  hiddenZones,
  zoneKind,
  cards,
  selectedCardId,
  lastPlacedCardId,
  game,
  onSelectCard,
  onZoneClick,
}: ZoneRowProps) {
  const zones = hiddenZones ?? cards ?? [];

  return (
    <div className={`zone-row ${accent}-zones`}>
      <div className="zones">
        {zones.map((zone, index) => {
          const zoneCard = typeof zone === "object" ? zone : null;
          const isHidden = typeof zone === "boolean" && zone;
          const isTarget = game && zoneKind ? isOpenTargetZone(game, zoneKind, index) : false;
          const zoneClasses = ["duel-zone", isTarget ? "targetable" : "", zoneCard || isHidden ? "occupied" : ""]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              className={zoneClasses}
              key={`${label}-${index}`}
              role={isTarget ? "button" : undefined}
              tabIndex={isTarget ? 0 : undefined}
              onClick={() => {
                if (isTarget && zoneKind) {
                  onZoneClick?.(zoneKind, index);
                }
              }}
              onKeyDown={(event) => {
                if (isTarget && zoneKind && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onZoneClick?.(zoneKind, index);
                }
              }}
              aria-label={`${label} zone ${index + 1}`}
            >
              {zoneCard ? (
                <CardView
                  card={zoneCard.instance}
                  faceDown={zoneCard.faceDown}
                  compact
                  selected={zoneCard.instance.instanceId === selectedCardId}
                  className={zoneCard.instance.instanceId === lastPlacedCardId ? "placed" : ""}
                  onClick={() => onSelectCard?.(zoneCard.instance.instanceId)}
                />
              ) : isHidden ? (
                <CardView faceDown compact label="Set" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PhaseTrackerProps {
  activePhase: Phase;
  onPhaseSelect: (phase: Phase) => void;
}

function PhaseTracker({ activePhase, onPhaseSelect }: PhaseTrackerProps) {
  return (
    <div className="phase-tracker" aria-label="Phase tracker">
      {PHASES.map((phase) => (
        <button
          className={phase === activePhase ? "active" : ""}
          type="button"
          key={phase}
          onClick={() => onPhaseSelect(phase)}
        >
          {phase}
        </button>
      ))}
    </div>
  );
}
