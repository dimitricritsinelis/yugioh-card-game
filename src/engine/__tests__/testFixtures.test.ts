import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import {
  cardByName,
  cardByPasscode,
  createRiggedDuel,
  putCardInGraveyard,
  putCardInHand,
  putMonsterOnField,
  putSpellTrapOnField,
  setPhase,
  setPriorityPlayer,
} from "../testing/builders";
import { expectChain, expectEvent, expectLP, expectZone } from "../testing/assertions";
import { runScenario } from "../testing/scenarioRunner";

const cards = cardsJson as CardRecord[];

describe("engine test fixture helpers", () => {
  it("looks up cards and creates deterministic rigged duels by passcode", () => {
    const battleOx = cardByName(cards, "Battle Ox");
    const aquaMadoor = cardByName(cards, "Aqua Madoor");
    const result = createRiggedDuel(cards, {
      seed: "fixture-rigged-duel",
      p1PriorityCards: [battleOx.passcode],
      p2PriorityCards: [aquaMadoor.passcode],
    });

    expect(cardByPasscode(cards, battleOx.passcode)).toBe(battleOx);
    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.hand[0]).toMatchObject({ cardId: battleOx.passcode });
    expect(result.state.players.P2.hand[0]).toMatchObject({ cardId: aquaMadoor.passcode });
    expect(result.state.players.P1.hand).toHaveLength(5);
    expect(result.state.players.P1.mainDeck).toHaveLength(35);
    expect(result.state.players.P2.hand).toHaveLength(5);
    expect(result.state.players.P2.mainDeck).toHaveLength(35);
  });

  it("places cards into hand, field zones, and Graveyard without mutating the input state", () => {
    const battleOx = cardByName(cards, "Battle Ox");
    const bookOfMoon = cardByName(cards, "Book of Moon");
    const base = createRiggedDuel(cards, {
      seed: "fixture-zone-helpers",
      p1PriorityCards: [battleOx.passcode, bookOfMoon.passcode],
    }).state;
    const baseHandSize = base.players.P1.hand.length;
    const inHand = putCardInHand(base, "P1", battleOx, { instanceId: "p1-battle-ox-extra-hand" });
    const onMonsterZone = putMonsterOnField(inHand.state, "P1", battleOx, 2, {
      instanceId: "p1-battle-ox-monster",
      position: "defense",
    });
    const onSpellTrapZone = putSpellTrapOnField(onMonsterZone.state, "P1", bookOfMoon, 1, {
      instanceId: "p1-book-of-moon-set",
    });
    const inGraveyard = putCardInGraveyard(onSpellTrapZone.state, "P1", battleOx, {
      instanceId: "p1-battle-ox-graveyard",
    });

    expect(base.players.P1.hand).toHaveLength(baseHandSize);
    expect(base.players.P1.monsterZones[2]).toBeNull();
    expect(base.players.P1.spellTrapZones[1]).toBeNull();
    expect(base.players.P1.graveyard).toEqual([]);
    expectZone(inHand.state, { playerId: "P1", zone: "hand", index: baseHandSize }, inHand.card);
    expectZone(inGraveyard.state, { playerId: "P1", zone: "monsterZone", index: 2 }, {
      instanceId: "p1-battle-ox-monster",
      cardId: battleOx.passcode,
      position: "defense",
    });
    expectZone(inGraveyard.state, { playerId: "P1", zone: "spellTrapZone", index: 1 }, {
      instanceId: "p1-book-of-moon-set",
      cardId: bookOfMoon.passcode,
      face: "faceDown",
      visibility: "hidden",
    });
    expectZone(inGraveyard.state, { playerId: "P1", zone: "graveyard", index: 0 }, {
      instanceId: "p1-battle-ox-graveyard",
      cardId: battleOx.passcode,
      face: "faceUp",
    });
  });

  it("sets phase and priority state for focused scenario setup", () => {
    const state = createRiggedDuel(cards, { seed: "fixture-priority" }).state;
    const battleState = setPriorityPlayer(setPhase(state, "BP", "P1"), "P2", "phase-start");

    expect(battleState.phase).toBe("BP");
    expect(battleState.activePlayer).toBe("P1");
    expect(battleState.priorityPlayer).toBe("P2");
    expect(battleState.priority.holder).toBe("P2");
    expectLP(battleState, "P1", 8000);
    expectChain(battleState, 0);
  });

  it("runs reducer scenarios and exposes aggregate events", () => {
    const battleOx = cardByName(cards, "Battle Ox");
    const base = setPriorityPlayer(
      setPhase(
        createRiggedDuel(cards, {
          seed: "fixture-scenario",
          p1PriorityCards: [battleOx.passcode],
        }).state,
        "BP",
        "P1",
      ),
      "P1",
    );
    const withAttacker = putMonsterOnField(base, "P1", battleOx, 0, {
      instanceId: "p1-battle-ox-attacker",
    });
    const run = runScenario(withAttacker.state, [
      {
        type: "attack",
        playerId: "P1",
        attackerInstanceId: withAttacker.card.instanceId,
      },
    ]);

    expect(run.errors).toEqual([]);
    expectLP(run.state, "P2", 6300);
    expectEvent(run.events, "attack-declared", {
      playerId: "P1",
      attackerInstanceId: withAttacker.card.instanceId,
    });
    expectEvent(run.events, "battle-damage", {
      playerId: "P2",
      amount: 1700,
    });
  });
});
