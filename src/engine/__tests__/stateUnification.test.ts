import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import {
  applyAction,
  createDuel,
  packEngineStateForStorage,
  unpackEngineStateFromStorage,
} from "../index";
import type { DuelAction, DuelState } from "../types";

const cards = cardsJson as CardRecord[];

// P-1 single-state unification guarantees:
// 1. The embedded core state is the single source of truth; the legacy shape
//    is a pure projection of it.
// 2. The persisted envelope (pack -> JSON -> unpack) reproduces the live
//    legacy state exactly, at every step of a real multi-turn game.
describe("single-state unification", () => {
  it("round-trips the persisted envelope identically after every action of a multi-turn game", () => {
    let state = createFixtureDuel();
    const battleOx = state.players.P1.hand.find((card) => card.card.name === "Battle Ox")!;
    const bookOfMoon = state.players.P1.hand.find((card) => card.card.name === "Book of Moon")!;
    const actions: readonly DuelAction[] = [
      { type: "set-phase", playerId: "P1", phase: "M1" },
      {
        type: "play-card",
        playerId: "P1",
        instanceId: bookOfMoon.instanceId,
        intent: "set",
        zoneKind: "spellTrap",
        zoneIndex: 0,
      },
      {
        type: "play-card",
        playerId: "P1",
        instanceId: battleOx.instanceId,
        intent: "summon",
        zoneKind: "monster",
        zoneIndex: 0,
      },
      { type: "set-life-points", playerId: "P1", targetPlayerId: "P2", value: 7500 },
      { type: "end-turn", playerId: "P1" },
      { type: "set-phase", playerId: "P2", phase: "M1" },
      { type: "end-turn", playerId: "P2" },
      { type: "set-phase", playerId: "P1", phase: "M1" },
      { type: "activate-set-card", playerId: "P1", instanceId: bookOfMoon.instanceId },
      { type: "set-phase", playerId: "P1", phase: "BP" },
      { type: "attack", playerId: "P1", attackerInstanceId: battleOx.instanceId },
      {
        type: "override-card-location",
        playerId: "P1",
        instanceId: battleOx.instanceId,
        destination: { zone: "graveyard" },
      },
    ];

    expectEnvelopeRoundTrip(state);

    for (const action of actions) {
      const result = applyAction(state, action);

      state = result.state;

      expect(result.events.map((event) => event.type)).not.toContain("illegal-action");
      expectEnvelopeRoundTrip(state);
    }

    // The scripted game really happened: spell flipped, attack landed, override moved the attacker.
    expect(state.players.P1.spellTrapZones[0]?.faceDown).toBe(false);
    expect(state.players.P2.lp).toBe(7500 - 1700);
    expect(state.players.P1.monsterZones[0]).toBeNull();
    expect(state.players.P1.graveyard.some((zone) => zone.instance.card.name === "Battle Ox")).toBe(true);
  });

  it("loads pre-versioning rows by lifting the embedded core state", () => {
    const state = createFixtureDuel();
    const v1Row = JSON.parse(JSON.stringify(state)) as unknown;
    const restored = unpackEngineStateFromStorage(v1Row, cards);

    expect(restored).toEqual(unpackEngineStateFromStorage(roundTrip(packEngineStateForStorage(state)), cards));
  });

  it("rejects unsupported or corrupt persisted engine states", () => {
    const state = createFixtureDuel();

    expect(() => unpackEngineStateFromStorage(null, cards)).toThrow(/not an object/);
    expect(() => unpackEngineStateFromStorage({}, cards)).toThrow(/predates core-state embedding/);
    expect(() => unpackEngineStateFromStorage({ engineStateVersion: 99 }, cards)).toThrow(
      /Unsupported persisted engine state version/,
    );

    const packed = packEngineStateForStorage(state);
    const corruptCore = JSON.parse(JSON.stringify(packed.core)) as {
      players: { P1: { hand: unknown[] } };
    };

    corruptCore.players.P1.hand = [...corruptCore.players.P1.hand, corruptCore.players.P1.hand[0]];

    expect(() =>
      unpackEngineStateFromStorage({ ...packed, core: corruptCore }, cards),
    ).toThrow();
  });
});

const engineSources = import.meta.glob(["../**/*.ts", "../../online/**/*.ts", "../../gameLogic.ts"], {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

describe("core-first static guards", () => {
  it("never converts the legacy shape back into core state", () => {
    const offenders = Object.entries(engineSources)
      .filter(([path]) => !path.includes("__tests__"))
      .filter(([, source]) => /coreStateFromLegacy|corePlayerFromLegacy|coreZoneFromLegacy/.test(source))
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });

  it("only duel.ts assigns the embedded core state", () => {
    const offenders = Object.entries(engineSources)
      .filter(([path]) => !path.includes("__tests__") && !path.endsWith("/duel.ts"))
      .filter(([, source]) => /\.coreState\s*=/.test(source))
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });
});

function expectEnvelopeRoundTrip(state: DuelState): void {
  const restored = unpackEngineStateFromStorage(roundTrip(packEngineStateForStorage(state)), cards);

  expect(restored).toEqual(state);
}

function roundTrip(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function createFixtureDuel(): DuelState {
  return createDuel({
    cards,
    decks: {
      P1: deckWith(["Battle Ox", "Book of Moon"]),
      P2: deckWith([]),
    },
    seed: "state-unification",
    firstPlayer: "P1",
    allowUnsupportedCards: true,
  });
}

function deckWith(priorityNames: readonly string[]): { main: string[] } {
  const priorityPasscodes = priorityNames.map((name) => {
    const card = cards.find((candidate) => candidate.name === name);

    if (!card) {
      throw new Error(`Missing fixture card: ${name}`);
    }

    return card.passcode;
  });
  const excluded = new Set(priorityPasscodes);
  const filler = cards
    .filter(
      (card) =>
        card.legality.goat_world_pool === true &&
        card.legality.max_copies > 0 &&
        !excluded.has(card.passcode) &&
        !card.classifications?.includes("Fusion"),
    )
    .map((card) => card.passcode);

  return { main: [...priorityPasscodes, ...filler].slice(0, 40) };
}
