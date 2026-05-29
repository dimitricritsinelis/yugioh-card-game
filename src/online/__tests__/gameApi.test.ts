import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import { handleNodeGameApi } from "../../../api/game";
import type { CardRecord } from "../../types";
import { InMemoryGameStore, OnlineGameService } from "../server/gameService";

const cards = cardsJson as CardRecord[];

function makeService() {
  return new OnlineGameService(new InMemoryGameStore(), {
    cards,
    seatTokenSalt: "api-test-seat-token-salt",
  });
}

describe("online game API", () => {
  it("stores seat tokens in an HttpOnly cookie instead of the response body", async () => {
    const service = makeService();
    const response = await postGame(
      {
        op: "createGame",
        p1Name: "Yugi",
        clientId: "api-client-p1",
      },
      service,
    );

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.payload)).not.toContain("seatToken");
    expect(String(response.headers.get("set-cookie"))).toContain("goat_online_seat=");
    expect(String(response.headers.get("set-cookie"))).toContain("HttpOnly");
  });

  it("returns 400 invalid_command for malformed move commands", async () => {
    const service = makeService();
    const created = await service.createGame({ p1Name: "Yugi", clientId: "api-p1" });
    await service.claimSeat({
      gameIdOrCode: created.gameId,
      role: "P2",
      playerName: "Kaiba",
      clientId: "api-p2",
    });
    const p1View = await service.getView({
      gameIdOrCode: created.gameId,
      viewerRole: "P1",
      seatToken: created.seatToken,
    });

    const response = await postGame(
      {
        op: "submitMove",
        gameId: created.gameId,
        role: "P1",
        expectedVersion: p1View.version,
        command: {
          type: "attack",
          attackerInstanceId: "card-id",
          target: { kind: "monster-zone", zoneIndex: "not-a-number" },
        },
      },
      service,
      `goat_online_seat=${encodeURIComponent(created.seatToken!)}`,
    );

    expect(response.status).toBe(400);
    expect(response.payload).toMatchObject({
      error: {
        code: "invalid_command",
      },
    });
  });
});

async function postGame(
  body: unknown,
  service: OnlineGameService,
  cookie?: string,
): Promise<{ status: number; headers: Map<string, string | readonly string[]>; payload: unknown }> {
  const rawBody = JSON.stringify(body);
  const headers = new Map<string, string | readonly string[]>();
  let responseBody = "";
  const request = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(new TextEncoder().encode(rawBody).length),
      ...(cookie ? { cookie } : {}),
    },
    async *[Symbol.asyncIterator]() {
      yield rawBody;
    },
  };
  const response = {
    statusCode: 0,
    setHeader(name: string, value: string | readonly string[]) {
      headers.set(name.toLowerCase(), value);
    },
    end(nextBody?: string) {
      responseBody = nextBody ?? "";
    },
  };

  await handleNodeGameApi(request, response, { service });

  return {
    status: response.statusCode,
    headers,
    payload: responseBody ? JSON.parse(responseBody) : null,
  };
}
