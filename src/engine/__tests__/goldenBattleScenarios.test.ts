import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { MIRROR_FORCE_ID, SAKURETSU_ARMOR_ID } from "../cards/scripts/traps";
import type { DuelState } from "../core/state";
import { expectEvent, expectLP, expectZone } from "../testing/assertions";
import { cardByPasscode, createRiggedDuel, putMonsterOnField, putSpellTrapOnField } from "../testing/builders";
import { runScenario } from "../testing/scenarioRunner";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";
const BLUE_EYES_ID = "89631139";
const LA_JINN_ID = "97590747";

describe("golden battle scenarios", () => {
  it("resolves Mirror Force on attack declaration before battle damage is dealt", () => {
    const setTrap = putSpellTrapOnField(
      battlePhaseState({
        p1PriorityCards: [BATTLE_OX_ID, LA_JINN_ID],
        p2PriorityCards: [MIRROR_FORCE_ID],
      }),
      "P2",
      cardByPasscode(cards, MIRROR_FORCE_ID),
      0,
      { instanceId: "p2-mirror-force" },
    );
    const withTrap = { ...setTrap, state: withSpellTrapSetTurn(setTrap.state, "P2", 0, 0) };
    const withBattleOx = putMonsterOnField(withTrap.state, "P1", cardByPasscode(cards, BATTLE_OX_ID), 0, {
      instanceId: "p1-battle-ox",
      position: "attack",
    });
    const withLaJinn = putMonsterOnField(withBattleOx.state, "P1", cardByPasscode(cards, LA_JINN_ID), 1, {
      instanceId: "p1-la-jinn",
      position: "attack",
    });
    const run = runScenario(withLaJinn.state, [
      {
        type: "attack",
        playerId: "P1",
        attackerInstanceId: "p1-battle-ox",
      },
      { type: "resolve-chain", playerId: "P1" },
    ]);

    expect(run.errors).toEqual([]);
    expectEvent(run.events, "attack-declared", { attackerInstanceId: "p1-battle-ox" });
    expect(run.events.some((event) => event.type === "battle-damage")).toBe(false);
    expectLP(run.state, "P2", 8000);
    expectZone(run.state, { playerId: "P1", zone: "monsterZone", index: 0 }, null);
    expectZone(run.state, { playerId: "P1", zone: "monsterZone", index: 1 }, null);
    expectZone(run.state, { playerId: "P2", zone: "graveyard", index: 0 }, {
      instanceId: "p2-mirror-force",
      cardId: MIRROR_FORCE_ID,
    });
  });

  it("resolves Sakuretsu Armor by destroying only the attacking monster", () => {
    const setTrap = putSpellTrapOnField(
      battlePhaseState({
        p1PriorityCards: [BLUE_EYES_ID, BATTLE_OX_ID],
        p2PriorityCards: [SAKURETSU_ARMOR_ID],
      }),
      "P2",
      cardByPasscode(cards, SAKURETSU_ARMOR_ID),
      0,
      { instanceId: "p2-sakuretsu" },
    );
    const withTrap = { ...setTrap, state: withSpellTrapSetTurn(setTrap.state, "P2", 0, 0) };
    const withBlueEyes = putMonsterOnField(withTrap.state, "P1", cardByPasscode(cards, BLUE_EYES_ID), 0, {
      instanceId: "p1-blue-eyes",
      position: "attack",
    });
    const withBattleOx = putMonsterOnField(withBlueEyes.state, "P1", cardByPasscode(cards, BATTLE_OX_ID), 1, {
      instanceId: "p1-battle-ox",
      position: "attack",
    });
    const run = runScenario(withBattleOx.state, [
      {
        type: "attack",
        playerId: "P1",
        attackerInstanceId: "p1-blue-eyes",
      },
      { type: "resolve-chain", playerId: "P1" },
    ]);

    expect(run.errors).toEqual([]);
    expectLP(run.state, "P2", 8000);
    expectZone(run.state, { playerId: "P1", zone: "monsterZone", index: 0 }, null);
    expectZone(run.state, { playerId: "P1", zone: "monsterZone", index: 1 }, {
      instanceId: "p1-battle-ox",
      cardId: BATTLE_OX_ID,
    });
    expectZone(run.state, { playerId: "P2", zone: "graveyard", index: 0 }, {
      instanceId: "p2-sakuretsu",
      cardId: SAKURETSU_ARMOR_ID,
    });
  });

  it("finishes the duel by LP zero from battle damage", () => {
    const withAttacker = putMonsterOnField(
      withLifePoints(
        battlePhaseState({
          p1PriorityCards: [BLUE_EYES_ID],
        }),
        "P2",
        3000,
      ),
      "P1",
      cardByPasscode(cards, BLUE_EYES_ID),
      0,
      { instanceId: "p1-blue-eyes-finisher", position: "attack" },
    );
    const run = runScenario(withAttacker.state, [
      {
        type: "attack",
        playerId: "P1",
        attackerInstanceId: "p1-blue-eyes-finisher",
      },
    ]);

    expect(run.errors).toEqual([]);
    expectLP(run.state, "P2", 0);
    expect(run.state.winner).toBe("P1");
    expectEvent(run.events, "player-lost", { playerId: "P2", reason: "lp-zero" });
    expectEvent(run.events, "duel-finished", { winner: "P1", reason: "lp-zero" });
  });

  it("finishes the duel by deck-out when a required draw cannot be completed", () => {
    const base = createRiggedDuel(cards, {
      seed: "golden-battle-deck-out",
      p1PriorityCards: [BATTLE_OX_ID],
    }).state;
    const deckOutState: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          mainDeck: [],
        },
      },
    };
    const run = runScenario(deckOutState, [{ type: "draw-card", playerId: "P1" }]);

    expect(run.errors).toEqual([]);
    expect(run.state.winner).toBe("P2");
    expectEvent(run.events, "player-lost", { playerId: "P1", reason: "deck-out" });
    expectEvent(run.events, "duel-finished", { winner: "P2", reason: "deck-out" });
  });
});

function battlePhaseState(options: {
  readonly p1PriorityCards?: readonly string[];
  readonly p2PriorityCards?: readonly string[];
}): DuelState {
  return runScenario(
    createRiggedDuel(cards, {
      seed: `golden-battle-${[...(options.p1PriorityCards ?? []), ...(options.p2PriorityCards ?? [])].join("-")}`,
      p1PriorityCards: options.p1PriorityCards,
      p2PriorityCards: options.p2PriorityCards,
    }).state,
    [
      { type: "change-phase", playerId: "P1", phase: "SP" },
      { type: "change-phase", playerId: "P1", phase: "M1" },
      { type: "change-phase", playerId: "P1", phase: "BP" },
    ],
  ).state;
}

function withLifePoints(state: DuelState, playerId: "P1" | "P2", lp: number): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        lp,
      },
    },
  };
}

function withSpellTrapSetTurn(
  state: DuelState,
  playerId: "P1" | "P2",
  zoneIndex: number,
  setTurn: number,
): DuelState {
  const card = state.players[playerId].spellTrapZones[zoneIndex];

  if (!card) {
    throw new Error(`Expected ${playerId} Spell/Trap Zone ${zoneIndex} to be occupied.`);
  }

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        spellTrapZones: state.players[playerId].spellTrapZones.map((entry, index) =>
          index === zoneIndex ? { ...card, setTurn } : entry,
        ),
      },
    },
  };
}
