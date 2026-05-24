import { expect } from "vitest";
import type { CardInstance, ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import type { EngineEvent, EngineEventType } from "../events";
import type { PlayerId } from "../types";

type EventOfType<TType extends EngineEventType> = Extract<EngineEvent, { readonly type: TType }>;
type ZoneExpectation = Partial<CardInstance | ZoneCard> | null;

export function expectEvent<TType extends EngineEventType>(
  events: readonly EngineEvent[],
  type: TType,
  expected?: Partial<EventOfType<TType>>,
): EventOfType<TType> {
  const event = events.find((candidate): candidate is EventOfType<TType> => candidate.type === type);

  expect(event).toBeDefined();
  if (!event) {
    throw new Error(`Expected event ${type}.`);
  }

  if (expected) {
    expect(event).toMatchObject(expected);
  }

  return event;
}

export function expectZone(
  state: DuelState,
  ref: ZoneRef,
  expected?: ZoneExpectation,
): CardInstance | ZoneCard | null {
  const card = cardInZone(state, ref);

  if (expected === null) {
    expect(card).toBeNull();
  } else if (expected) {
    expect(card).toMatchObject(expected);
  } else {
    expect(card).toBeDefined();
  }

  return card;
}

export function expectLP(state: DuelState, playerId: PlayerId, expected: number): void {
  expect(state.players[playerId].lp).toBe(expected);
}

export function expectChain(state: DuelState, expected: number | Partial<DuelState["chain"][number]>[]): void {
  if (typeof expected === "number") {
    expect(state.chain).toHaveLength(expected);
    return;
  }

  expect(state.chain).toMatchObject(expected);
}

function cardInZone(state: DuelState, ref: ZoneRef): CardInstance | ZoneCard | null {
  const player = state.players[ref.playerId];

  switch (ref.zone) {
    case "mainDeck":
      return player.mainDeck[ref.index] ?? null;
    case "hand":
      return player.hand[ref.index] ?? null;
    case "monsterZone":
      return player.monsterZones[ref.index] ?? null;
    case "spellTrapZone":
      return player.spellTrapZones[ref.index] ?? null;
    case "graveyard":
      return player.graveyard[ref.index] ?? null;
    case "banished":
      return player.banished[ref.index] ?? null;
    case "fieldZone":
      return player.fieldZone;
  }
}
