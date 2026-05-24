import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { EngineCommand } from "../commands";
import { isPlayableCard } from "../cards/coverage";
import { createDuel } from "../reducer";
import { createRiggedDuel } from "../testing/builders";
import { runScenario } from "../testing/scenarioRunner";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";

describe("engine determinism guards", () => {
  it("produces the same final state and events from the same initial state and commands", () => {
    const initial = createRiggedDuel(cards, {
      seed: "deterministic-command-stream",
      p1PriorityCards: [BATTLE_OX_ID],
      shuffleDecks: false,
    }).state;
    const battleOx = initial.players.P1.hand.find((card) => card.cardId === BATTLE_OX_ID);

    if (!battleOx) {
      throw new Error(`Expected opening hand to include cardId ${BATTLE_OX_ID}.`);
    }

    const commands: readonly EngineCommand[] = [
      { type: "change-phase", playerId: "P1", phase: "SP" },
      { type: "change-phase", playerId: "P1", phase: "M1" },
      {
        type: "normal-summon",
        playerId: "P1",
        instanceId: battleOx.instanceId,
        zoneIndex: 0,
      },
      { type: "change-phase", playerId: "P1", phase: "BP" },
      {
        type: "attack",
        playerId: "P1",
        attackerInstanceId: battleOx.instanceId,
      },
    ];
    const first = runScenario(cloneSerializable(initial), commands);
    const second = runScenario(cloneSerializable(initial), commands);

    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);
    expect(second.state).toEqual(first.state);
    expect(second.events).toEqual(first.events);
    expect(second.prompts).toEqual(first.prompts);
  });

  it("deals the same opening hands from the same shuffled seed", () => {
    const decks = {
      P1: { main: legalMainDeck(40) },
      P2: { main: reversedLegalMainDeck(40) },
    };
    const first = createDuel({ cards, decks, seed: "same-shuffled-opening" });
    const second = createDuel({ cards, decks, seed: "same-shuffled-opening" });

    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);
    expect(openingHandCardIds(second.state, "P1")).toEqual(openingHandCardIds(first.state, "P1"));
    expect(openingHandCardIds(second.state, "P2")).toEqual(openingHandCardIds(first.state, "P2"));
    expect(openingHandInstanceIds(second.state, "P1")).toEqual(openingHandInstanceIds(first.state, "P1"));
    expect(openingHandInstanceIds(second.state, "P2")).toEqual(openingHandInstanceIds(first.state, "P2"));
  });
});

function openingHandCardIds(
  state: ReturnType<typeof createDuel>["state"],
  playerId: "P1" | "P2",
): string[] {
  return state.players[playerId].hand.map((card) => card.cardId);
}

function openingHandInstanceIds(
  state: ReturnType<typeof createDuel>["state"],
  playerId: "P1" | "P2",
): string[] {
  return state.players[playerId].hand.map((card) => card.instanceId);
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

function reversedLegalMainDeck(size: number): string[] {
  return [...legalMainDeck(size)].reverse();
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
