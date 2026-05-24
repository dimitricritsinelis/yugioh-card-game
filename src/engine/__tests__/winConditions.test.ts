import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { isPlayableCard } from "../cards/coverage";
import type { CardCoverageRegistry } from "../cards/coverage";
import { ENGINE_CARD_COVERAGE } from "../cards/registry";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";
import { EXODIA_CARD_IDS } from "../rules/winConditions";

const cards = cardsJson as CardRecord[];

describe("core win and loss conditions", () => {
  it("finishes the duel when battle damage reduces LP to 0", () => {
    const state = stateWithDirectAttacker("Blue-Eyes White Dragon", 2500);
    const attacker = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P2.lp).toBe(0);
    expect(result.state.players.P2.lost).toBe(true);
    expect(result.state.winner).toBe("P1");
    expect(result.events.map((event) => event.type)).toEqual([
      "attack-declared",
      "battle-damage",
      "lp-changed",
      "player-lost",
      "duel-finished",
    ]);
    expect(result.events.at(-2)).toMatchObject({ type: "player-lost", playerId: "P2", reason: "lp-zero" });
    expect(result.events.at(-1)).toMatchObject({ type: "duel-finished", winner: "P1", reason: "lp-zero" });
  });

  it("finishes the duel when the turn player cannot draw a required card", () => {
    const state = createFixtureDuel(["Battle Ox"]).state;
    const emptyDeckState: DuelState = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          mainDeck: [],
        },
      },
    };
    const result = reduceDuel(emptyDeckState, { type: "change-phase", playerId: "P1", phase: "SP" });

    expect(result.state.winner).toBe("P2");
    expect(result.state.players.P1.lost).toBe(true);
    expect(result.state.phase).toBe("DP");
    expect(result.events.map((event) => event.type)).toEqual(["player-lost", "duel-finished"]);
    expect(result.events[0]).toMatchObject({ playerId: "P1", reason: "deck-out" });
    expect(result.events[1]).toMatchObject({ winner: "P2", reason: "deck-out" });
  });

  it("blocks normal gameplay commands once the duel is finished", () => {
    const state = stateWithDirectAttacker("Blue-Eyes White Dragon", 2500);
    const attacker = state.players.P1.monsterZones[0]!;
    const finished = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    }).state;
    const attackAgain = reduceDuel(finished, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });
    const unsupportedCommand = reduceDuel(finished, {
      type: "set-spell-trap",
      playerId: "P1",
      instanceId: "missing",
      zoneIndex: 0,
    });

    expect(attackAgain.errors[0]).toMatchObject({
      code: "illegal-action",
      message: "The duel is already over.",
    });
    expect(unsupportedCommand.errors[0]).toMatchObject({
      code: "illegal-action",
      message: "The duel is already over.",
    });
  });

  it("does not award Exodia wins unless every Exodia piece is explicitly implemented", () => {
    const defaultCoverage = createDuel({
      cards,
      decks: {
        P1: deckWithPriority([...EXODIA_CARD_IDS]),
        P2: deckWithPriority([]),
      },
      seed: "exodia-disabled",
      shuffleDecks: false,
      allowUnsupportedCards: true,
    });
    const partialCoverage = createDuel({
      cards,
      decks: {
        P1: deckWithPriority([...EXODIA_CARD_IDS]),
        P2: deckWithPriority([]),
      },
      seed: "exodia-partial",
      shuffleDecks: false,
      deckValidation: {
        coverageRegistry: exodiaCoverageRegistry(EXODIA_CARD_IDS.slice(0, 4)),
      },
      allowUnsupportedCards: true,
    });
    const enabled = createDuel({
      cards,
      decks: {
        P1: deckWithPriority([...EXODIA_CARD_IDS]),
        P2: deckWithPriority([]),
      },
      seed: "exodia-enabled",
      shuffleDecks: false,
      deckValidation: {
        coverageRegistry: exodiaCoverageRegistry(EXODIA_CARD_IDS),
      },
    });

    expect(defaultCoverage.state.winner).toBeNull();
    expect(partialCoverage.state.winner).toBeNull();
    expect(enabled.state.winner).toBe("P1");
    expect(enabled.state.players.P2.lost).toBe(true);
    expect(enabled.events.at(-2)).toMatchObject({ type: "player-lost", playerId: "P2", reason: "exodia" });
    expect(enabled.events.at(-1)).toMatchObject({ type: "duel-finished", winner: "P1", reason: "exodia" });
  });
});

function stateWithDirectAttacker(attackerName: string, defenderLp: number): DuelState {
  const state = advanceToBattlePhase(createFixtureDuel([attackerName]).state);
  const attacker = monsterZone("p1-attacker", attackerName, "P1");

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [attacker, null, null, null, null],
      },
      P2: {
        ...state.players.P2,
        lp: defenderLp,
      },
    },
  };
}

function createFixtureDuel(priorityNames: readonly string[] = []) {
  const priorityCardIds = priorityNames.map((name) => cardByName(name).passcode);

  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityCardIds),
      P2: deckWithPriority([]),
    },
    seed: "win-conditions",
    shuffleDecks: false,
  });
}

function advanceToBattlePhase(state: DuelState): DuelState {
  let current = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  for (const phase of ["M1", "BP"] as const) {
    current = reduceDuel(current, { type: "change-phase", playerId: "P1", phase }).state;
  }

  return current;
}

function deckWithPriority(priorityCardIds: readonly string[]) {
  const excluded = new Set(priorityCardIds);
  const filler = legalMainDeck(40 + excluded.size).filter((passcode) => !excluded.has(passcode));

  return {
    main: [...priorityCardIds, ...filler].slice(0, 40),
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

function monsterZone(instanceId: string, name: string, owner: "P1" | "P2"): ZoneCard {
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
    summonedTurn: 0,
    positionChangedTurn: null,
    attackedTurn: null,
  };
}

function exodiaCoverageRegistry(cardIds: readonly string[]): CardCoverageRegistry {
  const registry: Record<string, "implemented"> = {};

  for (const [cardId, status] of Object.entries(ENGINE_CARD_COVERAGE)) {
    if (status === "implemented") {
      registry[cardId] = status;
    }
  }

  for (const cardId of cardIds) {
    registry[cardId] = "implemented";
  }

  return Object.freeze(registry);
}

function cardByName(name: string): CardRecord {
  const card = cards.find((candidate) => candidate.name === name);

  if (!card) {
    throw new Error(`Missing fixture card: ${name}`);
  }

  return card;
}
