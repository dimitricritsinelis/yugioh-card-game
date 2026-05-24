import { describe, expect, it } from "vitest";
import { createRngState, nextRandom, shuffleSeeded, shuffleWithRng } from "../index";

describe("deterministic engine RNG", () => {
  it("creates serializable RNG state and advances without mutating input", () => {
    const initial = Object.freeze(createRngState("serial-seed"));
    const first = nextRandom(initial);
    const second = nextRandom(first.rng);

    expect(initial).toEqual({
      algorithm: "mulberry32-v1",
      seed: "serial-seed",
      value: initial.value,
      draws: 0,
    });
    expect(first.rng.draws).toBe(1);
    expect(second.rng.draws).toBe(2);
    expect(JSON.parse(JSON.stringify(second.rng))).toEqual(second.rng);
  });

  it("produces the same shuffle order for the same seed", () => {
    const cards = ["a", "b", "c", "d", "e", "f"];

    expect(shuffleSeeded(cards, "same-seed")).toEqual(shuffleSeeded(cards, "same-seed"));
  });

  it("produces different shuffle orders for different seeds", () => {
    const cards = ["a", "b", "c", "d", "e", "f"];

    expect(shuffleSeeded(cards, "seed-a")).not.toEqual(shuffleSeeded(cards, "seed-b"));
  });

  it("shuffles with explicit RNG state and returns the next RNG state", () => {
    const cards = Object.freeze(["a", "b", "c", "d"]);
    const rng = createRngState("shuffle-state");
    const first = shuffleWithRng(cards, rng);
    const second = shuffleWithRng(cards, rng);
    const continued = shuffleWithRng(cards, first.rng);

    expect(cards).toEqual(["a", "b", "c", "d"]);
    expect(first.items).toEqual(second.items);
    expect(first.rng).toEqual(second.rng);
    expect(first.rng.draws).toBe(cards.length - 1);
    expect(continued.items).not.toEqual(first.items);
    expect(continued.rng.draws).toBe((cards.length - 1) * 2);
  });

  it("does not mutate the shuffled input array", () => {
    const cards = ["a", "b", "c", "d"];
    const original = [...cards];
    const shuffled = shuffleSeeded(cards, "immutable");

    expect(cards).toEqual(original);
    expect(shuffled).not.toBe(cards);
  });
});
