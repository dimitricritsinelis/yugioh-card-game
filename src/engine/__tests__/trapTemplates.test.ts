import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import { createContinuousTrapScript } from "../cards/templates/continuousTrap";
import { createCounterTrapScript } from "../cards/templates/counterTrap";
import { createNormalTrapScript } from "../cards/templates/normalTrap";
import { createSpellSpeed2TrapScript } from "../cards/templates/spellSpeed2Trap";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const MIRROR_FORCE_ID = "44095762";
const SAKURETSU_ARMOR_ID = "56120475";
const WABOKU_ID = "12607053";
const SEVEN_TOOLS_ID = "03819470";
const GRAVITY_BIND_ID = "85742772";
const BATTLE_OX_ID = "05053103";
const AQUA_MADOOR_ID = "85639257";
const BLUE_EYES_ID = "89631139";

describe("Trap templates", () => {
  it("sets a Trap from hand face-down and stamps the set turn", () => {
    const state = advanceToM1(stateWithScripts([normalAttackTrap(MIRROR_FORCE_ID, "negate-attack")]));
    const trap = requireHandCard(state, "P1", MIRROR_FORCE_ID);
    const result = reduceDuel(state, {
      type: "set-spell-trap",
      playerId: "P1",
      instanceId: trap.instanceId,
      zoneIndex: 0,
    });

    expect(result.errors).toEqual([]);
    expect(result.events[0]).toMatchObject({ type: "spell-trap-set", cardId: MIRROR_FORCE_ID });
    expect(result.state.players.P1.hand.some((card) => card.instanceId === trap.instanceId)).toBe(false);
    expect(result.state.players.P1.spellTrapZones[0]).toMatchObject({
      instanceId: trap.instanceId,
      face: "faceDown",
      visibility: "hidden",
      setTurn: state.turn,
    });
  });

  it("blocks Trap activation the turn the card was Set", () => {
    const state = advanceToM1(stateWithScripts([normalAttackTrap(MIRROR_FORCE_ID, "negate-attack")]));
    const trap = requireHandCard(state, "P1", MIRROR_FORCE_ID);
    const set = reduceDuel(state, {
      type: "set-spell-trap",
      playerId: "P1",
      instanceId: trap.instanceId,
      zoneIndex: 0,
    });
    const result = reduceDuel(set.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: trap.instanceId,
    });

    expect(result.errors[0]?.message).toBe("Trap cards cannot be activated the turn they were Set.");
  });

  it("responds to attack declaration and destroys the attacking monster", () => {
    const state = battleStateWithOpponentTrap({
      scripts: [normalAttackTrap(SAKURETSU_ARMOR_ID, "destroy-attack-source")],
      trapId: SAKURETSU_ARMOR_ID,
      attackerId: BATTLE_OX_ID,
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const attack = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });

    expect(attack.errors).toEqual([]);
    expect(attack.state.chain).toHaveLength(1);
    expect(attack.state.players.P2.lp).toBe(8000);

    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ instanceId: attacker.instanceId });
    expect(resolved.state.players.P2.lp).toBe(8000);
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: SAKURETSU_ARMOR_ID });
  });

  it("does not trigger attack-response Traps on the turn they were Set", () => {
    const state = battleStateWithOpponentTrap({
      scripts: [normalAttackTrap(SAKURETSU_ARMOR_ID, "destroy-attack-source")],
      trapId: SAKURETSU_ARMOR_ID,
      attackerId: BATTLE_OX_ID,
      setTurn: 1,
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.chain).toEqual([]);
    expect(result.state.players.P2.lp).toBe(6300);
    expect(result.events.map((event) => event.type)).toEqual(["attack-declared", "battle-damage", "lp-changed"]);
  });

  it("destroys all opponent attack-position monsters on attack declaration", () => {
    const state = battleStateWithOpponentTrap({
      scripts: [normalAttackTrap(MIRROR_FORCE_ID, "destroy-opponent-attack-position-monsters")],
      trapId: MIRROR_FORCE_ID,
      attackerId: BATTLE_OX_ID,
    });
    const patched: DuelState = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          monsterZones: [
            zoneCard("p1-attacker", BATTLE_OX_ID, "P1", { position: "attack" }),
            zoneCard("p1-other-attack", BLUE_EYES_ID, "P1", { position: "attack" }),
            zoneCard("p1-defense", AQUA_MADOOR_ID, "P1", { position: "defense" }),
            null,
            null,
          ],
        },
      },
    };
    const attack = reduceDuel(patched, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P1.monsterZones[2]).toMatchObject({ instanceId: "p1-defense" });
    expect(resolved.state.players.P1.graveyard.map((card) => card.instanceId)).toEqual([
      "p1-other-attack",
      "p1-attacker",
    ]);
  });

  it("negates a pending attack without destroying the attacker", () => {
    const state = battleStateWithOpponentTrap({
      scripts: [normalAttackTrap(WABOKU_ID, "negate-attack")],
      trapId: WABOKU_ID,
      attackerId: BATTLE_OX_ID,
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const attack = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: attacker.instanceId });
    expect(resolved.state.players.P2.lp).toBe(8000);
    expect(resolved.state.pendingAttack).toBeNull();
  });

  it("responds to summons and destroys all monsters", () => {
    const state = advanceToM1(stateWithScripts([
      createNormalTrapScript({
        cardId: MIRROR_FORCE_ID,
        timing: "after-action",
        eventTypes: ["summon-successful"],
        eventPlayer: "any",
        steps: [{ kind: "destroy-all-monsters", controller: "all" }],
      }),
    ]));
    const trapState = {
      ...state,
      players: {
        ...state.players,
        P2: {
          ...state.players.P2,
          spellTrapZones: [zoneCard("p2-trap", MIRROR_FORCE_ID, "P2", { position: null, setTurn: 0, face: "faceDown", visibility: "hidden" }), null, null, null, null],
        },
      },
    };
    const monster = requireHandCard(trapState, "P1", BATTLE_OX_ID);
    const summon = reduceDuel(trapState, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: monster.instanceId,
      zoneIndex: 0,
    });
    const resolved = reduceDuel(summon.state, { type: "resolve-chain", playerId: "P1" });

    expect(summon.state.chain).toHaveLength(1);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ instanceId: monster.instanceId });
  });

  it("creates Counter Trap, Continuous Trap, and generic Spell Speed 2 Trap template scripts without adding production coverage", () => {
    const counter = createCounterTrapScript({
      cardId: SEVEN_TOOLS_ID,
      timing: "after-action",
      eventTypes: ["effect-activated"],
      eventPlayer: "opponent",
      steps: [{ kind: "negate-attack" }],
    });
    const continuous = createContinuousTrapScript({
      cardId: GRAVITY_BIND_ID,
      continuous: {
        attackRestrictions: [
          {
            target: { controller: "any", face: "faceUp" },
            reason: "Gravity Bind-style attack restriction.",
          },
        ],
      },
    });
    const spellSpeed2 = createSpellSpeed2TrapScript({
      cardId: WABOKU_ID,
      steps: [{ kind: "draw", player: "self", count: 1 }],
    });

    expect(counter.effects[0]).toMatchObject({ kind: "trigger", spellSpeed: 3 });
    expect(continuous.effects[0]).toMatchObject({ kind: "continuous", implemented: true });
    expect(spellSpeed2.effects[0]).toMatchObject({ kind: "quick", spellSpeed: 2 });
    expect(spellSpeed2.effects[0]?.resolution).toMatchObject({ sendSourceToGraveyard: true });
  });
});

function normalAttackTrap(cardId: string, step: "destroy-attack-source" | "destroy-opponent-attack-position-monsters" | "negate-attack"): CardScript {
  return createNormalTrapScript({
    cardId,
    timing: "after-action",
    eventTypes: ["attack-declared"],
    eventPlayer: "opponent",
    steps: [{ kind: step }],
  });
}

function stateWithScripts(scripts: readonly CardScript[]): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority([BATTLE_OX_ID, AQUA_MADOOR_ID, ...scripts.map((script) => script.cardId)]),
      P2: deckWithPriority(scripts.map((script) => script.cardId)),
    },
    seed: "trap-template-tests",
    shuffleDecks: false,
    allowUnsupportedCards: true,
  }).state;

  return {
    ...state,
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function battleStateWithOpponentTrap(options: {
  readonly scripts: readonly CardScript[];
  readonly trapId: string;
  readonly attackerId: string;
  readonly setTurn?: number;
}): DuelState {
  const base = advanceToBattlePhase(stateWithScripts(options.scripts));

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [zoneCard("p1-attacker", options.attackerId, "P1"), null, null, null, null],
      },
      P2: {
        ...base.players.P2,
        spellTrapZones: [
          zoneCard("p2-trap", options.trapId, "P2", {
            face: "faceDown",
            position: null,
            visibility: "hidden",
            setTurn: options.setTurn ?? 0,
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
