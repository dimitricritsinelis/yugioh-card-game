import type { ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import type { CardDefinition } from "../data/cardCatalog";
import type { PlayerId } from "../types";

export type TargetController = "own" | "opponent" | "any";
export type TargetFace = "faceUp" | "faceDown" | "any";
export type TargetCardKind = "monster" | "spell" | "trap";

export interface CardTargetSpec {
  readonly kind: "card";
  readonly controller: TargetController;
  readonly zones: readonly ZoneRef["zone"][];
  readonly cardKinds?: readonly TargetCardKind[];
  readonly face?: TargetFace;
  readonly min: number;
  readonly max: number;
}

export interface PlayerTargetSpec {
  readonly kind: "player";
  readonly controller: TargetController;
  readonly min: number;
  readonly max: number;
}

export type TargetSpec = CardTargetSpec | PlayerTargetSpec;

export interface TargetSelection {
  readonly targetRefs?: readonly ZoneRef[];
  readonly targetPlayerIds?: readonly PlayerId[];
}

export interface SelectedTargets {
  readonly targetRefs: readonly ZoneRef[];
  readonly targetPlayerIds: readonly PlayerId[];
}

export interface TargetValidationResult {
  readonly valid: boolean;
  readonly selectedTargets: SelectedTargets;
  readonly reason?: string;
}

export function validateTargetSelection(
  state: DuelState,
  activatingPlayerId: PlayerId,
  specs: readonly TargetSpec[],
  selection: TargetSelection,
  cardDefinitions: Readonly<Record<string, CardDefinition>> | undefined = state.cardDefinitions,
): TargetValidationResult {
  const targetRefs = selection.targetRefs ?? [];
  const targetPlayerIds = selection.targetPlayerIds ?? [];
  const cardSpecs = specs.filter((spec): spec is CardTargetSpec => spec.kind === "card");
  const playerSpecs = specs.filter((spec): spec is PlayerTargetSpec => spec.kind === "player");

  if (cardSpecs.length === 0 && targetRefs.length > 0) {
    return invalid("No card targets are required.", targetRefs, targetPlayerIds);
  }

  if (playerSpecs.length === 0 && targetPlayerIds.length > 0) {
    return invalid("No player targets are required.", targetRefs, targetPlayerIds);
  }

  for (const spec of cardSpecs) {
    const countError = validateCount(targetRefs.length, spec.min, spec.max, "card target");

    if (countError) {
      return invalid(countError, targetRefs, targetPlayerIds);
    }

    for (const ref of targetRefs) {
      const reason = validateCardTarget(state, activatingPlayerId, spec, ref, cardDefinitions);

      if (reason) {
        return invalid(reason, targetRefs, targetPlayerIds);
      }
    }
  }

  for (const spec of playerSpecs) {
    const countError = validateCount(targetPlayerIds.length, spec.min, spec.max, "player target");

    if (countError) {
      return invalid(countError, targetRefs, targetPlayerIds);
    }

    for (const targetPlayerId of targetPlayerIds) {
      const reason = validatePlayerTarget(activatingPlayerId, spec, targetPlayerId);

      if (reason) {
        return invalid(reason, targetRefs, targetPlayerIds);
      }
    }
  }

  return {
    valid: true,
    selectedTargets: Object.freeze({
      targetRefs: Object.freeze([...targetRefs]),
      targetPlayerIds: Object.freeze([...targetPlayerIds]),
    }),
  };
}

export function validateStoredTargets(
  state: DuelState,
  activatingPlayerId: PlayerId,
  specs: readonly TargetSpec[] | undefined,
  targets: SelectedTargets | undefined,
): TargetValidationResult {
  return validateTargetSelection(state, activatingPlayerId, specs ?? [], targets ?? {}, state.cardDefinitions);
}

function validateCardTarget(
  state: DuelState,
  activatingPlayerId: PlayerId,
  spec: CardTargetSpec,
  ref: ZoneRef,
  cardDefinitions: Readonly<Record<string, CardDefinition>> | undefined,
): string | null {
  const card = cardAtRef(state, ref);

  if (!card) {
    return "Stored target is no longer valid.";
  }

  if (!spec.zones.includes(ref.zone)) {
    return `Target must be in ${spec.zones.join(" or ")}.`;
  }

  if (!matchesController(activatingPlayerId, ref.playerId, spec.controller)) {
    return "Target controller does not match target requirements.";
  }

  if (spec.face && spec.face !== "any" && "face" in card && card.face !== spec.face) {
    return `Target must be ${spec.face}.`;
  }

  if (spec.cardKinds && spec.cardKinds.length > 0) {
    const cardKind = cardDefinitions?.[card.cardId]?.kind ?? inferKindFromZone(ref.zone);

    if (!cardKind || !spec.cardKinds.includes(cardKind)) {
      return `Target must be a ${spec.cardKinds.join(" or ")} card.`;
    }
  }

  return null;
}

function validatePlayerTarget(
  activatingPlayerId: PlayerId,
  spec: PlayerTargetSpec,
  targetPlayerId: PlayerId,
): string | null {
  if (!matchesController(activatingPlayerId, targetPlayerId, spec.controller)) {
    return "Player target does not match target requirements.";
  }

  return null;
}

function cardAtRef(state: DuelState, ref: ZoneRef) {
  const player = state.players[ref.playerId];

  switch (ref.zone) {
    case "mainDeck":
      return player.mainDeck[ref.index] ?? null;
    case "hand":
      return player.hand[ref.index] ?? null;
    case "monsterZone":
      return player.monsterZones[ref.index] ?? null;
    case "spellTrapZone":
      return player.spellTrapZones[ref.index] ?? null;
    case "graveyard":
      return player.graveyard[ref.index] ?? null;
    case "banished":
      return player.banished[ref.index] ?? null;
    case "fieldZone":
      return player.fieldZone;
  }
}

function matchesController(activatingPlayerId: PlayerId, targetPlayerId: PlayerId, controller: TargetController): boolean {
  switch (controller) {
    case "own":
      return targetPlayerId === activatingPlayerId;
    case "opponent":
      return targetPlayerId !== activatingPlayerId;
    case "any":
      return true;
  }
}

function inferKindFromZone(zone: ZoneRef["zone"]): TargetCardKind | null {
  switch (zone) {
    case "monsterZone":
      return "monster";
    case "spellTrapZone":
    case "fieldZone":
      return "spell";
    case "mainDeck":
    case "hand":
    case "graveyard":
    case "banished":
      return null;
  }
}

function validateCount(count: number, min: number, max: number, label: string): string | null {
  if (count < min) {
    return `Effect requires at least ${min} ${label}(s).`;
  }

  if (count > max) {
    return `Effect allows at most ${max} ${label}(s).`;
  }

  return null;
}

function invalid(reason: string, targetRefs: readonly ZoneRef[], targetPlayerIds: readonly PlayerId[]): TargetValidationResult {
  return {
    valid: false,
    reason,
    selectedTargets: {
      targetRefs,
      targetPlayerIds,
    },
  };
}
