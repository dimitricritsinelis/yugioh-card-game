import { getCardScriptForDefinitions } from "../cards/unsupported";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import type { PlayerId } from "../types";
import type { EffectTargetFilter } from "./continuous";

export type DestructionReason = "battle" | "effect" | "rule";
export type DestructionReplacementAction = "prevent" | "banish-instead";

export interface DestructionReplacementSpec {
  readonly target: EffectTargetFilter;
  readonly reasons?: readonly DestructionReason[];
  readonly action: DestructionReplacementAction;
}

export interface ReplacementEffectDefinition {
  readonly destruction?: DestructionReplacementSpec;
}

export interface DestructionReplacementInput {
  readonly playerId: PlayerId;
  readonly card: ZoneCard;
  readonly reason: DestructionReason;
}

export interface DestructionReplacementResult {
  readonly replaced: boolean;
  readonly action?: DestructionReplacementAction;
  readonly sourceInstanceId?: string;
}

export function findDestructionReplacement(
  state: DuelState,
  input: DestructionReplacementInput,
): DestructionReplacementResult {
  for (const source of collectReplacementSources(state)) {
    const spec = source.definition.destruction;

    if (!spec) {
      continue;
    }

    if (spec.reasons && !spec.reasons.includes(input.reason)) {
      continue;
    }

    if (!matchesTarget(input, source.playerId, spec.target)) {
      continue;
    }

    return {
      replaced: true,
      action: spec.action,
      sourceInstanceId: source.sourceInstanceId,
    };
  }

  return { replaced: false };
}

function collectReplacementSources(state: DuelState): readonly {
  readonly playerId: PlayerId;
  readonly sourceInstanceId: string;
  readonly definition: ReplacementEffectDefinition;
}[] {
  const sources: {
    readonly playerId: PlayerId;
    readonly sourceInstanceId: string;
    readonly definition: ReplacementEffectDefinition;
  }[] = [];

  for (const playerId of ["P1", "P2"] as const) {
    state.players[playerId].monsterZones.forEach((card) => {
      collectCardReplacementSources(state, playerId, card, sources);
    });
    state.players[playerId].spellTrapZones.forEach((card) => {
      collectCardReplacementSources(state, playerId, card, sources);
    });
    collectCardReplacementSources(state, playerId, state.players[playerId].fieldZone, sources);
  }

  return Object.freeze(sources);
}

function collectCardReplacementSources(
  state: DuelState,
  playerId: PlayerId,
  card: ZoneCard | null,
  sources: {
    readonly playerId: PlayerId;
    readonly sourceInstanceId: string;
    readonly definition: ReplacementEffectDefinition;
  }[],
): void {
  if (!card || card.face !== "faceUp") {
    return;
  }

  const script = getCardScriptForDefinitions(card.cardId, state.cardDefinitions, state.cardScripts);

  for (const effect of script?.effects ?? []) {
    if (effect.kind === "replacement" && effect.implemented && effect.replacement) {
      sources.push({
        playerId,
        sourceInstanceId: card.instanceId,
        definition: effect.replacement,
      });
    }
  }
}

function matchesTarget(
  input: DestructionReplacementInput,
  sourcePlayerId: PlayerId,
  target: EffectTargetFilter,
): boolean {
  if (target.controller && target.controller !== "any") {
    const own = input.playerId === sourcePlayerId;

    if (target.controller === "own" && !own) {
      return false;
    }

    if (target.controller === "opponent" && own) {
      return false;
    }
  }

  if (target.instanceIds && !target.instanceIds.includes(input.card.instanceId)) {
    return false;
  }

  if (target.cardIds && !target.cardIds.includes(input.card.cardId)) {
    return false;
  }

  if (target.face && target.face !== "any" && input.card.face !== target.face) {
    return false;
  }

  return true;
}
