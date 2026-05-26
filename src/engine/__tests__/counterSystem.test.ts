import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { createCardScriptRegistry } from "../cards/registry";
import { cardByName, createRiggedDuel, putMonsterOnField, setPhase, setPriorityPlayer } from "../testing/builders";
import type { DuelState } from "../core/state";
import { deriveBattleStats } from "../effects/continuous";
import { payCosts } from "../effects/costs";
import { reduceDuel } from "../reducer";
import { deserializeDuelState, serializeDuelState } from "../serialization";

const cards = cardsJson as CardRecord[];
const BIG_CORE = cardByName(cards, "B.E.S. Big Core");
const BALLOON_LIZARD = cardByName(cards, "Balloon Lizard");

describe("counter system", () => {
  it("places non-Spell counters on the exact source instance and caps them", () => {
    expect(BIG_CORE.text).toContain("Place 3 counters on it");
    const state = putSourceOnField(
      stateWithScripts([
        {
          cardId: BIG_CORE.passcode,
          effects: [
            {
              id: "place-bes-counters",
              kind: "ignition",
              implemented: true,
              spellSpeed: 1,
              resolution: {
                steps: [{ kind: "add-counter-to-source", counterType: "bes", count: 2, max: 3 }],
                sendSourceToGraveyard: false,
              },
            },
          ],
        },
      ]),
      { bes: 2 },
    );
    const source = state.players.P1.monsterZones[0]!;
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "place-bes-counters",
    });
    const resolved = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]?.counters.bes).toBe(3);
  });

  it("removes counter costs only from the activating source instance", () => {
    expect(BALLOON_LIZARD.text).toContain("Put 1 counter on this card");
    const base = stateWithScripts([
      {
        cardId: BIG_CORE.passcode,
        effects: [
          {
            id: "spend-bes-counter",
            kind: "ignition",
            implemented: true,
            spellSpeed: 1,
            costs: [{ kind: "remove-counter-from-source", counterType: "bes", count: 1 }],
            resolution: {
              steps: [{ kind: "lp-change", player: "self", amount: 500 }],
              sendSourceToGraveyard: false,
            },
          },
        ],
      },
    ]);
    const first = putMonsterOnField(base, "P1", BIG_CORE, 0, {
      instanceId: "p1-big-core-a",
      counters: { bes: 2 },
    });
    const second = putMonsterOnField(first.state, "P1", BIG_CORE, 1, {
      instanceId: "p1-big-core-b",
      counters: { bes: 2 },
    });
    const activated = reduceDuel(second.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: first.card.instanceId,
      effectId: "spend-bes-counter",
    });
    const resolved = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(activated.state.players.P1.monsterZones[0]?.counters.bes).toBe(1);
    expect(activated.state.players.P1.monsterZones[1]?.counters.bes).toBe(2);
    expect(resolved.state.players.P1.lp).toBe(8500);
  });

  it("uses counter requirements for continuous stat changes", () => {
    const state = putSourceOnField(
      stateWithScripts([
        {
          cardId: BIG_CORE.passcode,
          effects: [
            {
              id: "bes-counter-atk",
              kind: "continuous",
              implemented: true,
              continuous: {
                statModifiers: [
                  {
                    stat: "atk",
                    amount: 500,
                    target: {
                      source: "self",
                      face: "faceUp",
                      counters: [{ counterType: "bes", min: 3 }],
                    },
                  },
                ],
              },
            },
          ],
        },
      ]),
      { bes: 3 },
    );
    const source = state.players.P1.monsterZones[0]!;
    const baseStats = battleStatsFromRecord(BIG_CORE);

    expect(deriveBattleStats(state, { playerId: "P1", card: source, base: baseStats }).atk).toBe(baseStats.atk + 500);
  });

  it("serializes counters through core state snapshots", () => {
    const state = putSourceOnField(stateWithScripts([]), { bes: 3, spell: 1 });
    const restored = deserializeDuelState(serializeDuelState(state));

    expect(restored.players.P1.monsterZones[0]?.counters).toEqual({ bes: 3, spell: 1 });
  });

  it("rejects counter costs when the source lacks enough counters", () => {
    const state = putSourceOnField(stateWithScripts([]), { bes: 1 });
    const source = state.players.P1.monsterZones[0]!;
    const paid = payCosts(state, "P1", [{ kind: "remove-counter-from-source", counterType: "bes", count: 2 }], {
      sourceInstanceId: source.instanceId,
    });

    expect(paid.valid).toBe(false);
    expect(paid.reason).toBe("Source does not have enough counters to pay that cost.");
    expect(paid.state.players.P1.monsterZones[0]?.counters.bes).toBe(1);
  });
});

function stateWithScripts(scripts: readonly CardScript[]): DuelState {
  const state = createRiggedDuel(cards, {
    seed: "counter-system-tests",
    allowUnsupportedCards: true,
    p1PriorityCards: [],
    p2PriorityCards: [],
    shuffleDecks: false,
  }).state;

  return setPriorityPlayer(
    setPhase(
      {
        ...state,
        cardScripts: createCardScriptRegistry(scripts),
      },
      "M1",
    ),
    "P1",
  );
}

function putSourceOnField(state: DuelState, counters: Readonly<Record<string, number>>): DuelState {
  return putMonsterOnField(state, "P1", BIG_CORE, 0, {
    instanceId: "p1-big-core",
    counters,
  }).state;
}

function battleStatsFromRecord(card: CardRecord): { readonly atk: number; readonly def: number } {
  if (!card.monster || typeof card.monster.atk !== "number" || typeof card.monster.def !== "number") {
    throw new Error(`Expected numeric monster battle stats for ${card.name}.`);
  }

  return {
    atk: card.monster.atk,
    def: card.monster.def,
  };
}
