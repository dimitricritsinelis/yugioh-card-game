import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, UserRound } from "lucide-react";
import { loadCards } from "./cardData";
import {
  advancePhase,
  banishSelected,
  createDemoGameState,
  createInitialGameState,
  drawCard,
  findCardLocation,
  getSelectedCardInstance,
  placeSelectedCard,
  sendSelectedToGraveyard,
  setPhase,
} from "./gameLogic";
import { ActionPanel } from "./components/ActionPanel";
import { Board } from "./components/Board";
import { CardDetail } from "./components/CardDetail";
import { Hand } from "./components/Hand";
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

  function resetGame() {
    if (cards.length === 0) {
      return;
    }

    setGame(buildGameState(cards));
  }

  function selectCard(cardId: string) {
    setGame((current) => ({
      ...current,
      selectedCardId: cardId,
      pendingAction: null,
    }));
  }

  function startAction(action: CardAction) {
    if (!selectedCard) {
      return;
    }

    const zoneKind: ZoneKind = selectedCard.card.category === "Monster" ? "monster" : "spellTrap";

    setGame((current) => ({
      ...current,
      pendingAction: {
        action,
        zoneKind,
        cardId: selectedCard.instanceId,
      },
    }));
  }

  function cancelPendingAction() {
    setGame((current) => ({
      ...current,
      pendingAction: null,
    }));
  }

  function handleZoneClick(zoneKind: ZoneKind, index: number) {
    setGame((current) => placeSelectedCard(current, zoneKind, index));
  }

  function handlePhaseSelect(phase: Phase) {
    setGame((current) => setPhase(current, phase));
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
            onSelectCard={selectCard}
            onZoneClick={handleZoneClick}
            onPhaseSelect={handlePhaseSelect}
          />

          <Hand
            cards={game.player.hand}
            selectedCardId={game.selectedCardId}
            lastDrawnCardId={game.lastDrawnCardId}
            onSelectCard={selectCard}
          />
        </div>

        <aside className="side-rail">
          <CardDetail selectedCard={selectedCard} />
          <ActionPanel
            game={game}
            selectedCard={selectedCard}
            selectedLocation={selectedLocation}
            onDraw={() => setGame((current) => drawCard(current))}
            onReset={resetGame}
            onNextPhase={() => setGame((current) => advancePhase(current))}
            onStartAction={startAction}
            onCancelAction={cancelPendingAction}
            onSendToGraveyard={() => setGame((current) => sendSelectedToGraveyard(current))}
            onBanish={() => setGame((current) => banishSelected(current))}
          />
        </aside>

        <aside className="status-rail" aria-label="Duel status">
          <PlayerStatusCard
            label="Player 2"
            eyebrow="Opponent"
            lp={game.opponent.lp}
            handCount={game.opponent.hiddenHandCount}
            accent="opponent"
          />
          <PlayerStatusCard
            label="Player 1"
            eyebrow="Player"
            lp={game.player.lp}
            handCount={game.player.hand.length}
            accent="player"
          />
        </aside>
      </section>
    </main>
  );
}

interface PlayerStatusCardProps {
  label: string;
  eyebrow: string;
  lp: number;
  handCount: number;
  accent: "player" | "opponent";
}

function PlayerStatusCard({ label, eyebrow, lp, handCount, accent }: PlayerStatusCardProps) {
  return (
    <section className={`player-status-card ${accent}-status`}>
      <div className="avatar-frame">
        <UserRound size={42} strokeWidth={1.5} />
      </div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{label}</h2>
        <strong>{lp.toLocaleString()} <span>LP</span></strong>
        <em>{handCount} cards in hand</em>
      </div>
    </section>
  );
}
