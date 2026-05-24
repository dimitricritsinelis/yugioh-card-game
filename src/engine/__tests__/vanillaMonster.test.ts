import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry, getCardScript, hasCardScript } from "../cards/registry";
import { createCardScriptsForCatalog } from "../cards/scripts";
import {
  createVanillaMonsterScript,
  createVanillaMonsterScripts,
  isVanillaMonsterDefinition,
} from "../cards/templates/vanillaMonster";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { normalizeCard } from "../data/normalizeCard";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";
const AQUA_MADOOR_ID = "85639257";
const BLUE_EYES_ID = "89631139";
const THOUSAND_EYES_ID = "27125110";
const GRACEFUL_CHARITY_ID = "79571449";

describe("vanilla monster scripts", () => {
  it("auto-registers representative Normal Monsters by passcode cardId", () => {
    const definitions = [
      BATTLE_OX_ID,
      AQUA_MADOOR_ID,
      BLUE_EYES_ID,
      THOUSAND_EYES_ID,
      GRACEFUL_CHARITY_ID,
    ].map(cardDefinitionById);
    const registry = createCardScriptRegistry(createCardScriptsForCatalog(definitions));

    for (const cardId of [BATTLE_OX_ID, AQUA_MADOOR_ID, BLUE_EYES_ID, THOUSAND_EYES_ID]) {
      const script = getCardScript(registry, cardId);

      expect(script).toBeDefined();
      expect(script?.cardId).toBe(cardId);
      expect(script?.effects).toEqual([]);
      expect(script?.canActivate).toBeUndefined();
      expect(script?.resolve).toBeUndefined();
      expect(hasCardScript(registry, cardId)).toBe(true);
    }

    expect(getCardScript(registry, GRACEFUL_CHARITY_ID)).toBeUndefined();
    expect(hasCardScript(registry, GRACEFUL_CHARITY_ID)).toBe(false);
  });

  it("rejects direct vanilla script creation for non-vanilla cards", () => {
    const normalMonster = cardDefinitionById(BATTLE_OX_ID);
    const normalSpell = cardDefinitionById(GRACEFUL_CHARITY_ID);

    expect(isVanillaMonsterDefinition(normalMonster)).toBe(true);
    expect(isVanillaMonsterDefinition(normalSpell)).toBe(false);
    expect(createVanillaMonsterScript(normalMonster)).toMatchObject({
      cardId: BATTLE_OX_ID,
      effects: [],
    });
    expect(() => createVanillaMonsterScript(normalSpell)).toThrow(
      `Cannot create vanilla monster script for cardId: ${GRACEFUL_CHARITY_ID}`,
    );
  });

  it("creates no activatable effects for vanilla monsters", () => {
    const scripts = createVanillaMonsterScripts([
      cardDefinitionById(BATTLE_OX_ID),
      cardDefinitionById(AQUA_MADOOR_ID),
    ]);

    expect(scripts).toHaveLength(2);
    expect(scripts.every((script) => script.effects.length === 0)).toBe(true);
    expect(scripts.every((script) => script.canActivate === undefined)).toBe(true);
    expect(scripts.every((script) => script.resolve === undefined)).toBe(true);
  });

  it("allows vanilla monsters to be Summoned, Set, battle, and change position", () => {
    const summonState = advanceToM1(createFixtureDuel([BATTLE_OX_ID]).state);
    const summonCard = requireHandCard(summonState, "P1", BATTLE_OX_ID);
    const summonResult = reduceDuel(summonState, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: summonCard.instanceId,
      zoneIndex: 0,
    });

    expect(summonResult.errors).toEqual([]);
    expect(summonResult.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: BATTLE_OX_ID,
      face: "faceUp",
      position: "attack",
    });

    const setState = advanceToM1(createFixtureDuel([AQUA_MADOOR_ID]).state);
    const setCard = requireHandCard(setState, "P1", AQUA_MADOOR_ID);
    const setResult = reduceDuel(setState, {
      type: "set-monster",
      playerId: "P1",
      instanceId: setCard.instanceId,
      zoneIndex: 1,
    });

    expect(setResult.errors).toEqual([]);
    expect(setResult.state.players.P1.monsterZones[1]).toMatchObject({
      cardId: AQUA_MADOOR_ID,
      face: "faceDown",
      position: "defense",
    });

    const battleState = stateWithBattlefield(BATTLE_OX_ID, AQUA_MADOOR_ID);
    const attacker = battleState.players.P1.monsterZones[0]!;
    const defender = battleState.players.P2.monsterZones[0]!;
    const battleResult = reduceDuel(battleState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(battleResult.errors).toEqual([]);
    expect(battleResult.state.players.P2.lp).toBe(7500);
    expect(battleResult.state.players.P2.monsterZones[0]).toBeNull();

    const positionState = stateWithMonster(BATTLE_OX_ID, {
      position: "attack",
      summonedTurn: 0,
    });
    const positionMonster = positionState.players.P1.monsterZones[0]!;
    const positionResult = reduceDuel(positionState, {
      type: "change-position",
      playerId: "P1",
      instanceId: positionMonster.instanceId,
      position: "defense",
    });

    expect(positionResult.errors).toEqual([]);
    expect(positionResult.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: BATTLE_OX_ID,
      position: "defense",
      positionChangedTurn: positionState.turn,
    });
  });
});

function cardDefinitionById(cardId: string) {
  return normalizeCard(cardRecordById(cardId));
}

function cardRecordById(cardId: string): CardRecord {
  const card = cards.find((candidate) => candidate.passcode === cardId);

  if (!card) {
    throw new Error(`Missing fixture cardId: ${cardId}`);
  }

  return card;
}

function createFixtureDuel(priorityIds: string[] = []) {
  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    seed: "vanilla-monster",
    shuffleDecks: false,
  });
}

function stateWithBattlefield(attackerId: string, defenderId: string): DuelState {
  const created = createDuel({
    cards,
    decks: {
      P1: deckWithPriority([attackerId]),
      P2: deckWithPriority([defenderId]),
    },
    seed: "vanilla-battle",
    shuffleDecks: false,
  });
  const state = advanceToBattlePhase(created.state);

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [monsterZone("p1-attacker", attackerId, "P1"), null, null, null, null],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [monsterZone("p2-defender", defenderId, "P2"), null, null, null, null],
      },
    },
  };
}

function stateWithMonster(cardId: string, overrides: Partial<ZoneCard>): DuelState {
  const state = advanceToM1(createFixtureDuel([cardId]).state);

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [monsterZone("p1-monster", cardId, "P1", overrides), null, null, null, null],
      },
    },
  };
}

function advanceToM1(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
}

function advanceToBattlePhase(state: DuelState): DuelState {
  const mainPhase = advanceToM1(state);

  return reduceDuel(mainPhase, { type: "change-phase", playerId: "P1", phase: "BP" }).state;
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

function monsterZone(
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
