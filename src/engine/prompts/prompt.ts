import type { EnginePrompt } from "../result";
import type { PlayerId } from "../types";

export type PromptKind = EnginePrompt["kind"];

export interface PromptDefinition {
  readonly kind: PromptKind;
  readonly message: string;
  readonly min: number;
  readonly max: number;
  readonly metadata?: Readonly<Record<string, string>>;
}

export function createPrompt(
  definition: PromptDefinition,
  playerId: PlayerId,
  id: string,
): EnginePrompt {
  return Object.freeze({
    id,
    playerId,
    kind: definition.kind,
    message: definition.message,
    min: definition.min,
    max: definition.max,
    metadata: definition.metadata,
  });
}

export function createTargetPrompt(playerId: PlayerId, id: string, min: number, max: number): EnginePrompt {
  return createPrompt(
    {
      kind: "target",
      message: `${playerId} must choose target cards.`,
      min,
      max,
    },
    playerId,
    id,
  );
}
