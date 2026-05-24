import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { EngineCommand } from "../commands";
import type { DuelState } from "../core/state";
import { reduceDuel } from "../reducer";
import { cardByPasscode, createRiggedDuel, putMonsterOnField } from "../testing/builders";
import { runScenario } from "../testing/scenarioRunner";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";

const engineRuntimeModules = import.meta.glob("../**/*.ts", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

describe("engine mutation safety guards", () => {
  it("does not mutate deep-frozen reducer input state for representative commands", () => {
    for (const { state, command } of reducerMutationCases()) {
      const frozen = deepFreeze(state);
      const before = cloneSerializable(frozen);
      const result = reduceDuel(frozen, command);

      expect(frozen).toEqual(before);
      expect(result.state).not.toBe(frozen);
    }
  });

  it("does not call Math.random in engine runtime modules", () => {
    expect(sourceOffenders(/\bMath\.random\b/)).toEqual([]);
  });

  it("does not call Date.now in the reducer runtime path", () => {
    expect(sourceOffenders(/\bDate\.now\b/)).toEqual([]);
  });
});

function reducerMutationCases(): { readonly state: DuelState; readonly command: EngineCommand }[] {
  const drawPhase = createRiggedDuel(cards, {
    seed: "mutation-phase",
    p1PriorityCards: [BATTLE_OX_ID],
    shuffleDecks: false,
  }).state;
  const mainPhase = runScenario(
    createRiggedDuel(cards, {
      seed: "mutation-summon",
      p1PriorityCards: [BATTLE_OX_ID],
      shuffleDecks: false,
    }).state,
    [
      { type: "change-phase", playerId: "P1", phase: "SP" },
      { type: "change-phase", playerId: "P1", phase: "M1" },
    ],
  ).state;
  const summonCard = requireHandCard(mainPhase, "P1", BATTLE_OX_ID);
  const battlePhase = runScenario(
    createRiggedDuel(cards, {
      seed: "mutation-attack",
      p1PriorityCards: [BATTLE_OX_ID],
      shuffleDecks: false,
    }).state,
    [
      { type: "change-phase", playerId: "P1", phase: "SP" },
      { type: "change-phase", playerId: "P1", phase: "M1" },
      { type: "change-phase", playerId: "P1", phase: "BP" },
    ],
  ).state;
  const attacker = putMonsterOnField(
    battlePhase,
    "P1",
    cardByPasscode(cards, BATTLE_OX_ID),
    0,
    { instanceId: "p1-battle-ox-attacker" },
  );

  return [
    {
      state: drawPhase,
      command: { type: "change-phase", playerId: "P1", phase: "SP" },
    },
    {
      state: mainPhase,
      command: {
        type: "normal-summon",
        playerId: "P1",
        instanceId: summonCard.instanceId,
        zoneIndex: 0,
      },
    },
    {
      state: attacker.state,
      command: {
        type: "attack",
        playerId: "P1",
        attackerInstanceId: attacker.card.instanceId,
      },
    },
  ];
}

function requireHandCard(state: DuelState, playerId: "P1" | "P2", cardId: string) {
  const card = state.players[playerId].hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in ${playerId} hand.`);
  }

  return card;
}

function sourceOffenders(pattern: RegExp): string[] {
  return Object.entries(engineRuntimeModules)
    .filter(([path]) => !path.includes("/__tests__/"))
    .filter(([, source]) => pattern.test(source))
    .map(([path]) => path)
    .sort();
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
