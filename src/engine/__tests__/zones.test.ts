import { describe, expect, it } from "vitest";
import {
  assertDuelStateInvariants,
  findCardByInstanceId,
  insertIntoZone,
  moveCard,
  removeFromZone,
  revealCard,
  updateMonsterPosition,
  validateDuelStateInvariants,
  type CoreCardInstance,
  type CoreDuelState,
  type CorePlayerState,
  type CoreZoneCard,
} from "../index";

describe("core zone operations", () => {
  it("finds cards by instance ID across playable zones", () => {
    const state = makeState();

    expect(findCardByInstanceId(state, "p1-hand-a")).toMatchObject({
      ref: { playerId: "P1", zone: "hand", index: 0 },
    });
    expect(findCardByInstanceId(state, "p1-monster-a")).toMatchObject({
      ref: { playerId: "P1", zone: "monsterZone", index: 0 },
    });
    expect(findCardByInstanceId(state, "missing")).toBeNull();
  });

  it("removes and inserts cards without mutating frozen input state", () => {
    const state = deepFreeze(makeState());
    const removed = removeFromZone(state, { playerId: "P1", zone: "hand", index: 0 });
    const inserted = insertIntoZone(removed.state, { playerId: "P1", zone: "spellTrapZone", index: 1 }, removed.card);

    expect(removed.card.instanceId).toBe("p1-hand-a");
    expect(state.players.P1.hand).toHaveLength(1);
    expect(state.players.P1.spellTrapZones[1]).toBeNull();
    expect(inserted.players.P1.hand).toHaveLength(0);
    expect(inserted.players.P1.spellTrapZones[1]).toMatchObject({
      instanceId: "p1-hand-a",
      face: "faceDown",
      position: null,
      visibility: "hidden",
    });
  });

  it("moves cards between zones and preserves the original state", () => {
    const state = deepFreeze(makeState());
    const moved = moveCard(
      state,
      { playerId: "P1", zone: "hand", index: 0 },
      { playerId: "P1", zone: "monsterZone", index: 1 },
      { face: "faceDown", position: "defense", visibility: "hidden" },
    );

    expect(state.players.P1.hand).toHaveLength(1);
    expect(state.players.P1.monsterZones[1]).toBeNull();
    expect(moved.players.P1.hand).toHaveLength(0);
    expect(moved.players.P1.monsterZones[1]).toMatchObject({
      instanceId: "p1-hand-a",
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
  });

  it("moves Fusion Deck cards through the same zone pipeline", () => {
    const state = deepFreeze(makeState());
    const moved = moveCard(
      state,
      { playerId: "P1", zone: "fusionDeck", index: 0 },
      { playerId: "P1", zone: "monsterZone", index: 1 },
      { face: "faceUp", position: "attack", visibility: "public" },
    );

    expect(findCardByInstanceId(state, "p1-fusion-a")).toMatchObject({
      ref: { playerId: "P1", zone: "fusionDeck", index: 0 },
    });
    expect(moved.players.P1.fusionDeck).toHaveLength(0);
    expect(moved.players.P1.monsterZones[1]).toMatchObject({
      instanceId: "p1-fusion-a",
      face: "faceUp",
      position: "attack",
      visibility: "public",
    });
  });

  it("updates face state and monster position immutably", () => {
    const state = deepFreeze(makeState());
    const revealed = revealCard(state, { playerId: "P1", zone: "spellTrapZone", index: 0 });
    const changedPosition = updateMonsterPosition(revealed, { playerId: "P1", zone: "monsterZone", index: 0 }, "defense");

    expect(state.players.P1.spellTrapZones[0]?.face).toBe("faceDown");
    expect(revealed.players.P1.spellTrapZones[0]).toMatchObject({
      face: "faceUp",
      visibility: "public",
    });
    expect(state.players.P1.monsterZones[0]?.position).toBe("attack");
    expect(changedPosition.players.P1.monsterZones[0]?.position).toBe("defense");
  });

  it("validates duplicate locations and zone size limits", () => {
    const valid = makeState();
    const duplicateCard = zoneCard("p1-hand-a", "001", "P1");
    const invalid: CoreDuelState = {
      ...valid,
      players: {
        ...valid.players,
        P1: {
          ...valid.players.P1,
          monsterZones: [...valid.players.P1.monsterZones, duplicateCard],
        },
      },
    };
    const result = validateDuelStateInvariants(invalid);

    expect(validateDuelStateInvariants(valid).valid).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("maximum is 5");
    expect(result.errors.join(" ")).toContain("appears in 2 locations");
    expect(() => assertDuelStateInvariants(invalid)).toThrow("expected exactly one location");
  });

  it("rejects invalid zone operations", () => {
    const state = makeState();

    expect(() =>
      insertIntoZone(state, { playerId: "P1", zone: "monsterZone", index: 0 }, cardInstance("new-card", "999", "P1")),
    ).toThrow("occupied");
    expect(() => updateMonsterPosition(state, { playerId: "P1", zone: "hand", index: 0 }, "defense")).toThrow(
      "Cannot update monster position",
    );
  });
});

function makeState(): CoreDuelState {
  return {
    id: "duel-test",
    seed: "seed",
    turn: 1,
    phase: "M1",
    activePlayer: "P1",
    priorityPlayer: "P1",
    priority: {
      holder: "P1",
      passedPlayerIds: [],
      reason: "phase-start",
      status: "open",
    },
    players: {
      P1: makePlayer("P1", {
        mainDeck: [cardInstance("p1-deck-a", "003", "P1")],
        fusionDeck: [cardInstance("p1-fusion-a", "005", "P1")],
        hand: [cardInstance("p1-hand-a", "001", "P1")],
        monsterZones: [zoneCard("p1-monster-a", "002", "P1"), null, null, null, null],
        spellTrapZones: [zoneCard("p1-spell-a", "004", "P1", { face: "faceDown", visibility: "hidden" }), null, null, null, null],
      }),
      P2: makePlayer("P2"),
    },
    chain: [],
    prompts: {},
    pendingPromptIds: [],
    eventIds: [],
    winner: null,
  };
}

function makePlayer(playerId: "P1" | "P2", overrides: Partial<CorePlayerState> = {}): CorePlayerState {
  return {
    id: playerId,
    lp: 8000,
    mainDeck: [],
    fusionDeck: [],
    hand: [],
    monsterZones: [null, null, null, null, null],
    spellTrapZones: [null, null, null, null, null],
    graveyard: [],
    banished: [],
    fieldZone: null,
    normalSummonUsed: false,
    lost: false,
    ...overrides,
  };
}

function cardInstance(instanceId: string, cardId: string, owner: "P1" | "P2"): CoreCardInstance {
  return {
    instanceId,
    cardId,
    owner,
    controller: owner,
  };
}

function zoneCard(
  instanceId: string,
  cardId: string,
  owner: "P1" | "P2",
  overrides: Partial<CoreZoneCard> = {},
): CoreZoneCard {
  return {
    instanceId,
    cardId,
    owner,
    controller: owner,
    face: "faceUp",
    position: "attack",
    visibility: "public",
    counters: {},
    attachments: [],
    ...overrides,
  };
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
