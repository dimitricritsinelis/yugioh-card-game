import type { SupabaseClient } from "@supabase/supabase-js";
import {
  advanceToNextDecision,
  applyAction,
  assignRandomPlayableDecksToDuel,
  createDuel,
  createSeededRng,
  getLegalActions,
  type DuelAction,
  type DuelEvent,
  type DuelState,
  type PlayerId,
} from "../../engine";
import type { CardRecord } from "../../types";
import { buildOnlineGameView, selectOnlineLegalState } from "../publicView";
import { redactEventsForPublic, summarizePublicEvents } from "../redaction";
import type {
  GameRecord,
  MoveRecord,
  OnlineCommand,
  OnlineGameStatus,
  OnlineGameView,
  OnlineViewerRole,
  PublicMoveRealtimePayload,
  SeatRecord,
} from "../types";
import { loadServerCardBundle } from "./cardBundle";
import { getSeatTokenSalt } from "./supabaseAdmin";
import { createSeatToken, hashSeatToken, safeTokenHashEquals } from "./token";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const DEFAULT_PLAYER_NAME = "Duelist";
const STALE_SEAT_MS = 90_000;

export class OnlineGameError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "OnlineGameError";
    this.status = status;
    this.code = code;
  }
}

export interface CommitMoveInput {
  readonly gameId: string;
  readonly expectedVersion: number;
  readonly actorRole: PlayerId;
  readonly privateAction: unknown;
  readonly nextEngineState: DuelState;
  readonly nextStatus: OnlineGameStatus;
  readonly publicEvents: readonly DuelEvent[];
  readonly publicSummary: string;
}

export interface CommitMetadataUpdateInput {
  readonly gameId: string;
  readonly nextStatus?: OnlineGameStatus;
  readonly publicSummary: string;
}

export interface OnlineGameStore {
  insertGame(record: Omit<GameRecord, "createdAt" | "updatedAt" | "lastMoveAt">): Promise<GameRecord>;
  getGameByIdOrCode(gameIdOrCode: string): Promise<GameRecord | null>;
  listSeats(gameId: string): Promise<SeatRecord[]>;
  getSeat(gameId: string, role: PlayerId): Promise<SeatRecord | null>;
  insertSeat(record: Omit<SeatRecord, "claimedAt" | "heartbeatAt" | "disconnectedAt">): Promise<SeatRecord>;
  replaceSeat(record: Omit<SeatRecord, "claimedAt" | "heartbeatAt" | "disconnectedAt">): Promise<SeatRecord>;
  updateSeatHeartbeat(input: {
    readonly gameId: string;
    readonly role: PlayerId;
    readonly clientId: string;
  }): Promise<void>;
  deleteSeat(gameId: string, role: PlayerId, seatTokenHash: string): Promise<boolean>;
  commitMetadataUpdate(input: CommitMetadataUpdateInput): Promise<number>;
  commitMove(input: CommitMoveInput): Promise<number>;
}

export interface OnlineGameServiceOptions {
  readonly cards?: readonly CardRecord[];
  readonly seatTokenSalt?: string;
}

export interface CreateGameInput {
  readonly p1Name?: string;
  readonly clientId?: string;
}

export interface CreateGameResult {
  readonly gameId: string;
  readonly code: string;
  readonly version: number;
  readonly seats: OnlineGameView["seats"];
  readonly seatToken?: string;
  readonly view?: OnlineGameView;
}

export interface ClaimSeatInput {
  readonly gameIdOrCode: string;
  readonly role: PlayerId;
  readonly playerName: string;
  readonly clientId: string;
  readonly existingSeatToken?: string;
}

export interface ClaimSeatResult {
  readonly seatToken: string;
  readonly view: OnlineGameView;
}

export class OnlineGameService {
  private readonly cards: readonly CardRecord[];
  private readonly seatTokenSalt: string;

  constructor(
    private readonly store: OnlineGameStore,
    options: OnlineGameServiceOptions = {},
  ) {
    this.cards = options.cards ?? loadServerCardBundle();
    this.seatTokenSalt = options.seatTokenSalt ?? getSeatTokenSalt();
  }

  async createGame(input: CreateGameInput = {}): Promise<CreateGameResult> {
    const seed = crypto.randomUUID();
    const code = createShareCode();
    const engine = createInitialOnlineDuel(this.cards, seed);
    const now = new Date().toISOString();
    const game = await this.store.insertGame({
      id: crypto.randomUUID(),
      code,
      realtimeTopic: createRealtimeTopic(),
      status: "waiting",
      version: 0,
      seed,
      activePlayer: engine.activePlayer,
      phase: engine.phase,
      turn: engine.turn,
      winner: engine.winner,
      engineState: engine,
    });

    if (input.p1Name) {
      const clientId = input.clientId ?? crypto.randomUUID();
      const claimed = await this.claimSeat({
        gameIdOrCode: game.id,
        role: "P1",
        playerName: input.p1Name,
        clientId,
      });

      return {
        gameId: game.id,
        code: game.code,
        version: claimed.view.version,
        seats: claimed.view.seats,
        seatToken: claimed.seatToken,
        view: claimed.view,
      };
    }

    const view = buildOnlineGameView({
      gameId: game.id,
      code: game.code,
      realtimeTopic: game.realtimeTopic,
      status: game.status,
      version: game.version,
      engine,
      seats: [],
      viewerRole: "spectator",
    });

    return {
      gameId: game.id,
      code: game.code,
      version: game.version,
      seats: view.seats,
      view: {
        ...view,
        actionLog: [
          {
            id: `game-created-${now}`,
            message: "Online duel created.",
          },
        ],
      },
    };
  }

  async claimSeat(input: ClaimSeatInput): Promise<ClaimSeatResult> {
    const game = await this.requireGame(input.gameIdOrCode);
    const existing = await this.store.getSeat(game.id, input.role);
    const playerName = sanitizePlayerName(input.playerName);

    if (existing) {
      if (input.existingSeatToken) {
        const existingHash = await hashSeatToken(input.existingSeatToken, this.seatTokenSalt);
        if (safeTokenHashEquals(existing.seatTokenHash, existingHash)) {
          await this.store.updateSeatHeartbeat({
            gameId: game.id,
            role: input.role,
            clientId: input.clientId,
          });

          const view = await this.getView({
            gameIdOrCode: game.id,
            viewerRole: input.role,
            seatToken: input.existingSeatToken,
          });

          return {
            seatToken: input.existingSeatToken,
            view,
          };
        }
      }

      if (!isStaleSeat(existing)) {
        throw new OnlineGameError(409, "seat_occupied", `${input.role} is already occupied.`);
      }

      const seatToken = createSeatToken();
      const seatTokenHash = await hashSeatToken(seatToken, this.seatTokenSalt);
      await this.store.replaceSeat({
        gameId: game.id,
        role: input.role,
        playerName,
        seatTokenHash,
        clientId: input.clientId,
      });
      await this.publishSeatMetadataUpdate(game.id, `${input.role} reclaimed a stale seat.`);

      const view = await this.getView({
        gameIdOrCode: game.id,
        viewerRole: input.role,
        seatToken,
      });

      return {
        seatToken,
        view,
      };
    }

    const seatToken = createSeatToken();
    const seatTokenHash = await hashSeatToken(seatToken, this.seatTokenSalt);

    try {
      await this.store.insertSeat({
        gameId: game.id,
        role: input.role,
        playerName,
        seatTokenHash,
        clientId: input.clientId,
      });
    } catch (error) {
      if (error instanceof OnlineGameError) {
        throw error;
      }

      throw new OnlineGameError(409, "seat_occupied", `${input.role} is already occupied.`);
    }

    await this.publishSeatMetadataUpdate(game.id, `${input.role} joined the duel.`);

    const view = await this.getView({
      gameIdOrCode: game.id,
      viewerRole: input.role,
      seatToken,
    });

    return {
      seatToken,
      view,
    };
  }

  async leaveSeat(input: { readonly gameId: string; readonly role: PlayerId; readonly seatToken: string }): Promise<{
    readonly ok: true;
    readonly view: OnlineGameView;
  }> {
    const game = await this.requireGame(input.gameId);
    const seatTokenHash = await hashSeatToken(input.seatToken, this.seatTokenSalt);
    const deleted = await this.store.deleteSeat(game.id, input.role, seatTokenHash);

    if (!deleted) {
      throw new OnlineGameError(401, "invalid_seat_token", "Seat token did not match that seat.");
    }

    const nextStatus = game.status === "active" ? "waiting" : undefined;
    await this.store.commitMetadataUpdate({
      gameId: game.id,
      nextStatus,
      publicSummary: `${input.role} left the duel.`,
    });

    return {
      ok: true,
      view: await this.getView({ gameIdOrCode: game.code, viewerRole: "spectator" }),
    };
  }

  async getView(input: {
    readonly gameIdOrCode: string;
    readonly viewerRole: OnlineViewerRole;
    readonly seatToken?: string;
  }): Promise<OnlineGameView> {
    if (input.viewerRole === "spectator" && isUuid(input.gameIdOrCode)) {
      throw new OnlineGameError(404, "game_not_found", "Duel not found.");
    }

    const game = await this.requireGame(input.gameIdOrCode);

    if (input.viewerRole === "P1" || input.viewerRole === "P2") {
      await this.requireValidSeatToken(game.id, input.viewerRole, input.seatToken);
    }

    const seats = await this.store.listSeats(game.id);

    return buildOnlineGameView({
      gameId: game.id,
      code: game.code,
      realtimeTopic: game.realtimeTopic,
      status: game.status,
      version: game.version,
      engine: game.engineState,
      seats,
      viewerRole: input.viewerRole,
    });
  }

  async heartbeat(input: {
    readonly gameId: string;
    readonly role: PlayerId;
    readonly seatToken: string;
    readonly clientId: string;
  }): Promise<{ readonly ok: true }> {
    const game = await this.requireGame(input.gameId);
    await this.requireValidSeatToken(game.id, input.role, input.seatToken);
    await this.store.updateSeatHeartbeat({
      gameId: game.id,
      role: input.role,
      clientId: input.clientId,
    });

    return { ok: true };
  }

  async submitMove(input: {
    readonly gameId: string;
    readonly role: PlayerId;
    readonly seatToken: string;
    readonly expectedVersion: number;
    readonly command: OnlineCommand;
  }): Promise<OnlineGameView> {
    const game = await this.requireGame(input.gameId);
    await this.requireValidSeatToken(game.id, input.role, input.seatToken);

    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion !== game.version) {
      throw new OnlineGameError(409, "version_conflict", "Game version changed. Fetch the latest view.");
    }

    if (game.engineState.winner || game.status === "finished") {
      throw new OnlineGameError(409, "game_finished", "The duel is already finished.");
    }

    const seats = await this.store.listSeats(game.id);
    const occupiedRoles = new Set(seats.map((seat) => seat.role));
    if (game.status !== "active" || !occupiedRoles.has("P1") || !occupiedRoles.has("P2")) {
      throw new OnlineGameError(409, "game_not_active", "Both seats must be occupied before moves can be submitted.");
    }

    if (game.engineState.activePlayer !== input.role) {
      throw new OnlineGameError(403, "not_turn_player", `${input.role} is not the active player.`);
    }

    const applied = applyOnlineCommand(game.engineState, input.role, input.command);
    const publicEvents = redactEventsForPublic(applied.events);
    const publicSummary = summarizePublicEvents(publicEvents);
    const nextStatus: OnlineGameStatus = applied.state.winner ? "finished" : game.status;
    const committedVersion = await this.store.commitMove({
      gameId: game.id,
      expectedVersion: game.version,
      actorRole: input.role,
      privateAction: input.command,
      nextEngineState: applied.state,
      nextStatus,
      publicEvents,
      publicSummary,
    });

    return buildOnlineGameView({
      gameId: game.id,
      code: game.code,
      realtimeTopic: game.realtimeTopic,
      status: nextStatus,
      version: committedVersion,
      engine: applied.state,
      seats,
      viewerRole: input.role,
    });
  }

  private async requireGame(gameIdOrCode: string): Promise<GameRecord> {
    const game = await this.store.getGameByIdOrCode(gameIdOrCode);

    if (!game) {
      throw new OnlineGameError(404, "game_not_found", "Duel not found.");
    }

    return game;
  }

  private async requireValidSeatToken(gameId: string, role: PlayerId, seatToken: string | undefined): Promise<SeatRecord> {
    if (!seatToken) {
      throw new OnlineGameError(401, "missing_seat_token", "A seat token is required.");
    }

    const seat = await this.store.getSeat(gameId, role);

    if (!seat) {
      throw new OnlineGameError(401, "seat_not_claimed", `${role} has not been claimed.`);
    }

    const suppliedHash = await hashSeatToken(seatToken, this.seatTokenSalt);
    if (!safeTokenHashEquals(seat.seatTokenHash, suppliedHash)) {
      throw new OnlineGameError(401, "invalid_seat_token", "Seat token did not match that seat.");
    }

    return seat;
  }

  private async publishSeatMetadataUpdate(gameId: string, publicSummary: string): Promise<number> {
    const game = await this.requireGame(gameId);
    const seats = await this.store.listSeats(game.id);
    const occupiedRoles = new Set(seats.map((seat) => seat.role));
    const nextStatus =
      game.status === "waiting" && occupiedRoles.has("P1") && occupiedRoles.has("P2") ? "active" : undefined;

    return this.store.commitMetadataUpdate({
      gameId: game.id,
      nextStatus,
      publicSummary,
    });
  }
}

export class InMemoryGameStore implements OnlineGameStore {
  private readonly games = new Map<string, GameRecord>();
  private readonly seats = new Map<string, SeatRecord>();
  private readonly moves = new Map<string, MoveRecord>();
  private readonly publicInvalidations = new Map<string, PublicMoveRealtimePayload>();

  async insertGame(record: Omit<GameRecord, "createdAt" | "updatedAt" | "lastMoveAt">): Promise<GameRecord> {
    if ([...this.games.values()].some((game) => game.code === record.code)) {
      throw new OnlineGameError(409, "duplicate_code", "Duel code already exists.");
    }

    const now = new Date().toISOString();
    const game: GameRecord = {
      ...cloneJson(record),
      createdAt: now,
      updatedAt: now,
      lastMoveAt: null,
    };
    this.games.set(game.id, game);
    return cloneJson(game);
  }

  async getGameByIdOrCode(gameIdOrCode: string): Promise<GameRecord | null> {
    const normalized = gameIdOrCode.trim().toUpperCase();
    const game =
      this.games.get(gameIdOrCode) ??
      [...this.games.values()].find((candidate) => candidate.code === normalized) ??
      null;

    return game ? cloneJson(game) : null;
  }

  async listSeats(gameId: string): Promise<SeatRecord[]> {
    return [...this.seats.values()]
      .filter((seat) => seat.gameId === gameId)
      .map(cloneJson)
      .sort((first, second) => first.role.localeCompare(second.role));
  }

  async getSeat(gameId: string, role: PlayerId): Promise<SeatRecord | null> {
    const seat = this.seats.get(seatKey(gameId, role));
    return seat ? cloneJson(seat) : null;
  }

  async insertSeat(record: Omit<SeatRecord, "claimedAt" | "heartbeatAt" | "disconnectedAt">): Promise<SeatRecord> {
    const key = seatKey(record.gameId, record.role);
    if (this.seats.has(key)) {
      throw new OnlineGameError(409, "seat_occupied", `${record.role} is already occupied.`);
    }

    const now = new Date().toISOString();
    const seat: SeatRecord = {
      ...record,
      claimedAt: now,
      heartbeatAt: now,
      disconnectedAt: null,
    };
    this.seats.set(key, cloneJson(seat));
    return cloneJson(seat);
  }

  async replaceSeat(record: Omit<SeatRecord, "claimedAt" | "heartbeatAt" | "disconnectedAt">): Promise<SeatRecord> {
    const key = seatKey(record.gameId, record.role);
    const now = new Date().toISOString();
    const seat: SeatRecord = {
      ...record,
      claimedAt: now,
      heartbeatAt: now,
      disconnectedAt: null,
    };
    this.seats.set(key, cloneJson(seat));
    return cloneJson(seat);
  }

  async updateSeatHeartbeat(input: {
    readonly gameId: string;
    readonly role: PlayerId;
    readonly clientId: string;
  }): Promise<void> {
    const key = seatKey(input.gameId, input.role);
    const seat = this.seats.get(key);
    if (!seat) {
      return;
    }

    this.seats.set(key, {
      ...seat,
      clientId: input.clientId,
      heartbeatAt: new Date().toISOString(),
      disconnectedAt: null,
    });
  }

  async deleteSeat(gameId: string, role: PlayerId, seatTokenHash: string): Promise<boolean> {
    const key = seatKey(gameId, role);
    const seat = this.seats.get(key);

    if (!seat || !safeTokenHashEquals(seat.seatTokenHash, seatTokenHash)) {
      return false;
    }

    this.seats.delete(key);
    return true;
  }

  async commitMetadataUpdate(input: CommitMetadataUpdateInput): Promise<number> {
    const game = this.games.get(input.gameId);
    if (!game) {
      throw new OnlineGameError(404, "game_not_found", "Duel not found.");
    }

    const now = new Date().toISOString();
    const version = game.version + 1;
    const next = {
      ...game,
      version,
      status: input.nextStatus ?? game.status,
      updatedAt: now,
    };
    this.games.set(input.gameId, cloneJson(next));
    this.publicInvalidations.set(moveKey(input.gameId, version), {
      realtimeTopic: game.realtimeTopic,
      version,
      actorRole: null,
      publicSummary: input.publicSummary,
      createdAt: now,
    });
    return version;
  }

  async commitMove(input: CommitMoveInput): Promise<number> {
    const game = this.games.get(input.gameId);

    if (!game) {
      throw new OnlineGameError(404, "game_not_found", "Duel not found.");
    }

    if (game.version !== input.expectedVersion) {
      throw new OnlineGameError(409, "version_conflict", "Game version changed. Fetch the latest view.");
    }

    const now = new Date().toISOString();
    const version = input.expectedVersion + 1;
    const nextGame: GameRecord = {
      ...game,
      version,
      status: input.nextStatus,
      activePlayer: input.nextEngineState.activePlayer,
      phase: input.nextEngineState.phase,
      turn: input.nextEngineState.turn,
      winner: input.nextEngineState.winner,
      engineState: cloneJson(input.nextEngineState),
      updatedAt: now,
      lastMoveAt: now,
    };
    const move: MoveRecord = {
      gameId: input.gameId,
      realtimeTopic: game.realtimeTopic,
      version,
      actorRole: input.actorRole,
      privateAction: cloneJson(input.privateAction),
      publicEvents: cloneJson(input.publicEvents),
      publicSummary: input.publicSummary,
      createdAt: now,
    };

    this.games.set(input.gameId, nextGame);
    this.moves.set(moveKey(input.gameId, version), move);
    this.publicInvalidations.set(moveKey(input.gameId, version), {
      realtimeTopic: game.realtimeTopic,
      version,
      actorRole: input.actorRole,
      publicSummary: input.publicSummary,
      createdAt: now,
    });
    return version;
  }

  getMoveForTest(gameId: string, version: number): MoveRecord | null {
    const move = this.moves.get(moveKey(gameId, version));
    return move ? cloneJson(move) : null;
  }

  getGameForTest(gameId: string): GameRecord | null {
    const game = this.games.get(gameId);
    return game ? cloneJson(game) : null;
  }

  getPublicInvalidationForTest(gameId: string, version: number): PublicMoveRealtimePayload | null {
    const invalidation = this.publicInvalidations.get(moveKey(gameId, version));
    return invalidation ? cloneJson(invalidation) : null;
  }

  setSeatHeartbeatForTest(gameId: string, role: PlayerId, heartbeatAt: string): void {
    const key = seatKey(gameId, role);
    const seat = this.seats.get(key);
    if (!seat) {
      return;
    }

    this.seats.set(key, {
      ...seat,
      heartbeatAt,
    });
  }
}

export class SupabaseGameStore implements OnlineGameStore {
  constructor(private readonly client: SupabaseClient) {}

  async insertGame(record: Omit<GameRecord, "createdAt" | "updatedAt" | "lastMoveAt">): Promise<GameRecord> {
    const { data, error } = await this.client
      .from("duel_games")
      .insert(toDbGameInsert(record))
      .select("*")
      .single();

    if (error) {
      throw new OnlineGameError(409, "game_insert_failed", error.message);
    }

    return fromDbGame(data);
  }

  async getGameByIdOrCode(gameIdOrCode: string): Promise<GameRecord | null> {
    const normalized = gameIdOrCode.trim().toUpperCase();
    const query = isUuid(gameIdOrCode)
      ? this.client.from("duel_games").select("*").eq("id", gameIdOrCode)
      : this.client.from("duel_games").select("*").eq("code", normalized);
    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new OnlineGameError(500, "game_lookup_failed", error.message);
    }

    return data ? fromDbGame(data) : null;
  }

  async listSeats(gameId: string): Promise<SeatRecord[]> {
    const { data, error } = await this.client
      .from("duel_seats")
      .select("*")
      .eq("game_id", gameId)
      .order("role", { ascending: true });

    if (error) {
      throw new OnlineGameError(500, "seat_lookup_failed", error.message);
    }

    return (data ?? []).map(fromDbSeat);
  }

  async getSeat(gameId: string, role: PlayerId): Promise<SeatRecord | null> {
    const { data, error } = await this.client
      .from("duel_seats")
      .select("*")
      .eq("game_id", gameId)
      .eq("role", role)
      .maybeSingle();

    if (error) {
      throw new OnlineGameError(500, "seat_lookup_failed", error.message);
    }

    return data ? fromDbSeat(data) : null;
  }

  async insertSeat(record: Omit<SeatRecord, "claimedAt" | "heartbeatAt" | "disconnectedAt">): Promise<SeatRecord> {
    const { data, error } = await this.client
      .from("duel_seats")
      .insert({
        game_id: record.gameId,
        role: record.role,
        player_name: record.playerName,
        seat_token_hash: record.seatTokenHash,
        client_id: record.clientId,
      })
      .select("*")
      .single();

    if (error) {
      throw new OnlineGameError(409, "seat_occupied", error.message);
    }

    return fromDbSeat(data);
  }

  async replaceSeat(record: Omit<SeatRecord, "claimedAt" | "heartbeatAt" | "disconnectedAt">): Promise<SeatRecord> {
    const now = new Date().toISOString();
    const staleCutoff = new Date(Date.now() - STALE_SEAT_MS).toISOString();
    const { data, error } = await this.client
      .from("duel_seats")
      .update({
        player_name: record.playerName,
        seat_token_hash: record.seatTokenHash,
        client_id: record.clientId,
        claimed_at: now,
        heartbeat_at: now,
        disconnected_at: null,
      })
      .eq("game_id", record.gameId)
      .eq("role", record.role)
      .lt("heartbeat_at", staleCutoff)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new OnlineGameError(500, "seat_reclaim_failed", error.message);
    }

    if (!data) {
      throw new OnlineGameError(409, "seat_occupied", `${record.role} is already occupied.`);
    }

    return fromDbSeat(data);
  }

  async updateSeatHeartbeat(input: {
    readonly gameId: string;
    readonly role: PlayerId;
    readonly clientId: string;
  }): Promise<void> {
    const { error } = await this.client
      .from("duel_seats")
      .update({
        client_id: input.clientId,
        heartbeat_at: new Date().toISOString(),
        disconnected_at: null,
      })
      .eq("game_id", input.gameId)
      .eq("role", input.role);

    if (error) {
      throw new OnlineGameError(500, "heartbeat_failed", error.message);
    }
  }

  async deleteSeat(gameId: string, role: PlayerId, seatTokenHash: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("duel_seats")
      .delete({ count: "exact" })
      .eq("game_id", gameId)
      .eq("role", role)
      .eq("seat_token_hash", seatTokenHash);

    if (error) {
      throw new OnlineGameError(500, "leave_seat_failed", error.message);
    }

    return (count ?? 0) > 0;
  }

  async commitMetadataUpdate(input: CommitMetadataUpdateInput): Promise<number> {
    const { data, error } = await this.client.rpc("commit_duel_metadata_update", {
      p_game_id: input.gameId,
      p_next_status: input.nextStatus ?? null,
      p_public_summary: input.publicSummary,
    });

    if (error) {
      throw new OnlineGameError(500, "metadata_update_failed", error.message);
    }

    if (typeof data !== "number") {
      throw new OnlineGameError(500, "metadata_update_failed", "Supabase metadata update did not return a version.");
    }

    return data;
  }

  async commitMove(input: CommitMoveInput): Promise<number> {
    const { data, error } = await this.client.rpc("commit_duel_move", {
      p_game_id: input.gameId,
      p_expected_version: input.expectedVersion,
      p_actor_role: input.actorRole,
      p_private_action: input.privateAction,
      p_next_engine_state: input.nextEngineState,
      p_next_status: input.nextStatus,
      p_next_active_player: input.nextEngineState.activePlayer,
      p_next_phase: input.nextEngineState.phase,
      p_next_turn: input.nextEngineState.turn,
      p_next_winner: input.nextEngineState.winner,
      p_public_events: input.publicEvents,
      p_public_summary: input.publicSummary,
    });

    if (error) {
      if (error.message.toLowerCase().includes("version")) {
        throw new OnlineGameError(409, "version_conflict", "Game version changed. Fetch the latest view.");
      }

      throw new OnlineGameError(500, "commit_failed", error.message);
    }

    if (typeof data !== "number") {
      throw new OnlineGameError(500, "commit_failed", "Supabase commit did not return a version.");
    }

    return data;
  }
}

function applyOnlineCommand(
  engine: DuelState,
  role: PlayerId,
  command: OnlineCommand,
): { readonly state: DuelState; readonly events: readonly DuelEvent[] } {
  const eventStart = engine.events.length;

  if (command.type === "advance-turn-flow") {
    const legal = selectOnlineLegalState(engine, role);
    if (legal.discardRequiredCount > 0) {
      throw new OnlineGameError(400, "discard_required", "Discard required before ending this turn.");
    }

    return applyAdvanceTurnFlow(engine, role, eventStart);
  }

  if (command.type === "discard-and-advance") {
    const legal = selectOnlineLegalState(engine, role);
    if (legal.discardRequiredCount <= 0) {
      throw new OnlineGameError(400, "discard_not_required", "No discard is required right now.");
    }

    if (command.discardInstanceIds.length !== legal.discardRequiredCount) {
      throw new OnlineGameError(400, "invalid_discard_count", "Incorrect discard count.");
    }

    let state = engine;
    for (const instanceId of command.discardInstanceIds) {
      if (!state.players[role].hand.some((card) => card.instanceId === instanceId)) {
        throw new OnlineGameError(400, "invalid_discard", "Discarded cards must be in your hand.");
      }

      const result = applyAction(state, {
        type: "override-card-location",
        playerId: role,
        instanceId,
        destination: { zone: "graveyard" },
      });
      assertNoIllegalEvents(result.events);
      state = result.state;
    }

    return applyAdvanceTurnFlow(state, role, eventStart);
  }

  const action = commandToDuelAction(engine, role, command);
  const result = applyAction(engine, action);
  assertNoIllegalEvents(result.events);

  return {
    state: result.state,
    events: result.state.events.slice(eventStart),
  };
}

function commandToDuelAction(engine: DuelState, role: PlayerId, command: OnlineCommand): DuelAction {
  switch (command.type) {
    case "play-card": {
      const legal = getLegalActions(engine, role).filter(
        (action): action is Extract<DuelAction, { type: "play-card" }> => action.type === "play-card",
      );
      const match = legal.find(
        (action) =>
          action.instanceId === command.instanceId &&
          action.intent === command.intent &&
          action.zoneKind === command.zoneKind &&
          action.zoneIndex === command.zoneIndex,
      );

      if (!match) {
        throw new OnlineGameError(400, "illegal_command", "That card cannot be played there.");
      }

      return {
        ...match,
        tributeInstanceIds: command.tributeInstanceIds ? [...command.tributeInstanceIds] : [],
      };
    }
    case "activate-set-card": {
      const legal = selectOnlineLegalState(engine, role).activateSetCardIds;
      if (!legal.includes(command.instanceId)) {
        throw new OnlineGameError(400, "illegal_command", "That Set card cannot be activated now.");
      }

      return {
        type: "activate-set-card",
        playerId: role,
        instanceId: command.instanceId,
      };
    }
    case "attack": {
      const defenderInstanceId =
        command.target.kind === "monster-zone"
          ? engine.players[opponentOf(role)].monsterZones[command.target.zoneIndex]?.instance.instanceId
          : undefined;

      if (command.target.kind === "monster-zone" && !defenderInstanceId) {
        throw new OnlineGameError(400, "illegal_command", "No monster exists in that target zone.");
      }

      const legal = getLegalActions(engine, role).filter(
        (action): action is Extract<DuelAction, { type: "attack" }> => action.type === "attack",
      );
      const match = legal.find(
        (action) =>
          action.attackerInstanceId === command.attackerInstanceId &&
          (action.defenderInstanceId ?? null) === (defenderInstanceId ?? null),
      );

      if (!match) {
        throw new OnlineGameError(400, "illegal_command", "That attack is not legal.");
      }

      return match;
    }
    case "advance-turn-flow":
    case "discard-and-advance":
      throw new OnlineGameError(400, "illegal_command", "Turn-flow commands are handled separately.");
  }
}

function applyAdvanceTurnFlow(
  engine: DuelState,
  role: PlayerId,
  eventStart: number,
): { readonly state: DuelState; readonly events: readonly DuelEvent[] } {
  let result;

  if (engine.phase === "M1") {
    result = applyAction(engine, {
      type: canEnterBattle(engine, role) ? "advance-phase" : "end-turn",
      playerId: role,
    });
  } else if (engine.phase === "BP") {
    result = applyAction(engine, { type: "advance-phase", playerId: role });
  } else if (engine.phase === "M2" || engine.phase === "EP") {
    result = applyAction(engine, { type: "end-turn", playerId: role });
  } else {
    result = applyAction(engine, { type: "advance-phase", playerId: role });
  }

  assertNoIllegalEvents(result.events);
  const nextState =
    result.state.activePlayer === role ? advanceToNextDecision(result.state, role).state : result.state;
  const events = nextState.events.slice(eventStart);

  return { state: nextState, events };
}

function createInitialOnlineDuel(cards: readonly CardRecord[], seed: string): DuelState {
  const assignment = assignRandomPlayableDecksToDuel([...cards], createSeededRng(seed));
  const engine = createDuel({
    cards: [...cards],
    seed,
    mode: "match",
    decks: assignment.decks,
  });

  return advanceToNextDecision(engine, "P1").state;
}

function createShareCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

function sanitizePlayerName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ").slice(0, 32);
  return trimmed.length > 0 ? trimmed : DEFAULT_PLAYER_NAME;
}

function canEnterBattle(engine: DuelState, playerId: PlayerId): boolean {
  if (engine.phase !== "M1") {
    return false;
  }

  return engine.players[playerId].monsterZones.some(
    (zone) => zone && !zone.faceDown && zone.position === "attack" && !zone.instance.attackedThisTurn,
  );
}

function assertNoIllegalEvents(events: readonly DuelEvent[]): void {
  const illegal = events.find((event) => event.type === "illegal-action");

  if (illegal) {
    throw new OnlineGameError(400, "illegal_command", illegal.message);
  }
}

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}

function seatKey(gameId: string, role: PlayerId): string {
  return `${gameId}:${role}`;
}

function moveKey(gameId: string, version: number): string {
  return `${gameId}:${version}`;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createRealtimeTopic(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function isStaleSeat(seat: SeatRecord): boolean {
  const heartbeat = Date.parse(seat.heartbeatAt);
  return Number.isFinite(heartbeat) && Date.now() - heartbeat > STALE_SEAT_MS;
}

function toDbGameInsert(record: Omit<GameRecord, "createdAt" | "updatedAt" | "lastMoveAt">) {
  return {
    id: record.id,
    code: record.code,
    realtime_topic: record.realtimeTopic,
    status: record.status,
    version: record.version,
    seed: record.seed,
    active_player: record.activePlayer,
    phase: record.phase,
    turn: record.turn,
    winner: record.winner,
    engine_state: record.engineState,
  };
}

function fromDbGame(row: Record<string, unknown>): GameRecord {
  return {
    id: String(row.id),
    code: String(row.code),
    realtimeTopic: typeof row.realtime_topic === "string" ? String(row.realtime_topic) : String(row.id),
    status: row.status as OnlineGameStatus,
    version: Number(row.version),
    seed: String(row.seed),
    activePlayer: row.active_player as PlayerId | null,
    phase: row.phase as GameRecord["phase"],
    turn: typeof row.turn === "number" ? row.turn : row.turn == null ? null : Number(row.turn),
    winner: row.winner as PlayerId | null,
    engineState: row.engine_state as DuelState,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastMoveAt: row.last_move_at ? String(row.last_move_at) : null,
  };
}

function fromDbSeat(row: Record<string, unknown>): SeatRecord {
  return {
    gameId: String(row.game_id),
    role: row.role as PlayerId,
    playerName: String(row.player_name),
    seatTokenHash: String(row.seat_token_hash),
    clientId: String(row.client_id),
    claimedAt: String(row.claimed_at),
    heartbeatAt: String(row.heartbeat_at),
    disconnectedAt: row.disconnected_at ? String(row.disconnected_at) : null,
  };
}
