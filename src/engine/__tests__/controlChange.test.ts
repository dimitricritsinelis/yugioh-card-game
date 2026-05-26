import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import type { ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const POT_OF_GREED_ID = "55144522";
const BATTLE_OX_ID = "05053103";
const LA_JINN_ID = "97590747";
const BLUE_EYES_ID = "89631139";
const AQUA_MADOOR_ID = "85639257";

describe("Control-change foundations", () => {
  it("takes control temporarily and returns the monster during the End Phase without changing ownership", () => {
    const state = controlState([changeOfHeartStyleScript(POT_OF_GREED_ID)]);
    const spell = requireHandCard(state, POT_OF_GREED_ID);
    const target = state.players.P2.monsterZones[0]!;
    const resolved = activateAndResolve(state, spell.instanceId, [{ playerId: "P2", zone: "monsterZone", index: 0 }]);
    const endPhase = advanceToEndPhase(resolved.state);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[1]).toMatchObject({
      instanceId: target.instanceId,
      owner: "P2",
      controller: "P1",
    });
    expect(resolved.state.controlChangeReturns).toEqual([
      expect.objectContaining({
        instanceId: target.instanceId,
        returnPlayerId: "P2",
        expiresAtPhase: "EP",
      }),
    ]);
    expect(endPhase.events).toContainEqual(expect.objectContaining({
      type: "card-moved",
      instanceId: target.instanceId,
      reason: "control-return",
    }));
    expect(endPhase.state.players.P2.monsterZones[0]).toMatchObject({
      instanceId: target.instanceId,
      owner: "P2",
      controller: "P2",
    });
    expect(endPhase.state.controlChangeReturns).toEqual([]);
  });

  it("destroys a temporarily controlled monster if its return zone is full", () => {
    const state = controlState([changeOfHeartStyleScript(POT_OF_GREED_ID)]);
    const spell = requireHandCard(state, POT_OF_GREED_ID);
    const target = state.players.P2.monsterZones[0]!;
    const resolved = activateAndResolve(state, spell.instanceId, [{ playerId: "P2", zone: "monsterZone", index: 0 }]);
    const fullReturnZone: DuelState = {
      ...resolved.state,
      players: {
        ...resolved.state.players,
        P2: {
          ...resolved.state.players.P2,
          monsterZones: [
            zoneCard("p2-fill-1", BATTLE_OX_ID, "P2"),
            zoneCard("p2-fill-2", LA_JINN_ID, "P2"),
            zoneCard("p2-fill-3", AQUA_MADOOR_ID, "P2"),
            zoneCard("p2-fill-4", BATTLE_OX_ID, "P2"),
            zoneCard("p2-fill-5", LA_JINN_ID, "P2"),
          ],
        },
      },
    };
    const endPhase = advanceToEndPhase(fullReturnZone);

    expect(endPhase.state.players.P1.monsterZones.some((card) => card?.instanceId === target.instanceId)).toBe(false);
    expect(endPhase.state.players.P2.graveyard[0]).toMatchObject({ instanceId: target.instanceId });
    expect(endPhase.state.controlChangeReturns).toEqual([]);
  });

  it("swaps control permanently without changing either monster's owner", () => {
    const state = controlState([creatureSwapStyleScript(POT_OF_GREED_ID)]);
    const spell = requireHandCard(state, POT_OF_GREED_ID);
    const ownMonster = state.players.P1.monsterZones[0]!;
    const opponentMonster = state.players.P2.monsterZones[0]!;
    const resolved = activateAndResolve(state, spell.instanceId, [
      { playerId: "P1", zone: "monsterZone", index: 0 },
      { playerId: "P2", zone: "monsterZone", index: 0 },
    ]);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: opponentMonster.instanceId,
      owner: "P2",
      controller: "P1",
    });
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({
      instanceId: ownMonster.instanceId,
      owner: "P1",
      controller: "P2",
    });
    expect(resolved.state.controlChangeReturns).toEqual([]);
  });
});

function changeOfHeartStyleScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "temporary-control",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: [faceUpMonsterTarget("opponent", 1, 1)],
        resolution: {
          steps: [{ kind: "take-control-of-targets", returnAtEndPhase: true }],
        },
      },
    ],
  };
}

function creatureSwapStyleScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "swap-control",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: [faceUpMonsterTarget("any", 2, 2)],
        resolution: {
          steps: [{ kind: "swap-control-targets" }],
        },
      },
    ],
  };
}

function faceUpMonsterTarget(controller: "own" | "opponent" | "any", min: number, max: number) {
  return {
    kind: "card" as const,
    controller,
    zones: ["monsterZone"] as const,
    cardKinds: ["monster"] as const,
    face: "faceUp" as const,
    min,
    max,
  };
}

function activateAndResolve(state: DuelState, sourceInstanceId: string, targetRefs: readonly ZoneRef[]) {
  const activated = reduceDuel(state, {
    type: "activate-card",
    playerId: "P1",
    instanceId: sourceInstanceId,
    targetRefs,
  });

  if (activated.errors.length > 0) {
    return activated;
  }

  return reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });
}

function advanceToEndPhase(state: DuelState) {
  let current = state;
  const events = [];

  for (const phase of ["BP", "M2", "EP"] as const) {
    const result = reduceDuel(current, { type: "change-phase", playerId: "P1", phase });
    events.push(...result.events);
    current = result.state;
  }

  return { state: current, events };
}

function controlState(scripts: readonly CardScript[]): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority([POT_OF_GREED_ID, BATTLE_OX_ID]),
      P2: deckWithPriority([BLUE_EYES_ID]),
    },
    allowUnsupportedCards: true,
    seed: `control-${scripts.map((script) => script.cardId).join("-")}`,
    shuffleDecks: false,
  }).state;
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;
  const main = reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;

  return {
    ...main,
    cardScripts: createCardScriptRegistry(scripts),
    players: {
      ...main.players,
      P1: {
        ...main.players.P1,
        monsterZones: [zoneCard("p1-battle-ox", BATTLE_OX_ID, "P1"), null, null, null, null],
      },
      P2: {
        ...main.players.P2,
        monsterZones: [zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function deckWithPriority(priorityIds: readonly string[]) {
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

function requireHandCard(state: DuelState, cardId: string) {
  const card = state.players.P1.hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in P1 hand.`);
  }

  return card;
}

function zoneCard(
  instanceId: string,
  cardId: string,
  owner: "P1" | "P2",
  overrides: Partial<ZoneCard> = {},
): ZoneCard {
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
    summonedTurn: 0,
    positionChangedTurn: null,
    attackedTurn: null,
    ...overrides,
  };
}
