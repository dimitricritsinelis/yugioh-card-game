import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Copy } from "lucide-react";
import { loadCards } from "./cardData";
import {
  createDemoGameState,
  createInitialGameState,
  findCardLocation,
  getSelectedCardInstance,
  type LegalAttackTarget,
  type LegalPlacementAction,
} from "./gameLogic";
import { ActionPanel } from "./components/ActionPanel";
import { ActionLog } from "./components/ActionLog";
import { Board } from "./components/Board";
import { CardDetail } from "./components/CardDetail";
import { Hand } from "./components/Hand";
import { HomeScreen } from "./components/HomeScreen";
import { LobbyScreen } from "./components/LobbyScreen";
import { MusicPlayer, type MusicPlayerHandle } from "./components/MusicPlayer";
import { HandStatusCard } from "./components/HandStatusCard";
import { PhaseHud } from "./components/PhaseHud";
import { PlayerStatusCard } from "./components/PlayerStatusCard";
import { useOnlineGame } from "./online/client/useOnlineGame";
import type { OnlineCommand } from "./online/types";
import type { CardRecord, Screen } from "./types";

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

// The local `game` state only ever backs the dev `?scenario=demo` board; live
// play always flows through the online view.
function buildGameState(cards: CardRecord[]) {
  return demoScenarioActive ? createDemoGameState(cards) : createInitialGameState(cards);
}

const HAND_SIZE_LIMIT = 6;

const DEFAULT_P1_NAME = "Player 1";
const DEFAULT_P2_NAME = "Player 2";

const initialOnlineCode = initialCodeFromPath();
const initialScreen: Screen = demoScenarioActive
  ? "game"
  : initialOnlineCode || window.location.pathname === "/online"
    ? "lobby"
    : "home";

function resolveDisplayName(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? fallback : trimmed;
}

export default function App() {
  const [game, setGame] = useState(() => createInitialGameState([]));
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorTitle, setErrorTitle] = useState("Card bundle unavailable");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingTribute, setPendingTribute] = useState<PendingTributeSelection | null>(null);
  const [discard, setDiscard] = useState<{ requiredCount: number; selectedIds: string[] } | null>(null);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [playerName, setPlayerName] = useState("");
  const [musicSlotEl, setMusicSlotEl] = useState<HTMLDivElement | null>(null);
  const [onlineCodeInput, setOnlineCodeInput] = useState(initialOnlineCode ?? "");
  const [onlineSelectedCardId, setOnlineSelectedCardId] = useState<string | null>(null);
  const musicRef = useRef<MusicPlayerHandle>(null);
  const online = useOnlineGame(true, initialOnlineCode);
  const initialOnlineJoinAttempted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    loadCards()
      .then((loadedCards) => {
        if (cancelled) {
          return;
        }

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

  // A shared `/duel/:code` link peeks the game so the lobby can offer the open seat.
  useEffect(() => {
    if (!initialOnlineCode || initialOnlineJoinAttempted.current) {
      return;
    }

    initialOnlineJoinAttempted.current = true;
    void online.joinAsSpectator(initialOnlineCode).catch(() => undefined);
  }, [online, initialOnlineCode]);

  const onlineProjectedGame = useMemo(
    () =>
      online.gameState
        ? {
            ...online.gameState,
            selectedCardId: onlineSelectedCardId,
          }
        : null,
    [online.gameState, onlineSelectedCardId],
  );
  const onlineMode = Boolean(online.view && onlineProjectedGame && (screen === "game" || screen === "spectator"));
  const renderedGame = onlineMode && onlineProjectedGame ? onlineProjectedGame : game;

  const selectedCard = useMemo(() => getSelectedCardInstance(renderedGame), [renderedGame]);
  const selectedLocation = useMemo(() => {
    if (!renderedGame.selectedCardId) {
      return null;
    }

    return findCardLocation(renderedGame.player, renderedGame.selectedCardId);
  }, [renderedGame.player, renderedGame.selectedCardId]);

  const legalPlacements = useMemo(() => {
    if (!onlineMode) {
      return [];
    }

    const selectedHandCardId = selectedLocation?.area === "hand" ? renderedGame.selectedCardId : null;
    return selectedHandCardId
      ? [...(online.view?.legal.placements ?? [])].filter(
          (placement) => placement.instanceId === selectedHandCardId,
        )
      : [];
  }, [online.view?.legal.placements, onlineMode, renderedGame, selectedLocation]);
  const legalAttackTargets = useMemo(() => {
    if (!onlineMode) {
      return [];
    }

    const selectedAttackerId = selectedLocation?.area === "monster" ? renderedGame.selectedCardId : null;
    return selectedAttackerId
      ? [...(online.view?.legal.attacks ?? [])].filter(
          (target) => target.attackerInstanceId === selectedAttackerId,
        )
      : [];
  }, [online.view?.legal.attacks, onlineMode, renderedGame, selectedLocation]);
  const unavailableHandCardIds = useMemo(
    () => (onlineMode ? [...(online.view?.legal.unavailableHandCardIds ?? [])] : []),
    [online.view?.legal.unavailableHandCardIds, onlineMode],
  );

  async function submitOnlineCommand(command: OnlineCommand) {
    try {
      await online.submitOnlineCommand(command);
      setOnlineSelectedCardId(null);
      setPendingTribute(null);
    } catch {
      // The hook owns the visible online error message.
    }
  }

  function leaveDuel() {
    void online.leaveOnlineSeat().catch(() => undefined);
    setPendingTribute(null);
    setDiscard(null);
    setOnlineSelectedCardId(null);
    setScreen("lobby");
  }

  function selectCard(cardId: string) {
    // Clicking the already-selected card again deselects it ("unclick").
    setPendingTribute(null);
    setOnlineSelectedCardId((current) => (current === cardId ? null : cardId));
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
    void submitOnlineCommand({
      type: "play-card",
      instanceId: placement.instanceId,
      intent: placement.intent,
      zoneKind: placement.zoneKind,
      zoneIndex: placement.zoneIndex,
    });
  }

  function handleAttack(target: LegalAttackTarget) {
    setPendingTribute(null);
    void submitOnlineCommand({
      type: "attack",
      attackerInstanceId: target.attackerInstanceId,
      target:
        target.target.kind === "direct"
          ? { kind: "direct" }
          : { kind: "monster-zone", zoneIndex: target.target.zoneIndex },
    });
  }

  function handleActivateSetCard(instanceId: string) {
    setPendingTribute(null);
    void submitOnlineCommand({
      type: "activate-set-card",
      instanceId,
    });
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
    void submitOnlineCommand({
      type: "play-card",
      instanceId: placement.instanceId,
      intent: placement.intent,
      zoneKind: placement.zoneKind,
      zoneIndex: placement.zoneIndex,
      tributeInstanceIds: selectedTributeIds,
    });
    setPendingTribute(null);
  }

  function handleAdvance() {
    setPendingTribute(null);

    const endingTurn = online.view?.legal.advanceLabel === "End Turn";
    const handSize = renderedGame.player.hand.length;
    if (endingTurn && handSize > HAND_SIZE_LIMIT) {
      setDiscard({ requiredCount: handSize - HAND_SIZE_LIMIT, selectedIds: [] });
      return;
    }

    void submitOnlineCommand({ type: "advance-turn-flow" });
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

    void submitOnlineCommand({ type: "discard-and-advance", discardInstanceIds: discard.selectedIds });
    setDiscard(null);
  }

  function cancelDiscard() {
    setDiscard(null);
  }

  async function hostDuel() {
    const name = resolveDisplayName(playerName, DEFAULT_P1_NAME);
    try {
      await online.createOnlineDuel(name);
      setOnlineSelectedCardId(null);
      setScreen("game");
    } catch {
      // The hook exposes the visible online error.
    }
  }

  async function joinDuel() {
    const code = onlineCodeInput.trim();
    if (!code) {
      return;
    }

    const name = resolveDisplayName(playerName, DEFAULT_P2_NAME);
    // The host always takes P1, so the joiner takes P2 — unless a peeked view
    // shows P1 is the only open seat.
    const role: "P1" | "P2" =
      online.view && !online.view.seats.P1.occupied && online.view.seats.P2.occupied ? "P1" : "P2";
    try {
      await online.claimOnlineSeat(role, name, online.view?.gameId ?? code);
      setOnlineSelectedCardId(null);
      setScreen("game");
    } catch {
      // The hook exposes the visible online error.
    }
  }

  async function spectateDuel() {
    const code = onlineCodeInput.trim();
    try {
      if (!online.view && code) {
        await online.joinAsSpectator(code);
      }

      if (online.view || code) {
        setOnlineSelectedCardId(null);
        setScreen("spectator");
      }
    } catch {
      // The hook exposes the visible online error.
    }
  }

  function copyShareLink() {
    const code = online.view?.code;
    if (!code) {
      return;
    }

    void navigator.clipboard?.writeText(`${window.location.origin}/duel/${code}`).catch(() => undefined);
  }

  if (loadState === "loading") {
    return (
      <main className="screen shell-state">
        <div className="stone-panel status-panel">
          <div className="loader-mark" />
          <h1>Loading GOAT card pool</h1>
          <p>Preparing the online duel terminal.</p>
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

  const isSpectator = onlineMode ? online.view?.viewerRole === "spectator" : false;
  const viewerIsP2 = onlineMode ? online.view?.viewerId === "P2" : false;
  const viewerName = onlineMode ? onlineDisplayName(online.view, viewerIsP2 ? "P2" : "P1") : DEFAULT_P1_NAME;
  const opponentName = onlineMode ? onlineDisplayName(online.view, viewerIsP2 ? "P1" : "P2") : DEFAULT_P2_NAME;
  const viewerActive = onlineMode
    ? Boolean(
        online.view?.viewerId &&
          online.view.activePlayer === online.view.viewerId &&
          !online.view.winner &&
          !online.pending,
      )
    : false;
  const advanceLabel = onlineMode
    ? isSpectator
      ? "Spectating"
      : online.view?.legal.advanceLabel ?? "Waiting"
    : "Main Phase";
  const canAdvance = onlineMode ? Boolean(online.view?.legal.canAdvance && !online.pending) : false;
  const canEnterBattlePhase = onlineMode ? online.view?.legal.advanceLabel === "Battle Phase" : false;
  const waitingForOpponent = onlineMode && !isSpectator && online.view?.status === "waiting";
  const duelView = (
    <main className={`screen ${isSpectator ? "spectator-screen" : ""}`}>
      <section className="duel-shell" aria-label={isSpectator ? "GOAT duel spectator view" : "GOAT duel test screen"}>
        {onlineMode ? (
          <div className={`online-game-status online-game-status-${online.connectionStatus}`} role="status">
            <span>{online.connectionStatus}</span>
            {online.message ? <strong>{online.message}</strong> : null}
          </div>
        ) : null}
        <div className="table-column">
          <Board
            game={renderedGame}
            legalPlacements={isSpectator || online.pending ? [] : legalPlacements}
            legalAttackTargets={isSpectator || online.pending ? [] : legalAttackTargets}
            onSelectCard={selectCard}
            onPlaceCard={handlePlaceCard}
            onAttack={handleAttack}
            onActivateSetCard={handleActivateSetCard}
            canActivateSetCards={viewerActive && !online.pending}
            tributeSelection={isSpectator ? null : pendingTribute}
            onToggleTribute={toggleTributeSelection}
            onCancelTribute={() => setPendingTribute(null)}
            onConfirmTribute={confirmTributeSelection}
          />

          {isSpectator ? null : (
            <Hand
              cards={renderedGame.player.hand}
              selectedCardId={renderedGame.selectedCardId}
              lastDrawnCardId={renderedGame.lastDrawnCardId}
              unavailableCardIds={unavailableHandCardIds}
              handCount={renderedGame.player.hand.length}
              handLimit={HAND_SIZE_LIMIT}
              onSelectCard={selectCard}
              discardMode={discard !== null}
              discardSelectedIds={discard?.selectedIds ?? []}
              onToggleDiscard={toggleDiscardCard}
            />
          )}

          <div className="right-rail" aria-label="Match status">
            <PlayerStatusCard name={opponentName} lp={renderedGame.opponent.lp} accent="opponent" readonly />
            <PhaseHud
              phase={renderedGame.phase}
              turn={renderedGame.turn}
              canEnterBattle={canEnterBattlePhase}
              actionLabel={advanceLabel}
              onAdvance={isSpectator ? undefined : handleAdvance}
              disabled={!canAdvance || discard !== null}
              disabledLabel={advanceLabel}
            />
            {!isSpectator && discard !== null ? (
              <HandStatusCard
                handCount={renderedGame.player.hand.length}
                handLimit={HAND_SIZE_LIMIT}
                discard={discard}
                onConfirmDiscard={confirmDiscard}
                onCancelDiscard={cancelDiscard}
              />
            ) : null}
            <PlayerStatusCard name={viewerName} lp={renderedGame.player.lp} accent="player" readonly />
          </div>

          {waitingForOpponent ? (
            <div className="waiting-overlay" role="status">
              <div className="waiting-overlay-card">
                <span className="loader-mark" aria-hidden="true" />
                <p className="waiting-overlay-title">Waiting for opponent…</p>
                <p className="waiting-overlay-sub">Share this code to invite a player.</p>
                <div className="online-code-card waiting-overlay-code">
                  <span>Code</span>
                  <strong>{online.view?.code}</strong>
                </div>
                <button type="button" className="lobby-cta waiting-overlay-copy" onClick={copyShareLink}>
                  <Copy size={15} />
                  Copy invite link
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="side-rail">
          <CardDetail selectedCard={selectedCard} />
          <div className="engine-surface-stack">
            <ActionLog entries={renderedGame.actionLog} />
          </div>
          <div className="rail-footer">
            <div ref={setMusicSlotEl} className="music-rail-slot" />
            <ActionPanel onLeave={leaveDuel} />
          </div>
        </aside>
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
        playerName={playerName}
        onPlayerName={setPlayerName}
        codeInput={onlineCodeInput}
        onCodeInput={setOnlineCodeInput}
        pending={online.pending}
        view={online.view}
        message={online.message}
        connectionStatus={online.connectionStatus}
        onHost={hostDuel}
        onJoin={joinDuel}
        onSpectate={spectateDuel}
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

function initialCodeFromPath(): string | null {
  const match = /^\/duel\/([^/?#]+)/.exec(window.location.pathname);
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}

function onlineDisplayName(
  view: ReturnType<typeof useOnlineGame>["view"],
  role: "P1" | "P2",
): string {
  return view?.seats[role].playerName ?? (role === "P1" ? DEFAULT_P1_NAME : DEFAULT_P2_NAME);
}
