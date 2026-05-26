import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript, EffectPlayerSelector } from "../cards/CardScript";
import { createCardScriptRegistry } from "../cards/registry";
import { cardByName, createRiggedDuel, putMonsterOnField } from "../testing/builders";
import type { DuelState } from "../core/state";
import { reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const BATTLE_OX = cardByName(cards, "Battle Ox");
const AQUA_MADOOR = cardByName(cards, "Aqua Madoor");
const LA_JINN = cardByName(cards, "La Jinn the Mystical Genie of the Lamp");

describe("phase procedure queues", () => {
  it("prompts Standby Phase optional effects for both players in deterministic turn-player order", () => {
    const state = stateWithFieldScripts([
      standbyTriggerScript(BATTLE_OX.passcode, "p1-standby-optional", "self", true, 100),
      standbyTriggerScript(AQUA_MADOOR.passcode, "p2-standby-optional", "opponent", true, 200),
    ]);
    const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" });
    const outOfOrder = reduceDuel(standby.state, {
      type: "answer-prompt",
      playerId: "P2",
      promptId: "prompt-2",
      choiceIds: ["yes"],
    });
    const answeredFirst = reduceDuel(standby.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      choiceIds: ["yes"],
    });
    const resolvedTooEarly = reduceDuel(answeredFirst.state, { type: "resolve-chain", playerId: "P1" });
    const skippedTooEarly = reduceDuel(answeredFirst.state, { type: "change-phase", playerId: "P1", phase: "M1" });
    const answeredSecond = reduceDuel(answeredFirst.state, {
      type: "answer-prompt",
      playerId: "P2",
      promptId: "prompt-2",
      choiceIds: ["no"],
    });
    const resolved = reduceDuel(answeredSecond.state, { type: "resolve-chain", playerId: "P1" });

    expect(standby.errors).toEqual([]);
    expect(standby.state.pendingPromptIds).toEqual(["prompt-1", "prompt-2"]);
    expect(standby.prompts.map((prompt) => prompt.playerId)).toEqual(["P1", "P2"]);
    expect(standby.prompts.map((prompt) => prompt.metadata?.effectId)).toEqual([
      "p1-standby-optional",
      "p2-standby-optional",
    ]);
    expect(outOfOrder.errors[0]).toMatchObject({
      message: "Pending prompts must be answered in order.",
    });
    expect(answeredFirst.errors).toEqual([]);
    expect(answeredFirst.state.chain).toHaveLength(1);
    expect(answeredFirst.state.pendingPromptIds).toEqual(["prompt-2"]);
    expect(resolvedTooEarly.errors[0]).toMatchObject({
      message: "Pending prompts must be answered before resolving the chain.",
    });
    expect(skippedTooEarly.errors[0]).toMatchObject({
      message: "Pending phase procedure prompts must be answered before changing phases.",
    });
    expect(answeredSecond.errors).toEqual([]);
    expect(answeredSecond.state.pendingPromptIds).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(8100);
    expect(resolved.state.players.P2.lp).toBe(8000);
  });

  it("queues mandatory Standby Phase effects for both players and blocks phase advance until the chain resolves", () => {
    const state = stateWithFieldScripts([
      standbyTriggerScript(BATTLE_OX.passcode, "p1-standby-mandatory", "self", false, 100),
      standbyTriggerScript(AQUA_MADOOR.passcode, "p2-standby-mandatory", "opponent", false, 200),
    ]);
    const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" });
    const skipped = reduceDuel(standby.state, { type: "change-phase", playerId: "P1", phase: "M1" });
    const resolved = reduceDuel(standby.state, { type: "resolve-chain", playerId: "P1" });
    const advanced = reduceDuel(resolved.state, { type: "change-phase", playerId: "P1", phase: "M1" });

    expect(standby.errors).toEqual([]);
    expect(standby.prompts).toEqual([]);
    expect(standby.state.chain).toHaveLength(2);
    expect(standby.state.chain.map((link) => link.effectId)).toEqual([
      "p1-standby-mandatory",
      "p2-standby-mandatory",
    ]);
    expect(skipped.errors[0]).toMatchObject({
      message: "Pending chain links must be resolved before changing phases.",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(8100);
    expect(resolved.state.players.P2.lp).toBe(8200);
    expect(advanced.errors).toEqual([]);
    expect(advanced.state.phase).toBe("M1");
  });

  it("blocks End Phase turn changes while mandatory End Phase effects are pending", () => {
    const state = {
      ...stateWithFieldScripts([
        endPhaseTriggerScript(LA_JINN.passcode, "p1-end-mandatory", "self", 300),
      ], LA_JINN.passcode),
      phase: "M2" as const,
    };
    const endPhase = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "EP" });
    const endedTooEarly = reduceDuel(endPhase.state, { type: "end-turn", playerId: "P1" });
    const resolved = reduceDuel(endPhase.state, { type: "resolve-chain", playerId: "P1" });
    const ended = reduceDuel(resolved.state, { type: "end-turn", playerId: "P1" });

    expect(endPhase.errors).toEqual([]);
    expect(endPhase.state.chain).toHaveLength(1);
    expect(endedTooEarly.errors[0]).toMatchObject({
      message: "Pending chain links must be resolved before changing phases.",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(8300);
    expect(ended.errors).toEqual([]);
    expect(ended.state.activePlayer).toBe("P2");
    expect(ended.state.phase).toBe("DP");
  });
});

function standbyTriggerScript(
  cardId: string,
  effectId: string,
  eventPlayer: EffectPlayerSelector,
  optional: boolean,
  lpGain: number,
): CardScript {
  return phaseTriggerScript(cardId, effectId, "SP", eventPlayer, optional, lpGain);
}

function endPhaseTriggerScript(
  cardId: string,
  effectId: string,
  eventPlayer: EffectPlayerSelector,
  lpGain: number,
): CardScript {
  return phaseTriggerScript(cardId, effectId, "EP", eventPlayer, false, lpGain);
}

function phaseTriggerScript(
  cardId: string,
  effectId: string,
  phaseTo: "SP" | "EP",
  eventPlayer: EffectPlayerSelector,
  optional: boolean,
  lpGain: number,
): CardScript {
  return {
    cardId,
    effects: [
      {
        id: effectId,
        kind: "trigger",
        implemented: true,
        spellSpeed: 1,
        trigger: {
          timing: "after-action",
          eventTypes: ["phase-changed"],
          eventPlayer,
          phaseTo: [phaseTo],
          optional,
        },
        resolution: {
          steps: [{ kind: "lp-change", player: "self", amount: lpGain }],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
}

function stateWithFieldScripts(scripts: readonly CardScript[], p1CardId = BATTLE_OX.passcode): DuelState {
  const created = createRiggedDuel(cards, {
    seed: "phase-procedure-tests",
    firstPlayer: "P1",
    allowUnsupportedCards: true,
    p1PriorityCards: [],
    p2PriorityCards: [],
    shuffleDecks: false,
  }).state;
  const p1Card = cards.find((card) => card.passcode === p1CardId);

  if (!p1Card) {
    throw new Error(`Missing fixture card ${p1CardId}.`);
  }

  const withP1 = putMonsterOnField(created, "P1", p1Card, 0, { instanceId: "p1-phase-source" }).state;
  const withP2 = putMonsterOnField(withP1, "P2", AQUA_MADOOR, 0, { instanceId: "p2-phase-source" }).state;

  return {
    ...withP2,
    cardScripts: createCardScriptRegistry(scripts),
  };
}
