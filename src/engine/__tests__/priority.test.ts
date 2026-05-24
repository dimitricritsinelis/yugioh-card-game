import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { isPlayableCard } from "../cards/coverage";
import { createDuel, reduceDuel } from "../reducer";
import { createChainResolvedPriorityWindow, PASS_PRIORITY } from "../rules/priority";
import type { DuelState } from "../core/state";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";

describe("core priority windows", () => {
  it("starts phase priority with the turn player", () => {
    const created = createFixtureDuel().state;

    expect(created.priorityPlayer).toBe("P1");
    expect(created.priority).toEqual({
      holder: "P1",
      passedPlayerIds: [],
      reason: "phase-start",
      status: "open",
    });

    const standby = reduceDuel(created, { type: "change-phase", playerId: "P1", phase: "SP" });

    expect(standby.errors).toEqual([]);
    expect(standby.state.priorityPlayer).toBe("P1");
    expect(standby.state.priority).toEqual({
      holder: "P1",
      passedPlayerIds: [],
      reason: "phase-start",
      status: "open",
    });
  });

  it("passes priority to the opponent and closes after both players pass", () => {
    const state = deepFreeze(createFixtureDuel().state);
    const before = JSON.parse(JSON.stringify(state));
    const firstPass = reduceDuel(state, { type: PASS_PRIORITY, playerId: "P1" });
    const wrongPass = reduceDuel(firstPass.state, { type: PASS_PRIORITY, playerId: "P1" });
    const secondPass = reduceDuel(firstPass.state, { type: PASS_PRIORITY, playerId: "P2" });

    expect(state).toEqual(before);
    expect(firstPass.errors).toEqual([]);
    expect(firstPass.events).toEqual([]);
    expect(firstPass.state.priorityPlayer).toBe("P2");
    expect(firstPass.state.priority).toEqual({
      holder: "P2",
      passedPlayerIds: ["P1"],
      reason: "phase-start",
      status: "open",
    });
    expect(wrongPass.errors[0]?.message).toBe("Only the current priority holder can pass priority.");
    expect(secondPass.errors).toEqual([]);
    expect(secondPass.state.priorityPlayer).toBe("P1");
    expect(secondPass.state.priority).toEqual({
      holder: "P1",
      passedPlayerIds: [],
      reason: "phase-start",
      status: "closed",
    });
  });

  it("blocks turn actions while the opponent holds priority", () => {
    const state = createFixtureDuel().state;
    const opponentPriority = reduceDuel(state, { type: PASS_PRIORITY, playerId: "P1" }).state;
    const blocked = reduceDuel(opponentPriority, { type: "change-phase", playerId: "P1", phase: "SP" });

    expect(opponentPriority.priorityPlayer).toBe("P2");
    expect(blocked.errors[0]?.message).toBe("P2 currently holds priority.");
    expect(blocked.state.phase).toBe("DP");
  });

  it("opens a fresh priority window after a successful summon", () => {
    const state = advanceToM1(createFixtureDuel([BATTLE_OX_ID]).state);
    const battleOx = requireHandCard(state, "P1", BATTLE_OX_ID);
    const result = reduceDuel(state, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: battleOx.instanceId,
      zoneIndex: 0,
    });

    expect(result.errors).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual(["summon-declared", "summon-successful"]);
    expect(result.state.priorityPlayer).toBe("P1");
    expect(result.state.priority).toEqual({
      holder: "P1",
      passedPlayerIds: [],
      reason: "summon-successful",
      status: "open",
    });
  });

  it("can create the priority window used after chain resolution", () => {
    expect(createChainResolvedPriorityWindow("P2")).toEqual({
      holder: "P2",
      passedPlayerIds: [],
      reason: "chain-resolved",
      status: "open",
    });
  });
});

function createFixtureDuel(priorityIds: string[] = []) {
  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    seed: "priority-window",
    shuffleDecks: false,
  });
}

function advanceToM1(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
}

function deckWithPriority(priorityIds: string[]) {
  const excluded = new Set(priorityIds);
  const filler = legalMainDeck(40 + excluded.size).filter((passcode) => !excluded.has(passcode));

  return {
    main: [...priorityIds, ...filler].slice(0, 40),
  };
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

function requireHandCard(state: DuelState, playerId: "P1" | "P2", cardId: string) {
  const card = state.players[playerId].hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in ${playerId} hand.`);
  }

  return card;
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
