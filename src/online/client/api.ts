import type { OnlineCommand, OnlineGameView, OnlineViewerRole } from "../types";
import type { PlayerId } from "../../engine";

const API_URL = "/api/game";

export class OnlineApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "OnlineApiError";
    this.status = status;
    this.code = code;
  }
}

export interface CreateGameResponse {
  readonly gameId: string;
  readonly code: string;
  readonly version: number;
  readonly seats: OnlineGameView["seats"];
  readonly view?: OnlineGameView;
}

export interface ClaimSeatResponse {
  readonly view: OnlineGameView;
}

export async function createGame(input: { readonly p1Name?: string; readonly clientId?: string }): Promise<CreateGameResponse> {
  return postGame({ op: "createGame", ...input });
}

export async function claimSeat(input: {
  readonly gameIdOrCode: string;
  readonly role: PlayerId;
  readonly playerName: string;
  readonly clientId: string;
}): Promise<ClaimSeatResponse> {
  return postGame({ op: "claimSeat", ...input });
}

export async function leaveSeat(input: {
  readonly gameId: string;
  readonly role: PlayerId;
}): Promise<{ readonly ok: true; readonly view: OnlineGameView }> {
  return postGame({ op: "leaveSeat", ...input });
}

export async function getView(input: {
  readonly gameIdOrCode: string;
  readonly viewerRole: OnlineViewerRole;
}): Promise<OnlineGameView> {
  return postGame({ op: "getView", ...input });
}

export async function submitMove(input: {
  readonly gameId: string;
  readonly role: PlayerId;
  readonly expectedVersion: number;
  readonly command: OnlineCommand;
}): Promise<OnlineGameView> {
  return postGame({ op: "submitMove", ...input });
}

export async function heartbeat(input: {
  readonly gameId: string;
  readonly role: PlayerId;
  readonly clientId: string;
}): Promise<{ readonly ok: true }> {
  return postGame({ op: "heartbeat", ...input });
}

async function postGame<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | T
    | null;

  if (!response.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload ? payload.error : null;
    throw new OnlineApiError(
      response.status,
      error?.code ?? "request_failed",
      error?.message ?? `Request failed with ${response.status}.`,
    );
  }

  return payload as T;
}
