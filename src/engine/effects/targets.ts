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
  readonly cardIds?: readonly string[];
  readonly face?: TargetFace;
  readonly spellTrapIcon?: string;
  readonly monsterType?: string;
  readonly attribute?: string;
  readonly levelMin?: number;
  readonly levelMax?: number;
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
  readonly targetInstanceIds?: readonly string[];
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
      targetInstanceIds: Object.freeze(targetRefs.map((ref) => cardAtRef(state, ref)?.instanceId).filter(isString)),
    }),
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function validateStoredTargets(
  state: DuelState,
  activatingPlayerId: PlayerId,
  specs: readonly TargetSpec[] | undefined,
  targets: SelectedTargets | undefined,
): TargetValidationResult {
  if (!targets?.targetInstanceIds?.length) {
    return validateTargetSelection(state, activatingPlayerId, specs ?? [], targets ?? {}, state.cardDefinitions);
  }

  const targetRefs = (targets.targetRefs ?? []).map((ref, index) =>
    findRefByInstanceId(state, targets.targetInstanceIds?.[index]) ?? ref,
  );

  return validateTargetSelection(
    state,
    activatingPlayerId,
    specs ?? [],
    { ...targets, targetRefs },
    state.cardDefinitions,
  );
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

  if (spec.cardIds && !spec.cardIds.includes(card.cardId)) {
    return "Target card identity does not match target requirements.";
  }

  if (spec.spellTrapIcon !== undefined) {
    const definition = cardDefinitions?.[card.cardId];

    if (!definition || (definition.kind !== "spell" && definition.kind !== "trap")) {
      return "Target must be a Spell or Trap Card.";
    }

    if (definition.spellTrap.icon !== spec.spellTrapIcon) {
      return `Target must be a ${spec.spellTrapIcon} Spell Card.`;
    }
  }

  if (spec.monsterType !== undefined || spec.attribute !== undefined || spec.levelMin !== undefined || spec.levelMax !== undefined) {
    const definition = cardDefinitions?.[card.cardId];

    if (!definition || definition.kind !== "monster") {
      return "Target must be a monster.";
    }

    if (spec.monsterType !== undefined && definition.monster.type !== spec.monsterType) {
      return `Target must be a ${spec.monsterType} monster.`;
    }

    if (spec.attribute !== undefined && definition.monster.attribute !== spec.attribute) {
      return `Target must be a ${spec.attribute} monster.`;
    }

    if (spec.levelMin !== undefined && (definition.monster.level ?? 0) < spec.levelMin) {
      return `Target must be Level ${spec.levelMin} or higher.`;
    }

    if (spec.levelMax !== undefined && (definition.monster.level ?? 0) > spec.levelMax) {
      return `Target must be Level ${spec.levelMax} or lower.`;
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
    case "fusionDeck":
      return player.fusionDeck?.[ref.index] ?? null;
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

function findRefByInstanceId(state: DuelState, instanceId: string | undefined): ZoneRef | null {
  if (!instanceId) {
    return null;
  }

  for (const playerId of ["P1", "P2"] as const) {
    const player = state.players[playerId];
    const zones: readonly [ZoneRef["zone"], readonly ({ readonly instanceId: string } | null)[]][] = [
      ["mainDeck", player.mainDeck],
      ["fusionDeck", player.fusionDeck ?? []],
      ["hand", player.hand],
      ["monsterZone", player.monsterZones],
      ["spellTrapZone", player.spellTrapZones],
      ["graveyard", player.graveyard],
      ["banished", player.banished],
    ];

    for (const [zone, cards] of zones) {
      const index = cards.findIndex((card) => card?.instanceId === instanceId);

      if (index >= 0) {
        return { playerId, zone, index };
      }
    }

    if (player.fieldZone?.instanceId === instanceId) {
      return { playerId, zone: "fieldZone" };
    }
  }

  return null;
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
    case "fusionDeck":
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
