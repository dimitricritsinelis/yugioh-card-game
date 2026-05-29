import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { createDuel, reduceDuel } from "../reducer";
import { deserializeDuelState, serializeDuelState } from "../serialization";

const cards = cardsJson as CardRecord[];

describe("core reducer shell", () => {
  it("creates a duel from two exact 40-card Main Decks", () => {
    const result = createDuel({
      cards,
      decks: {
        P1: { main: legalMainDeck(40) },
        P2: { main: reversedLegalMainDeck(40) },
      },
      seed: "core-create",
      firstPlayer: "P1",
    });

    expect(result.errors).toEqual([]);
    expect(result.prompts).toEqual([]);
    expect(result.state.phase).toBe("DP");
    expect(result.state.turn).toBe(1);
    expect(result.state.activePlayer).toBe("P1");
    expect(result.state.players.P1.lp).toBe(8000);
    expect(result.state.players.P1.hand).toHaveLength(5);
    expect(result.state.players.P1.mainDeck).toHaveLength(35);
    expect(result.state.players.P2.hand).toHaveLength(5);
    expect(result.state.players.P2.mainDeck).toHaveLength(35);
    expect(result.state.eventIds).toEqual(result.events.map((event) => event.id));
    expect(result.events.map((event) => event.type)).toEqual([
      "duel-started",
      "card-drawn",
      "card-drawn",
      "card-drawn",
      "card-drawn",
      "card-drawn",
      "card-drawn",
      "card-drawn",
      "card-drawn",
      "card-drawn",
      "card-drawn",
      "turn-started",
    ]);
  });

  it("uses deterministic opening hands for the same seed", () => {
    const decks = {
      P1: { main: legalMainDeck(40) },
      P2: { main: reversedLegalMainDeck(40) },
    };
    const first = createDuel({ cards, decks, seed: "same-opening" });
    const second = createDuel({ cards, decks, seed: "same-opening" });
    const different = createDuel({ cards, decks, seed: "different-opening" });

    expect(first.state.players.P1.hand.map((card) => card.instanceId)).toEqual(
      second.state.players.P1.hand.map((card) => card.instanceId),
    );
    expect(first.state.players.P2.hand.map((card) => card.instanceId)).toEqual(
      second.state.players.P2.hand.map((card) => card.instanceId),
    );
    expect(first.state.players.P1.hand.map((card) => card.instanceId)).not.toEqual(
      different.state.players.P1.hand.map((card) => card.instanceId),
    );
  });

  it("rejects non-40, Side Deck, and Extra Deck inputs", () => {
    const valid = legalMainDeck(40);

    expect(() =>
      createDuel({
        cards,
        decks: { P1: { main: valid.slice(0, 39) }, P2: { main: valid } },
      }),
    ).toThrow("Main Deck must contain exactly 40 cards.");

    expect(() =>
      createDuel({
        cards,
        decks: { P1: { main: valid, side: [valid[0]] }, P2: { main: valid } },
      }),
    ).toThrow("Side Deck is not supported");

    expect(() =>
      createDuel({
        cards,
        decks: { P1: { main: valid, extra: [valid[0]] }, P2: { main: valid } },
      }),
    ).toThrow("Extra Deck is not supported");
  });

  it("reduces draw commands without mutating input state", () => {
    const created = createDuel({
      cards,
      decks: {
        P1: { main: legalMainDeck(40) },
        P2: { main: reversedLegalMainDeck(40) },
      },
      seed: "immutable-draw",
    });
    const frozenState = deepFreeze(created.state);
    const before = JSON.parse(JSON.stringify(frozenState));
    const result = reduceDuel(frozenState, { type: "draw-card", playerId: "P1" });

    expect(frozenState).toEqual(before);
    expect(result.errors).toEqual([]);
    expect(result.prompts).toEqual([]);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ type: "card-drawn", playerId: "P1" });
    expect(result.state.players.P1.hand).toHaveLength(6);
    expect(result.state.players.P1.mainDeck).toHaveLength(34);
  });

  it("serializes and restores core duel state without side or extra deck fields", () => {
    const created = createDuel({
      cards,
      decks: {
        P1: { main: legalMainDeck(40) },
        P2: { main: reversedLegalMainDeck(40) },
      },
      seed: "serialize-core",
    });
    const serialized = serializeDuelState(created.state);
    const restored = deserializeDuelState(serialized);

    expect(restored).toEqual(created.state);
    expect(JSON.stringify(serialized)).not.toContain("sideDeck");
    expect(JSON.stringify(serialized)).not.toContain("extraDeck");
  });
});

function legalMainDeck(size: number): string[] {
  const passcodes = cards
    .filter(
      (card) =>
        card.legality.goat_world_pool &&
        card.legality.max_copies > 0 &&
        card.legality.goat_world_pool === true,
    )
    .map((card) => card.passcode);

  if (passcodes.length < size) {
    throw new Error(`Not enough legal fixture cards for ${size}-card deck.`);
  }

  return passcodes.slice(0, size);
}

function reversedLegalMainDeck(size: number): string[] {
  return [...legalMainDeck(size)].reverse();
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
