import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { InMemoryGameStore, OnlineGameService } from "../server/gameService";
import { toPublicMovePayload } from "../redaction";
import type { OnlineCommand } from "../types";

const cards = cardsJson as CardRecord[];

function makeService() {
  const store = new InMemoryGameStore();
  const service = new OnlineGameService(store, {
    cards,
    seatTokenSalt: "test-seat-token-salt",
  });

  return { service, store };
}

async function createClaimedGame() {
  const { service, store } = makeService();
  const created = await service.createGame({ p1Name: "Yugi", clientId: "client-p1" });
  const p1Token = created.seatToken!;
  const p2 = await service.claimSeat({
    gameIdOrCode: created.gameId,
    role: "P2",
    playerName: "Kaiba",
    clientId: "client-p2",
  });
  const p1View = await service.getView({ gameIdOrCode: created.gameId, viewerRole: "P1", seatToken: p1Token });

  return {
    service,
    store,
    gameId: created.gameId,
    code: created.code,
    p1Token,
    p2Token: p2.seatToken,
    p1View,
    p2View: p2.view,
  };
}

describe("online seat claiming", () => {
  it("claims P1 and P2 once, allows same-token rejoin, and rejects a different token", async () => {
    const { service, store } = makeService();
    const created = await service.createGame();
    const p1 = await service.claimSeat({
      gameIdOrCode: created.code,
      role: "P1",
      playerName: "Yugi",
      clientId: "client-a",
    });

    expect(p1.view.seats.P1.occupied).toBe(true);
    expect(p1.view.seats.P2.occupied).toBe(false);
    expect(p1.view.version).toBe(1);
    expect(store.getPublicInvalidationForTest(created.gameId, 1)).toMatchObject({
      actorRole: null,
      version: 1,
    });

    const p1Rejoin = await service.claimSeat({
      gameIdOrCode: created.gameId,
      role: "P1",
      playerName: "Yugi",
      clientId: "client-a2",
      existingSeatToken: p1.seatToken,
    });
    expect(p1Rejoin.seatToken).toBe(p1.seatToken);

    await expect(
      service.claimSeat({
        gameIdOrCode: created.gameId,
        role: "P1",
        playerName: "Other",
        clientId: "client-b",
        existingSeatToken: "wrong-token",
      }),
    ).rejects.toMatchObject({ status: 409, code: "seat_occupied" });

    const p2 = await service.claimSeat({
      gameIdOrCode: created.gameId,
      role: "P2",
      playerName: "Kaiba",
      clientId: "client-c",
    });

    expect(p2.view.seats.P2.occupied).toBe(true);
    expect(p2.view.status).toBe("active");
    expect(p2.view.version).toBe(2);
    expect(store.getPublicInvalidationForTest(created.gameId, 2)).toMatchObject({
      actorRole: null,
      realtimeTopic: p2.view.realtimeTopic,
      version: 2,
    });
  });

  it("reclaims a stale seat after the heartbeat timeout and publishes metadata", async () => {
    const { service, store } = makeService();
    const created = await service.createGame({ p1Name: "Yugi", clientId: "stale-p1" });
    const staleHeartbeat = new Date(Date.now() - 91_000).toISOString();
    store.setSeatHeartbeatForTest(created.gameId, "P1", staleHeartbeat);

    const reclaimed = await service.claimSeat({
      gameIdOrCode: created.gameId,
      role: "P1",
      playerName: "Replacement",
      clientId: "stale-p1-replacement",
    });

    expect(reclaimed.seatToken).not.toBe(created.seatToken);
    expect(reclaimed.view.seats.P1.playerName).toBe("Replacement");
    expect(reclaimed.view.version).toBe(created.version + 1);
    expect(store.getPublicInvalidationForTest(created.gameId, reclaimed.view.version)).toMatchObject({
      actorRole: null,
      realtimeTopic: reclaimed.view.realtimeTopic,
      version: reclaimed.view.version,
    });
  });
});

describe("online move ordering", () => {
  it("rejects moves before both seats are claimed", async () => {
    const { service } = makeService();
    const created = await service.createGame({ p1Name: "Yugi", clientId: "solo-p1" });

    await expect(
      service.submitMove({
        gameId: created.gameId,
        role: "P1",
        seatToken: created.seatToken!,
        expectedVersion: created.view!.version,
        command: { type: "advance-turn-flow" },
      }),
    ).rejects.toMatchObject({ status: 409, code: "game_not_active" });
  });

  it("increments version and rejects stale expected versions", async () => {
    const { service, gameId, p1Token, p1View } = await createClaimedGame();

    const next = await service.submitMove({
      gameId,
      role: "P1",
      seatToken: p1Token,
      expectedVersion: p1View.version,
      command: { type: "advance-turn-flow" },
    });

    expect(next.version).toBe(p1View.version + 1);

    await expect(
      service.submitMove({
        gameId,
        role: "P1",
        seatToken: p1Token,
        expectedVersion: p1View.version,
        command: { type: "advance-turn-flow" },
      }),
    ).rejects.toMatchObject({ status: 409, code: "version_conflict" });
  });

  it("does not let two simultaneous commits both win the same expected version", async () => {
    const { service, store, gameId, p1Token, p1View } = await createClaimedGame();
    const command = { type: "advance-turn-flow" } satisfies OnlineCommand;
    const attempts = await Promise.allSettled([
      service.submitMove({ gameId, role: "P1", seatToken: p1Token, expectedVersion: p1View.version, command }),
      service.submitMove({ gameId, role: "P1", seatToken: p1Token, expectedVersion: p1View.version, command }),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    expect(store.getGameForTest(gameId)?.version).toBe(p1View.version + 1);
  });

  it("returns updated public spectator board state after a committed move", async () => {
    const { service, gameId, code, p1Token } = await createClaimedGame();
    const before = await service.getView({ gameIdOrCode: code, viewerRole: "spectator" });
    const p1View = await service.getView({ gameIdOrCode: gameId, viewerRole: "P1", seatToken: p1Token });
    const setAction = p1View.legal.placements.find((action) => action.intent === "set");

    expect(setAction).toBeDefined();

    await service.submitMove({
      gameId,
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

    const after = await service.getView({ gameIdOrCode: code, viewerRole: "spectator" });
    expect(after.viewerRole).toBe("spectator");
    expect(after.legal.canAdvance).toBe(false);
    expect(after.version).toBe(before.version + 1);
    expect(after.spectator?.P1.handCount).toBe((before.spectator?.P1.handCount ?? 0) - 1);
    expect(after.actionLog.some((entry) => entry.message === "P1 Set a card.")).toBe(true);
  });
});

describe("online turn ownership", () => {
  it("rejects non-turn-player and unseated mutation attempts", async () => {
    const { service, gameId, p2Token, p1View } = await createClaimedGame();

    await expect(
      service.submitMove({
        gameId,
        role: "P2",
        seatToken: p2Token,
        expectedVersion: p1View.version,
        command: { type: "advance-turn-flow" },
      }),
    ).rejects.toMatchObject({ status: 403, code: "not_turn_player" });

    await expect(
      service.submitMove({
        gameId,
        role: "P1",
        seatToken: "spectator-has-no-seat-token",
        expectedVersion: p1View.version,
        command: { type: "advance-turn-flow" },
      }),
    ).rejects.toMatchObject({ status: 401, code: "invalid_seat_token" });
  });
});

describe("online hidden information", () => {
  it("does not expose hidden hand identity to opponents or spectators", async () => {
    const { service, gameId, code, p1Token, p2Token } = await createClaimedGame();
    const p1View = await service.getView({ gameIdOrCode: gameId, viewerRole: "P1", seatToken: p1Token });
    const p2View = await service.getView({ gameIdOrCode: gameId, viewerRole: "P2", seatToken: p2Token });
    const spectatorView = await service.getView({ gameIdOrCode: code, viewerRole: "spectator" });
    const hidden = p1View.player!.hand[0];
    const p2Names = new Set(p2View.player!.hand.map((card) => card.card.name));
    const p2Passcodes = new Set(p2View.player!.hand.map((card) => card.card.passcode));

    expect(p1View.player!.deck).toEqual([]);
    expect(p1View.playerDeckCount).toBeGreaterThan(0);
    expect(JSON.stringify(p1View.seats)).not.toContain("client-p1");
    expect(JSON.stringify(p1View.seats)).not.toContain("client-p2");
    expect(JSON.stringify(p2View)).not.toContain(hidden.instanceId);
    if (!p2Passcodes.has(hidden.card.passcode)) {
      expect(JSON.stringify(p2View)).not.toContain(hidden.card.passcode);
    }
    if (!p2Names.has(hidden.card.name)) {
      expect(JSON.stringify(p2View)).not.toContain(hidden.card.name);
    }
    expect(JSON.stringify(spectatorView)).not.toContain(hidden.instanceId);
    expect(JSON.stringify(spectatorView)).not.toContain(hidden.card.passcode);
    expect(JSON.stringify(spectatorView)).not.toContain(hidden.card.name);
    expect(spectatorView.spectator?.P1.handCount).toBeGreaterThan(0);
    expect(spectatorView.spectator?.P2.handCount).toBeGreaterThan(0);
  });

  it("rejects spectator lookup by raw game UUID", async () => {
    const { service, gameId } = await createClaimedGame();

    await expect(
      service.getView({ gameIdOrCode: gameId, viewerRole: "spectator" }),
    ).rejects.toMatchObject({ status: 404, code: "game_not_found" });
  });

  it("redacts face-down set-card identity and public realtime payloads", async () => {
    const { service, store, gameId, code, p1Token, p2Token } = await createClaimedGame();
    const p1View = await service.getView({ gameIdOrCode: gameId, viewerRole: "P1", seatToken: p1Token });
    const setAction = p1View.legal.placements.find((action) => action.intent === "set");

    expect(setAction).toBeDefined();
    const setCard = p1View.player!.hand.find((card) => card.instanceId === setAction!.instanceId)!;

    await service.submitMove({
      gameId,
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

    const p2View = await service.getView({ gameIdOrCode: gameId, viewerRole: "P2", seatToken: p2Token });
    const spectatorView = await service.getView({ gameIdOrCode: code, viewerRole: "spectator" });
    const p2Json = JSON.stringify(p2View);
    const spectatorJson = JSON.stringify(spectatorView);

    expect(p2Json).not.toContain(setCard.instanceId);
    expect(spectatorJson).not.toContain(setCard.instanceId);
    expect(spectatorJson).not.toContain(setCard.card.passcode);
    expect(spectatorJson).not.toContain(setCard.card.name);
    expect(p2View.actionLog.some((entry) => entry.message === "P1 Set a card.")).toBe(true);
    expect(spectatorView.actionLog.some((entry) => entry.message === "P1 Set a card.")).toBe(true);

    const move = store.getMoveForTest(gameId, p1View.version + 1)!;
    const realtimePayload = toPublicMovePayload({
      realtimeTopic: move.realtimeTopic,
      version: move.version,
      actorRole: move.actorRole,
      publicSummary: move.publicSummary,
      createdAt: move.createdAt,
    });
    const realtimeJson = JSON.stringify(realtimePayload);

    expect(realtimeJson).not.toContain("private_action");
    expect(realtimeJson).not.toContain(gameId);
    expect(realtimePayload.realtimeTopic).not.toBe(gameId);
    expect(realtimeJson).not.toContain(setCard.instanceId);
    expect(realtimeJson).not.toContain(setCard.card.passcode);
    expect(realtimeJson).not.toContain(setCard.card.name);
  });
});
