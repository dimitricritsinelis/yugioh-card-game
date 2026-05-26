import type { PlayerId } from "../types";
import type { InstanceId, ZoneRef } from "./cardRefs";
import type { DuelState, PlayerState } from "./state";

const MAX_MONSTER_ZONES = 5;
const MAX_SPELL_TRAP_ZONES = 5;

export interface LocatedCardRef {
  readonly instanceId: InstanceId;
  readonly cardId: string;
  readonly ref: ZoneRef;
}

export interface InvariantResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateDuelStateInvariants(state: DuelState): InvariantResult {
  const errors: string[] = [];
  const locationsByInstanceId = new Map<InstanceId, LocatedCardRef[]>();

  for (const playerId of ["P1", "P2"] as const) {
    const player = state.players[playerId];

    if (player.monsterZones.length > MAX_MONSTER_ZONES) {
      errors.push(`${playerId} has ${player.monsterZones.length} Monster Zones; maximum is ${MAX_MONSTER_ZONES}.`);
    }

    if (player.spellTrapZones.length > MAX_SPELL_TRAP_ZONES) {
      errors.push(
        `${playerId} has ${player.spellTrapZones.length} Spell/Trap Zones; maximum is ${MAX_SPELL_TRAP_ZONES}.`,
      );
    }

    for (const location of collectPlayerCardLocations(playerId, player)) {
      const existing = locationsByInstanceId.get(location.instanceId) ?? [];
      locationsByInstanceId.set(location.instanceId, [...existing, location]);
    }
  }

  for (const [instanceId, locations] of locationsByInstanceId) {
    if (locations.length !== 1) {
      errors.push(
        `Card instance ${instanceId} appears in ${locations.length} locations; expected exactly one location.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertDuelStateInvariants(state: DuelState): void {
  const result = validateDuelStateInvariants(state);

  if (!result.valid) {
    throw new Error(result.errors.join(" "));
  }
}

export function collectCardLocations(state: DuelState): readonly LocatedCardRef[] {
  return (["P1", "P2"] as const).flatMap((playerId) => collectPlayerCardLocations(playerId, state.players[playerId]));
}

function collectPlayerCardLocations(playerId: PlayerId, player: PlayerState): LocatedCardRef[] {
  const locations: LocatedCardRef[] = [];

  player.mainDeck.forEach((card, index) => {
    locations.push({ instanceId: card.instanceId, cardId: card.cardId, ref: { playerId, zone: "mainDeck", index } });
  });

  (player.fusionDeck ?? []).forEach((card, index) => {
    locations.push({ instanceId: card.instanceId, cardId: card.cardId, ref: { playerId, zone: "fusionDeck", index } });
  });

  player.hand.forEach((card, index) => {
    locations.push({ instanceId: card.instanceId, cardId: card.cardId, ref: { playerId, zone: "hand", index } });
  });

  player.monsterZones.forEach((card, index) => {
    if (card) {
      locations.push({ instanceId: card.instanceId, cardId: card.cardId, ref: { playerId, zone: "monsterZone", index } });
    }
  });

  player.spellTrapZones.forEach((card, index) => {
    if (card) {
      locations.push({
        instanceId: card.instanceId,
        cardId: card.cardId,
        ref: { playerId, zone: "spellTrapZone", index },
      });
    }
  });

  player.graveyard.forEach((card, index) => {
    locations.push({ instanceId: card.instanceId, cardId: card.cardId, ref: { playerId, zone: "graveyard", index } });
  });

  player.banished.forEach((card, index) => {
    locations.push({ instanceId: card.instanceId, cardId: card.cardId, ref: { playerId, zone: "banished", index } });
  });

  if (player.fieldZone) {
    locations.push({
      instanceId: player.fieldZone.instanceId,
      cardId: player.fieldZone.cardId,
      ref: { playerId, zone: "fieldZone" },
    });
  }

  return locations;
}
