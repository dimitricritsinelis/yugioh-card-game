import {
  OnlineGameError,
  OnlineGameService,
  SupabaseGameStore,
} from "../src/online/server/gameService";
import { getSupabaseAdminClient } from "../src/online/server/supabaseAdmin";
import type { OnlineCommand } from "../src/online/types";
import type { PlayerId } from "../src/engine";
import type { CardAction, ZoneKind } from "../src/types";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_OP_LENGTH = 32;
const MAX_TARGET_LENGTH = 80;
const MAX_NAME_LENGTH = 64;
const MAX_CLIENT_ID_LENGTH = 80;
const MAX_ID_LENGTH = 120;
const MAX_COMMAND_IDS = 20;
const RATE_LIMIT_CAPACITY = 60;
const RATE_LIMIT_REFILL_PER_MS = 1 / 1_000;
const SEAT_COOKIE_NAME = "goat_online_seat";
const SEAT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

let service: OnlineGameService | null = null;

interface NodeRequestLike {
  readonly method?: string;
  readonly headers?: Record<string, string | readonly string[] | undefined>;
  readonly socket?: { readonly remoteAddress?: string };
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>;
}

interface NodeResponseLike {
  statusCode: number;
  setHeader(name: string, value: string | readonly string[]): void;
  end(body?: string): void;
}

interface HandlerOptions {
  readonly service?: OnlineGameService;
}

interface RequestContext {
  readonly service: OnlineGameService;
  readonly seatToken?: string;
}

interface RouteResult {
  readonly payload: unknown;
  readonly seatToken?: string;
  readonly clearSeatToken?: boolean;
}

interface RateBucket {
  tokens: number;
  updatedAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

export default async function handler(
  request: Request | NodeRequestLike,
  response?: NodeResponseLike,
): Promise<Response | void> {
  if (response) {
    await handleNodeGameApi(request as NodeRequestLike, response);
    return;
  }

  return handleFetchGameApi(request as Request);
}

export async function handleFetchGameApi(request: Request, options: HandlerOptions = {}): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders() });
  }

  if (request.method !== "POST") {
    return json({ error: { code: "method_not_allowed", message: "Use POST." } }, 405);
  }

  try {
    enforceRateLimit(getFetchIp(request));
    const body = await readFetchJson(request);
    const result = await routeOperation(body, {
      service: options.service ?? getService(),
      seatToken: getSeatTokenFromCookie(request.headers.get("cookie") ?? ""),
    });
    return json(result.payload, 200, cookieForResult(result, requestIsSecure(request)));
  } catch (error) {
    return jsonError(error);
  }
}

export async function handleNodeGameApi(
  request: NodeRequestLike,
  response: NodeResponseLike,
  options: HandlerOptions = {},
): Promise<void> {
  if (request.method === "OPTIONS") {
    sendNodeJson(response, null, 204);
    return;
  }

  if (request.method !== "POST") {
    sendNodeJson(response, { error: { code: "method_not_allowed", message: "Use POST." } }, 405);
    return;
  }

  try {
    enforceRateLimit(getNodeIp(request));
    const body = await readNodeJson(request);
    const result = await routeOperation(body, {
      service: options.service ?? getService(),
      seatToken: getSeatTokenFromCookie(getNodeHeader(request, "cookie") ?? ""),
    });
    sendNodeJson(response, result.payload, 200, cookieForResult(result, nodeRequestIsSecure(request)));
  } catch (error) {
    sendNodeError(response, error);
  }
}

async function routeOperation(body: unknown, context: RequestContext): Promise<RouteResult> {
  const input = assertRecord(body);
  const op = requireLimitedString(input, "op", MAX_OP_LENGTH, "invalid_input");
  const gameService = context.service;

  switch (op) {
    case "createGame": {
      const result = await gameService.createGame({
        p1Name: optionalLimitedString(input, "p1Name", MAX_NAME_LENGTH, "invalid_input"),
        clientId: optionalLimitedString(input, "clientId", MAX_CLIENT_ID_LENGTH, "invalid_input"),
      });
      const { seatToken, ...payload } = result;
      return { payload, seatToken };
    }
    case "claimSeat": {
      const result = await gameService.claimSeat({
        gameIdOrCode: requireLimitedString(input, "gameIdOrCode", MAX_TARGET_LENGTH, "invalid_input"),
        role: requireRole(input, "role"),
        playerName: requireLimitedString(input, "playerName", MAX_NAME_LENGTH, "invalid_input"),
        clientId: requireLimitedString(input, "clientId", MAX_CLIENT_ID_LENGTH, "invalid_input"),
        existingSeatToken: context.seatToken,
      });
      return { payload: { view: result.view }, seatToken: result.seatToken };
    }
    case "leaveSeat": {
      const result = await gameService.leaveSeat({
        gameId: requireLimitedString(input, "gameId", MAX_TARGET_LENGTH, "invalid_input"),
        role: requireRole(input, "role"),
        seatToken: requireSeatToken(context),
      });
      return { payload: result, clearSeatToken: true };
    }
    case "getView":
      return {
        payload: await gameService.getView({
          gameIdOrCode: requireLimitedString(input, "gameIdOrCode", MAX_TARGET_LENGTH, "invalid_input"),
          viewerRole: requireViewerRole(input),
          seatToken: context.seatToken,
        }),
      };
    case "submitMove":
      return {
        payload: await gameService.submitMove({
          gameId: requireLimitedString(input, "gameId", MAX_TARGET_LENGTH, "invalid_input"),
          role: requireRole(input, "role"),
          seatToken: requireSeatToken(context),
          expectedVersion: requireInteger(input, "expectedVersion"),
          command: requireCommand(input.command),
        }),
      };
    case "heartbeat":
      return {
        payload: await gameService.heartbeat({
          gameId: requireLimitedString(input, "gameId", MAX_TARGET_LENGTH, "invalid_input"),
          role: requireRole(input, "role"),
          seatToken: requireSeatToken(context),
          clientId: requireLimitedString(input, "clientId", MAX_CLIENT_ID_LENGTH, "invalid_input"),
        }),
      };
    default:
      throw new OnlineGameError(400, "unknown_operation", `Unknown operation '${op}'.`);
  }
}

function getService(): OnlineGameService {
  if (!service) {
    service = new OnlineGameService(new SupabaseGameStore(getSupabaseAdminClient()));
  }

  return service;
}

function json(payload: unknown, status: number, cookie?: string): Response {
  const headers = new Headers(responseHeaders());
  if (cookie) {
    headers.append("set-cookie", cookie);
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

function jsonError(error: unknown): Response {
  if (error instanceof OnlineGameError) {
    return json({ error: { code: error.code, message: error.message } }, error.status);
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return json({ error: { code: "server_error", message } }, 500);
}

function responseHeaders(): HeadersInit {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  };
}

async function readFetchJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new OnlineGameError(413, "body_too_large", "Request body is too large.");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    throw new OnlineGameError(413, "body_too_large", "Request body is too large.");
  }

  return parseJsonBody(rawBody);
}

async function readNodeJson(request: NodeRequestLike): Promise<unknown> {
  if (!request[Symbol.asyncIterator]) {
    throw new OnlineGameError(400, "invalid_json", "Expected a JSON request body.");
  }

  const contentLength = Number(getNodeHeader(request, "content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new OnlineGameError(413, "body_too_large", "Request body is too large.");
  }

  let rawBody = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  for await (const chunk of request as AsyncIterable<Uint8Array | string>) {
    const text = typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    bytes += new TextEncoder().encode(text).length;
    if (bytes > MAX_BODY_BYTES) {
      throw new OnlineGameError(413, "body_too_large", "Request body is too large.");
    }
    rawBody += text;
  }

  const tail = decoder.decode();
  bytes += new TextEncoder().encode(tail).length;
  if (bytes > MAX_BODY_BYTES) {
    throw new OnlineGameError(413, "body_too_large", "Request body is too large.");
  }
  rawBody += tail;
  return parseJsonBody(rawBody);
}

function parseJsonBody(rawBody: string): unknown {
  try {
    return rawBody.trim().length > 0 ? JSON.parse(rawBody) : {};
  } catch {
    throw new OnlineGameError(400, "invalid_json", "Expected valid JSON.");
  }
}

function sendNodeJson(response: NodeResponseLike, payload: unknown, status: number, cookie?: string): void {
  response.statusCode = status;
  for (const [key, value] of Object.entries(responseHeaders())) {
    response.setHeader(key, value);
  }
  if (cookie) {
    response.setHeader("set-cookie", cookie);
  }
  response.end(payload === null ? undefined : JSON.stringify(payload));
}

function sendNodeError(response: NodeResponseLike, error: unknown): void {
  if (error instanceof OnlineGameError) {
    sendNodeJson(response, { error: { code: error.code, message: error.message } }, error.status);
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  sendNodeJson(response, { error: { code: "server_error", message } }, 500);
}

function assertRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new OnlineGameError(400, "invalid_json", "Expected a JSON object.");
  }

  return value as Record<string, unknown>;
}

function requireLimitedString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
  errorCode: string,
): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new OnlineGameError(400, errorCode, `${key} is required.`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    throw new OnlineGameError(400, errorCode, `${key} is invalid.`);
  }

  return trimmed;
}

function optionalLimitedString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
  errorCode: string,
): string | undefined {
  const value = record[key];
  if (value == null || value === "") {
    return undefined;
  }

  return requireLimitedString(record, key, maxLength, errorCode);
}

function requireInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (!Number.isInteger(value)) {
    throw new OnlineGameError(400, "invalid_input", `${key} must be an integer.`);
  }

  return value as number;
}

function requireRole(record: Record<string, unknown>, key: string): PlayerId {
  const value = requireLimitedString(record, key, 2, "invalid_role");
  if (value !== "P1" && value !== "P2") {
    throw new OnlineGameError(400, "invalid_role", `${key} must be P1 or P2.`);
  }

  return value;
}

function requireViewerRole(record: Record<string, unknown>): PlayerId | "spectator" {
  const value = requireLimitedString(record, "viewerRole", 16, "invalid_role");
  if (value !== "P1" && value !== "P2" && value !== "spectator") {
    throw new OnlineGameError(400, "invalid_role", "viewerRole must be P1, P2, or spectator.");
  }

  return value;
}

function requireSeatToken(context: RequestContext): string {
  if (!context.seatToken) {
    throw new OnlineGameError(401, "missing_seat_token", "A seat token is required.");
  }

  return context.seatToken;
}

function requireCommand(value: unknown): OnlineCommand {
  const command = commandRecord(value);
  const type = commandString(command, "type", 32);

  switch (type) {
    case "play-card":
      return {
        type,
        instanceId: commandString(command, "instanceId", MAX_ID_LENGTH),
        intent: commandCardAction(command, "intent"),
        zoneKind: commandZoneKind(command, "zoneKind"),
        zoneIndex: commandZoneIndex(command, "zoneIndex"),
        tributeInstanceIds: optionalCommandStringArray(command, "tributeInstanceIds", MAX_COMMAND_IDS),
      };
    case "activate-set-card":
      return {
        type,
        instanceId: commandString(command, "instanceId", MAX_ID_LENGTH),
      };
    case "attack": {
      const target = commandRecord(command.target);
      const kind = commandString(target, "kind", 16);
      if (kind === "direct") {
        return {
          type,
          attackerInstanceId: commandString(command, "attackerInstanceId", MAX_ID_LENGTH),
          target: { kind },
        };
      }

      if (kind !== "monster-zone") {
        invalidCommand("Unsupported attack target.");
      }

      return {
        type,
        attackerInstanceId: commandString(command, "attackerInstanceId", MAX_ID_LENGTH),
        target: {
          kind,
          zoneIndex: commandZoneIndex(target, "zoneIndex"),
        },
      };
    }
    case "advance-turn-flow":
      return { type };
    case "discard-and-advance":
      return {
        type,
        discardInstanceIds: commandStringArray(command, "discardInstanceIds", MAX_COMMAND_IDS),
      };
    default:
      invalidCommand("Unsupported move command.");
  }
}

function commandRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalidCommand("Command must be an object.");
  }

  return value as Record<string, unknown>;
}

function commandString(record: Record<string, unknown>, key: string, maxLength: number): string {
  const value = record[key];
  if (typeof value !== "string") {
    invalidCommand(`${key} is required.`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    invalidCommand(`${key} is invalid.`);
  }

  return trimmed;
}

function commandStringArray(record: Record<string, unknown>, key: string, maxLength: number): string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.length > maxLength) {
    invalidCommand(`${key} is invalid.`);
  }

  return value.map((item) => {
    if (typeof item !== "string") {
      invalidCommand(`${key} is invalid.`);
    }

    const trimmed = item.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_ID_LENGTH) {
      invalidCommand(`${key} is invalid.`);
    }

    return trimmed;
  });
}

function optionalCommandStringArray(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
): string[] | undefined {
  return record[key] == null ? undefined : commandStringArray(record, key, maxLength);
}

function commandZoneIndex(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 4) {
    invalidCommand(`${key} is invalid.`);
  }

  return value;
}

function commandCardAction(record: Record<string, unknown>, key: string): CardAction {
  const value = commandString(record, key, 16);
  if (value !== "summon" && value !== "set" && value !== "activate") {
    invalidCommand(`${key} is invalid.`);
  }

  return value;
}

function commandZoneKind(record: Record<string, unknown>, key: string): ZoneKind {
  const value = commandString(record, key, 16);
  if (value !== "monster" && value !== "spellTrap") {
    invalidCommand(`${key} is invalid.`);
  }

  return value;
}

function invalidCommand(message: string): never {
  throw new OnlineGameError(400, "invalid_command", message);
}

function enforceRateLimit(ip: string): void {
  const now = Date.now();
  const current = rateBuckets.get(ip) ?? { tokens: RATE_LIMIT_CAPACITY, updatedAt: now };
  const tokens = Math.min(
    RATE_LIMIT_CAPACITY,
    current.tokens + (now - current.updatedAt) * RATE_LIMIT_REFILL_PER_MS,
  );

  if (tokens < 1) {
    rateBuckets.set(ip, { tokens, updatedAt: now });
    throw new OnlineGameError(429, "rate_limited", "Too many requests.");
  }

  rateBuckets.set(ip, { tokens: tokens - 1, updatedAt: now });
}

function getFetchIp(request: Request): string {
  return firstForwardedIp(request.headers.get("x-forwarded-for")) ?? request.headers.get("x-real-ip") ?? "unknown";
}

function getNodeIp(request: NodeRequestLike): string {
  return firstForwardedIp(getNodeHeader(request, "x-forwarded-for")) ??
    getNodeHeader(request, "x-real-ip") ??
    request.socket?.remoteAddress ??
    "unknown";
}

function firstForwardedIp(value: string | null | undefined): string | null {
  const first = value?.split(",")[0]?.trim();
  return first && first.length <= 80 ? first : null;
}

function getNodeHeader(request: NodeRequestLike, name: string): string | undefined {
  const headers = request.headers ?? {};
  const direct = headers[name] ?? headers[name.toLowerCase()];
  const value = Array.isArray(direct) ? direct[0] : direct;
  return typeof value === "string" ? value : undefined;
}

function cookieForResult(result: RouteResult, secure: boolean): string | undefined {
  if (result.clearSeatToken) {
    return `${SEAT_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? "; Secure" : ""}`;
  }

  if (!result.seatToken) {
    return undefined;
  }

  return `${SEAT_COOKIE_NAME}=${encodeURIComponent(result.seatToken)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SEAT_COOKIE_MAX_AGE_SECONDS}${secure ? "; Secure" : ""}`;
}

function getSeatTokenFromCookie(cookieHeader: string): string | undefined {
  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === SEAT_COOKIE_NAME) {
      const value = rawValue.join("=");
      try {
        return value ? decodeURIComponent(value) : undefined;
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function requestIsSecure(request: Request): boolean {
  return new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

function nodeRequestIsSecure(request: NodeRequestLike): boolean {
  return getNodeHeader(request, "x-forwarded-proto") === "https";
}
