import type { SpellSpeed } from "../cards/CardScript";
import type { PaidCost } from "../effects/costs";
import type { SelectedTargets, TargetSpec } from "../effects/targets";
import type { EngineEvent } from "../events";
import type { PlayerId } from "../types";

export interface ChainLink {
  readonly id: string;
  readonly playerId: PlayerId;
  readonly sourceInstanceId: string;
  readonly cardId: string;
  readonly effectId: string;
  readonly spellSpeed: SpellSpeed;
  readonly paidCosts?: readonly PaidCost[];
  readonly targetSpecs?: readonly TargetSpec[];
  readonly selectedTargets?: SelectedTargets;
  readonly triggerEvent?: EngineEvent;
}

export function createChainLink(input: Omit<ChainLink, "id">, currentChain: readonly ChainLink[]): ChainLink {
  return Object.freeze({
    ...input,
    id: `chain-${currentChain.length + 1}`,
  });
}

export function addChainLink(currentChain: readonly ChainLink[], link: ChainLink): readonly ChainLink[] {
  return Object.freeze([...currentChain, link]);
}

export function resolveChainLifo(currentChain: readonly ChainLink[]): {
  readonly resolvedLinks: readonly ChainLink[];
  readonly remainingChain: readonly ChainLink[];
} {
  return Object.freeze({
    resolvedLinks: Object.freeze([...currentChain].reverse()),
    remainingChain: Object.freeze([]),
  });
}
