import { CARD_DECK_IMAGE_URL } from "../cardData";
import type { CardAction, CardInstance, GameState, ZoneKind } from "../types";
import { CardView } from "./CardView";

interface BoardProps {
  game: GameState;
  placeableKind: ZoneKind | null;
  onSelectCard: (cardId: string) => void;
  onPlaceCard: (action: CardAction, zoneKind: ZoneKind, index: number) => void;
}

export function Board({ game, placeableKind, onSelectCard, onPlaceCard }: BoardProps) {
  return (
    <section className="board-frame" aria-label="Duel board">
      <div className="board-side opponent-side">
        <DeckPile deckCount={game.opponent.deckCount} monsterRowFirst={false} />
        <div className="zone-grid">
          <ZoneRow label="Spell / Trap" accent="opponent" hiddenZones={game.opponent.spellTrapZones} />
          <ZoneRow label="Monster" accent="opponent" hiddenZones={game.opponent.monsterZones} />
        </div>
        {/* Opponent rows run S/T → Monster, so banished (S/T row) sits above graveyard (monster row). */}
        <GraveBanishStack
          graveyardCount={game.opponent.graveyardCount}
          banishedCount={game.opponent.banishedCount}
          graveyardFirst={false}
          hidden
        />
      </div>

      <div className="board-side player-side">
        <DeckPile deckCount={game.player.deck.length} monsterRowFirst />
        <div className="zone-grid">
          <ZoneRow
            label="Monster"
            accent="player"
            zoneKind="monster"
            cards={game.player.monsterZones}
            selectedCardId={game.selectedCardId}
            lastPlacedCardId={game.lastPlacedCardId}
            placeableKind={placeableKind}
            onSelectCard={onSelectCard}
            onPlaceCard={onPlaceCard}
          />
          <ZoneRow
            label="Spell / Trap"
            accent="player"
            zoneKind="spellTrap"
            cards={game.player.spellTrapZones}
            selectedCardId={game.selectedCardId}
            lastPlacedCardId={game.lastPlacedCardId}
            placeableKind={placeableKind}
            onSelectCard={onSelectCard}
            onPlaceCard={onPlaceCard}
          />
        </div>
        {/* Player rows run Monster → S/T, so graveyard (monster row) sits above banished (S/T row). */}
        <GraveBanishStack
          graveyardCount={game.player.graveyard.length}
          banishedCount={game.player.banished.length}
          graveyardTop={game.player.graveyard[0]?.instance ?? null}
          banishedTop={game.player.banished[0]?.instance ?? null}
          graveyardFirst
          selectedCardId={game.selectedCardId}
          onSelectCard={onSelectCard}
        />
      </div>
    </section>
  );
}

function DeckPile({ deckCount, monsterRowFirst }: { deckCount: number; monsterRowFirst: boolean }) {
  return (
    <div className="utility-stack">
      <div className="utility-slot" style={{ gridRow: monsterRowFirst ? 1 : 2 }}>
        <CardView faceDown compact label="Deck" faceDownImageUrl={CARD_DECK_IMAGE_URL} />
        <span className="pile-badge">DECK {deckCount}</span>
      </div>
    </div>
  );
}

interface PileSlotProps {
  badgeLabel: string;
  placeholderLabel: string;
  count: number;
  topCard?: CardInstance | null;
  hidden?: boolean;
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string) => void;
}

function PileSlot({
  badgeLabel,
  placeholderLabel,
  count,
  topCard,
  hidden = false,
  selectedCardId,
  onSelectCard,
}: PileSlotProps) {
  return (
    <div className="utility-slot">
      {topCard && !hidden ? (
        <CardView
          card={topCard}
          compact
          selected={topCard.instanceId === selectedCardId}
          onClick={() => onSelectCard?.(topCard.instanceId)}
        />
      ) : (
        <CardView placeholder compact label={placeholderLabel} />
      )}
      <span className="pile-badge">
        {badgeLabel} {count}
      </span>
    </div>
  );
}

interface GraveBanishStackProps {
  graveyardCount: number;
  banishedCount: number;
  graveyardTop?: CardInstance | null;
  banishedTop?: CardInstance | null;
  hidden?: boolean;
  /** True when the graveyard slot should sit in the top row (aligned with the monster row). */
  graveyardFirst: boolean;
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string) => void;
}

function GraveBanishStack({
  graveyardCount,
  banishedCount,
  graveyardTop,
  banishedTop,
  hidden = false,
  graveyardFirst,
  selectedCardId,
  onSelectCard,
}: GraveBanishStackProps) {
  const graveyard = (
    <PileSlot
      key="graveyard"
      badgeLabel="GY"
      placeholderLabel="GY"
      count={graveyardCount}
      topCard={graveyardTop}
      hidden={hidden}
      selectedCardId={selectedCardId}
      onSelectCard={onSelectCard}
    />
  );
  const banished = (
    <PileSlot
      key="banished"
      badgeLabel="BANISHED"
      placeholderLabel="Banish"
      count={banishedCount}
      topCard={banishedTop}
      hidden={hidden}
      selectedCardId={selectedCardId}
      onSelectCard={onSelectCard}
    />
  );

  return (
    <div className="utility-stack">{graveyardFirst ? [graveyard, banished] : [banished, graveyard]}</div>
  );
}

const ZONE_ACTIONS: Record<ZoneKind, Array<{ action: CardAction; label: string }>> = {
  monster: [
    { action: "summon", label: "Summon" },
    { action: "set", label: "Set" },
  ],
  spellTrap: [
    { action: "activate", label: "Activate" },
    { action: "set", label: "Set" },
  ],
};

interface ZoneActionsProps {
  zoneKind: ZoneKind;
  index: number;
  onPlaceCard: (action: CardAction, zoneKind: ZoneKind, index: number) => void;
}

function ZoneActions({ zoneKind, index, onPlaceCard }: ZoneActionsProps) {
  return (
    <div className="zone-actions">
      {ZONE_ACTIONS[zoneKind].map(({ action, label }) => (
        <button
          key={action}
          type="button"
          className="zone-action-btn"
          onClick={() => onPlaceCard(action, zoneKind, index)}
        >
          {label}
        </button>
      ))}
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
  placeableKind?: ZoneKind | null;
  onSelectCard?: (cardId: string) => void;
  onPlaceCard?: (action: CardAction, zoneKind: ZoneKind, index: number) => void;
}

function ZoneRow({
  label,
  accent,
  hiddenZones,
  zoneKind,
  cards,
  selectedCardId,
  lastPlacedCardId,
  placeableKind,
  onSelectCard,
  onPlaceCard,
}: ZoneRowProps) {
  const zones = hiddenZones ?? cards ?? [];

  return (
    <div className={`zone-row ${accent}-zones`}>
      <div className="zones">
        {zones.map((zone, index) => {
          const zoneCard = typeof zone === "object" ? zone : null;
          const isHidden = typeof zone === "boolean" && zone;
          const showActions =
            !zoneCard && !isHidden && Boolean(zoneKind) && placeableKind === zoneKind;
          const zoneClasses = [
            "duel-zone",
            zoneCard || isHidden ? "occupied" : "",
            showActions ? "action-target" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              className={zoneClasses}
              key={`${label}-${index}`}
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
              ) : showActions && zoneKind && onPlaceCard ? (
                <ZoneActions zoneKind={zoneKind} index={index} onPlaceCard={onPlaceCard} />
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
