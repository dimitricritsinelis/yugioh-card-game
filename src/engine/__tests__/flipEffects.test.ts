import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import { DEKOICHI_ID } from "../cards/scripts/monsters";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const THOUSAND_EYES_IDOL_ID = "27125110";
const POT_OF_GREED_ID = "55144522";

describe("FLIP effect timing", () => {
  it("triggers a FLIP effect when a face-down defender is flipped by battle", () => {
    const state = battleState();
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const attacked = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });
    const resolved = reduceDuel(attacked.state, { type: "resolve-chain", playerId: "P1" });

    expect(attacked.errors).toEqual([]);
    expect(attacked.events).toContainEqual(expect.objectContaining({
      type: "monster-flipped-face-up",
      playerId: "P2",
      instanceId: defender.instanceId,
      reason: "battle",
    }));
    expect(attacked.state.chain[0]).toMatchObject({
      playerId: "P2",
      cardId: DEKOICHI_ID,
      effectId: "flip",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).toContainEqual(expect.objectContaining({ type: "card-drawn", playerId: "P2" }));
  });

  it("triggers a FLIP effect when a card effect flips a monster face-up", () => {
    const state = mainPhaseState([effectFlipScript(POT_OF_GREED_ID)]);
    const spell = requireHandCard(state, "P1", POT_OF_GREED_ID);
    const target = state.players.P1.monsterZones[0]!;
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: spell.instanceId,
      effectId: "flip-target-face-up",
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const flipResolved = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });
    const triggerResolved = reduceDuel(flipResolved.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(flipResolved.errors).toEqual([]);
    expect(flipResolved.events).toContainEqual(expect.objectContaining({
      type: "monster-flipped-face-up",
      playerId: "P1",
      instanceId: target.instanceId,
      reason: "effect",
    }));
    expect(flipResolved.state.chain[0]).toMatchObject({
      playerId: "P1",
      cardId: DEKOICHI_ID,
      effectId: "flip",
    });
    expect(triggerResolved.errors).toEqual([]);
    expect(triggerResolved.events).toContainEqual(expect.objectContaining({ type: "card-drawn", playerId: "P1" }));
  });
});

function battleState(): DuelState {
  const state = advanceToBattlePhase(createDuel({
    cards,
    decks: {
      P1: deckWithPriority([THOUSAND_EYES_IDOL_ID]),
      P2: deckWithPriority([DEKOICHI_ID]),
    },
    seed: "flip-effect-battle",
    shuffleDecks: false,
  }).state);

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-attacker", THOUSAND_EYES_IDOL_ID, "P1"), null, null, null, null],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [
          zoneCard("p2-dekoichi", DEKOICHI_ID, "P2", {
            face: "faceDown",
            position: "defense",
            visibility: "hidden",
          }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function mainPhaseState(scripts: readonly CardScript[]): DuelState {
  const state = advanceToMainPhase(createDuel({
    cards,
    decks: {
      P1: deckWithPriority([POT_OF_GREED_ID, DEKOICHI_ID]),
      P2: deckWithPriority([]),
    },
    seed: "flip-effect-card-effect",
    shuffleDecks: false,
  }).state);
  const dekoichi = requireHandCard(state, "P1", DEKOICHI_ID);

  return {
    ...state,
    cardScripts: createCardScriptRegistry(scripts),
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: state.players.P1.hand.filter((card) => card.instanceId !== dekoichi.instanceId),
        monsterZones: [
          zoneCard(dekoichi.instanceId, DEKOICHI_ID, "P1", {
            face: "faceDown",
            position: "defense",
            visibility: "hidden",
          }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function effectFlipScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "flip-target-face-up",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: [
          {
            kind: "card",
            controller: "own",
            zones: ["monsterZone"],
            cardKinds: ["monster"],
            face: "faceDown",
            min: 1,
            max: 1,
          },
        ],
        resolution: {
          steps: [{ kind: "set-face", face: "faceUp" }],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
}

function advanceToBattlePhase(state: DuelState): DuelState {
  return reduceDuel(advanceToMainPhase(state), { type: "change-phase", playerId: "P1", phase: "BP" }).state;
}

function advanceToMainPhase(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
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

function requireHandCard(state: DuelState, playerId: "P1" | "P2", cardId: string) {
  const card = state.players[playerId].hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in ${playerId} hand.`);
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
