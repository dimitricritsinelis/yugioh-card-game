import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { getCardCoverage, isPlayableCard } from "../cards/coverage";
import {
  DEKOICHI_ID,
  EXILED_FORCE_ID,
  MAGICIAN_OF_FAITH_ID,
  OLD_VINDICTIVE_MAGICIAN_ID,
} from "../cards/scripts/monsters";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { validateDeck } from "../deckValidation";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const SANGAN_ID = "26202165";
const MYSTIC_TOMATO_ID = "83011277";
const POT_OF_GREED_ID = "55144522";
const BATTLE_OX_ID = "05053103";
const BLUE_EYES_ID = "89631139";

describe("supported Monster card scripts", () => {
  it("supports Dekoichi drawing when Flip Summoned", () => {
    const state = setOwnFaceDownMonster(stateWithPriority([DEKOICHI_ID], []), DEKOICHI_ID);
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const resolved = reduceDuel(flipped.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(DEKOICHI_ID)).status).toBe("implemented");
    expect(resolved.errors).toEqual([]);
    expect(resolved.events.some((event) => event.type === "card-drawn")).toBe(true);
  });

  it("supports Magician of Faith returning a Spell from Graveyard to hand", () => {
    const state = setOwnFaceDownMonster(
      stateWithPriority([MAGICIAN_OF_FAITH_ID, POT_OF_GREED_ID], []),
      MAGICIAN_OF_FAITH_ID,
    );
    const patched: DuelState = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          graveyard: [zoneCard("p1-pot-grave", POT_OF_GREED_ID, "P1", { position: null })],
        },
      },
    };
    const monster = patched.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(patched, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.hand.at(-1)).toMatchObject({ instanceId: "p1-pot-grave" });
  });

  it("supports Old Vindictive Magician destroying a selected monster", () => {
    const state = withOpponentMonster(
      setOwnFaceDownMonster(stateWithPriority([OLD_VINDICTIVE_MAGICIAN_ID], [BLUE_EYES_ID]), OLD_VINDICTIVE_MAGICIAN_ID),
      BLUE_EYES_ID,
    );
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
  });

  it("supports Exiled Force Tributing itself to destroy a selected monster", () => {
    const state = withOpponentMonster(
      withOwnFaceUpMonster(stateWithPriority([EXILED_FORCE_ID], [BLUE_EYES_ID]), EXILED_FORCE_ID),
      BLUE_EYES_ID,
    );
    const source = state.players.P1.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(activation.events.some((event) => event.type === "cost-paid" && event.costKind === "tribute")).toBe(true);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ instanceId: source.instanceId });
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
  });

  it("keeps unsupported effect monsters blocked from playable decks", () => {
    const sangan = cardById(SANGAN_ID);
    const mysticTomato = cardById(MYSTIC_TOMATO_ID);
    const result = validateDeck(deckWithPriority([SANGAN_ID]), [...cards]);

    expect(getCardCoverage(sangan).status).toBe("unsupported");
    expect(getCardCoverage(mysticTomato).status).toBe("unsupported");
    expect(isPlayableCard(SANGAN_ID, cards)).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Sangan is not supported in playable decks.");
  });
});

function stateWithPriority(p1PriorityIds: readonly string[], p2PriorityIds: readonly string[]): DuelState {
  return advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(p1PriorityIds),
      P2: deckWithPriority(p2PriorityIds),
    },
    seed: "monster-card-tests",
    shuffleDecks: false,
  }).state);
}

function setOwnFaceDownMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-flip", cardId, "P1", { face: "faceDown", position: "defense", visibility: "hidden" }), null, null, null, null],
      },
    },
  };
}

function withOwnFaceUpMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-source", cardId, "P1"), null, null, null, null],
      },
    },
  };
}

function withOpponentMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        monsterZones: [zoneCard("p2-target", cardId, "P2"), null, null, null, null],
      },
    },
  };
}

function advanceToM1(state: DuelState): DuelState {
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
    setTurn: null,
    ...overrides,
  };
}

function cardById(cardId: string): CardRecord {
  const card = cards.find((candidate) => candidate.passcode === cardId);

  if (!card) {
    throw new Error(`Missing fixture cardId: ${cardId}`);
  }

  return card;
}
