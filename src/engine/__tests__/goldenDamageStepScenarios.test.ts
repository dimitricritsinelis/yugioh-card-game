import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { BOOK_OF_MOON_ID } from "../cards/scripts/spells";
import type { DuelState } from "../core/state";
import {
  closeDamageStep,
  createDamageStepState,
  DAMAGE_STEP_ACTIVATION_ERROR,
} from "../rules/damageStep";
import { expectEvent } from "../testing/assertions";
import { cardByPasscode, createRiggedDuel, putMonsterOnField } from "../testing/builders";
import { runScenario } from "../testing/scenarioRunner";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";
const BLUE_EYES_ID = "89631139";

describe("golden Damage Step scenarios", () => {
  it("blocks supported Book of Moon during an active Damage Step window", () => {
    const base = putMonsterOnField(
      activeDamageStepState({
        p1PriorityCards: [BOOK_OF_MOON_ID, BATTLE_OX_ID],
        p2PriorityCards: [BLUE_EYES_ID],
      }),
      "P2",
      cardByPasscode(cards, BLUE_EYES_ID),
      0,
      { instanceId: "p2-blue-eyes", position: "attack" },
    ).state;
    const book = requireHandCard(base, "P1", BOOK_OF_MOON_ID);
    const run = runScenario(base, [
      {
        type: "activate-card",
        playerId: "P1",
        instanceId: book.instanceId,
        targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
      },
    ]);

    expect(run.errors[0]?.message).toBe(DAMAGE_STEP_ACTIVATION_ERROR);
    expectEvent(run.events, "illegal-action", { playerId: "P1", commandType: "activate-card" });
    expect(run.state.chain).toEqual([]);
    expect(run.state.players.P2.monsterZones[0]).toMatchObject({
      instanceId: "p2-blue-eyes",
      face: "faceUp",
      position: "attack",
    });
  });

  it("closes Damage Step state after an atomic battle resolution", () => {
    const withAttacker = putMonsterOnField(
      battlePhaseState({
        p1PriorityCards: [BATTLE_OX_ID],
      }),
      "P1",
      cardByPasscode(cards, BATTLE_OX_ID),
      0,
      { instanceId: "p1-battle-ox", position: "attack" },
    );
    const run = runScenario(withAttacker.state, [
      {
        type: "attack",
        playerId: "P1",
        attackerInstanceId: "p1-battle-ox",
      },
    ]);

    expect(run.errors).toEqual([]);
    expect(run.state.damageStep).toEqual(closeDamageStep());
    expectEvent(run.events, "battle-damage", { playerId: "P2", amount: 1700 });
  });
});

function activeDamageStepState(options: {
  readonly p1PriorityCards?: readonly string[];
  readonly p2PriorityCards?: readonly string[];
}): DuelState {
  const state = battlePhaseState(options);

  return {
    ...state,
    damageStep: createDamageStepState({
      substep: "damage-calculation",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    }),
  };
}

function battlePhaseState(options: {
  readonly p1PriorityCards?: readonly string[];
  readonly p2PriorityCards?: readonly string[];
}): DuelState {
  return runScenario(
    createRiggedDuel(cards, {
      seed: `golden-damage-step-${[...(options.p1PriorityCards ?? []), ...(options.p2PriorityCards ?? [])].join("-")}`,
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

function requireHandCard(state: DuelState, playerId: "P1" | "P2", cardId: string) {
  const card = state.players[playerId].hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in ${playerId} hand.`);
  }

  return card;
}
