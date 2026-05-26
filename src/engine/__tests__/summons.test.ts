import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { isPlayableCard } from "../cards/coverage";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];

describe("core summon rules", () => {
  it("Normal Summons a Main Deck monster from hand without mutating input state", () => {
    const state = deepFreeze(advanceToM1(createFixtureDuel(["Battle Ox"]).state));
    const before = JSON.parse(JSON.stringify(state));
    const battleOx = requireHandCard(state, "P1", "Battle Ox");
    const result = reduceDuel(state, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: battleOx.instanceId,
      zoneIndex: 0,
    });

    expect(state).toEqual(before);
    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.hand.some((card) => card.instanceId === battleOx.instanceId)).toBe(false);
    expect(result.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: battleOx.instanceId,
      cardId: battleOx.cardId,
      face: "faceUp",
      position: "attack",
      visibility: "public",
    });
    expect(result.state.players.P1.normalSummonUsed).toBe(true);
    expect(result.events.map((event) => event.type)).toEqual(["summon-declared", "summon-successful"]);
  });

  it("Sets a monster face-down in Defense Position and consumes the turn summon/set", () => {
    const state = advanceToM1(createFixtureDuel(["Battle Ox", "Aqua Madoor"]).state);
    const battleOx = requireHandCard(state, "P1", "Battle Ox");
    const aquaMadoor = requireHandCard(state, "P1", "Aqua Madoor");
    const setResult = reduceDuel(state, {
      type: "set-monster",
      playerId: "P1",
      instanceId: battleOx.instanceId,
      zoneIndex: 1,
    });
    const secondSummon = reduceDuel(setResult.state, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: aquaMadoor.instanceId,
      zoneIndex: 2,
    });

    expect(setResult.errors).toEqual([]);
    expect(setResult.state.players.P1.monsterZones[1]).toMatchObject({
      instanceId: battleOx.instanceId,
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
    expect(setResult.events.map((event) => event.type)).toEqual(["monster-set"]);
    expect(secondSummon.errors[0]?.message).toBe("A Normal Summon or Set has already been used this turn.");
    expect(secondSummon.state.players.P1.monsterZones[2]).toBeNull();
  });

  it("requires and pays one Tribute for Level 5 and 6 Tribute Summons", () => {
    const base = advanceToM1(createFixtureDuel(["Summoned Skull", "Battle Ox"]).state);
    const summonedSkull = requireHandCard(base, "P1", "Summoned Skull");
    const tribute = monsterZone("tribute-battle-ox", "Battle Ox", "P1");
    const withTribute: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [tribute, null, null, null, null],
        },
      },
    };
    const missingTribute = reduceDuel(withTribute, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: summonedSkull.instanceId,
      zoneIndex: 0,
    });
    const result = reduceDuel(withTribute, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: summonedSkull.instanceId,
      zoneIndex: 0,
      tributeInstanceIds: [tribute.instanceId],
    });

    expect(missingTribute.errors[0]?.message).toBe("This monster requires exactly 1 Tribute.");
    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: summonedSkull.instanceId,
      cardId: summonedSkull.cardId,
      face: "faceUp",
      position: "attack",
    });
    expect(result.state.players.P1.graveyard[0]).toMatchObject({
      instanceId: tribute.instanceId,
      cardId: tribute.cardId,
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "card-moved",
      "summon-declared",
      "summon-successful",
    ]);
    expect(result.events[0]?.metadata?.reason).toBe("tribute");
  });

  it("requires two Tributes for Level 7+ Tribute Sets", () => {
    const base = advanceToM1(createFixtureDuel(["Blue-Eyes White Dragon", "Battle Ox", "Aqua Madoor"]).state);
    const blueEyes = requireHandCard(base, "P1", "Blue-Eyes White Dragon");
    const tributeA = monsterZone("tribute-a", "Battle Ox", "P1");
    const tributeB = monsterZone("tribute-b", "Aqua Madoor", "P1", {
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
    const withTributes: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [tributeA, tributeB, null, null, null],
        },
      },
    };
    const oneTribute = reduceDuel(withTributes, {
      type: "set-monster",
      playerId: "P1",
      instanceId: blueEyes.instanceId,
      zoneIndex: 2,
      tributeInstanceIds: [tributeA.instanceId],
    });
    const result = reduceDuel(withTributes, {
      type: "set-monster",
      playerId: "P1",
      instanceId: blueEyes.instanceId,
      zoneIndex: 2,
      tributeInstanceIds: [tributeA.instanceId, tributeB.instanceId],
    });

    expect(oneTribute.errors[0]?.message).toBe("This monster requires exactly 2 Tributes.");
    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.graveyard).toHaveLength(2);
    expect(result.state.players.P1.monsterZones[2]).toMatchObject({
      instanceId: blueEyes.instanceId,
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
    expect(result.events.map((event) => event.type)).toEqual(["card-moved", "card-moved", "monster-set"]);
    expect(result.events.slice(0, 2)).toEqual([
      expect.objectContaining({
        type: "card-moved",
        instanceId: tributeA.instanceId,
        owner: "P1",
        controller: "P1",
        from: { playerId: "P1", zone: "monsterZone", index: 0 },
        to: { playerId: "P1", zone: "graveyard", index: 0 },
        visibility: "public",
        reason: "tribute",
        phase: "M1",
        chainDepth: 0,
      }),
      expect.objectContaining({
        type: "card-moved",
        instanceId: tributeB.instanceId,
        owner: "P1",
        controller: "P1",
        from: { playerId: "P1", zone: "monsterZone", index: 1 },
        to: { playerId: "P1", zone: "graveyard", index: 0 },
        visibility: "public",
        reason: "tribute",
        phase: "M1",
        chainDepth: 0,
      }),
    ]);
  });

  it("Flip Summons a face-down Defense Position monster without consuming the turn summon/set", () => {
    const base = advanceToM1(createFixtureDuel(["Battle Ox"]).state);
    const setMonster = monsterZone("set-battle-ox", "Battle Ox", "P1", {
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
    const withSetMonster: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [setMonster, null, null, null, null],
          normalSummonUsed: false,
        },
      },
    };
    const result = reduceDuel(withSetMonster, {
      type: "flip-summon",
      playerId: "P1",
      instanceId: setMonster.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: setMonster.instanceId,
      face: "faceUp",
      position: "attack",
      visibility: "public",
    });
    expect(result.state.players.P1.normalSummonUsed).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual(["summon-declared", "summon-successful"]);
    expect(result.events[0]).toMatchObject({ summonKind: "flip" });
  });

  it("rejects Ritual monsters through the Main Deck summon path and Fusion monsters during deck validation", () => {
    const state = advanceToM1(
      createFixtureDuel(["Paladin of White Dragon"], {
        allowUnsupportedCards: true,
      }).state,
    );
    const ritual = requireHandCard(state, "P1", "Paladin of White Dragon");
    const ritualResult = reduceDuel(state, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: ritual.instanceId,
      zoneIndex: 0,
    });

    expect(ritualResult.errors[0]?.message).toBe("Ritual Monsters cannot be Normal Summoned or Set.");
    expect(() => createFixtureDuel(["Thousand-Eyes Restrict"], { allowUnsupportedCards: true })).toThrow(
      "Thousand-Eyes Restrict is a Fusion Monster and must be placed in the Extra Deck.",
    );
    expect(JSON.stringify(state)).not.toContain("extraDeck");
  });
});

function createFixtureDuel(
  priorityNames: string[] = [],
  options: { allowUnsupportedCards?: boolean } = {},
) {
  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityNames),
      P2: deckWithPriority([]),
    },
    seed: "summons",
    shuffleDecks: false,
    allowUnsupportedCards: options.allowUnsupportedCards,
  });
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

function requireHandCard(state: DuelState, playerId: "P1" | "P2", name: string) {
  const passcode = cardByName(name).passcode;
  const card = state.players[playerId].hand.find((candidate) => candidate.cardId === passcode);

  if (!card) {
    throw new Error(`Expected ${name} in ${playerId} hand.`);
  }

  return card;
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
