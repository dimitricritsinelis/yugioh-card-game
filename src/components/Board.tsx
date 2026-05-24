import { CARD_DECK_IMAGE_URL } from "../cardData";
import type { LegalAttackTarget, LegalPlacementAction } from "../gameLogic";
import type { CardAction, CardInstance, GameState, ZoneKind } from "../types";
import { CardView } from "./CardView";

interface BoardProps {
  game: GameState;
  legalPlacements: LegalPlacementAction[];
  legalAttackTargets: LegalAttackTarget[];
  onSelectCard: (cardId: string) => void;
  onPlaceCard: (placement: LegalPlacementAction) => void;
  onAttack: (target: LegalAttackTarget) => void;
  tributeSelection: TributeSelectionView | null;
  onToggleTribute: (instanceId: string) => void;
  onCancelTribute: () => void;
  onConfirmTribute: () => void;
}

interface TributeSelectionView {
  requiredCount: number;
  selectedTributeIds: string[];
  lockedTributeIds: string[];
}

export function Board({
  game,
  legalPlacements,
  legalAttackTargets,
  onSelectCard,
  onPlaceCard,
  onAttack,
  tributeSelection,
  onToggleTribute,
  onCancelTribute,
  onConfirmTribute,
}: BoardProps) {
  return (
    <section className="board-frame" aria-label="Duel board">
      {tributeSelection ? (
        <div className="tribute-selection-banner" role="status">
          <span>
            Select Tributes {tributeSelection.selectedTributeIds.length}/{tributeSelection.requiredCount}
          </span>
          <button
            type="button"
            className="tribute-confirm-btn"
            disabled={tributeSelection.selectedTributeIds.length !== tributeSelection.requiredCount}
            onClick={onConfirmTribute}
          >
            Confirm
          </button>
          <button type="button" className="tribute-cancel-btn" onClick={onCancelTribute}>
            Cancel
          </button>
        </div>
      ) : null}

      <div className="board-side opponent-side">
        <DeckPile deckCount={game.opponent.deckCount} monsterRowFirst={false} />
        <div className="zone-grid">
          <ZoneRow label="Spell / Trap" accent="opponent" hiddenZones={game.opponent.spellTrapZones} />
          <ZoneRow
            label="Monster"
            accent="opponent"
            hiddenZones={game.opponent.monsterZones}
            attackTargets={legalAttackTargets}
            onAttack={onAttack}
          />
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
            legalPlacements={legalPlacements}
            attackTargets={legalAttackTargets}
            onSelectCard={onSelectCard}
            onPlaceCard={onPlaceCard}
            onAttack={onAttack}
            tributeSelection={tributeSelection}
            onToggleTribute={onToggleTribute}
          />
          <ZoneRow
            label="Spell / Trap"
            accent="player"
            zoneKind="spellTrap"
            cards={game.player.spellTrapZones}
            selectedCardId={game.selectedCardId}
            lastPlacedCardId={game.lastPlacedCardId}
            legalPlacements={legalPlacements}
            onSelectCard={onSelectCard}
            onPlaceCard={onPlaceCard}
            tributeSelection={null}
            onToggleTribute={onToggleTribute}
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
  placements: LegalPlacementAction[];
  onPlaceCard: (placement: LegalPlacementAction) => void;
}

function ZoneActions({ zoneKind, index, placements, onPlaceCard }: ZoneActionsProps) {
  return (
    <div className="zone-actions">
      {ZONE_ACTIONS[zoneKind]
        .map(({ action }) => placements.find((placement) => placement.intent === action))
        .filter((placement): placement is LegalPlacementAction => Boolean(placement))
        .map((placement) => (
          <button
            key={`${placement.intent}-${index}`}
            type="button"
            className="zone-action-btn"
            onClick={() => onPlaceCard(placement)}
          >
            {placementLabel(placement)}
          </button>
        ))}
    </div>
  );
}

function placementLabel(placement: LegalPlacementAction): string {
  if (placement.zoneKind === "monster" && (placement.tributeCount ?? 0) > 0) {
    return placement.intent === "set" ? "Tribute Set" : "Tribute Summon";
  }

  return (
    ZONE_ACTIONS[placement.zoneKind].find(({ action }) => action === placement.intent)?.label ??
    placement.intent
  );
}

interface ZoneRowProps {
  label: string;
  accent: "player" | "opponent";
  hiddenZones?: GameState["opponent"]["monsterZones"];
  zoneKind?: ZoneKind;
  cards?: GameState["player"]["monsterZones"];
  selectedCardId?: string | null;
  lastPlacedCardId?: string | null;
  legalPlacements?: LegalPlacementAction[];
  attackTargets?: LegalAttackTarget[];
  onSelectCard?: (cardId: string) => void;
  onPlaceCard?: (placement: LegalPlacementAction) => void;
  onAttack?: (target: LegalAttackTarget) => void;
  tributeSelection?: TributeSelectionView | null;
  onToggleTribute?: (instanceId: string) => void;
}

function ZoneRow({
  label,
  accent,
  hiddenZones,
  zoneKind,
  cards,
  selectedCardId,
  lastPlacedCardId,
  legalPlacements = [],
  attackTargets = [],
  onSelectCard,
  onPlaceCard,
  onAttack,
  tributeSelection = null,
  onToggleTribute,
}: ZoneRowProps) {
  const zones = hiddenZones ?? cards ?? [];

  return (
    <div className={`zone-row ${accent}-zones`}>
      <div className="zones">
        {zones.map((zone, index) => {
          const zoneCard = typeof zone === "object" ? zone : null;
          const isHidden = typeof zone === "boolean" && zone;
          const legalZonePlacements = zoneKind
            ? legalPlacements.filter(
                (placement) => placement.zoneKind === zoneKind && placement.zoneIndex === index,
              )
            : [];
          const hasTributePlacement = legalZonePlacements.some((placement) => (placement.tributeCount ?? 0) > 0);
          const directAttackTarget =
            accent === "player" &&
            zoneCard?.instance.instanceId === selectedCardId
              ? attackTargets.find((target) => target.target.kind === "direct")
              : undefined;
          const monsterAttackTarget =
            accent === "opponent"
              ? attackTargets.find(
                  (target) => target.target.kind === "monster" && target.target.zoneIndex === index,
                )
              : undefined;
          const showActions =
            !tributeSelection &&
            !isHidden &&
            Boolean(zoneKind) &&
            legalZonePlacements.length > 0 &&
            (!zoneCard || hasTributePlacement);
          const showAttackTarget = !tributeSelection && Boolean(monsterAttackTarget);
          const showDirectAttack = !tributeSelection && Boolean(directAttackTarget);
          const tributeSelected =
            Boolean(zoneCard) &&
            Boolean(tributeSelection?.selectedTributeIds.includes(zoneCard!.instance.instanceId));
          const tributeLocked =
            Boolean(zoneCard) &&
            Boolean(tributeSelection?.lockedTributeIds.includes(zoneCard!.instance.instanceId));
          const tributeSelectionFull =
            Boolean(tributeSelection) &&
            tributeSelection!.selectedTributeIds.length >= tributeSelection!.requiredCount;
          const tributeCandidate =
            Boolean(tributeSelection) &&
            zoneKind === "monster" &&
            Boolean(zoneCard) &&
            (!tributeSelectionFull || tributeSelected);
          const zoneClasses = [
            "duel-zone",
            zoneCard || isHidden ? "occupied" : "",
            showActions || showAttackTarget || showDirectAttack ? "action-target" : "",
            tributeCandidate ? "tribute-candidate" : "",
            tributeSelected ? "tribute-selected" : "",
            tributeLocked ? "tribute-locked" : "",
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
                  className={[
                    zoneCard.instance.instanceId === lastPlacedCardId ? "placed" : "",
                    tributeSelected ? "tribute-selected-card" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={
                    tributeCandidate || onSelectCard
                      ? () =>
                          tributeCandidate
                            ? onToggleTribute?.(zoneCard.instance.instanceId)
                            : onSelectCard?.(zoneCard.instance.instanceId)
                      : undefined
                  }
                />
              ) : isHidden ? (
                <CardView faceDown compact label="Set" />
              ) : null}

              {showActions && zoneKind && onPlaceCard ? (
                <ZoneActions
                  zoneKind={zoneKind}
                  index={index}
                  placements={legalZonePlacements}
                  onPlaceCard={onPlaceCard}
                />
              ) : null}

              {showAttackTarget && monsterAttackTarget && onAttack ? (
                <div className="zone-actions attack-actions">
                  <button
                    type="button"
                    className="zone-action-btn"
                    onClick={() => onAttack(monsterAttackTarget)}
                  >
                    Attack
                  </button>
                </div>
              ) : null}

              {showDirectAttack && directAttackTarget && onAttack ? (
                <div className="zone-actions attack-actions">
                  <button
                    type="button"
                    className="zone-action-btn"
                    onClick={() => onAttack(directAttackTarget)}
                  >
                    Direct
                  </button>
                </div>
              ) : null}

              {tributeCandidate && zoneCard ? (
                <button
                  type="button"
                  className="tribute-candidate-btn"
                  onClick={() => onToggleTribute?.(zoneCard.instance.instanceId)}
                >
                  {tributeLocked ? "Required" : tributeSelected ? "Selected" : "Tribute"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
