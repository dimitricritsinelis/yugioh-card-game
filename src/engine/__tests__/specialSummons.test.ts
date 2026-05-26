import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import type { CardInstance, ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const POT_OF_GREED_ID = "55144522";
const BATTLE_OX_ID = "05053103";
const AQUA_MADOOR_ID = "85639257";
const THOUSAND_EYES_RESTRICT_ID = "63519819";

describe("special summon resolution primitives", () => {
  it("special summons a selected monster from hand", () => {
    const state = mainPhaseState([specialSummonTargetScript(POT_OF_GREED_ID, ["hand"])], [POT_OF_GREED_ID, BATTLE_OX_ID]);
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const target = requireHandCard(state, BATTLE_OX_ID);
    const resolved = activateAndResolve(state, source.instanceId, [{ playerId: "P1", zone: "hand", index: 1 }]);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.hand.some((card) => card.instanceId === target.instanceId)).toBe(false);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      instanceId: target.instanceId,
      cardId: BATTLE_OX_ID,
      face: "faceUp",
      position: "defense",
    });
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "summon-successful",
      instanceId: target.instanceId,
      summonKind: "special",
    }));
  });

  it("special summons selected monsters from banished and Fusion Deck zones", () => {
    const banishedState = withBanishedCard(
      mainPhaseState([specialSummonTargetScript(POT_OF_GREED_ID, ["banished"])], [POT_OF_GREED_ID, BATTLE_OX_ID]),
      BATTLE_OX_ID,
    );
    const banishedSource = requireHandCard(banishedState, POT_OF_GREED_ID);
    const banishedResolved = activateAndResolve(banishedState, banishedSource.instanceId, [
      { playerId: "P1", zone: "banished", index: 0 },
    ]);
    const fusionState = withFusionDeckCard(
      mainPhaseState([specialSummonTargetScript(POT_OF_GREED_ID, ["fusionDeck"])], [POT_OF_GREED_ID]),
      THOUSAND_EYES_RESTRICT_ID,
    );
    const fusionSource = requireHandCard(fusionState, POT_OF_GREED_ID);
    const fusionResolved = activateAndResolve(fusionState, fusionSource.instanceId, [
      { playerId: "P1", zone: "fusionDeck", index: 0 },
    ]);

    expect(banishedResolved.errors).toEqual([]);
    expect(banishedResolved.state.players.P1.banished).toEqual([]);
    expect(banishedResolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: BATTLE_OX_ID,
      position: "defense",
    });
    expect(fusionResolved.errors).toEqual([]);
    expect(fusionResolved.state.players.P1.fusionDeck).toEqual([]);
    expect(fusionResolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: THOUSAND_EYES_RESTRICT_ID,
      position: "defense",
    });
  });

  it("does not special summon when no Monster Zone is available", () => {
    const state = withFullMonsterZones(
      mainPhaseState([specialSummonTargetScript(POT_OF_GREED_ID, ["hand"])], [POT_OF_GREED_ID, BATTLE_OX_ID]),
    );
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const target = requireHandCard(state, BATTLE_OX_ID);
    const resolved = activateAndResolve(state, source.instanceId, [{ playerId: "P1", zone: "hand", index: 1 }]);

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.some((event) => event.type === "summon-successful")).toBe(false);
    expect(resolved.state.players.P1.hand).toContainEqual(expect.objectContaining({ instanceId: target.instanceId }));
    expect(resolved.state.players.P1.monsterZones).toHaveLength(5);
    expect(resolved.state.players.P1.monsterZones.every(Boolean)).toBe(true);
  });
});

function activateAndResolve(state: DuelState, sourceInstanceId: string, targetRefs: readonly ZoneRef[]) {
  const activated = reduceDuel(state, {
    type: "activate-card",
    playerId: "P1",
    instanceId: sourceInstanceId,
    effectId: "special-summon-target",
    targetRefs,
  });

  expect(activated.errors).toEqual([]);

  return reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });
}

function specialSummonTargetScript(cardId: string, zones: readonly ZoneRef["zone"][]): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "special-summon-target",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: [
          {
            kind: "card",
            controller: "own",
            zones,
            face: "any",
            min: 1,
            max: 1,
          },
        ],
        resolution: {
          steps: [{ kind: "special-summon-targets", position: "defense" }],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
}

function mainPhaseState(scripts: readonly CardScript[], priorityIds: readonly string[]): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    seed: `special-summon-${priorityIds.join("-")}`,
    shuffleDecks: false,
  }).state;
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;
  const main = reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;

  return {
    ...main,
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function withBanishedCard(state: DuelState, cardId: string): DuelState {
  const card = requireHandCard(state, cardId);

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: state.players.P1.hand.filter((candidate) => candidate.instanceId !== card.instanceId),
        banished: [zoneCard(card.instanceId, cardId, "P1", { position: null })],
      },
    },
  };
}

function withFusionDeckCard(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        fusionDeck: [cardInstance("p1-fusion-target", cardId, "P1")],
      },
    },
  };
}

function withFullMonsterZones(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: Array.from({ length: 5 }, (_, index) =>
          zoneCard(`p1-occupied-${index}`, AQUA_MADOOR_ID, "P1"),
        ),
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

function requireHandCard(state: DuelState, cardId: string): CardInstance {
  const card = state.players.P1.hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in P1 hand.`);
  }

  return card;
}

function cardInstance(instanceId: string, cardId: string, owner: "P1" | "P2"): CardInstance {
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
