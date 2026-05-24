import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import type { ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { payCosts } from "../effects/costs";
import { createPrompt } from "../prompts/prompt";
import { validatePromptAnswer } from "../prompts/selection";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const SOURCE_ID = "05053103";
const DISCARD_ID = "85639257";
const TRIBUTE_ID = "89631139";
const SEND_ID = "27125110";
const BANISH_ID = "47372349";
const REVEAL_ID = "23771716";

describe("effect costs", () => {
  it("supports all core cost kinds without mutating the input state", () => {
    const base = stateWithPriority([SOURCE_ID, DISCARD_ID, TRIBUTE_ID, SEND_ID, BANISH_ID, REVEAL_ID]);
    const discard = requireHandCard(base, "P1", DISCARD_ID);
    const tribute = zoneCard("tribute-source", TRIBUTE_ID, "P1");
    const send = zoneCard("send-source", SEND_ID, "P1");
    const banish = zoneCard("banish-source", BANISH_ID, "P1");
    const reveal = zoneCard("reveal-source", REVEAL_ID, "P1", {
      face: "faceDown",
      position: null,
      visibility: "hidden",
    });
    const withCostCards: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [tribute, null, null, null, null],
          spellTrapZones: [send, reveal, null, null, null],
          graveyard: [banish],
        },
      },
    };
    const frozen = deepFreeze(withCostCards);
    const before = JSON.parse(JSON.stringify(frozen));
    const result = payCosts(frozen, "P1", [
      { kind: "none" },
      { kind: "pay-lp", amount: 500 },
      { kind: "discard", count: 1 },
      { kind: "tribute", count: 1 },
      { kind: "send-to-graveyard", count: 1 },
      { kind: "banish-from-graveyard", count: 1 },
      { kind: "reveal", count: 1 },
    ], {
      instanceIds: [
        discard.instanceId,
        tribute.instanceId,
        send.instanceId,
        banish.instanceId,
        reveal.instanceId,
      ],
    });

    expect(frozen).toEqual(before);
    expect(result.valid).toBe(true);
    expect(result.state.players.P1.lp).toBe(7500);
    expect(result.state.players.P1.hand.some((card) => card.instanceId === discard.instanceId)).toBe(false);
    expect(result.state.players.P1.monsterZones[0]).toBeNull();
    expect(result.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(result.state.players.P1.banished[0]).toMatchObject({ instanceId: banish.instanceId });
    expect(result.state.players.P1.spellTrapZones[1]).toMatchObject({
      instanceId: reveal.instanceId,
      face: "faceUp",
      visibility: "public",
    });
    expect(result.paidCosts.map((cost) => cost.kind)).toEqual([
      "none",
      "pay-lp",
      "discard",
      "tribute",
      "send-to-graveyard",
      "banish-from-graveyard",
      "reveal",
    ]);
  });
});

describe("effect targets", () => {
  it("stores chosen targets at activation and rejects resolution when a target becomes invalid", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "monsterZone", index: 0 };
    const state = stateWithScripts([
      {
        cardId: SOURCE_ID,
        effects: [
          {
            id: "targeted-effect",
            kind: "quick",
            implemented: true,
            spellSpeed: 2,
            targets: [
              {
                kind: "card",
                controller: "opponent",
                zones: ["monsterZone"],
                cardKinds: ["monster"],
                face: "faceUp",
                min: 1,
                max: 1,
              },
            ],
            resolution: {
              steps: [{ kind: "destroy-targets" }],
              sendSourceToGraveyard: false,
            },
          },
        ],
      },
    ]);
    const source = requireHandCard(state, "P1", SOURCE_ID);
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "targeted-effect",
      targetRefs: [targetRef],
    });

    expect(activation.errors).toEqual([]);
    expect(activation.state.chain[0]?.selectedTargets).toEqual({
      targetRefs: [targetRef],
      targetPlayerIds: [],
    });
    expect(activation.events.map((event) => event.type)).toEqual([
      "targets-chosen",
      "effect-activated",
      "chain-link-created",
    ]);

    const invalidated: DuelState = {
      ...activation.state,
      players: {
        ...activation.state.players,
        P2: {
          ...activation.state.players.P2,
          monsterZones: [null, null, null, null, null],
        },
      },
    };
    const resolved = reduceDuel(invalidated, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.map((event) => event.type)).toContain("effect-resolved-without-effect");
    expect(resolved.state.chain).toEqual([]);
  });
});

describe("effect prompts", () => {
  it("creates pending prompts for effects that need choices and resolves answered prompts", () => {
    const state = stateWithScripts([
      {
        cardId: SOURCE_ID,
        effects: [
          {
            id: "choice-effect",
            kind: "quick",
            implemented: true,
            spellSpeed: 2,
            prompts: [
              {
                kind: "yes-no",
                message: "Activate optional effect?",
                min: 1,
                max: 1,
              },
            ],
          },
        ],
      },
    ]);
    const source = requireHandCard(state, "P1", SOURCE_ID);
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "choice-effect",
    });

    expect(activation.events[0]).toMatchObject({
      type: "prompt-created",
      promptId: "prompt-1",
      promptKind: "yes-no",
    });
    expect(activation.prompts[0]).toMatchObject({
      id: "prompt-1",
      kind: "yes-no",
      min: 1,
      max: 1,
    });
    expect(activation.state.pendingPromptIds).toEqual(["prompt-1"]);

    const invalidAnswer = reduceDuel(activation.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      choiceIds: ["maybe"],
    });
    const answered = reduceDuel(activation.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      choiceIds: ["yes"],
    });

    expect(invalidAnswer.errors[0]?.message).toBe("Yes/no prompts require a yes or no choice.");
    expect(answered.errors).toEqual([]);
    expect(answered.events[0]).toMatchObject({
      type: "prompt-resolved",
      promptId: "prompt-1",
    });
    expect(answered.state.pendingPromptIds).toEqual([]);
    expect(answered.state.prompts["prompt-1"]).toBeUndefined();
  });

  it("validates choice, target, discard, tribute, and chain-response selections", () => {
    const promptKinds = [
      ["choice", { choiceIds: ["one"] }],
      ["target", { targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }] }],
      ["discard", { discardInstanceIds: ["discard-1"] }],
      ["tribute", { tributeInstanceIds: ["tribute-1"] }],
      ["chain-response", { choiceIds: ["pass"] }],
    ] as const;

    for (const [kind, answer] of promptKinds) {
      const prompt = createPrompt(
        {
          kind,
          message: `${kind} prompt`,
          min: 1,
          max: 1,
        },
        "P1",
        `${kind}-prompt`,
      );

      expect(validatePromptAnswer(prompt, {
        type: "answer-prompt",
        playerId: "P1",
        promptId: prompt.id,
        ...answer,
      })).toBeNull();
    }
  });
});

function stateWithScripts(scripts: readonly CardScript[]): DuelState {
  const state = stateWithPriority(scripts.map((script) => script.cardId));

  return {
    ...state,
    cardScripts: createCardScriptRegistry(scripts),
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        monsterZones: [zoneCard("p2-target", DISCARD_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function stateWithPriority(priorityIds: readonly string[]): DuelState {
  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    seed: "costs-targets-prompts",
    shuffleDecks: false,
  }).state;
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

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}
