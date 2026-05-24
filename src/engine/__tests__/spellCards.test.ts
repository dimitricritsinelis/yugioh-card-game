import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import {
  BOOK_OF_MOON_ID,
  HEAVY_STORM_ID,
  MYSTICAL_SPACE_TYPHOON_ID,
  POT_OF_GREED_ID,
  UPSTART_GOBLIN_ID,
} from "../cards/scripts/spells";
import { getCardCoverage, isPlayableCard } from "../cards/coverage";
import type { ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";
import { validateDeck } from "../deckValidation";

const cards = cardsJson as CardRecord[];
const GRACEFUL_CHARITY_ID = "79571449";
const LIGHTNING_VORTEX_ID = "69162969";
const BLUE_EYES_ID = "89631139";
const LA_JINN_ID = "97590747";
const AXE_RAIDER_ID = "48305365";

describe("supported Spell card scripts", () => {
  it("supports Pot of Greed drawing two cards", () => {
    const state = stateWithPriority([POT_OF_GREED_ID]);
    const beforeDeckSize = state.players.P1.mainDeck.length;
    const resolved = activateAndResolve(state, POT_OF_GREED_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(2);
    expect(resolved.state.players.P1.mainDeck).toHaveLength(beforeDeckSize - 2);
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ cardId: POT_OF_GREED_ID });
  });

  it("supports Heavy Storm destroying all Spell and Trap cards on the field", () => {
    const state = withFieldCards(stateWithPriority([HEAVY_STORM_ID]), {
      P1: {
        spellTrapZones: [zoneCard("p1-set", LA_JINN_ID, "P1", { position: null }), null, null, null, null],
        fieldZone: zoneCard("p1-field", AXE_RAIDER_ID, "P1", { position: null }),
      },
      P2: {
        spellTrapZones: [zoneCard("p2-set", BLUE_EYES_ID, "P2", { position: null }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, HEAVY_STORM_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.spellTrapZones.every((card) => card === null)).toBe(true);
    expect(resolved.state.players.P2.spellTrapZones.every((card) => card === null)).toBe(true);
    expect(resolved.state.players.P1.fieldZone).toBeNull();
    expect(resolved.events.filter((event) => event.type === "card-destroyed")).toHaveLength(3);
  });

  it("supports Mystical Space Typhoon destroying a targeted Spell or Trap", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "spellTrapZone", index: 0 };
    const state = withFieldCards(stateWithPriority([MYSTICAL_SPACE_TYPHOON_ID]), {
      P2: {
        spellTrapZones: [zoneCard("p2-set", POT_OF_GREED_ID, "P2", { position: null }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, MYSTICAL_SPACE_TYPHOON_ID, { targetRefs: [targetRef] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ instanceId: "p2-set" });
  });

  it("supports Book of Moon setting a face-up monster face-down in Defense Position", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "monsterZone", index: 0 };
    const state = withFieldCards(stateWithPriority([BOOK_OF_MOON_ID]), {
      P2: {
        monsterZones: [zoneCard("p2-monster", BLUE_EYES_ID, "P2", { face: "faceUp", position: "attack" }), null, null, null, null],
      },
    });
    const resolved = activateAndResolve(state, BOOK_OF_MOON_ID, { targetRefs: [targetRef] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
  });

  it("supports Upstart Goblin drawing one card and giving the opponent 1000 LP", () => {
    const state = stateWithPriority([UPSTART_GOBLIN_ID]);
    const beforeDeckSize = state.players.P1.mainDeck.length;
    const resolved = activateAndResolve(state, UPSTART_GOBLIN_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(1);
    expect(resolved.state.players.P1.mainDeck).toHaveLength(beforeDeckSize - 1);
    expect(resolved.state.players.P2.lp).toBe(9000);
  });

  it("keeps unsupported Spell cards blocked from playable decks", () => {
    const graceful = cardById(GRACEFUL_CHARITY_ID);
    const vortex = cardById(LIGHTNING_VORTEX_ID);

    expect(getCardCoverage(graceful).status).toBe("goatUnsupported");
    expect(getCardCoverage(vortex).status).toBe("goatUnsupported");
    expect(isPlayableCard(GRACEFUL_CHARITY_ID, cards)).toBe(false);

    const result = validateDeck(deckWithPriority([GRACEFUL_CHARITY_ID]), [...cards]);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Graceful Charity is not supported in playable decks.");
  });
});

function stateWithPriority(priorityIds: readonly string[]): DuelState {
  return advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    seed: "spell-card-tests",
    shuffleDecks: false,
  }).state);
}

function activateAndResolve(
  state: DuelState,
  cardId: string,
  options: { readonly targetRefs?: readonly ZoneRef[] } = {},
) {
  const source = requireHandCard(state, "P1", cardId);
  const activation = reduceDuel(state, {
    type: "activate-card",
    playerId: "P1",
    instanceId: source.instanceId,
    targetRefs: options.targetRefs,
  });

  expect(activation.errors).toEqual([]);

  return reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });
}

function withFieldCards(
  state: DuelState,
  patches: Partial<Record<"P1" | "P2", Partial<Pick<DuelState["players"]["P1"], "monsterZones" | "spellTrapZones" | "fieldZone">>>>,
): DuelState {
  return {
    ...state,
    players: {
      P1: {
        ...state.players.P1,
        ...patches.P1,
      },
      P2: {
        ...state.players.P2,
        ...patches.P2,
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

function cardById(cardId: string): CardRecord {
  const card = cards.find((candidate) => candidate.passcode === cardId);

  if (!card) {
    throw new Error(`Missing fixture cardId: ${cardId}`);
  }

  return card;
}
