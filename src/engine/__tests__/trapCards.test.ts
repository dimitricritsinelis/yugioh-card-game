import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { getCardCoverage, isPlayableCard } from "../cards/coverage";
import {
  MIRROR_FORCE_ID,
  SAKURETSU_ARMOR_ID,
  TORRENTIAL_TRIBUTE_ID,
} from "../cards/scripts/traps";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { validateDeck } from "../deckValidation";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const WABOKU_ID = "12607053";
const MAGIC_JAMMER_ID = "77414722";
const BATTLE_OX_ID = "05053103";
const BLUE_EYES_ID = "89631139";

describe("supported Trap card scripts", () => {
  it("supports Mirror Force responding to an opponent attack", () => {
    const state = battleStateWithOpponentTrap(MIRROR_FORCE_ID, BATTLE_OX_ID);
    const attack = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(MIRROR_FORCE_ID)).status).toBe("goatTemplate");
    expect(attack.state.chain[0]).toMatchObject({ playerId: "P2", cardId: MIRROR_FORCE_ID });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ instanceId: "p1-attacker" });
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: MIRROR_FORCE_ID });
  });

  it("supports Sakuretsu Armor destroying the attacking monster", () => {
    const state = battleStateWithOpponentTrap(SAKURETSU_ARMOR_ID, BLUE_EYES_ID);
    const attack = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(attack.state.players.P2.lp).toBe(8000);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.lp).toBe(8000);
  });

  it("supports Torrential Tribute responding to a successful summon", () => {
    const base = advanceToM1(stateWithPriority([BATTLE_OX_ID], [TORRENTIAL_TRIBUTE_ID]));
    const trapState = withOpponentTrap(base, TORRENTIAL_TRIBUTE_ID);
    const monster = requireHandCard(trapState, "P1", BATTLE_OX_ID);
    const summon = reduceDuel(trapState, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: monster.instanceId,
      zoneIndex: 0,
    });
    const resolved = reduceDuel(summon.state, { type: "resolve-chain", playerId: "P1" });

    expect(summon.state.chain[0]).toMatchObject({ playerId: "P2", cardId: TORRENTIAL_TRIBUTE_ID });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ instanceId: monster.instanceId });
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: TORRENTIAL_TRIBUTE_ID });
  });

  it("enforces the Trap set-turn timing lock for supported Traps", () => {
    const state = battleStateWithOpponentTrap(MIRROR_FORCE_ID, BATTLE_OX_ID, 1);
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });

    expect(result.errors).toEqual([]);
    expect(result.state.chain).toEqual([]);
    expect(result.state.players.P2.lp).toBe(6300);
  });

  it("keeps unsupported Trap cards blocked from playable decks", () => {
    const waboku = cardById(WABOKU_ID);
    const magicJammer = cardById(MAGIC_JAMMER_ID);
    const result = validateDeck(deckWithPriority([WABOKU_ID]), [...cards]);

    expect(getCardCoverage(waboku).status).toBe("goatUnsupported");
    expect(getCardCoverage(magicJammer).status).toBe("goatUnsupported");
    expect(isPlayableCard(WABOKU_ID, cards)).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Waboku is not supported in playable decks.");
  });
});

function battleStateWithOpponentTrap(trapId: string, attackerId: string, setTurn = 0): DuelState {
  const base = advanceToBattlePhase(stateWithPriority([attackerId], [trapId]));

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [zoneCard("p1-attacker", attackerId, "P1"), null, null, null, null],
      },
      P2: {
        ...base.players.P2,
        spellTrapZones: [
          zoneCard("p2-trap", trapId, "P2", {
            face: "faceDown",
            position: null,
            visibility: "hidden",
            setTurn,
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

function withOpponentTrap(state: DuelState, trapId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        spellTrapZones: [
          zoneCard("p2-trap", trapId, "P2", {
            face: "faceDown",
            position: null,
            visibility: "hidden",
            setTurn: 0,
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

function stateWithPriority(p1PriorityIds: readonly string[], p2PriorityIds: readonly string[]): DuelState {
  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(p1PriorityIds),
      P2: deckWithPriority(p2PriorityIds),
    },
    seed: "trap-card-tests",
    shuffleDecks: false,
  }).state;
}

function advanceToM1(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
}

function advanceToBattlePhase(state: DuelState): DuelState {
  const main = advanceToM1(state);

  return reduceDuel(main, { type: "change-phase", playerId: "P1", phase: "BP" }).state;
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
