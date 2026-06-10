import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];

describe("core battle flow", () => {
  it("declares a direct attack, applies battle damage, and marks the attacker", () => {
    const state = deepFreeze(stateWithBattlefield({ attackerName: "Battle Ox" }));
    const before = JSON.parse(JSON.stringify(state));
    const attacker = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });

    expect(state).toEqual(before);
    expect(result.errors).toEqual([]);
    expect(result.state.players.P2.lp).toBe(6300);
    expect(result.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: attacker.instanceId,
      attackedTurn: state.turn,
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "attack-declared",
      "battle-damage",
      "lp-changed",
    ]);
  });

  it("blocks direct attacks while the opponent controls monsters", () => {
    const state = stateWithBattlefield({
      attackerName: "Battle Ox",
      defenderName: "Aqua Madoor",
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });

    expect(result.errors[0]?.message).toBe("A direct attack is not legal while the opponent controls monsters.");
    expect(result.state.players.P2.lp).toBe(8000);
  });

  it("resolves attack-position battles with damage and defender destruction", () => {
    const state = stateWithBattlefield({
      attackerName: "Battle Ox",
      defenderName: "Aqua Madoor",
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P2.lp).toBe(7500);
    expect(result.state.players.P2.monsterZones[0]).toBeNull();
    expect(result.state.players.P2.graveyard[0]).toMatchObject({
      instanceId: defender.instanceId,
      cardId: defender.cardId,
      face: "faceUp",
      visibility: "public",
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "attack-declared",
      "battle-completed",
      "battle-damage",
      "lp-changed",
      "card-destroyed",
      "card-moved",
    ]);
  });

  it("destroys the attacking monster when it loses an attack-position battle", () => {
    const state = stateWithBattlefield({
      attackerName: "Aqua Madoor",
      defenderName: "Battle Ox",
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.lp).toBe(7500);
    expect(result.state.players.P1.monsterZones[0]).toBeNull();
    expect(result.state.players.P1.graveyard[0]).toMatchObject({
      instanceId: attacker.instanceId,
      cardId: attacker.cardId,
    });
    expect(result.state.players.P2.monsterZones[0]).toMatchObject({
      instanceId: defender.instanceId,
    });
  });

  it("resolves attack versus defense with damage but no destruction when ATK is lower", () => {
    const state = stateWithBattlefield({
      attackerName: "Battle Ox",
      defenderName: "Aqua Madoor",
      defenderOverrides: { position: "defense" },
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.lp).toBe(7700);
    expect(result.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: attacker.instanceId });
    expect(result.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: defender.instanceId });
    expect(result.events.map((event) => event.type)).toEqual([
      "attack-declared",
      "battle-completed",
      "battle-damage",
      "lp-changed",
    ]);
  });

  it("destroys a defense-position monster when ATK is higher without battle damage", () => {
    const state = stateWithBattlefield({
      attackerName: "Blue-Eyes White Dragon",
      defenderName: "Aqua Madoor",
      defenderOverrides: { position: "defense" },
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.lp).toBe(8000);
    expect(result.state.players.P2.lp).toBe(8000);
    expect(result.state.players.P2.monsterZones[0]).toBeNull();
    expect(result.state.players.P2.graveyard[0]).toMatchObject({ instanceId: defender.instanceId });
    expect(result.events.map((event) => event.type)).toEqual([
      "attack-declared",
      "battle-completed",
      "card-destroyed",
      "card-moved",
    ]);
  });

  it("flips a face-down defender before damage calculation", () => {
    const state = stateWithBattlefield({
      attackerName: "Battle Ox",
      defenderName: "Aqua Madoor",
      defenderOverrides: {
        face: "faceDown",
        position: "defense",
        visibility: "hidden",
      },
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P2.monsterZones[0]).toMatchObject({
      instanceId: defender.instanceId,
      face: "faceUp",
      visibility: "public",
    });
    expect(result.state.players.P1.lp).toBe(7700);
  });

  it("destroys both attack-position monsters when their ATK is equal, including 0 ATK", () => {
    const state = stateWithBattlefield({
      attackerName: "Thousand-Eyes Idol",
      defenderName: "Thousand-Eyes Idol",
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.lp).toBe(8000);
    expect(result.state.players.P2.lp).toBe(8000);
    expect(result.state.players.P1.monsterZones[0]).toBeNull();
    expect(result.state.players.P2.monsterZones[0]).toBeNull();
    expect(result.state.players.P1.graveyard[0]).toMatchObject({ instanceId: attacker.instanceId });
    expect(result.state.players.P2.graveyard[0]).toMatchObject({ instanceId: defender.instanceId });
    expect(result.events.map((event) => event.type)).toEqual([
      "attack-declared",
      "battle-completed",
      "card-destroyed",
      "card-moved",
      "card-destroyed",
      "card-moved",
    ]);
  });

  it("rejects attacks outside Battle Phase and repeated attacks in the same turn", () => {
    const mainPhaseState = stateWithBattlefield({
      attackerName: "Battle Ox",
      phase: "M1",
    });
    const alreadyAttackedState = stateWithBattlefield({
      attackerName: "Battle Ox",
      attackerOverrides: { attackedTurn: 2 },
    });
    const mainPhaseAttacker = mainPhaseState.players.P1.monsterZones[0]!;
    const alreadyAttacked = alreadyAttackedState.players.P1.monsterZones[0]!;
    const phaseResult = reduceDuel(mainPhaseState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: mainPhaseAttacker.instanceId,
    });
    const repeatedResult = reduceDuel(alreadyAttackedState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: alreadyAttacked.instanceId,
    });

    expect(phaseResult.errors[0]?.message).toBe("Attacks can only be declared during the Battle Phase.");
    expect(repeatedResult.errors[0]?.message).toBe("That monster has already attacked this turn.");
  });
});

function stateWithBattlefield(options: {
  attackerName: string;
  defenderName?: string;
  phase?: DuelState["phase"];
  attackerOverrides?: Partial<ZoneCard>;
  defenderOverrides?: Partial<ZoneCard>;
}): DuelState {
  const created = createDuel({
    cards,
    decks: {
      P1: deckWithPriority([options.attackerName]),
      P2: deckWithPriority(options.defenderName ? [options.defenderName] : []),
    },
    seed: "battle-flow",
    shuffleDecks: false,
  });
  const state = advanceToBattlePhase(created.state);
  const attacker = monsterZone("p1-attacker", options.attackerName, "P1", options.attackerOverrides);
  const defender = options.defenderName
    ? monsterZone("p2-defender", options.defenderName, "P2", options.defenderOverrides)
    : null;

  return {
    ...state,
    phase: options.phase ?? state.phase,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [attacker, null, null, null, null],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [defender, null, null, null, null],
      },
    },
  };
}

function advanceToBattlePhase(state: DuelState): DuelState {
  // GOAT rules: the Battle Phase cannot be entered on turn 1, so rigged battle
  // fixtures start from turn 2.
  let current = reduceDuel({ ...state, turn: 2 }, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  for (const phase of ["M1", "BP"] as const) {
    current = reduceDuel(current, { type: "change-phase", playerId: "P1", phase }).state;
  }

  return current;
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
        card.legality.goat_world_pool === true,
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
    summonedTurn: 0,
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
