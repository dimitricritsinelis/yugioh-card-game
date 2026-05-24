import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { HEAVY_STORM_ID, BOOK_OF_MOON_ID, MYSTICAL_SPACE_TYPHOON_ID } from "../cards/scripts/spells";
import { MIRROR_FORCE_ID, TORRENTIAL_TRIBUTE_ID } from "../cards/scripts/traps";
import type { DuelState } from "../core/state";
import { reduceDuel } from "../reducer";
import { expectChain, expectEvent, expectZone } from "../testing/assertions";
import { cardByPasscode, createRiggedDuel, putMonsterOnField, putSpellTrapOnField } from "../testing/builders";
import { runScenario } from "../testing/scenarioRunner";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";
const BLUE_EYES_ID = "89631139";

describe("golden chain scenarios", () => {
  it("queues and resolves Torrential Tribute from a summon response", () => {
    const withTrap = putSpellTrapOnField(
      mainPhaseState({
        p1PriorityCards: [BATTLE_OX_ID],
        p2PriorityCards: [TORRENTIAL_TRIBUTE_ID],
      }),
      "P2",
      cardByPasscode(cards, TORRENTIAL_TRIBUTE_ID),
      0,
      { instanceId: "p2-torrential" },
    );
    const base = withSpellTrapSetTurn(withTrap.state, "P2", 0, 0);
    const battleOx = requireHandCard(base, "P1", BATTLE_OX_ID);
    const summon = reduceDuel(base, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: battleOx.instanceId,
      zoneIndex: 0,
    });
    const resolved = reduceDuel(summon.state, { type: "resolve-chain", playerId: "P1" });

    expect(summon.errors).toEqual([]);
    expect(summon.state.chain[0]).toMatchObject({
      playerId: "P2",
      cardId: TORRENTIAL_TRIBUTE_ID,
    });
    expect(resolved.errors).toEqual([]);
    expectEvent(resolved.events, "card-destroyed", {
      playerId: "P1",
      instanceId: battleOx.instanceId,
    });
    expectZone(resolved.state, { playerId: "P1", zone: "monsterZone", index: 0 }, null);
    expectZone(resolved.state, { playerId: "P2", zone: "spellTrapZone", index: 0 }, null);
    expectZone(resolved.state, { playerId: "P2", zone: "graveyard", index: 0 }, {
      cardId: TORRENTIAL_TRIBUTE_ID,
      instanceId: "p2-torrential",
    });
  });

  it("resolves Mystical Space Typhoon chained to a Spell activation before the original link", () => {
    const withTrap = putSpellTrapOnField(
      mainPhaseState({
        p1PriorityCards: [HEAVY_STORM_ID, MYSTICAL_SPACE_TYPHOON_ID],
        p2PriorityCards: [MIRROR_FORCE_ID],
      }),
      "P2",
      cardByPasscode(cards, MIRROR_FORCE_ID),
      0,
      { instanceId: "p2-mirror-force" },
    );
    const base = withSpellTrapSetTurn(withTrap.state, "P2", 0, 0);
    const heavyStorm = requireHandCard(base, "P1", HEAVY_STORM_ID);
    const mst = requireHandCard(base, "P1", MYSTICAL_SPACE_TYPHOON_ID);
    const run = runScenario(base, [
      {
        type: "activate-card",
        playerId: "P1",
        instanceId: heavyStorm.instanceId,
      },
      {
        type: "activate-card",
        playerId: "P1",
        instanceId: mst.instanceId,
        targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 0 }],
      },
      { type: "resolve-chain", playerId: "P1" },
    ]);

    expect(run.errors).toEqual([]);
    expect(run.results[0].state.chain).toMatchObject([{ cardId: HEAVY_STORM_ID }]);
    expect(run.results[1].state.chain).toMatchObject([
      { cardId: HEAVY_STORM_ID },
      { cardId: MYSTICAL_SPACE_TYPHOON_ID },
    ]);
    expect(run.events.filter((event) => event.type === "chain-resolved").map((event) => event.chainLinkId)).toEqual([
      "chain-2",
      "chain-1",
    ]);
    expectZone(run.state, { playerId: "P2", zone: "spellTrapZone", index: 0 }, null);
    expect(run.state.players.P1.graveyard.some((card) => card.cardId === MYSTICAL_SPACE_TYPHOON_ID)).toBe(true);
    expect(run.state.players.P1.graveyard.some((card) => card.cardId === HEAVY_STORM_ID)).toBe(true);
    expect(run.state.players.P2.graveyard.some((card) => card.instanceId === "p2-mirror-force")).toBe(true);
  });

  it("resolves Book of Moon target selection into a face-down Defense Position monster", () => {
    const base = putMonsterOnField(
      mainPhaseState({
        p1PriorityCards: [BOOK_OF_MOON_ID],
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
      { type: "resolve-chain", playerId: "P1" },
    ]);

    expect(run.errors).toEqual([]);
    expectChain(run.state, 0);
    expectEvent(run.events, "targets-chosen", { playerId: "P1" });
    expectZone(run.state, { playerId: "P2", zone: "monsterZone", index: 0 }, {
      instanceId: "p2-blue-eyes",
      cardId: BLUE_EYES_ID,
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
  });
});

function mainPhaseState(options: {
  readonly p1PriorityCards?: readonly string[];
  readonly p2PriorityCards?: readonly string[];
}): DuelState {
  return runScenario(
    createRiggedDuel(cards, {
      seed: `golden-chain-${[...(options.p1PriorityCards ?? []), ...(options.p2PriorityCards ?? [])].join("-")}`,
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
