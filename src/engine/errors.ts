import type { PlayerId } from "./types";

export type EngineErrorCode =
  | "invalid-command"
  | "invalid-player"
  | "invalid-zone"
  | "invalid-card"
  | "illegal-action"
  | "unsupported-card"
  | "missing-prompt"
  | "invariant-violation";

export interface EngineError {
  readonly code: EngineErrorCode;
  readonly message: string;
  readonly playerId?: PlayerId;
  readonly commandType?: string;
  readonly cardId?: string;
  readonly instanceId?: string;
}
