import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import type { EngineEventType } from "../events";
import { createDuel, reduceDuel } from "../reducer";
import type { ChainLink } from "../rules/chain";

const cards = cardsJson as CardRecord[];
const TURN_PLAYER_TRIGGER_ID = "05053103";
const OPPONENT_TRIGGER_ID = "85639257";
const CHAIN_TRIGGER_ID = "89631139";

describe("simple trigger collection", () => {
  it("collects mandatory triggers after an action batch in turn-player then opponent order", () => {
    const state = stateWithScripts([
      triggerScript(TURN_PLAYER_TRIGGER_ID, "turn-player-trigger", "after-action", ["summon-successful"]),
      triggerScript(OPPONENT_TRIGGER_ID, "opponent-trigger", "after-action", ["summon-successful"]),
    ]);
    const withOpponentTrigger: DuelState = {
      ...state,
      players: {
        ...state.players,
        P2: {
          ...state.players.P2,
          monsterZones: [zoneCard("p2-trigger", OPPONENT_TRIGGER_ID, "P2"), null, null, null, null],
        },
      },
    };
    const summoned = requireHandCard(withOpponentTrigger, "P1", TURN_PLAYER_TRIGGER_ID);
    const result = reduceDuel(withOpponentTrigger, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: summoned.instanceId,
      zoneIndex: 0,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.chain.map((link) => [link.id, link.playerId, link.cardId, link.effectId])).toEqual([
      ["chain-1", "P1", TURN_PLAYER_TRIGGER_ID, "turn-player-trigger"],
      ["chain-2", "P2", OPPONENT_TRIGGER_ID, "opponent-trigger"],
    ]);
    expect(result.events.map((event) => event.type)).toEqual([
      "summon-declared",
      "summon-successful",
      "effect-activated",
      "chain-link-created",
      "effect-activated",
      "chain-link-created",
    ]);
  });

  it("creates and answers optional trigger prompts", () => {
    const state = stateWithScripts([
      triggerScript(TURN_PLAYER_TRIGGER_ID, "optional-trigger", "after-action", ["summon-successful"], true),
    ]);
    const summoned = requireHandCard(state, "P1", TURN_PLAYER_TRIGGER_ID);
    const result = reduceDuel(state, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: summoned.instanceId,
      zoneIndex: 0,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.chain).toEqual([]);
    expect(result.prompts[0]).toMatchObject({
      id: "prompt-1",
      kind: "yes-no",
      playerId: "P1",
      metadata: {
        trigger: "true",
        cardId: TURN_PLAYER_TRIGGER_ID,
        effectId: "optional-trigger",
      },
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "summon-declared",
      "summon-successful",
      "prompt-created",
    ]);

    const answered = reduceDuel(result.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      choiceIds: ["yes"],
    });

    expect(answered.errors).toEqual([]);
    expect(answered.events.map((event) => event.type)).toEqual([
      "prompt-resolved",
      "effect-activated",
      "chain-link-created",
    ]);
    expect(answered.state.pendingPromptIds).toEqual([]);
    expect(answered.state.chain[0]).toMatchObject({
      id: "chain-1",
      playerId: "P1",
      cardId: TURN_PLAYER_TRIGGER_ID,
      effectId: "optional-trigger",
    });
  });

  it("allows the opponent to answer an optional trigger prompt", () => {
    const state = stateWithScripts([
      triggerScript(OPPONENT_TRIGGER_ID, "opponent-optional-trigger", "after-action", ["summon-successful"], true),
    ]);
    const withOpponentTrigger: DuelState = {
      ...state,
      players: {
        ...state.players,
        P2: {
          ...state.players.P2,
          monsterZones: [zoneCard("p2-trigger", OPPONENT_TRIGGER_ID, "P2"), null, null, null, null],
        },
      },
    };
    const summoned = requireHandCard(withOpponentTrigger, "P1", TURN_PLAYER_TRIGGER_ID);
    const result = reduceDuel(withOpponentTrigger, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: summoned.instanceId,
      zoneIndex: 0,
    });

    expect(result.errors).toEqual([]);
    expect(result.prompts[0]).toMatchObject({
      id: "prompt-1",
      kind: "yes-no",
      playerId: "P2",
    });

    const answered = reduceDuel(result.state, {
      type: "answer-prompt",
      playerId: "P2",
      promptId: "prompt-1",
      choiceIds: ["yes"],
    });

    expect(answered.errors).toEqual([]);
    expect(answered.state.chain[0]).toMatchObject({
      id: "chain-1",
      playerId: "P2",
      cardId: OPPONENT_TRIGGER_ID,
      effectId: "opponent-optional-trigger",
    });
  });

  it("collects mandatory triggers after chain resolution", () => {
    const state = stateWithScripts([
      triggerScript(CHAIN_TRIGGER_ID, "after-chain-trigger", "chain-resolved", ["chain-resolved"]),
    ]);
    const chainTriggerState: DuelState = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          monsterZones: [zoneCard("p1-chain-trigger", CHAIN_TRIGGER_ID, "P1"), null, null, null, null],
        },
      },
      chain: [
        {
          id: "chain-1",
          playerId: "P1",
          sourceInstanceId: "existing-source",
          cardId: TURN_PLAYER_TRIGGER_ID,
          effectId: "existing-effect",
          spellSpeed: 1,
        } satisfies ChainLink,
      ],
    };
    const result = reduceDuel(chainTriggerState, { type: "resolve-chain", playerId: "P1" });

    expect(result.errors).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual([
      "chain-resolved",
      "effect-activated",
      "chain-link-created",
    ]);
    expect(result.events[0]).toMatchObject({ type: "chain-resolved", chainLinkId: "chain-1" });
    expect(result.state.chain).toEqual([
      {
        id: "chain-1",
        playerId: "P1",
        sourceInstanceId: "p1-chain-trigger",
        cardId: CHAIN_TRIGGER_ID,
        effectId: "after-chain-trigger",
        spellSpeed: 1,
      },
    ]);
    expect(result.state.priority.reason).toBe("chain-resolved");
  });
});

function stateWithScripts(scripts: readonly CardScript[]): DuelState {
  const state = advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority([TURN_PLAYER_TRIGGER_ID]),
      P2: deckWithPriority([]),
    },
    seed: "trigger-collection",
    shuffleDecks: false,
  }).state);

  return {
    ...state,
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function advanceToM1(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
}

function triggerScript(
  cardId: string,
  effectId: string,
  timing: "after-action" | "chain-resolved",
  eventTypes: readonly EngineEventType[],
  optional = false,
): CardScript {
  return {
    cardId,
    effects: [
      {
        id: effectId,
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: {
          timing,
          eventTypes,
          optional,
        },
      },
    ],
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
