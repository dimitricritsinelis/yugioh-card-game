import { getCardScriptForDefinitions } from "../cards/unsupported";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import type { PlayerId } from "../types";
import type { EffectTargetFilter } from "./continuous";

export type DestructionReason = "battle" | "effect" | "rule";
export type DestructionReplacementAction = "prevent" | "banish-instead";
export type PreventionReplacementKind =
  | "damage"
  | "send-to-graveyard"
  | "banish"
  | "draw"
  | "discard"
  | "attack";
export type ReplacementKind = "destruction" | PreventionReplacementKind;
export type ReplacementAction = DestructionReplacementAction | "prevent";

export interface DestructionReplacementSpec {
  readonly target: EffectTargetFilter;
  readonly reasons?: readonly DestructionReason[];
  readonly action: DestructionReplacementAction;
}

export interface PreventionReplacementSpec {
  readonly kind: PreventionReplacementKind;
  readonly target?: EffectTargetFilter;
  readonly reasons?: readonly string[];
  readonly action: "prevent";
}

export interface ReplacementEffectDefinition {
  readonly destruction?: DestructionReplacementSpec;
  readonly prevention?: readonly PreventionReplacementSpec[];
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

export type ReplacementInput =
  | {
      readonly kind: "destruction";
      readonly playerId: PlayerId;
      readonly card: ZoneCard;
      readonly reason: DestructionReason;
    }
  | {
      readonly kind: PreventionReplacementKind;
      readonly playerId: PlayerId;
      readonly card?: ZoneCard;
      readonly reason?: string;
    };

export interface ReplacementResult {
  readonly replaced: boolean;
  readonly kind?: ReplacementKind;
  readonly action?: ReplacementAction;
  readonly sourceInstanceId?: string;
}

export function findDestructionReplacement(
  state: DuelState,
  input: DestructionReplacementInput,
): DestructionReplacementResult {
  const replacement = findReplacementEffect(state, {
    kind: "destruction",
    ...input,
  });

  if (!replacement.replaced) {
    return { replaced: false };
  }

  return {
    replaced: true,
    action: replacement.action as DestructionReplacementAction,
    sourceInstanceId: replacement.sourceInstanceId,
  };
}

export function findReplacementEffect(
  state: DuelState,
  input: ReplacementInput,
): ReplacementResult {
  for (const source of collectReplacementSources(state)) {
    const matched = matchReplacementSource(source, input);

    if (!matched) {
      continue;
    }

    return {
      replaced: true,
      kind: input.kind,
      action: matched.action,
      sourceInstanceId: source.sourceInstanceId,
    };
  }

  return { replaced: false };
}

function matchReplacementSource(
  source: {
    readonly playerId: PlayerId;
    readonly sourceInstanceId: string;
    readonly definition: ReplacementEffectDefinition;
  },
  input: ReplacementInput,
): { readonly action: ReplacementAction } | null {
  if (input.kind === "destruction") {
    const spec = source.definition.destruction;

    if (!spec) {
      return null;
    }

    if (spec.reasons && !spec.reasons.includes(input.reason)) {
      return null;
    }

    if (!matchesTarget(input, source.playerId, spec.target)) {
      return null;
    }

    return { action: spec.action };
  }

  const specs = source.definition.prevention ?? [];

  for (const spec of specs) {
    if (spec.kind !== input.kind) {
      continue;
    }

    if (spec.reasons && (!input.reason || !spec.reasons.includes(input.reason))) {
      continue;
    }

    if (spec.target && input.card && !matchesTarget({ playerId: input.playerId, card: input.card, reason: "rule" }, source.playerId, spec.target)) {
      continue;
    }

    if (spec.target && !input.card && !matchesControllerOnly(input.playerId, source.playerId, spec.target)) {
      continue;
    }

    return { action: spec.action };
  }

  return null;
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
  if (!matchesControllerOnly(input.playerId, sourcePlayerId, target)) {
    return false;
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

function matchesControllerOnly(
  targetPlayerId: PlayerId,
  sourcePlayerId: PlayerId,
  target: EffectTargetFilter,
): boolean {
  if (!target.controller || target.controller === "any") {
    return true;
  }

  const own = targetPlayerId === sourcePlayerId;

  if (target.controller === "own" && !own) {
    return false;
  }

  if (target.controller === "opponent" && own) {
    return false;
  }

  return true;
}
