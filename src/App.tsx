import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { loadCards } from "./cardData";
import {
  banishSelected,
  canEnterBattle,
  continueTurnFlow,
  createDemoGameState,
  createInitialGameState,
  findCardLocation,
  getLegalPlacementsForCard,
  getTurnFlowActionLabel,
  getUnavailableHandCardIds,
  getSelectedCardInstance,
  type LegalPlacementAction,
  placeSelectedCard,
  sendSelectedToGraveyard,
  setLifePoints,
} from "./gameLogic";
import { ActionPanel } from "./components/ActionPanel";
import { Board } from "./components/Board";
import { CardDetail } from "./components/CardDetail";
import { Hand } from "./components/Hand";
import { MusicPlayer } from "./components/MusicPlayer";
import { PhaseHud } from "./components/PhaseHud";
import { PlayerStatusCard } from "./components/PlayerStatusCard";
import type { CardRecord } from "./types";

// Dev-only: `?scenario=demo` boots a fully populated board for visual testing.
// `import.meta.env.DEV` is false in production builds, so this never ships.
const demoScenarioActive =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get("scenario") === "demo";

interface PendingTributeSelection {
  placement: LegalPlacementAction;
  requiredCount: number;
  selectedTributeIds: string[];
  lockedTributeIds: string[];
}

function buildGameState(cards: CardRecord[]) {
  return demoScenarioActive
    ? createDemoGameState(cards)
    : createInitialGameState(cards, {
        opponentBehavior: import.meta.env.DEV ? "passive-board-filler" : "none",
      });
}

export default function App() {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [game, setGame] = useState(() => createInitialGameState([]));
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingTribute, setPendingTribute] = useState<PendingTributeSelection | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadCards()
      .then((loadedCards) => {
        if (cancelled) {
          return;
        }

        setCards(loadedCards);
        setGame(buildGameState(loadedCards));
        setPendingTribute(null);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load card bundle.");
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCard = useMemo(() => getSelectedCardInstance(game), [game]);
  const selectedLocation = useMemo(() => {
    if (!game.selectedCardId) {
      return null;
    }

    return findCardLocation(game.player, game.selectedCardId);
  }, [game.player, game.selectedCardId]);

  const legalPlacements = useMemo(
    () => getLegalPlacementsForCard(game, selectedLocation?.area === "hand" ? game.selectedCardId : null),
    [game, selectedLocation],
  );
  const unavailableHandCardIds = useMemo(() => getUnavailableHandCardIds(game), [game]);

  function resetGame() {
    if (cards.length === 0) {
      return;
    }

    setGame(buildGameState(cards));
    setPendingTribute(null);
  }

  function selectCard(cardId: string) {
    // Clicking the already-selected card again deselects it ("unclick").
    setPendingTribute(null);
    setGame((current) => ({
      ...current,
      selectedCardId: current.selectedCardId === cardId ? null : cardId,
    }));
  }

  function handlePlaceCard(placement: LegalPlacementAction) {
    const requiredCount = placement.tributeCount ?? 0;

    if (requiredCount > 0) {
      const lockedTributeIds = placement.requiredTributeInstanceIds ?? [];

      setPendingTribute({
        placement,
        requiredCount,
        selectedTributeIds: lockedTributeIds,
        lockedTributeIds,
      });
      return;
    }

    setPendingTribute(null);
    setGame((current) => placeSelectedCard(current, placement.intent, placement.zoneKind, placement.zoneIndex));
  }

  function toggleTributeSelection(instanceId: string) {
    setPendingTribute((current) => {
      if (!current || current.lockedTributeIds.includes(instanceId)) {
        return current;
      }

      const alreadySelected = current.selectedTributeIds.includes(instanceId);
      const selectedTributeIds = alreadySelected
        ? current.selectedTributeIds.filter((id) => id !== instanceId)
        : current.selectedTributeIds.length < current.requiredCount
          ? [...current.selectedTributeIds, instanceId]
          : current.selectedTributeIds;

      return {
        ...current,
        selectedTributeIds,
      };
    });
  }

  function confirmTributeSelection() {
    if (!pendingTribute || pendingTribute.selectedTributeIds.length !== pendingTribute.requiredCount) {
      return;
    }

    const { placement, selectedTributeIds } = pendingTribute;

    setGame((current) =>
      placeSelectedCard(
        { ...current, selectedCardId: placement.instanceId },
        placement.intent,
        placement.zoneKind,
        placement.zoneIndex,
        selectedTributeIds,
      ),
    );
    setPendingTribute(null);
  }

  function handleAdvance() {
    setPendingTribute(null);
    setGame((current) => continueTurnFlow(current));
  }

  function handleSetLp(side: "player" | "opponent", value: number) {
    setGame((current) => setLifePoints(current, side, value));
  }

  if (loadState === "loading") {
    return (
      <main className="screen shell-state">
        <div className="stone-panel status-panel">
          <div className="loader-mark" />
          <h1>Loading GOAT card pool</h1>
          <p>Preparing the local duel terminal.</p>
        </div>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="screen shell-state">
        <div className="stone-panel status-panel error">
          <AlertTriangle size={32} />
          <h1>Card bundle unavailable</h1>
          <p>{errorMessage}</p>
          <p>Expected `/yugioh_cards/cards.json` to be served by Vite.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <section className="duel-shell" aria-label="GOAT duel test screen">
        <div className="table-column">
          <Board
            game={game}
            legalPlacements={legalPlacements}
            onSelectCard={selectCard}
            onPlaceCard={handlePlaceCard}
            tributeSelection={pendingTribute}
            onToggleTribute={toggleTributeSelection}
            onCancelTribute={() => setPendingTribute(null)}
            onConfirmTribute={confirmTributeSelection}
          />

          <Hand
            cards={game.player.hand}
            selectedCardId={game.selectedCardId}
            lastDrawnCardId={game.lastDrawnCardId}
            unavailableCardIds={unavailableHandCardIds}
            onSelectCard={selectCard}
            onSendToGraveyard={() => setGame((current) => sendSelectedToGraveyard(current))}
            onBanish={() => setGame((current) => banishSelected(current))}
          />

          <div className="right-rail" aria-label="Match status">
            <PlayerStatusCard
              name="Player 2"
              lp={game.opponent.lp}
              accent="opponent"
              onEditLp={(value) => handleSetLp("opponent", value)}
            />
            <PhaseHud
              phase={game.phase}
              turn={game.turn}
              canEnterBattle={canEnterBattle(game)}
              actionLabel={getTurnFlowActionLabel(game)}
              onAdvance={handleAdvance}
            />
            <PlayerStatusCard
              name="Player 1"
              lp={game.player.lp}
              accent="player"
              onEditLp={(value) => handleSetLp("player", value)}
            />
          </div>
        </div>

        <aside className="side-rail">
          <CardDetail selectedCard={selectedCard} />
          <div className="rail-footer">
            <MusicPlayer />
            <ActionPanel onReset={resetGame} />
          </div>
        </aside>
      </section>
    </main>
  );
}
