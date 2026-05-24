import type { EngineCommand } from "./commands";
import type { DuelState } from "./core/state";
import type { EngineError } from "./errors";
import type { EngineEvent } from "./events";
import type { PlayerId } from "./types";

export type { EngineEvent } from "./events";

export interface EnginePrompt {
  readonly id: string;
  readonly playerId: PlayerId;
  readonly kind: "choice" | "target" | "discard" | "tribute" | "chain-response" | "yes-no";
  readonly message: string;
  readonly min: number;
  readonly max: number;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface EngineResult {
  readonly state: DuelState;
  readonly command: EngineCommand;
  readonly events: readonly EngineEvent[];
  readonly prompts: readonly EnginePrompt[];
  readonly errors: readonly EngineError[];
}
