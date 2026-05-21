import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { loadCards } from "./cardData";
import {
  advancePhase,
  banishSelected,
  createDemoGameState,
  createInitialGameState,
  endTurn,
  findCardLocation,
  getSelectedCardInstance,
  placeSelectedCard,
  sendSelectedToGraveyard,
  setLifePoints,
  setPhase,
} from "./gameLogic";
import { ActionPanel } from "./components/ActionPanel";
import { Board } from "./components/Board";
import { CardDetail } from "./components/CardDetail";
import { Hand } from "./components/Hand";
import { PhaseHud } from "./components/PhaseHud";
import { PlayerStatusCard } from "./components/PlayerStatusCard";
import type { CardAction, CardRecord, Phase, ZoneKind } from "./types";

// Dev-only: `?scenario=demo` boots a fully populated board for visual testing.
// `import.meta.env.DEV` is false in production builds, so this never ships.
const demoScenarioActive =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get("scenario") === "demo";

function buildGameState(cards: CardRecord[]) {
  return demoScenarioActive ? createDemoGameState(cards) : createInitialGameState(cards);
}

export default function App() {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [game, setGame] = useState(() => createInitialGameState([]));
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    loadCards()
      .then((loadedCards) => {
        if (cancelled) {
          return;
        }

        setCards(loadedCards);
        setGame(buildGameState(loadedCards));
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

  // A hand card can be played; its category decides which zone row lights up.
  const placeableKind: ZoneKind | null = useMemo(() => {
    if (!selectedCard || selectedLocation?.area !== "hand") {
      return null;
    }

    return selectedCard.card.category === "Monster" ? "monster" : "spellTrap";
  }, [selectedCard, selectedLocation]);

  function resetGame() {
    if (cards.length === 0) {
      return;
    }

    setGame(buildGameState(cards));
  }

  function selectCard(cardId: string) {
    // Clicking the already-selected card again deselects it ("unclick").
    setGame((current) => ({
      ...current,
      selectedCardId: current.selectedCardId === cardId ? null : cardId,
    }));
  }

  function handlePlaceCard(action: CardAction, zoneKind: ZoneKind, index: number) {
    setGame((current) => placeSelectedCard(current, action, zoneKind, index));
  }

  function handlePhaseSelect(phase: Phase) {
    setGame((current) => setPhase(current, phase));
  }

  function handleAdvance() {
    setGame((current) => (current.phase === "EP" ? endTurn(current) : advancePhase(current)));
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
            placeableKind={placeableKind}
            onSelectCard={selectCard}
            onPlaceCard={handlePlaceCard}
          />

          <Hand
            cards={game.player.hand}
            selectedCardId={game.selectedCardId}
            lastDrawnCardId={game.lastDrawnCardId}
            onSelectCard={selectCard}
            onSendToGraveyard={() => setGame((current) => sendSelectedToGraveyard(current))}
            onBanish={() => setGame((current) => banishSelected(current))}
          />
        </div>

        <aside className="side-rail">
          <CardDetail selectedCard={selectedCard} />
          <ActionPanel onReset={resetGame} />
        </aside>

        <aside className="status-rail" aria-label="Duel status">
          <PlayerStatusCard
            name="Player 2"
            lp={game.opponent.lp}
            accent="opponent"
            onEditLp={(value) => handleSetLp("opponent", value)}
          />
          <PhaseHud
            phase={game.phase}
            turn={game.turn}
            onSelectPhase={handlePhaseSelect}
            onAdvance={handleAdvance}
          />
          <PlayerStatusCard
            name="Player 1"
            lp={game.player.lp}
            accent="player"
            onEditLp={(value) => handleSetLp("player", value)}
          />
        </aside>
      </section>
    </main>
  );
}
