import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { isPlayableCard } from "../cards/coverage";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];

describe("core manual battle-position changes", () => {
  it("changes a face-up monster position during Main Phase without mutating input state", () => {
    const state = deepFreeze(stateWithMonster({ position: "attack", summonedTurn: 0 }));
    const before = JSON.parse(JSON.stringify(state));
    const monster = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "change-position",
      playerId: "P1",
      instanceId: monster.instanceId,
      position: "defense",
    });

    expect(state).toEqual(before);
    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: monster.instanceId,
      position: "defense",
      positionChangedTurn: state.turn,
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      type: "position-changed",
      from: "attack",
      to: "defense",
      playerId: "P1",
    });
  });

  it("blocks manual position changes outside Main Phases", () => {
    const state = stateWithMonster({ phase: "BP", position: "attack", summonedTurn: 0 });
    const monster = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "change-position",
      playerId: "P1",
      instanceId: monster.instanceId,
      position: "defense",
    });

    expect(result.errors[0]?.message).toBe(
      "Manual battle position changes are only allowed during Main Phase 1 or Main Phase 2.",
    );
    expect(result.state.players.P1.monsterZones[0]?.position).toBe("attack");
  });

  it("blocks monsters that were Summoned, Set, or Flip Summoned this turn", () => {
    const summoned = stateWithMonster({ position: "attack", summonedTurn: 1 });
    const setThenFlipped = {
      ...stateWithMonster({
        position: "defense",
        face: "faceDown",
        visibility: "hidden",
        summonedTurn: 0,
      }),
    };
    const summonedMonster = summoned.players.P1.monsterZones[0]!;
    const setMonster = setThenFlipped.players.P1.monsterZones[0]!;
    const summonedResult = reduceDuel(summoned, {
      type: "change-position",
      playerId: "P1",
      instanceId: summonedMonster.instanceId,
      position: "defense",
    });
    const flipped = reduceDuel(setThenFlipped, {
      type: "flip-summon",
      playerId: "P1",
      instanceId: setMonster.instanceId,
    }).state;
    const flippedMonster = flipped.players.P1.monsterZones[0]!;
    const flippedResult = reduceDuel(flipped, {
      type: "change-position",
      playerId: "P1",
      instanceId: flippedMonster.instanceId,
      position: "defense",
    });

    expect(summonedResult.errors[0]?.message).toBe(
      "A monster cannot manually change battle position the turn it was Summoned or Set.",
    );
    expect(flippedResult.errors[0]?.message).toBe(
      "A monster cannot manually change battle position the turn it was Summoned or Set.",
    );
  });

  it("blocks monsters that attacked or already manually changed position this turn", () => {
    const attacked = stateWithMonster({ position: "attack", summonedTurn: 0, attackedTurn: 1 });
    const changed = stateWithMonster({ position: "attack", summonedTurn: 0, positionChangedTurn: 1 });
    const attackedMonster = attacked.players.P1.monsterZones[0]!;
    const changedMonster = changed.players.P1.monsterZones[0]!;
    const attackedResult = reduceDuel(attacked, {
      type: "change-position",
      playerId: "P1",
      instanceId: attackedMonster.instanceId,
      position: "defense",
    });
    const changedResult = reduceDuel(changed, {
      type: "change-position",
      playerId: "P1",
      instanceId: changedMonster.instanceId,
      position: "defense",
    });

    expect(attackedResult.errors[0]?.message).toBe(
      "A monster cannot manually change battle position after attacking this turn.",
    );
    expect(changedResult.errors[0]?.message).toBe(
      "A monster can only manually change battle position once per turn.",
    );
  });

  it("blocks face-down monsters and no-op position changes", () => {
    const faceDown = stateWithMonster({
      position: "defense",
      face: "faceDown",
      visibility: "hidden",
      summonedTurn: 0,
    });
    const samePosition = stateWithMonster({ position: "attack", summonedTurn: 0 });
    const faceDownMonster = faceDown.players.P1.monsterZones[0]!;
    const samePositionMonster = samePosition.players.P1.monsterZones[0]!;
    const faceDownResult = reduceDuel(faceDown, {
      type: "change-position",
      playerId: "P1",
      instanceId: faceDownMonster.instanceId,
      position: "attack",
    });
    const samePositionResult = reduceDuel(samePosition, {
      type: "change-position",
      playerId: "P1",
      instanceId: samePositionMonster.instanceId,
      position: "attack",
    });

    expect(faceDownResult.errors[0]?.message).toBe(
      "Face-down monsters cannot be manually changed by position-change commands.",
    );
    expect(samePositionResult.errors[0]?.message).toBe("That monster is already in that battle position.");
  });

  it("allows position changes on a later turn after the monster was Summoned or previously changed", () => {
    const state = stateWithMonster({
      turn: 2,
      position: "defense",
      summonedTurn: 1,
      positionChangedTurn: 1,
    });
    const monster = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "change-position",
      playerId: "P1",
      instanceId: monster.instanceId,
      position: "attack",
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.monsterZones[0]).toMatchObject({
      position: "attack",
      positionChangedTurn: 2,
    });
  });
});

function stateWithMonster(overrides: Partial<ZoneCard> & { phase?: DuelState["phase"]; turn?: number } = {}): DuelState {
  const created = createDuel({
    cards,
    decks: {
      P1: deckWithPriority(["Battle Ox"]),
      P2: deckWithPriority([]),
    },
    seed: "position-change",
    shuffleDecks: false,
  });
  const state = advanceToM1(created.state);
  const monster = monsterZone("p1-battle-ox", "Battle Ox", "P1", overrides);

  return {
    ...state,
    turn: overrides.turn ?? state.turn,
    phase: overrides.phase ?? state.phase,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [monster, null, null, null, null],
      },
    },
  };
}

function advanceToM1(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
}

function deckWithPriority(priorityNames: string[]) {
  const priorityPasscodes = priorityNames.map((name) => cardByName(name).passcode);
  const excluded = new Set(priorityPasscodes);
  const filler = legalMainDeck(40 + excluded.size).filter((passcode) => !excluded.has(passcode));

  return {
    main: [...priorityPasscodes, ...filler].slice(0, 40),
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

function monsterZone(
  instanceId: string,
  name: string,
  owner: "P1" | "P2",
  overrides: Partial<ZoneCard> = {},
): ZoneCard {
  return {
    instanceId,
    cardId: cardByName(name).passcode,
    owner,
    controller: owner,
    face: "faceUp",
    position: "attack",
    visibility: "public",
    counters: {},
    attachments: [],
    summonedTurn: null,
    positionChangedTurn: null,
    attackedTurn: null,
    ...overrides,
  };
}

function cardByName(name: string): CardRecord {
  const card = cards.find((candidate) => candidate.name === name);

  if (!card) {
    throw new Error(`Missing fixture card: ${name}`);
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
