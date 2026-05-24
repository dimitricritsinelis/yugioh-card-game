import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { isPlayableCard, validateDeck } from "../index";
import { EFFECT_NOT_IMPLEMENTED } from "../cards/unsupported";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const GRACEFUL_CHARITY_ID = "79571449";

describe("missing card effect scripts", () => {
  it("emits an explicit missing-effect event without moving cards for unsupported Spell activation", () => {
    const state = deepFreeze(advanceToM1(createFixtureDuel([GRACEFUL_CHARITY_ID], { allowUnsupportedCards: true }).state));
    const before = JSON.parse(JSON.stringify(state));
    const gracefulCharity = requireHandCard(state, "P1", GRACEFUL_CHARITY_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: gracefulCharity.instanceId,
    });

    expect(result.state).not.toBe(state);
    expect({ ...result.state, eventIds: state.eventIds }).toEqual(before);
    expect(result.state.eventIds).toEqual([...state.eventIds, "evt-0016"]);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      type: "effect-not-implemented",
      playerId: "P1",
      cardId: GRACEFUL_CHARITY_ID,
      instanceId: gracefulCharity.instanceId,
      metadata: {
        reasonCode: EFFECT_NOT_IMPLEMENTED,
      },
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: "unsupported-card",
      playerId: "P1",
      commandType: "activate-card",
      cardId: GRACEFUL_CHARITY_ID,
      instanceId: gracefulCharity.instanceId,
    });
    expect(result.errors[0]?.message).toContain(EFFECT_NOT_IMPLEMENTED);
  });

  it("blocks unsupported cards in normal playable deck validation and duel creation", () => {
    const deck = deckWithPriority([GRACEFUL_CHARITY_ID]);
    const validation = validateDeck(deck, cards);

    expect(validation.valid).toBe(false);
    expect(validation.errors.join(" ")).toContain("Graceful Charity is not supported in playable decks");
    expect(() =>
      createDuel({
        cards,
        decks: {
          P1: deck,
          P2: deckWithPriority([]),
        },
        seed: "unsupported-deck",
        shuffleDecks: false,
      }),
    ).toThrow("Graceful Charity is not supported in playable decks");
  });
});

function createFixtureDuel(
  priorityIds: string[] = [],
  options: { allowUnsupportedCards?: boolean } = {},
) {
  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    seed: "missing-script",
    shuffleDecks: false,
    allowUnsupportedCards: options.allowUnsupportedCards,
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
