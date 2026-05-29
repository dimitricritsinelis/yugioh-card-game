import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import { LobbyScreen } from "../../components/LobbyScreen";
import type { CardRecord } from "../../types";
import { InMemoryGameStore, OnlineGameService } from "../server/gameService";
import type { OnlineGameView } from "../types";

const allCards = cardsJson as CardRecord[];
const store = new InMemoryGameStore();
const service = new OnlineGameService(store, {
  cards: allCards,
  seatTokenSalt: "ui-test-salt",
});
let mockSeatToken: string | undefined;

vi.mock("../../cardData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../cardData")>();
  return {
    ...actual,
    loadCards: () => Promise.resolve(allCards),
  };
});

vi.mock("../client/api", () => ({
  OnlineApiError: class OnlineApiError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  createGame: async (input: { p1Name?: string; clientId?: string }) => {
    const result = await service.createGame(input);
    mockSeatToken = result.seatToken;
    const { seatToken, ...payload } = result;
    return payload;
  },
  claimSeat: async (input: { gameIdOrCode: string; role: "P1" | "P2"; playerName: string; clientId: string }) => {
    const result = await service.claimSeat({
      ...input,
      existingSeatToken: mockSeatToken,
    });
    mockSeatToken = result.seatToken;
    return { view: result.view };
  },
  getView: (input: { gameIdOrCode: string; viewerRole: "P1" | "P2" | "spectator" }) =>
    service.getView({
      ...input,
      seatToken: input.viewerRole === "spectator" ? undefined : mockSeatToken,
    }),
  submitMove: (input: { gameId: string; role: "P1" | "P2"; expectedVersion: number; command: unknown }) =>
    service.submitMove({
      ...input,
      seatToken: mockSeatToken!,
    } as Parameters<OnlineGameService["submitMove"]>[0]),
  leaveSeat: async (input: { gameId: string; role: "P1" | "P2" }) => {
    const result = await service.leaveSeat({
      ...input,
      seatToken: mockSeatToken!,
    });
    mockSeatToken = undefined;
    return result;
  },
  heartbeat: (input: { gameId: string; role: "P1" | "P2"; clientId: string }) =>
    mockSeatToken
      ? service.heartbeat({
          ...input,
          seatToken: mockSeatToken,
        })
      : Promise.resolve({ ok: true }),
}));

vi.mock("../client/supabaseRealtime", () => ({
  subscribeToGameEvents: (options: { onStatus: (status: string) => void }) => {
    options.onStatus("connected");
    return { unsubscribe: () => {} };
  },
  handleVisibilityReconnect: (fetchLatest: () => Promise<void>) => fetchLatest(),
  shouldApplyFetchedView: (currentVersion: number, view: { version: number }) => view.version > currentVersion,
}));

afterEach(() => {
  cleanup();
  mockSeatToken = undefined;
  window.localStorage.clear();
  vi.useRealTimers();
});

async function importApp(path = "/online") {
  vi.resetModules();
  window.history.replaceState(null, "", path);
  return (await import("../../App")).default;
}

describe("online UI smoke", () => {
  it("shows host/join controls and no local seat controls on the online route", async () => {
    const App = await importApp("/online");
    render(<App />);

    expect(await screen.findByRole("button", { name: /host a duel/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /join with code/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^enter as player 1$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^enter as player 2$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^enter as spectator$/i })).toBeNull();
  });

  it("hosts an online duel and lands on the board waiting for an opponent", async () => {
    const App = await importApp();
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /host a duel/i }));

    expect(await screen.findByRole("region", { name: /goat duel test screen/i })).toBeTruthy();
    expect(screen.getByRole("region", { name: /player hand/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /override/i })).toBeNull();
    expect(await screen.findByText(/waiting for opponent/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /copy invite link/i })).toBeTruthy();
  });

  it("joins an existing duel as Player 2 from the lobby", async () => {
    const created = await service.createGame({ p1Name: "Yugi", clientId: "join-p1" });

    const App = await importApp(`/duel/${created.code}`);
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /join duel/i }));

    expect(await screen.findByRole("region", { name: /goat duel test screen/i })).toBeTruthy();
    expect(screen.getByRole("region", { name: /player hand/i })).toBeTruthy();
  });

  it("renders the host/join lobby and fires the right callbacks", () => {
    const onHost = vi.fn();
    const onPlayerName = vi.fn();

    const hostRender = render(
      <LobbyScreen
        playerName=""
        onPlayerName={onPlayerName}
        codeInput=""
        onCodeInput={() => {}}
        pending={false}
        view={null}
        message={null}
        connectionStatus="connected"
        onHost={onHost}
        onJoin={() => {}}
        onSpectate={() => {}}
        onBack={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Yugi" } });
    expect(onPlayerName).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /host a duel/i }));
    expect(onHost).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /join with code/i }));
    expect(screen.getByLabelText(/duel code/i)).toBeTruthy();
    hostRender.unmount();

    const onJoin = vi.fn();
    const onSpectate = vi.fn();
    render(
      <LobbyScreen
        playerName="Kaiba"
        onPlayerName={() => {}}
        codeInput="ABC123"
        onCodeInput={() => {}}
        pending={false}
        view={makeLobbyView()}
        message={null}
        connectionStatus="connected"
        onHost={() => {}}
        onJoin={onJoin}
        onSpectate={onSpectate}
        onBack={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /join duel/i }));
    expect(onJoin).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /^spectate$/i }));
    expect(onSpectate).toHaveBeenCalledTimes(1);
  });

  it("updates the online spectator board through fallback polling when realtime is quiet", async () => {
    const created = await service.createGame({ p1Name: "Yugi", clientId: "poll-p1" });
    const p1Token = created.seatToken!;
    await service.claimSeat({
      gameIdOrCode: created.gameId,
      role: "P2",
      playerName: "Kaiba",
      clientId: "poll-p2",
    });

    window.localStorage.setItem(
      "goat-online-session",
      JSON.stringify({
        gameId: created.gameId,
        code: created.code,
        role: "spectator",
      }),
    );

    const App = await importApp(`/duel/${created.code}`);
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^spectate$/i }));
    expect(await screen.findByRole("region", { name: /goat duel spectator view/i })).toBeTruthy();

    const p1View = await service.getView({ gameIdOrCode: created.gameId, viewerRole: "P1", seatToken: p1Token });
    const setAction = p1View.legal.placements.find((action) => action.intent === "set");
    expect(setAction).toBeDefined();

    await service.submitMove({
      gameId: created.gameId,
      role: "P1",
      seatToken: p1Token,
      expectedVersion: p1View.version,
      command: {
        type: "play-card",
        instanceId: setAction!.instanceId,
        intent: setAction!.intent,
        zoneKind: setAction!.zoneKind,
        zoneIndex: setAction!.zoneIndex,
      },
    });

    await waitFor(() => {
      expect(screen.getByText("P1 Set a card.")).toBeTruthy();
    }, { timeout: 7_000 });
  }, 10_000);
});

function makeLobbyView(): OnlineGameView {
  return {
    gameId: "game-id",
    code: "ABC123",
    realtimeTopic: "topic-abc123",
    version: 0,
    status: "waiting",
    seats: {
      P1: {
        role: "P1",
        occupied: true,
        playerName: "Yugi",
        heartbeatAt: null,
        disconnectedAt: null,
      },
      P2: {
        role: "P2",
        occupied: false,
        playerName: null,
        heartbeatAt: null,
        disconnectedAt: null,
      },
    },
    viewerRole: "spectator",
    phase: "DP",
    turn: 1,
    activePlayer: "P1",
    winner: null,
    spectator: {
      P1: {
        lp: 8000,
        deckCount: 35,
        handCount: 5,
        monsterZones: [null, null, null, null, null],
        spellTrapZones: [null, null, null, null, null],
        graveyard: [],
        banished: [],
      },
      P2: {
        lp: 8000,
        deckCount: 35,
        handCount: 5,
        monsterZones: [null, null, null, null, null],
        spellTrapZones: [null, null, null, null, null],
        graveyard: [],
        banished: [],
      },
    },
    actionLog: [],
    legal: {
      placements: [],
      attacks: [],
      activateSetCardIds: [],
      unavailableHandCardIds: [],
      canAdvance: false,
      advanceLabel: "Spectating",
      discardRequiredCount: 0,
    },
  };
}
