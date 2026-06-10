import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameState, PlayerState } from "../../types";
import type { PlayerId } from "../../engine";
import {
  claimSeat,
  createGame,
  getView,
  heartbeat,
  leaveSeat,
  OnlineApiError,
  submitMove,
} from "./api";
import {
  handleVisibilityReconnect,
  shouldApplyFetchedView,
  subscribeToGameEvents,
} from "./supabaseRealtime";
import type {
  OnlineBoardZone,
  OnlineCommand,
  OnlineConnectionStatus,
  OnlineGameView,
  OnlineViewerRole,
} from "../types";

const CLIENT_ID_KEY = "goat-online-client-id";
const SESSION_KEY = "goat-online-session";
export const FALLBACK_POLL_MS = 5_000;

interface StoredOnlineSession {
  readonly gameId: string;
  readonly code: string;
  readonly role: OnlineViewerRole;
}

export interface UseOnlineGameResult {
  readonly enabled: boolean;
  readonly view: OnlineGameView | null;
  readonly gameState: GameState | null;
  readonly connectionStatus: OnlineConnectionStatus;
  readonly pending: boolean;
  readonly message: string | null;
  readonly clientId: string;
  readonly createOnlineDuel: (p1Name?: string) => Promise<void>;
  readonly joinAsSpectator: (gameIdOrCode: string) => Promise<void>;
  readonly claimOnlineSeat: (role: PlayerId, playerName: string, gameIdOrCode?: string) => Promise<void>;
  readonly submitOnlineCommand: (command: OnlineCommand) => Promise<void>;
  readonly refreshOnlineView: () => Promise<void>;
  readonly leaveOnlineSeat: () => Promise<void>;
  readonly clearOnlineMessage: () => void;
}

export function useOnlineGame(enabled: boolean, preferredCode: string | null = null): UseOnlineGameResult {
  const [view, setView] = useState<OnlineGameView | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<OnlineConnectionStatus>("stale");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const viewRef = useRef<OnlineGameView | null>(null);
  const sessionRef = useRef<StoredOnlineSession | null>(readStoredSession(preferredCode));
  const clientId = useMemo(() => getOrCreateClientId(), []);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const applyView = useCallback((nextView: OnlineGameView) => {
    setView(nextView);
    setConnectionStatus("connected");
    sessionRef.current = {
      gameId: nextView.gameId,
      code: nextView.code,
      role: nextView.viewerRole,
    };
    writeStoredSession(sessionRef.current);
  }, []);

  const fetchAndApplyView = useCallback(async (options: { readonly onlyIfNewer?: boolean } = {}) => {
    const session = sessionRef.current;
    if (!enabled || !session) {
      return;
    }

    const nextView = await getView({
      gameIdOrCode: session.role === "spectator" ? session.code : session.gameId,
      viewerRole: session.role,
    });
    const currentVersion = viewRef.current?.version ?? -1;
    if (!options.onlyIfNewer || shouldApplyFetchedView(currentVersion, nextView)) {
      applyView(nextView);
      return;
    }

    setConnectionStatus("connected");
  }, [applyView, enabled]);

  const refreshOnlineView = useCallback(
    () => fetchAndApplyView(),
    [fetchAndApplyView],
  );

  const refreshOnlineViewIfNewer = useCallback(
    () => fetchAndApplyView({ onlyIfNewer: true }),
    [fetchAndApplyView],
  );

  useEffect(() => {
    if (!enabled || view) {
      return;
    }

    const session = sessionRef.current;
    if (!session) {
      return;
    }

    void refreshOnlineView().catch(() => {
      clearStoredSession();
      sessionRef.current = null;
    });
  }, [enabled, refreshOnlineView, view]);

  useEffect(() => {
    if (!enabled || !view) {
      return;
    }

    const subscription = subscribeToGameEvents({
      realtimeTopic: view.realtimeTopic,
      getCurrentVersion: () => viewRef.current?.version ?? 0,
      onStatus: setConnectionStatus,
      fetchLatest: refreshOnlineView,
    });

    return () => subscription.unsubscribe();
  }, [enabled, refreshOnlineView, view?.gameId, view?.realtimeTopic]);

  useEffect(() => {
    if (!enabled || !view) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void refreshOnlineViewIfNewer().catch(() => setConnectionStatus("reconnecting"));
    }, FALLBACK_POLL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, refreshOnlineViewIfNewer, view?.gameId]);

  useEffect(() => {
    if (!enabled || !view) {
      return;
    }

    const onVisibilityChange = () => {
      void handleVisibilityReconnect(refreshOnlineView);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled, refreshOnlineView, view]);

  useEffect(() => {
    if (!enabled || !view?.viewerId) {
      return;
    }

    const tick = () => {
      const current = viewRef.current;
      const session = sessionRef.current;
      if (!current?.viewerId || !session) {
        return;
      }

      void heartbeat({
        gameId: current.gameId,
        role: current.viewerId,
        clientId,
      }).catch(() => setConnectionStatus("reconnecting"));
    };

    tick();
    const timer = window.setInterval(tick, 20_000);
    return () => window.clearInterval(timer);
  }, [clientId, enabled, view?.gameId, view?.viewerId]);

  const createOnlineDuel = useCallback(
    async (p1Name?: string) => {
      setPending(true);
      setMessage(null);
      try {
        const response = await createGame({ p1Name, clientId });
        if (response.view) {
          applyView(response.view);
        } else {
          const nextView = await getView({ gameIdOrCode: response.gameId, viewerRole: "spectator" });
          applyView(nextView);
        }
      } catch (error) {
        setMessage(errorMessage(error));
        throw error;
      } finally {
        setPending(false);
      }
    },
    [applyView, clientId],
  );

  const joinAsSpectator = useCallback(
    async (gameIdOrCode: string) => {
      setPending(true);
      setMessage(null);
      try {
        const nextView = await getView({ gameIdOrCode, viewerRole: "spectator" });
        applyView(nextView);
      } catch (error) {
        setMessage(errorMessage(error));
        throw error;
      } finally {
        setPending(false);
      }
    },
    [applyView],
  );

  const claimOnlineSeat = useCallback(
    async (role: PlayerId, playerName: string, gameIdOrCode?: string) => {
      const target = gameIdOrCode || viewRef.current?.gameId || viewRef.current?.code;
      if (!target) {
        setMessage("Create or join a duel before claiming a seat.");
        return;
      }

      setPending(true);
      setMessage(null);
      try {
        const response = await claimSeat({
          gameIdOrCode: target,
          role,
          playerName,
          clientId,
        });
        applyView(response.view);
      } catch (error) {
        setMessage(errorMessage(error));
        throw error;
      } finally {
        setPending(false);
      }
    },
    [applyView, clientId],
  );

  const submitOnlineCommand = useCallback(async (command: OnlineCommand) => {
    const current = viewRef.current;
    const session = sessionRef.current;
    if (!current?.viewerId || !session) {
      setMessage("Only claimed players can submit moves.");
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const nextView = await submitMove({
        gameId: current.gameId,
        role: current.viewerId,
        expectedVersion: current.version,
        command,
      });
      applyView(nextView);
    } catch (error) {
      if (error instanceof OnlineApiError && error.status === 409) {
        setConnectionStatus("conflict");
        setMessage("Game updated, retry your move.");
        await refreshOnlineView().catch(() => undefined);
        return;
      }

      setMessage(errorMessage(error));
      throw error;
    } finally {
      setPending(false);
    }
  }, [applyView, refreshOnlineView]);

  const leaveOnlineSeat = useCallback(async () => {
    const current = viewRef.current;
    const session = sessionRef.current;

    if (!current?.viewerId || !session) {
      setView(null);
      clearStoredSession();
      sessionRef.current = null;
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const response = await leaveSeat({
        gameId: current.gameId,
        role: current.viewerId,
      });
      applyView(response.view);
    } catch (error) {
      setMessage(errorMessage(error));
      throw error;
    } finally {
      setPending(false);
    }
  }, [applyView]);

  const gameState = useMemo(() => (view ? onlineViewToGameState(view) : null), [view]);

  return {
    enabled,
    view,
    gameState,
    connectionStatus,
    pending,
    message,
    clientId,
    createOnlineDuel,
    joinAsSpectator,
    claimOnlineSeat,
    submitOnlineCommand,
    refreshOnlineView,
    leaveOnlineSeat,
    clearOnlineMessage: () => setMessage(null),
  };
}

export function onlineViewToGameState(view: OnlineGameView): GameState {
  if (view.viewerId && view.player && view.opponent) {
    return {
      player: view.player,
      opponent: view.opponent,
      phase: view.phase,
      turn: view.turn,
      selectedCardId: null,
      actionLog: [...view.actionLog],
      lastDrawnCardId: null,
      lastPlacedCardId: null,
      viewerId: view.viewerId,
      playerDeckCount: view.playerDeckCount ?? view.player.deck.length,
    };
  }

  const spectator = view.spectator;
  const p1 = spectator?.P1;
  const p2 = spectator?.P2;

  return {
    player: {
      lp: p1?.lp ?? 8000,
      deck: [],
      hand: [],
      monsterZones: [...(p1?.monsterZones ?? emptyPublicZones())] as PlayerState["monsterZones"],
      spellTrapZones: [...(p1?.spellTrapZones ?? emptyPublicZones())] as PlayerState["spellTrapZones"],
      graveyard: [...(p1?.graveyard ?? [])],
      banished: [...(p1?.banished ?? [])],
    },
    opponent: {
      lp: p2?.lp ?? 8000,
      monsterZones: [...(p2?.monsterZones ?? emptyPublicZones())],
      spellTrapZones: [...(p2?.spellTrapZones ?? emptyPublicZones())],
      deckCount: p2?.deckCount ?? 0,
      graveyardCount: p2?.graveyard.length ?? 0,
      banishedCount: p2?.banished.length ?? 0,
    },
    phase: view.phase,
    turn: view.turn,
    selectedCardId: null,
    actionLog: [...view.actionLog],
    lastDrawnCardId: null,
    lastPlacedCardId: null,
    playerDeckCount: p1?.deckCount ?? 0,
  };
}

function emptyPublicZones(): OnlineBoardZone[] {
  return [null, null, null, null, null];
}

function getOrCreateClientId(): string {
  const existing = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

function readStoredSession(preferredCode: string | null = null): StoredOnlineSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredOnlineSession>;
    if (!parsed.gameId || !parsed.code || !parsed.role) {
      return null;
    }

    const session = parsed as StoredOnlineSession;
    if (preferredCode && session.code !== preferredCode) {
      clearStoredSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredOnlineSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearStoredSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Online request failed.";
}
