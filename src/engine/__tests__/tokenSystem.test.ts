import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript, EffectResolutionStep } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const POT_OF_GREED_ID = "55144522";
const BATTLE_OX_ID = "05053103";
const BLUE_EYES_ID = "89631139";
const SUMMONED_SKULL_ID = cardByName("Summoned Skull").passcode;

describe("Token system foundations", () => {
  it("creates Scapegoat-like Tokens with stats, ownership, controller, and tribute restrictions", () => {
    const state = tokenState([tokenScript(POT_OF_GREED_ID, sheepTokens(4, "defense"))]);
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const resolved = activateAndResolve(state, source.instanceId);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones.filter(Boolean)).toHaveLength(4);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: "token:sheep-token",
      owner: "P1",
      controller: "P1",
      face: "faceUp",
      position: "defense",
      token: {
        name: "Sheep Token",
        monsterType: "Beast",
        attribute: "EARTH",
        level: 1,
        atk: 0,
        def: 0,
        cannotBeTributedForTributeSummon: true,
      },
    });
    expect(resolved.events.filter((event) => event.type === "summon-successful")).toHaveLength(4);
  });

  it("rejects Token creation when there are not enough Monster Zones", () => {
    const base = tokenState([tokenScript(POT_OF_GREED_ID, sheepTokens(4, "defense"))]);
    const state = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [
            zoneCard("p1-occupied-1", BATTLE_OX_ID, "P1"),
            zoneCard("p1-occupied-2", BATTLE_OX_ID, "P1"),
            null,
            null,
            null,
          ],
        },
      },
    };
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const result = reduceDuel(state, { type: "activate-card", playerId: "P1", instanceId: source.instanceId });

    expect(result.errors[0]?.message).toBe("Not enough Monster Zones are available for those Tokens.");
    expect(result.state.chain).toEqual([]);
  });

  it("uses Token battle stats during damage calculation", () => {
    const state = tokenState([tokenScript(POT_OF_GREED_ID, battleToken())]);
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const resolved = activateAndResolve(state, source.instanceId);
    const noDefender: DuelState = {
      ...resolved.state,
      players: {
        ...resolved.state.players,
        P2: {
          ...resolved.state.players.P2,
          monsterZones: [null, null, null, null, null],
        },
      },
    };
    const battleReady = reduceDuel(
      reduceDuel(noDefender, { type: "change-phase", playerId: "P1", phase: "BP" }).state,
      {
        type: "attack",
        playerId: "P1",
        attackerInstanceId: noDefender.players.P1.monsterZones[0]!.instanceId,
      },
    );

    expect(battleReady.errors).toEqual([]);
    expect(battleReady.state.players.P2.lp).toBe(7500);
  });

  it("blocks Scapegoat-like Tokens as Tribute Summon Tributes", () => {
    const state = tokenState([tokenScript(POT_OF_GREED_ID, sheepTokens(1, "defense"))], [SUMMONED_SKULL_ID]);
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const resolved = activateAndResolve(state, source.instanceId);
    const tributeMonster = requireHandCard(resolved.state, SUMMONED_SKULL_ID);
    const token = resolved.state.players.P1.monsterZones[0]!;
    const tributeSummon = reduceDuel(resolved.state, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: tributeMonster.instanceId,
      zoneIndex: 0,
      tributeInstanceIds: [token.instanceId],
    });

    expect(tributeSummon.errors[0]?.message).toBe("That Token cannot be Tributed for a Tribute Summon.");
  });

  it("removes Tokens from the field without placing them in non-field zones", () => {
    const state = tokenState([tokenScript(POT_OF_GREED_ID, battleToken())]);
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const resolved = activateAndResolve(state, source.instanceId);
    const battleReady = reduceDuel(resolved.state, { type: "change-phase", playerId: "P1", phase: "BP" }).state;
    const battle = reduceDuel(battleReady, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: battleReady.players.P1.monsterZones[0]!.instanceId,
      defenderInstanceId: battleReady.players.P2.monsterZones[0]!.instanceId,
    });

    expect(battle.errors).toEqual([]);
    expect(battle.state.players.P1.monsterZones[0]).toBeNull();
    expect(battle.state.players.P1.graveyard.some((card) => card.cardId.startsWith("token:"))).toBe(false);
    expect(battle.state.players.P1.banished.some((card) => card.cardId.startsWith("token:"))).toBe(false);
  });
});

function sheepTokens(count: number, position: "attack" | "defense"): EffectResolutionStep {
  return {
    kind: "create-tokens",
    player: "self",
    count,
    name: "Sheep Token",
    monsterType: "Beast",
    attribute: "EARTH",
    level: 1,
    atk: 0,
    def: 0,
    position,
    cannotBeTributedForTributeSummon: true,
  };
}

function battleToken(): EffectResolutionStep {
  return {
    kind: "create-tokens",
    player: "self",
    count: 1,
    name: "Battle Token",
    monsterType: "Warrior",
    attribute: "EARTH",
    level: 4,
    atk: 500,
    def: 500,
    position: "attack",
  };
}

function tokenScript(cardId: string, step: EffectResolutionStep): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "create-token",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        resolution: { steps: [step] },
      },
    ],
  };
}

function activateAndResolve(state: DuelState, sourceInstanceId: string) {
  const activated = reduceDuel(state, { type: "activate-card", playerId: "P1", instanceId: sourceInstanceId });

  if (activated.errors.length > 0) {
    return activated;
  }

  return reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });
}

function tokenState(scripts: readonly CardScript[], extraPriorityIds: readonly string[] = []): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority([POT_OF_GREED_ID, ...extraPriorityIds]),
      P2: deckWithPriority([BLUE_EYES_ID]),
    },
    allowUnsupportedCards: true,
    seed: `token-${scripts.map((script) => script.cardId).join("-")}-${extraPriorityIds.join("-")}`,
    shuffleDecks: false,
  }).state;
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;
  const main = reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;

  return {
    ...main,
    cardScripts: createCardScriptRegistry(scripts),
    players: {
      ...main.players,
      P2: {
        ...main.players.P2,
        monsterZones: [zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
      },
    },
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

function requireHandCard(state: DuelState, cardId: string) {
  const card = state.players.P1.hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in P1 hand.`);
  }

  return card;
}

function cardByName(name: string): CardRecord {
  const card = cards.find((candidate) => candidate.name === name);

  if (!card) {
    throw new Error(`Missing fixture card: ${name}`);
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
