import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { isPlayableCard } from "../cards/coverage";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];

describe("core phase flow", () => {
  it("progresses through all turn phases and draws during the first Draw Phase", () => {
    let state = createFixtureDuel().state;

    expect(state.phase).toBe("DP");
    expect(state.players.P1.hand).toHaveLength(5);
    expect(state.players.P1.mainDeck).toHaveLength(35);

    let result = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" });

    expect(result.errors).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual(["card-drawn", "phase-changed"]);
    expect(result.state.phase).toBe("SP");
    expect(result.state.players.P1.hand).toHaveLength(6);
    expect(result.state.players.P1.mainDeck).toHaveLength(34);

    state = result.state;
    result = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "M1" });
    expect(result.state.phase).toBe("M1");
    expect(result.events[0]).toMatchObject({
      type: "phase-changed",
      from: "SP",
      to: "M1",
      metadata: { standbyPlaceholder: true },
    });

    state = result.state;
    for (const phase of ["BP", "M2", "EP"] as const) {
      result = reduceDuel(state, { type: "change-phase", playerId: "P1", phase });
      expect(result.errors).toEqual([]);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({ type: "phase-changed", to: phase });
      expect(result.state.phase).toBe(phase);
      state = result.state;
    }
  });

  it("starts the next player's turn in Draw Phase and draws for that turn", () => {
    let state = advanceToEndPhase(createFixtureDuel().state);
    const ended = reduceDuel(state, { type: "end-turn", playerId: "P1" });

    expect(ended.errors).toEqual([]);
    expect(ended.state.turn).toBe(2);
    expect(ended.state.phase).toBe("DP");
    expect(ended.state.activePlayer).toBe("P2");
    expect(ended.state.priorityPlayer).toBe("P2");
    expect(ended.events.map((event) => event.type)).toEqual(["phase-changed", "turn-started"]);

    state = ended.state;
    const p2Draw = reduceDuel(state, { type: "change-phase", playerId: "P2", phase: "SP" });

    expect(p2Draw.errors).toEqual([]);
    expect(p2Draw.state.players.P2.hand).toHaveLength(6);
    expect(p2Draw.state.players.P2.mainDeck).toHaveLength(34);
    expect(p2Draw.state.phase).toBe("SP");
  });

  it("discards down to six cards at End Phase without mutating input state", () => {
    const epState = advanceToEndPhase(createFixtureDuel().state);
    const extraCards = epState.players.P1.mainDeck.slice(0, 2);
    const oversizedHandState: DuelState = {
      ...epState,
      players: {
        ...epState.players,
        P1: {
          ...epState.players.P1,
          mainDeck: epState.players.P1.mainDeck.slice(3),
          hand: [...epState.players.P1.hand, ...extraCards],
          normalSummonUsed: true,
        },
      },
    };
    const frozen = deepFreeze(oversizedHandState);
    const before = JSON.parse(JSON.stringify(frozen));
    const result = reduceDuel(frozen, { type: "end-turn", playerId: "P1" });
    const movedEvents = result.events.filter((event) => event.type === "card-moved");

    expect(frozen).toEqual(before);
    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.hand).toHaveLength(6);
    expect(result.state.players.P1.graveyard).toHaveLength(2);
    expect(result.state.players.P1.graveyard.map((card) => card.instanceId)).toEqual([
      oversizedHandState.players.P1.hand[6].instanceId,
      oversizedHandState.players.P1.hand[7].instanceId,
    ]);
    expect(result.state.players.P1.normalSummonUsed).toBe(false);
    expect(movedEvents).toHaveLength(2);
    expect(movedEvents.map((event) => event.metadata?.reason)).toEqual([
      "hand-size-discard",
      "hand-size-discard",
    ]);
  });

  it("rejects skipped phases and wrong-player turn commands", () => {
    const state = deepFreeze(createFixtureDuel().state);
    const before = JSON.parse(JSON.stringify(state));
    const skipped = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "M1" });
    const wrongPlayer = reduceDuel(state, { type: "change-phase", playerId: "P2", phase: "SP" });

    expect(state).toEqual(before);
    expect(skipped.errors[0]?.code).toBe("illegal-action");
    expect(skipped.state).not.toBe(state);
    expect(skipped.state.phase).toBe("DP");
    expect(skipped.events[0]).toMatchObject({ type: "illegal-action" });
    expect(wrongPlayer.errors[0]?.message).toBe("It is not P2's turn.");
  });
});

function createFixtureDuel() {
  return createDuel({
    cards,
    decks: {
      P1: { main: legalMainDeck(40) },
      P2: { main: [...legalMainDeck(40)].reverse() },
    },
    seed: "phase-flow",
    shuffleDecks: false,
  });
}

function advanceToEndPhase(state: DuelState): DuelState {
  let current = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  for (const phase of ["M1", "BP", "M2", "EP"] as const) {
    current = reduceDuel(current, { type: "change-phase", playerId: "P1", phase }).state;
  }

  return current;
}

function legalMainDeck(size: number): string[] {
  const passcodes = cards
    .filter(
      (card) =>
        card.legality.goat_world_pool &&
        card.legality.max_copies > 0 &&
        isPlayableCard(card.passcode, cards),
    )
    .map((card) => card.passcode);

  if (passcodes.length < size) {
    throw new Error(`Not enough legal fixture cards for ${size}-card deck.`);
  }

  return passcodes.slice(0, size);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}
