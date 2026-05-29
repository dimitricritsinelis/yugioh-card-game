import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { loadCards } from "./cardData";
import {
  activateSetCard,
  attackWithSelectedCard,
  answerActivePrompt,
  canEnterBattle,
  continueTurnFlow,
  createDemoGameState,
  createInitialGameState,
  findCardLocation,
  getChainView,
  getLegalAttackTargetsForCard,
  getLegalPlacementsForCard,
  getOverrideCardEntries,
  getPriorityView,
  getPromptView,
  getTurnFlowActionLabel,
  getUnavailableHandCardIds,
  isViewerActivePlayer,
  overrideCardLocation,
  passPriorityForPlayer,
  resolveCurrentChain,
  type LegalAttackTarget,
  getSelectedCardInstance,
  type LegalPlacementAction,
  placeSelectedCard,
  setLifePoints,
} from "./gameLogic";
import { ActionPanel } from "./components/ActionPanel";
import { ActionLog } from "./components/ActionLog";
import { Board } from "./components/Board";
import { CardDetail } from "./components/CardDetail";
import { Hand } from "./components/Hand";
import { HomeScreen } from "./components/HomeScreen";
import { LobbyScreen } from "./components/LobbyScreen";
import { MusicPlayer, type MusicPlayerHandle } from "./components/MusicPlayer";
import { OverridePanel } from "./components/OverridePanel";
import { PhaseHud } from "./components/PhaseHud";
import { PlayerStatusCard } from "./components/PlayerStatusCard";
import type { CardRecord, Screen, SessionState } from "./types";

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

function buildGameState(cards: CardRecord[], viewerId: "P1" | "P2" = "P1") {
  return demoScenarioActive
    ? createDemoGameState(cards)
    : createInitialGameState(cards, {
        opponentBehavior: import.meta.env.DEV && viewerId === "P1" ? "passive-board-filler" : "none",
        viewerId,
      });
}

const HAND_SIZE_LIMIT = 6;

const DEFAULT_P1_NAME = "Player 1";
const DEFAULT_P2_NAME = "Player 2";

const DEFAULT_SESSION: SessionState = {
  p1Name: "",
  p2Name: "",
  spectatorName: "",
  viewerRole: "P1",
};

const initialScreen: Screen = demoScenarioActive ? "game" : "home";

function resolveDisplayName(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? fallback : trimmed;
}

export default function App() {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [game, setGame] = useState(() => createInitialGameState([]));
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorTitle, setErrorTitle] = useState("Card bundle unavailable");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingTribute, setPendingTribute] = useState<PendingTributeSelection | null>(null);
  const [promptSelectionIds, setPromptSelectionIds] = useState<string[]>([]);
  const [discard, setDiscard] = useState<{ requiredCount: number; selectedIds: string[] } | null>(null);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [session, setSession] = useState<SessionState>(DEFAULT_SESSION);
  const [musicSlotEl, setMusicSlotEl] = useState<HTMLDivElement | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const musicRef = useRef<MusicPlayerHandle>(null);

  useEffect(() => {
    let cancelled = false;

    loadCards()
      .then((loadedCards) => {
        if (cancelled) {
          return;
        }

        setCards(loadedCards);
        try {
          setGame(buildGameState(loadedCards));
        } catch (error: unknown) {
          setErrorTitle("Duel setup unavailable");
          setErrorMessage(errorMessageFromUnknown(error));
          setLoadState("error");
          return;
        }

        setPendingTribute(null);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setErrorTitle("Card bundle unavailable");
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
  const legalAttackTargets = useMemo(
    () => getLegalAttackTargetsForCard(game, selectedLocation?.area === "monster" ? game.selectedCardId : null),
    [game, selectedLocation],
  );
  const unavailableHandCardIds = useMemo(() => getUnavailableHandCardIds(game), [game]);
  const promptView = useMemo(() => getPromptView(game), [game]);
  const priorityView = useMemo(() => getPriorityView(game), [game]);
  const chainView = useMemo(() => getChainView(game), [game]);
  const overrideEntries = useMemo(() => getOverrideCardEntries(game), [game]);

  useEffect(() => {
    setPromptSelectionIds([]);
  }, [promptView.activePrompt?.id]);

  function resetGame() {
    if (cards.length === 0) {
      return;
    }

    const viewerId = game.viewerId ?? "P1";
    try {
      setGame(buildGameState(cards, viewerId));
    } catch (error: unknown) {
      setErrorTitle("Duel setup unavailable");
      setErrorMessage(errorMessageFromUnknown(error));
      setLoadState("error");
      return;
    }

    setPendingTribute(null);
    setPromptSelectionIds([]);
    setDiscard(null);
    setOverrideOpen(false);
  }

  function startDuel(viewerId: "P1" | "P2") {
    if (cards.length === 0) {
      return;
    }

    try {
      setGame(buildGameState(cards, viewerId));
    } catch (error: unknown) {
      setErrorTitle("Duel setup unavailable");
      setErrorMessage(errorMessageFromUnknown(error));
      setLoadState("error");
      return;
    }

    setPendingTribute(null);
    setPromptSelectionIds([]);
    setDiscard(null);
    setOverrideOpen(false);
  }

  function enterGame(role: "P1" | "P2") {
    startDuel(role);
    setSession((current) => ({
      ...current,
      p1Name: resolveDisplayName(current.p1Name, DEFAULT_P1_NAME),
      p2Name: resolveDisplayName(current.p2Name, DEFAULT_P2_NAME),
      viewerRole: role,
    }));
    setScreen("game");
  }

  function enterSpectator() {
    startDuel("P1");
    setSession((current) => ({
      ...current,
      p1Name: resolveDisplayName(current.p1Name, DEFAULT_P1_NAME),
      p2Name: resolveDisplayName(current.p2Name, DEFAULT_P2_NAME),
      viewerRole: "spectator",
    }));
    setScreen("spectator");
  }

  function updateSession(changes: Partial<SessionState>) {
    setSession((current) => ({ ...current, ...changes }));
  }

  function leaveDuel() {
    setPendingTribute(null);
    setPromptSelectionIds([]);
    setDiscard(null);
    setOverrideOpen(false);
    setScreen("lobby");
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

  function handleAttack(target: LegalAttackTarget) {
    setPendingTribute(null);
    setGame((current) => attackWithSelectedCard(current, target));
  }

  function handleActivateSetCard(instanceId: string) {
    setPendingTribute(null);
    setGame((current) => activateSetCard(current, instanceId));
  }

  function togglePromptCandidate(candidateId: string) {
    const maxSelections = promptView.activePrompt?.max ?? 0;

    setPromptSelectionIds((current) => {
      if (current.includes(candidateId)) {
        return current.filter((id) => id !== candidateId);
      }

      if (maxSelections > 0 && current.length >= maxSelections) {
        return current;
      }

      return [...current, candidateId];
    });
  }

  function confirmPromptSelection() {
    if (!promptView.activePrompt) {
      return;
    }

    setGame((current) =>
      answerActivePrompt(current, {
        promptId: promptView.activePrompt!.id,
        candidateIds: promptSelectionIds,
      }),
    );
    setPromptSelectionIds([]);
  }

  function answerPromptChoice(choiceIds: string[]) {
    if (!promptView.activePrompt) {
      return;
    }

    setGame((current) =>
      answerActivePrompt(current, {
        promptId: promptView.activePrompt!.id,
        choiceIds,
      }),
    );
    setPromptSelectionIds([]);
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

    const endingTurn = getTurnFlowActionLabel(game) === "End Turn";
    const handSize = game.player.hand.length;
    if (endingTurn && handSize > HAND_SIZE_LIMIT) {
      setDiscard({ requiredCount: handSize - HAND_SIZE_LIMIT, selectedIds: [] });
      return;
    }

    setGame((current) => continueTurnFlow(current));
  }

  function toggleDiscardCard(cardId: string) {
    setDiscard((current) => {
      if (!current) {
        return current;
      }

      if (current.selectedIds.includes(cardId)) {
        return { ...current, selectedIds: current.selectedIds.filter((id) => id !== cardId) };
      }

      if (current.selectedIds.length >= current.requiredCount) {
        return current;
      }

      return { ...current, selectedIds: [...current.selectedIds, cardId] };
    });
  }

  function confirmDiscard() {
    if (!discard || discard.selectedIds.length !== discard.requiredCount) {
      return;
    }

    const idsToDiscard = discard.selectedIds;
    setGame((current) => {
      const trimmed = idsToDiscard.reduce(
        (state, instanceId) => overrideCardLocation(state, instanceId, { zone: "graveyard" }),
        current,
      );
      return continueTurnFlow(trimmed);
    });
    setDiscard(null);
  }

  function cancelDiscard() {
    setDiscard(null);
  }

  function handleOverride(instanceId: string, destination: Parameters<typeof overrideCardLocation>[2]) {
    setPendingTribute(null);
    setGame((current) => overrideCardLocation(current, instanceId, destination));
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
          <h1>{errorTitle}</h1>
          <p>{errorMessage}</p>
          {errorTitle === "Card bundle unavailable" ? (
            <p>Expected `/yugioh_cards/cards.json` to be served by Vite.</p>
          ) : null}
        </div>
      </main>
    );
  }

  const isSpectator = session.viewerRole === "spectator";
  const viewerIsP2 = session.viewerRole === "P2";
  const viewerName = viewerIsP2 ? session.p2Name : session.p1Name;
  const opponentName = viewerIsP2 ? session.p1Name : session.p2Name;
  const viewerActive = !isSpectator && isViewerActivePlayer(game);
  const advanceLabel = viewerActive
    ? getTurnFlowActionLabel(game)
    : `Waiting on ${opponentName}`;
  const duelView = (
    <main className={`screen ${isSpectator ? "spectator-screen" : ""}`}>
      <section className="duel-shell" aria-label={isSpectator ? "GOAT duel spectator view" : "GOAT duel test screen"}>
        <div className="table-column">
          <Board
            game={game}
            legalPlacements={isSpectator ? [] : legalPlacements}
            legalAttackTargets={isSpectator ? [] : legalAttackTargets}
            onSelectCard={selectCard}
            onPlaceCard={handlePlaceCard}
            onAttack={handleAttack}
            onActivateSetCard={handleActivateSetCard}
            canActivateSetCards={viewerActive}
            tributeSelection={isSpectator ? null : pendingTribute}
            onToggleTribute={toggleTributeSelection}
            onCancelTribute={() => setPendingTribute(null)}
            onConfirmTribute={confirmTributeSelection}
          />

          {isSpectator ? null : (
            <Hand
              cards={game.player.hand}
              selectedCardId={game.selectedCardId}
              lastDrawnCardId={game.lastDrawnCardId}
              unavailableCardIds={unavailableHandCardIds}
              onSelectCard={selectCard}
              onOpenOverride={() => setOverrideOpen(true)}
              discardMode={discard !== null}
              discardSelectedIds={discard?.selectedIds ?? []}
              discardRequiredCount={discard?.requiredCount ?? 0}
              onToggleDiscard={toggleDiscardCard}
              onConfirmDiscard={confirmDiscard}
              onCancelDiscard={cancelDiscard}
            />
          )}

          <div className="right-rail" aria-label="Match status">
            <PlayerStatusCard
              name={opponentName}
              lp={game.opponent.lp}
              accent="opponent"
              onEditLp={(value) => handleSetLp("opponent", value)}
              readonly={isSpectator}
            />
            <PhaseHud
              phase={game.phase}
              turn={game.turn}
              canEnterBattle={canEnterBattle(game)}
              actionLabel={advanceLabel}
              onAdvance={isSpectator ? undefined : handleAdvance}
              disabled={!viewerActive || discard !== null}
              disabledLabel={advanceLabel}
            />
            <PlayerStatusCard
              name={viewerName}
              lp={game.player.lp}
              accent="player"
              onEditLp={(value) => handleSetLp("player", value)}
              readonly={isSpectator}
            />
          </div>
        </div>

        <aside className="side-rail">
          <CardDetail selectedCard={selectedCard} />
          {!isSpectator && (
            <div className="engine-surface-stack">
              <ActionLog entries={game.actionLog} />
            </div>
          )}
          <div className="rail-footer">
            <div ref={setMusicSlotEl} className="music-rail-slot" />
            <ActionPanel onReset={isSpectator ? undefined : resetGame} onLeave={leaveDuel} />
          </div>
        </aside>

        {!isSpectator && overrideOpen ? (
          <OverridePanel
            entries={overrideEntries}
            player={game.player}
            onClose={() => setOverrideOpen(false)}
            onOverride={handleOverride}
          />
        ) : null}
      </section>
    </main>
  );

  let screenContent: ReactNode;
  if (screen === "home") {
    screenContent = (
      <HomeScreen
        onPlay={() => {
          musicRef.current?.start();
          setScreen("lobby");
        }}
      />
    );
  } else if (screen === "lobby") {
    screenContent = (
      <LobbyScreen
        session={session}
        onUpdateSession={updateSession}
        onEnterGame={enterGame}
        onEnterSpectator={enterSpectator}
        onBack={() => setScreen("home")}
      />
    );
  } else {
    screenContent = duelView;
  }

  return (
    <>
      {screenContent}
      <div className="music-launcher" data-screen={screen}>
        <MusicPlayer ref={musicRef} autoStart={false} portalTarget={musicSlotEl} />
      </div>
    </>
  );
}

function errorMessageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to prepare the duel.";
}
