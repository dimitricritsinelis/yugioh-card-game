import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import type { ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const AXE_OF_DESPAIR_ID = "40619825";
const POT_OF_GREED_ID = "55144522";
const BATTLE_OX_ID = "05053103";
const LA_JINN_ID = "97590747";
const BLUE_EYES_ID = "89631139";

describe("Equip system foundations", () => {
  it("equips a source card to a face-up monster and applies attached stat modifiers", () => {
    const state = equipBattleState([equipAtkScript(AXE_OF_DESPAIR_ID)]);
    const axe = requireHandCard(state, AXE_OF_DESPAIR_ID);
    const target = state.players.P1.monsterZones[0]!;
    const equipped = activateAndResolve(state, axe.instanceId, [{ playerId: "P1", zone: "monsterZone", index: 0 }]);
    const equippedMonster = equipped.state.players.P1.monsterZones[0]!;
    const equippedSource = equipped.state.players.P1.spellTrapZones[0]!;
    const battleReady = reduceDuel(equipped.state, { type: "change-phase", playerId: "P1", phase: "BP" }).state;
    const battle = reduceDuel(battleReady, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: equippedMonster.instanceId,
      defenderInstanceId: battleReady.players.P2.monsterZones[0]!.instanceId,
    });

    expect(equipped.errors).toEqual([]);
    expect(equipped.events).toContainEqual(expect.objectContaining({
      type: "card-moved",
      cardId: AXE_OF_DESPAIR_ID,
      reason: "equip",
    }));
    expect(equippedMonster.attachments).toContain(axe.instanceId);
    expect(equippedSource.attachments).toContain(target.instanceId);
    expect(battle.errors).toEqual([]);
    expect(battle.state.players.P1.lp).toBe(7700);
    expect(battle.events).toContainEqual(expect.objectContaining({
      type: "battle-damage",
      playerId: "P1",
      amount: 300,
    }));
  });

  it("detaches the equipped monster when the Equip source leaves the field", () => {
    const state = equipBattleState([equipAtkScript(AXE_OF_DESPAIR_ID), destroySpellTrapScript(POT_OF_GREED_ID)], [POT_OF_GREED_ID]);
    const axe = requireHandCard(state, AXE_OF_DESPAIR_ID);
    const destroySpell = requireHandCard(state, POT_OF_GREED_ID);
    const equipped = activateAndResolve(state, axe.instanceId, [{ playerId: "P1", zone: "monsterZone", index: 0 }]);
    const destroyed = activateAndResolve(
      equipped.state,
      destroySpell.instanceId,
      [{ playerId: "P1", zone: "spellTrapZone", index: 0 }],
    );

    expect(destroyed.errors).toEqual([]);
    expect(destroyed.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(destroyed.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: BATTLE_OX_ID,
      attachments: [],
    });
    expect(destroyed.state.players.P1.graveyard.some((card) => card.instanceId === axe.instanceId)).toBe(true);
  });

  it("destroys the Equip source when the equipped monster leaves the field", () => {
    const state = equipBattleState([equipAtkScript(AXE_OF_DESPAIR_ID)]);
    const axe = requireHandCard(state, AXE_OF_DESPAIR_ID);
    const equipped = activateAndResolve(state, axe.instanceId, [{ playerId: "P1", zone: "monsterZone", index: 0 }]);
    const battleReady = reduceDuel(equipped.state, { type: "change-phase", playerId: "P1", phase: "BP" }).state;
    const battle = reduceDuel(battleReady, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: battleReady.players.P1.monsterZones[0]!.instanceId,
      defenderInstanceId: battleReady.players.P2.monsterZones[0]!.instanceId,
    });

    expect(battle.errors).toEqual([]);
    expect(battle.state.players.P1.monsterZones[0]).toBeNull();
    expect(battle.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(battle.state.players.P1.graveyard.some((card) => card.instanceId === axe.instanceId)).toBe(true);
  });

  it("destroys Equip sources when the equipped monster becomes face-down", () => {
    const state = equipBattleState([equipAtkScript(AXE_OF_DESPAIR_ID), setFaceDownScript(POT_OF_GREED_ID)], [POT_OF_GREED_ID]);
    const axe = requireHandCard(state, AXE_OF_DESPAIR_ID);
    const setFaceSpell = requireHandCard(state, POT_OF_GREED_ID);
    const equipped = activateAndResolve(state, axe.instanceId, [{ playerId: "P1", zone: "monsterZone", index: 0 }]);
    const setFaceDown = activateAndResolve(
      equipped.state,
      setFaceSpell.instanceId,
      [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    );

    expect(setFaceDown.errors).toEqual([]);
    expect(setFaceDown.state.players.P1.monsterZones[0]).toMatchObject({
      face: "faceDown",
      attachments: [],
    });
    expect(setFaceDown.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(setFaceDown.state.players.P1.graveyard.some((card) => card.instanceId === axe.instanceId)).toBe(true);
  });

  it("rejects re-equipping an already equipped source", () => {
    const state = equipBattleState([equipAtkScript(AXE_OF_DESPAIR_ID)], [], true);
    const axe = requireHandCard(state, AXE_OF_DESPAIR_ID);
    const equipped = activateAndResolve(state, axe.instanceId, [{ playerId: "P1", zone: "monsterZone", index: 0 }]);
    const result = reduceDuel(equipped.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: axe.instanceId,
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 1 }],
    });

    expect(result.errors[0]?.message).toBe("Equip source is already equipped.");
    expect(result.state.chain).toEqual([]);
  });
});

function equipAtkScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "equip",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: [faceUpMonsterTarget("own")],
        resolution: {
          steps: [{ kind: "equip-source-to-target" }],
          sendSourceToGraveyard: false,
        },
      },
      {
        id: "equipped-atk-bonus",
        kind: "continuous",
        implemented: true,
        continuous: {
          statModifiers: [
            {
              stat: "atk",
              amount: 1000,
              target: { attachedToSource: true },
            },
          ],
        },
      },
    ],
  };
}

function destroySpellTrapScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "destroy-spell-trap",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: [
          {
            kind: "card",
            controller: "own",
            zones: ["spellTrapZone"],
            min: 1,
            max: 1,
          },
        ],
        resolution: { steps: [{ kind: "destroy-targets" }] },
      },
    ],
  };
}

function setFaceDownScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "set-face-down",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: [faceUpMonsterTarget("own")],
        resolution: { steps: [{ kind: "set-face", face: "faceDown", position: "defense" }] },
      },
    ],
  };
}

function faceUpMonsterTarget(controller: "own" | "opponent") {
  return {
    kind: "card" as const,
    controller,
    zones: ["monsterZone"] as const,
    cardKinds: ["monster"] as const,
    face: "faceUp" as const,
    min: 1,
    max: 1,
  };
}

function activateAndResolve(state: DuelState, sourceInstanceId: string, targetRefs: readonly ZoneRef[]) {
  const activated = reduceDuel(state, {
    type: "activate-card",
    playerId: "P1",
    instanceId: sourceInstanceId,
    targetRefs,
  });

  if (activated.errors.length > 0) {
    return activated;
  }

  return reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });
}

function equipBattleState(
  scripts: readonly CardScript[],
  extraPriorityIds: readonly string[] = [],
  secondP1Monster = false,
): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority([AXE_OF_DESPAIR_ID, ...extraPriorityIds, BATTLE_OX_ID, ...(secondP1Monster ? [LA_JINN_ID] : [])]),
      P2: deckWithPriority([BLUE_EYES_ID]),
    },
    allowUnsupportedCards: true,
    seed: `equip-${scripts.map((script) => script.cardId).join("-")}-${extraPriorityIds.join("-")}`,
    shuffleDecks: false,
  }).state;
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;
  const main = reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
  const p1Monsters = [
    zoneCard("p1-battle-ox", BATTLE_OX_ID, "P1"),
    secondP1Monster ? zoneCard("p1-la-jinn", LA_JINN_ID, "P1") : null,
    null,
    null,
    null,
  ];

  return {
    ...main,
    cardScripts: createCardScriptRegistry(scripts),
    players: {
      ...main.players,
      P1: {
        ...main.players.P1,
        monsterZones: p1Monsters,
      },
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
