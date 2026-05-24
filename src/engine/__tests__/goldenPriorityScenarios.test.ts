import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { MYSTICAL_SPACE_TYPHOON_ID } from "../cards/scripts/spells";
import {
  BREAKER_THE_MAGICAL_WARRIOR_ID,
  TRIBE_INFECTING_VIRUS_ID,
  tribeEffectId,
} from "../cards/scripts/custom/staples";
import type { DuelState } from "../core/state";
import { reduceDuel } from "../reducer";
import { expectChain, expectEvent, expectZone } from "../testing/assertions";
import { cardByPasscode, createRiggedDuel, putMonsterOnField, putSpellTrapOnField } from "../testing/builders";
import { runScenario } from "../testing/scenarioRunner";

const cards = cardsJson as CardRecord[];
const AQUA_MADOOR_ID = "85639257";
const BATTLE_OX_ID = "05053103";

describe("golden priority scenarios", () => {
  it("lets the turn player use post-summon priority with Tribe-Infecting Virus", () => {
    const base = putMonsterOnField(
      mainPhaseState({
        p1PriorityCards: [TRIBE_INFECTING_VIRUS_ID, AQUA_MADOOR_ID],
        p2PriorityCards: [BATTLE_OX_ID],
      }),
      "P2",
      cardByPasscode(cards, BATTLE_OX_ID),
      0,
      { instanceId: "p2-battle-ox" },
    ).state;
    const tribe = requireHandCard(base, "P1", TRIBE_INFECTING_VIRUS_ID);
    const discard = requireHandCard(base, "P1", AQUA_MADOOR_ID);
    const summoned = reduceDuel(base, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: tribe.instanceId,
      zoneIndex: 0,
    });
    const summonedTribe = summoned.state.players.P1.monsterZones[0]!;

    expect(summoned.errors).toEqual([]);
    expect(summoned.state.priorityPlayer).toBe("P1");
    expectChain(summoned.state, 0);

    const run = runScenario(summoned.state, [
      {
        type: "activate-card",
        playerId: "P1",
        instanceId: summonedTribe.instanceId,
        effectId: tribeEffectId("Beast-Warrior"),
        costInstanceIds: [discard.instanceId],
      },
      { type: "resolve-chain", playerId: "P1" },
    ]);

    expect(run.errors).toEqual([]);
    expectEvent(run.events, "cost-paid", { playerId: "P1", costKind: "discard" });
    expectEvent(run.events, "card-destroyed", { playerId: "P2", instanceId: "p2-battle-ox" });
    expectZone(run.state, { playerId: "P1", zone: "monsterZone", index: 0 }, {
      instanceId: summonedTribe.instanceId,
      cardId: TRIBE_INFECTING_VIRUS_ID,
    });
    expectZone(run.state, { playerId: "P2", zone: "monsterZone", index: 0 }, null);
  });

  it("resolves Breaker's summon trigger before its ignition effect can spend the counter", () => {
    const base = putSpellTrapOnField(
      mainPhaseState({
        p1PriorityCards: [BREAKER_THE_MAGICAL_WARRIOR_ID],
        p2PriorityCards: [MYSTICAL_SPACE_TYPHOON_ID],
      }),
      "P2",
      cardByPasscode(cards, MYSTICAL_SPACE_TYPHOON_ID),
      0,
      { instanceId: "p2-set-mst" },
    ).state;
    const breaker = requireHandCard(base, "P1", BREAKER_THE_MAGICAL_WARRIOR_ID);
    const summoned = reduceDuel(base, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: breaker.instanceId,
      zoneIndex: 0,
    });
    const summonedBreaker = summoned.state.players.P1.monsterZones[0]!;
    const prematureActivation = reduceDuel(summoned.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: summonedBreaker.instanceId,
      effectId: "remove-spell-counter-destroy",
      targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 0 }],
    });
    const resolvedCounter = reduceDuel(summoned.state, { type: "resolve-chain", playerId: "P1" });
    const breakerWithCounter = resolvedCounter.state.players.P1.monsterZones[0]!;
    const destroySetCard = runScenario(resolvedCounter.state, [
      {
        type: "activate-card",
        playerId: "P1",
        instanceId: breakerWithCounter.instanceId,
        effectId: "remove-spell-counter-destroy",
        targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 0 }],
      },
      { type: "resolve-chain", playerId: "P1" },
    ]);

    expect(summoned.errors).toEqual([]);
    expect(summoned.state.chain[0]).toMatchObject({
      cardId: BREAKER_THE_MAGICAL_WARRIOR_ID,
      effectId: "place-spell-counter",
    });
    expect(summonedBreaker.counters.spell).toBeUndefined();
    expect(prematureActivation.errors[0]?.message).toBe("That effect cannot be activated right now.");
    expect(resolvedCounter.errors).toEqual([]);
    expect(breakerWithCounter.counters.spell).toBe(1);
    expect(destroySetCard.errors).toEqual([]);
    expectZone(destroySetCard.state, { playerId: "P2", zone: "spellTrapZone", index: 0 }, null);
    expectZone(destroySetCard.state, { playerId: "P2", zone: "graveyard", index: 0 }, {
      instanceId: "p2-set-mst",
      cardId: MYSTICAL_SPACE_TYPHOON_ID,
    });
  });
});

function mainPhaseState(options: {
  readonly p1PriorityCards?: readonly string[];
  readonly p2PriorityCards?: readonly string[];
}): DuelState {
  return runScenario(
    createRiggedDuel(cards, {
      seed: `golden-priority-${[...(options.p1PriorityCards ?? []), ...(options.p2PriorityCards ?? [])].join("-")}`,
      p1PriorityCards: options.p1PriorityCards,
      p2PriorityCards: options.p2PriorityCards,
    }).state,
    [
      { type: "change-phase", playerId: "P1", phase: "SP" },
      { type: "change-phase", playerId: "P1", phase: "M1" },
    ],
  ).state;
}

function requireHandCard(state: DuelState, playerId: "P1" | "P2", cardId: string) {
  const card = state.players[playerId].hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in ${playerId} hand.`);
  }

  return card;
}
