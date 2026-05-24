import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import type { CardScript, SpellSpeed } from "../cards/CardScript";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const SPELL_SPEED_1_ID = "05053103";
const SPELL_SPEED_2_ID = "85639257";
const SPELL_SPEED_3_ID = "89631139";

describe("core chain flow", () => {
  it("creates chain links from implemented scripts", () => {
    const state = stateWithScripts([
      script(SPELL_SPEED_1_ID, "speed-1", 1),
    ]);
    const source = requireHandCard(state, "P1", SPELL_SPEED_1_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "speed-1",
    });

    expect(result.errors).toEqual([]);
    expect(result.state.chain).toEqual([
      {
        id: "chain-1",
        playerId: "P1",
        sourceInstanceId: source.instanceId,
        cardId: SPELL_SPEED_1_ID,
        effectId: "speed-1",
        spellSpeed: 1,
      },
    ]);
    expect(result.events.map((event) => event.type)).toEqual([
      "effect-activated",
      "chain-link-created",
    ]);
    expect(result.events[1]).toMatchObject({
      type: "chain-link-created",
      chainLinkId: "chain-1",
      sourceInstanceId: source.instanceId,
      cardId: SPELL_SPEED_1_ID,
      spellSpeed: 1,
    });
  });

  it("rejects manual Spell Speed 1 chaining without changing chain state", () => {
    const state = stateWithScripts([
      script(SPELL_SPEED_1_ID, "first", 1),
      script(SPELL_SPEED_2_ID, "second", 1),
    ]);
    const first = requireHandCard(state, "P1", SPELL_SPEED_1_ID);
    const second = requireHandCard(state, "P1", SPELL_SPEED_2_ID);
    const firstResult = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: first.instanceId,
      effectId: "first",
    });
    const rejected = reduceDuel(firstResult.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: second.instanceId,
      effectId: "second",
    });

    expect(rejected.errors[0]?.message).toBe("Spell Speed 1 effects cannot be chained manually.");
    expect(rejected.state.chain).toEqual(firstResult.state.chain);
  });

  it("resolves chains in LIFO order", () => {
    let state = stateWithScripts([
      script(SPELL_SPEED_1_ID, "first", 1),
      script(SPELL_SPEED_2_ID, "second", 2),
      script(SPELL_SPEED_3_ID, "third", 3),
    ]);
    const first = requireHandCard(state, "P1", SPELL_SPEED_1_ID);
    const second = requireHandCard(state, "P1", SPELL_SPEED_2_ID);
    const third = requireHandCard(state, "P1", SPELL_SPEED_3_ID);

    state = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: first.instanceId,
      effectId: "first",
    }).state;
    state = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: second.instanceId,
      effectId: "second",
    }).state;
    state = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: third.instanceId,
      effectId: "third",
    }).state;

    expect(state.chain.map((link) => link.id)).toEqual(["chain-1", "chain-2", "chain-3"]);

    const resolved = reduceDuel(state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.map((event) => event.type)).toEqual([
      "chain-resolved",
      "chain-resolved",
      "chain-resolved",
    ]);
    expect(resolved.events.map((event) => event.type === "chain-resolved" ? event.chainLinkId : "")).toEqual([
      "chain-3",
      "chain-2",
      "chain-1",
    ]);
    expect(resolved.state.chain).toEqual([]);
    expect(resolved.state.priority).toEqual({
      holder: "P1",
      passedPlayerIds: [],
      reason: "chain-resolved",
      status: "open",
    });
  });
});

function stateWithScripts(scripts: readonly CardScript[]): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority(scripts.map((candidate) => candidate.cardId)),
      P2: deckWithPriority([]),
    },
    seed: "chain-flow",
    shuffleDecks: false,
  }).state;

  return {
    ...state,
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function script(cardId: string, effectId: string, spellSpeed: SpellSpeed): CardScript {
  return Object.freeze({
    cardId,
    effects: Object.freeze([
      Object.freeze({
        id: effectId,
        kind: "quick",
        implemented: true,
        spellSpeed,
        resolution: {
          steps: [],
          sendSourceToGraveyard: false,
        },
      }),
    ]),
  });
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
