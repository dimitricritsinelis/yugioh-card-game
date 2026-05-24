import { describe, expect, it } from "vitest";
import {
  assertReadableEventMessage,
  eventMessages,
  eventsForCard,
  eventsForInstance,
  eventsForPlayer,
  eventsOfType,
  hasEventType,
  latestEventOfType,
  type CoreTypedEngineEvent,
  type CoreTypedEngineEventType,
  type CoreZoneRef,
} from "../index";

const handRef: CoreZoneRef = { playerId: "P1", zone: "hand", index: 0 };
const monsterRef: CoreZoneRef = { playerId: "P1", zone: "monsterZone", index: 0 };
const graveyardRef: CoreZoneRef = { playerId: "P1", zone: "graveyard", index: 0 };

describe("typed engine events", () => {
  it("defines every required event type with readable messages", () => {
    const events = Object.values(requiredEvents());

    expect(events.map((event) => event.type)).toEqual([
      "duel-started",
      "turn-started",
      "phase-changed",
      "card-drawn",
      "card-moved",
      "summon-declared",
      "summon-successful",
      "monster-set",
      "spell-trap-set",
      "position-changed",
      "attack-declared",
      "battle-completed",
      "battle-damage",
      "card-destroyed",
      "card-banished",
      "lp-changed",
      "effect-activated",
      "cost-paid",
      "targets-chosen",
      "chain-link-created",
      "chain-resolved",
      "effect-resolved-without-effect",
      "prompt-created",
      "prompt-resolved",
      "player-lost",
      "duel-finished",
      "illegal-action",
      "effect-not-implemented",
    ]);
    expect(eventMessages(events)).toHaveLength(28);
    expect(events.every((event) => event.message.trim().length > 0)).toBe(true);
  });

  it("carries structured metadata for UI and log consumers", () => {
    const events = requiredEvents();

    expect(events["card-moved"]).toMatchObject({
      instanceId: "inst-battle-ox",
      cardId: "05053103",
      from: handRef,
      to: monsterRef,
    });
    expect(events["lp-changed"]).toMatchObject({
      previous: 8000,
      next: 6200,
      delta: -1800,
    });
    expect(events["chain-link-created"]).toMatchObject({
      chainLinkId: "chain-1",
      spellSpeed: 1,
    });
    expect(events["prompt-created"]).toMatchObject({
      promptId: "prompt-1",
      promptKind: "target",
    });
  });

  it("queries events by type, player, card, and instance", () => {
    const events = Object.values(requiredEvents());

    expect(hasEventType(events, "effect-not-implemented")).toBe(true);
    expect(eventsOfType(events, "card-moved")).toHaveLength(1);
    expect(latestEventOfType(events, "lp-changed")?.next).toBe(6200);
    expect(eventsForPlayer(events, "P1").map((event) => event.type)).toContain("card-drawn");
    expect(eventsForCard(events, "05053103").map((event) => event.type)).toEqual(
      expect.arrayContaining(["card-drawn", "card-moved", "attack-declared"]),
    );
    expect(eventsForInstance(events, "inst-battle-ox").map((event) => event.type)).toEqual(
      expect.arrayContaining(["card-drawn", "effect-activated", "targets-chosen"]),
    );
  });

  it("rejects blank messages before they reach the action log", () => {
    const blank = {
      ...requiredEvents()["duel-started"],
      message: "   ",
    };

    expect(() => assertReadableEventMessage(blank)).toThrow("missing a readable message");
  });
});

function requiredEvents(): Record<CoreTypedEngineEventType, CoreTypedEngineEvent> {
  return {
    "duel-started": {
      id: "event-1",
      type: "duel-started",
      message: "Duel started.",
      seed: "seed",
      firstPlayer: "P1",
    },
    "turn-started": {
      id: "event-2",
      type: "turn-started",
      message: "P1 started turn 1.",
      playerId: "P1",
      turn: 1,
    },
    "phase-changed": {
      id: "event-3",
      type: "phase-changed",
      message: "P1 moved from Draw Phase to Main Phase 1.",
      playerId: "P1",
      from: "DP",
      to: "M1",
    },
    "card-drawn": {
      id: "event-4",
      type: "card-drawn",
      message: "P1 drew a card.",
      playerId: "P1",
      instanceId: "inst-battle-ox",
      cardId: "05053103",
    },
    "card-moved": {
      id: "event-5",
      type: "card-moved",
      message: "Battle Ox moved from hand to Monster Zone.",
      playerId: "P1",
      instanceId: "inst-battle-ox",
      cardId: "05053103",
      from: handRef,
      to: monsterRef,
    },
    "summon-declared": {
      id: "event-6",
      type: "summon-declared",
      message: "P1 declared a Normal Summon.",
      playerId: "P1",
      instanceId: "inst-battle-ox",
      cardId: "05053103",
      summonKind: "normal",
    },
    "summon-successful": {
      id: "event-7",
      type: "summon-successful",
      message: "Battle Ox was Normal Summoned.",
      playerId: "P1",
      instanceId: "inst-battle-ox",
      cardId: "05053103",
      zone: monsterRef,
      summonKind: "normal",
    },
    "monster-set": {
      id: "event-8",
      type: "monster-set",
      message: "P1 Set a monster.",
      playerId: "P1",
      instanceId: "inst-set-monster",
      cardId: "00000001",
      zone: monsterRef,
    },
    "spell-trap-set": {
      id: "event-9",
      type: "spell-trap-set",
      message: "P1 Set a Spell or Trap.",
      playerId: "P1",
      instanceId: "inst-spell",
      cardId: "55144522",
      zone: { playerId: "P1", zone: "spellTrapZone", index: 0 },
    },
    "position-changed": {
      id: "event-10",
      type: "position-changed",
      message: "Battle Ox changed to Defense Position.",
      playerId: "P1",
      instanceId: "inst-battle-ox",
      cardId: "05053103",
      from: "attack",
      to: "defense",
    },
    "attack-declared": {
      id: "event-11",
      type: "attack-declared",
      message: "Battle Ox declared an attack.",
      playerId: "P1",
      attackerInstanceId: "inst-battle-ox",
      attackerCardId: "05053103",
      defenderInstanceId: "inst-defender",
      defenderCardId: "11111111",
    },
    "battle-completed": {
      id: "event-12",
      type: "battle-completed",
      message: "A monster battle completed.",
      playerId: "P1",
      attackerPlayerId: "P1",
      defenderPlayerId: "P2",
      attackerInstanceId: "inst-battle-ox",
      attackerCardId: "05053103",
      attackerBattleAtk: 1700,
      attackerBattlePosition: "attack",
      defenderInstanceId: "inst-defender",
      defenderCardId: "11111111",
      defenderBattlePosition: "attack",
    },
    "battle-damage": {
      id: "event-13",
      type: "battle-damage",
      message: "P2 took 1800 battle damage.",
      playerId: "P2",
      amount: 1800,
      sourceInstanceId: "inst-battle-ox",
    },
    "card-destroyed": {
      id: "event-14",
      type: "card-destroyed",
      message: "A monster was destroyed by battle.",
      playerId: "P2",
      instanceId: "inst-defender",
      cardId: "11111111",
      reason: "battle",
    },
    "card-banished": {
      id: "event-15",
      type: "card-banished",
      message: "A card was banished.",
      playerId: "P1",
      instanceId: "inst-banished",
      cardId: "22222222",
      reason: "effect",
    },
    "lp-changed": {
      id: "event-16",
      type: "lp-changed",
      message: "P2 LP changed from 8000 to 6200.",
      playerId: "P2",
      previous: 8000,
      next: 6200,
      delta: -1800,
    },
    "effect-activated": {
      id: "event-17",
      type: "effect-activated",
      message: "P1 activated Battle Ox.",
      playerId: "P1",
      instanceId: "inst-battle-ox",
      cardId: "05053103",
      chainLinkId: "chain-1",
    },
    "cost-paid": {
      id: "event-18",
      type: "cost-paid",
      message: "P1 paid a discard cost.",
      playerId: "P1",
      costKind: "discard",
      instanceIds: ["inst-battle-ox"],
    },
    "targets-chosen": {
      id: "event-19",
      type: "targets-chosen",
      message: "P1 chose a target.",
      playerId: "P1",
      sourceInstanceId: "inst-battle-ox",
      targetRefs: [graveyardRef],
    },
    "chain-link-created": {
      id: "event-20",
      type: "chain-link-created",
      message: "A chain link was created.",
      playerId: "P1",
      chainLinkId: "chain-1",
      sourceInstanceId: "inst-battle-ox",
      cardId: "05053103",
      spellSpeed: 1,
    },
    "chain-resolved": {
      id: "event-21",
      type: "chain-resolved",
      message: "Chain link 1 resolved.",
      chainLinkId: "chain-1",
      sourceInstanceId: "inst-battle-ox",
    },
    "effect-resolved-without-effect": {
      id: "event-22",
      type: "effect-resolved-without-effect",
      message: "Chain link chain-1 resolved without effect: Stored target is no longer valid.",
      playerId: "P1",
      chainLinkId: "chain-1",
      sourceInstanceId: "inst-spell",
      cardId: "55144522",
      effectId: "draw-two",
      reason: "Stored target is no longer valid.",
    },
    "prompt-created": {
      id: "event-23",
      type: "prompt-created",
      message: "P1 must choose a target.",
      playerId: "P1",
      promptId: "prompt-1",
      promptKind: "target",
    },
    "prompt-resolved": {
      id: "event-24",
      type: "prompt-resolved",
      message: "P1 chose a target.",
      playerId: "P1",
      promptId: "prompt-1",
    },
    "player-lost": {
      id: "event-25",
      type: "player-lost",
      message: "P2 lost the duel.",
      playerId: "P2",
      reason: "lp-zero",
    },
    "duel-finished": {
      id: "event-26",
      type: "duel-finished",
      message: "P1 won the duel.",
      winner: "P1",
      reason: "lp-zero",
    },
    "illegal-action": {
      id: "event-27",
      type: "illegal-action",
      message: "P1 tried an illegal action.",
      playerId: "P1",
      commandType: "normal-summon",
      reason: "Normal Summon already used.",
    },
    "effect-not-implemented": {
      id: "event-28",
      type: "effect-not-implemented",
      message: "This card effect is not implemented.",
      playerId: "P1",
      cardId: "55144522",
      instanceId: "inst-spell",
    },
  };
}
