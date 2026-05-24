import type { InstanceId, ZoneRef } from "../core/cardRefs";
import { findCardByInstanceId, moveCard, revealCard } from "../core/zones";
import type { DuelState } from "../core/state";
import type { PlayerId } from "../types";

export type CostKind =
  | "none"
  | "discard"
  | "tribute"
  | "tribute-source"
  | "remove-counter-from-source"
  | "pay-lp"
  | "send-to-graveyard"
  | "banish-from-graveyard"
  | "reveal";

export type CostSpec =
  | { readonly kind: "none" }
  | { readonly kind: "discard"; readonly count: number }
  | { readonly kind: "tribute"; readonly count: number }
  | { readonly kind: "tribute-source" }
  | { readonly kind: "remove-counter-from-source"; readonly counterType: string; readonly count: number }
  | { readonly kind: "pay-lp"; readonly amount: number }
  | { readonly kind: "send-to-graveyard"; readonly count: number }
  | { readonly kind: "banish-from-graveyard"; readonly count: number }
  | { readonly kind: "reveal"; readonly count: number };

export interface CostPayment {
  readonly instanceIds?: readonly InstanceId[];
  readonly sourceInstanceId?: InstanceId;
}

export interface PaidCost {
  readonly kind: CostKind;
  readonly instanceIds?: readonly InstanceId[];
  readonly amount?: number;
}

export interface PayCostsResult {
  readonly valid: boolean;
  readonly state: DuelState;
  readonly paidCosts: readonly PaidCost[];
  readonly reason?: string;
}

export function payCosts(
  state: DuelState,
  playerId: PlayerId,
  costs: readonly CostSpec[],
  payment: CostPayment = {},
): PayCostsResult {
  let nextState = state;
  let paymentIndex = 0;
  const paidCosts: PaidCost[] = [];
  const instanceIds = payment.instanceIds ?? [];

  for (const cost of costs) {
    switch (cost.kind) {
      case "none":
        paidCosts.push(Object.freeze({ kind: "none" }));
        break;
      case "pay-lp": {
        if (nextState.players[playerId].lp < cost.amount) {
          return invalid(nextState, paidCosts, "Not enough LP to pay that cost.");
        }

        nextState = {
          ...nextState,
          players: {
            ...nextState.players,
            [playerId]: {
              ...nextState.players[playerId],
              lp: nextState.players[playerId].lp - cost.amount,
            },
          },
        };
        paidCosts.push(Object.freeze({ kind: cost.kind, amount: cost.amount }));
        break;
      }
      case "tribute-source": {
        if (!payment.sourceInstanceId) {
          return invalid(nextState, paidCosts, "Source tribute cost requires an activating source.");
        }

        const paid = payCardCost(nextState, playerId, "tribute", [payment.sourceInstanceId]);

        if (!paid.valid) {
          return invalid(nextState, paidCosts, paid.reason ?? "Cost could not be paid.");
        }

        nextState = paid.state;
        paidCosts.push(Object.freeze({ kind: cost.kind, instanceIds: Object.freeze([payment.sourceInstanceId]) }));
        break;
      }
      case "remove-counter-from-source": {
        if (!payment.sourceInstanceId) {
          return invalid(nextState, paidCosts, "Counter cost requires an activating source.");
        }

        const paid = removeCounterCost(nextState, playerId, payment.sourceInstanceId, cost.counterType, cost.count);

        if (!paid.valid) {
          return invalid(nextState, paidCosts, paid.reason ?? "Cost could not be paid.");
        }

        nextState = paid.state;
        paidCosts.push(Object.freeze({ kind: cost.kind, instanceIds: Object.freeze([payment.sourceInstanceId]), amount: cost.count }));
        break;
      }
      case "discard":
      case "tribute":
      case "send-to-graveyard":
      case "banish-from-graveyard":
      case "reveal": {
        const selected = instanceIds.slice(paymentIndex, paymentIndex + cost.count);
        paymentIndex += cost.count;

        if (selected.length !== cost.count) {
          return invalid(nextState, paidCosts, `Cost requires exactly ${cost.count} card(s).`);
        }

        const paid = payCardCost(nextState, playerId, cost.kind, selected);

        if (!paid.valid) {
          return invalid(nextState, paidCosts, paid.reason ?? "Cost could not be paid.");
        }

        nextState = paid.state;
        paidCosts.push(Object.freeze({ kind: cost.kind, instanceIds: Object.freeze([...selected]) }));
        break;
      }
    }
  }

  return {
    valid: true,
    state: nextState,
    paidCosts: Object.freeze(paidCosts),
  };
}

function payCardCost(
  state: DuelState,
  playerId: PlayerId,
  kind: Exclude<CostKind, "none" | "pay-lp" | "tribute-source" | "remove-counter-from-source">,
  instanceIds: readonly InstanceId[],
): PayCostsResult {
  let nextState = state;

  for (const instanceId of instanceIds) {
    const located = findCardByInstanceId(nextState, instanceId);

    if (!located) {
      return invalid(nextState, [], "Cost card was not found.");
    }

    if (located.ref.playerId !== playerId) {
      return invalid(nextState, [], "Cost card must be controlled by the paying player.");
    }

    const zoneError = validateCostZone(kind, located.ref);

    if (zoneError) {
      return invalid(nextState, [], zoneError);
    }

    if (kind === "reveal") {
      nextState = revealCostCard(nextState, located.ref);
      continue;
    }

    const destination = destinationForCost(kind, playerId);

    nextState = moveCard(nextState, located.ref, destination, {
      face: "faceUp",
      visibility: "public",
    });
  }

  return {
    valid: true,
    state: nextState,
    paidCosts: [],
  };
}

function validateCostZone(
  kind: Exclude<CostKind, "none" | "pay-lp" | "tribute-source" | "remove-counter-from-source">,
  ref: ZoneRef,
): string | null {
  switch (kind) {
    case "discard":
      return ref.zone === "hand" ? null : "Discard costs must use cards from hand.";
    case "tribute":
      return ref.zone === "monsterZone" ? null : "Tribute costs must use monsters on the field.";
    case "send-to-graveyard":
      return ["hand", "monsterZone", "spellTrapZone", "fieldZone"].includes(ref.zone)
        ? null
        : "Send-to-Graveyard costs must use a card from hand or field.";
    case "banish-from-graveyard":
      return ref.zone === "graveyard" ? null : "Banish costs must use cards in the Graveyard.";
    case "reveal":
      return ["hand", "monsterZone", "spellTrapZone", "fieldZone"].includes(ref.zone)
        ? null
        : "Reveal costs must use a card from hand or field.";
  }
}

function destinationForCost(
  kind: Exclude<CostKind, "none" | "pay-lp" | "reveal" | "tribute-source" | "remove-counter-from-source">,
  playerId: PlayerId,
): ZoneRef {
  switch (kind) {
    case "discard":
    case "tribute":
    case "send-to-graveyard":
      return { playerId, zone: "graveyard", index: 0 };
    case "banish-from-graveyard":
      return { playerId, zone: "banished", index: 0 };
  }
}

function removeCounterCost(
  state: DuelState,
  playerId: PlayerId,
  sourceInstanceId: InstanceId,
  counterType: string,
  count: number,
): PayCostsResult {
  const located = findCardByInstanceId(state, sourceInstanceId);

  if (!located || !("counters" in located.card)) {
    return invalid(state, [], "Counter cost source was not found on the field.");
  }

  if (located.ref.playerId !== playerId) {
    return invalid(state, [], "Counter cost source must be controlled by the paying player.");
  }

  const current = located.card.counters[counterType] ?? 0;

  if (current < count) {
    return invalid(state, [], "Source does not have enough counters to pay that cost.");
  }

  const nextCounters = {
    ...located.card.counters,
    [counterType]: current - count,
  };
  const nextCard = {
    ...located.card,
    counters: nextCounters[counterType] > 0
      ? nextCounters
      : Object.fromEntries(Object.entries(nextCounters).filter(([type]) => type !== counterType)),
  };

  return {
    valid: true,
    state: replaceLocatedZoneCard(state, located.ref, nextCard),
    paidCosts: [],
  };
}

function replaceLocatedZoneCard(state: DuelState, ref: ZoneRef, card: NonNullable<ReturnType<typeof findCardByInstanceId>>["card"]): DuelState {
  if (!("counters" in card)) {
    return state;
  }

  switch (ref.zone) {
    case "monsterZone":
      return {
        ...state,
        players: {
          ...state.players,
          [ref.playerId]: {
            ...state.players[ref.playerId],
            monsterZones: state.players[ref.playerId].monsterZones.map((zoneCard, index) =>
              index === ref.index ? card : zoneCard,
            ),
          },
        },
      };
    case "spellTrapZone":
      return {
        ...state,
        players: {
          ...state.players,
          [ref.playerId]: {
            ...state.players[ref.playerId],
            spellTrapZones: state.players[ref.playerId].spellTrapZones.map((zoneCard, index) =>
              index === ref.index ? card : zoneCard,
            ),
          },
        },
      };
    case "fieldZone":
      return {
        ...state,
        players: {
          ...state.players,
          [ref.playerId]: {
            ...state.players[ref.playerId],
            fieldZone: card,
          },
        },
      };
    case "mainDeck":
    case "hand":
    case "graveyard":
    case "banished":
      return state;
  }
}

function revealCostCard(state: DuelState, ref: ZoneRef): DuelState {
  if (ref.zone === "hand" || ref.zone === "mainDeck") {
    return state;
  }

  return revealCard(state, ref);
}

function invalid(state: DuelState, paidCosts: readonly PaidCost[], reason: string): PayCostsResult {
  return {
    valid: false,
    state,
    paidCosts,
    reason,
  };
}
