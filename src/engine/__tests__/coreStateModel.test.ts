import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { isPlayableCard } from "../cards/coverage";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel } from "../reducer";
import { deserializeDuelState, serializeDuelState } from "../serialization";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";

describe("core duel state model", () => {
  it("serializes canonical state with separate owner, controller, location, and visibility data", () => {
    const created = createCleanDuel("core-state-identity");
    const controlledMonster: ZoneCard = {
      instanceId: "p2-battle-ox-controlled-by-p1",
      cardId: BATTLE_OX_ID,
      owner: "P2",
      controller: "P1",
      face: "faceUp",
      position: "attack",
      visibility: "public",
      counters: {},
      attachments: [],
      summonedTurn: 1,
      setTurn: null,
      positionChangedTurn: null,
      attackedTurn: null,
    };
    const state: DuelState = {
      ...created.state,
      players: {
        ...created.state.players,
        P1: {
          ...created.state.players.P1,
          monsterZones: [controlledMonster, null, null, null, null],
          spellTrapZones: [
            {
              ...controlledMonster,
              instanceId: "p1-hidden-set-card",
              cardId: BATTLE_OX_ID,
              owner: "P1",
              controller: "P1",
              face: "faceDown",
              position: null,
              visibility: "hidden",
            },
            null,
            null,
            null,
            null,
          ],
        },
      },
    };

    const restored = deserializeDuelState(serializeDuelState(state));

    expect(restored.players.P1.monsterZones[0]).toMatchObject({
      instanceId: "p2-battle-ox-controlled-by-p1",
      owner: "P2",
      controller: "P1",
      face: "faceUp",
      visibility: "public",
    });
    expect(restored.players.P1.spellTrapZones[0]).toMatchObject({
      instanceId: "p1-hidden-set-card",
      owner: "P1",
      controller: "P1",
      face: "faceDown",
      visibility: "hidden",
    });
  });

  it("creates a clean reset state without stale chain, prompts, lingering effects, or pending attacks", () => {
    const first = createCleanDuel("core-state-reset");
    const dirtyState: DuelState = {
      ...first.state,
      chain: [
        {
          id: "chain-stale",
          playerId: "P1",
          sourceInstanceId: "stale-source",
          cardId: BATTLE_OX_ID,
          effectId: "stale-effect",
          spellSpeed: 1,
        },
      ],
      prompts: {
        "prompt-stale": {
          id: "prompt-stale",
          playerId: "P1",
          kind: "yes-no",
          message: "stale prompt",
          min: 1,
          max: 1,
        },
      },
      pendingPromptIds: ["prompt-stale"],
      pendingAttack: {
        attackerPlayerId: "P1",
        defenderPlayerId: "P2",
        attackerInstanceId: "stale-attacker",
        defenderInstanceId: null,
      },
      lingeringEffects: [
        {
          id: "lingering-stale",
          playerId: "P1",
          sourceInstanceId: "stale-source",
          sourceCardId: BATTLE_OX_ID,
          effectId: "stale-effect",
          definition: {
            duration: "until-end-phase",
          },
          expiresAtTurn: 1,
          expiresAtPhase: "EP",
        },
      ],
      winner: "P1",
    };

    expect(dirtyState.chain).toHaveLength(1);
    expect(dirtyState.pendingPromptIds).toEqual(["prompt-stale"]);

    const reset = createCleanDuel("core-state-reset");

    expect(reset.state.chain).toEqual([]);
    expect(reset.state.prompts).toEqual({});
    expect(reset.state.pendingPromptIds).toEqual([]);
    expect(reset.state.pendingAttack).toBeUndefined();
    expect(reset.state.lingeringEffects).toEqual([]);
    expect(reset.state.winner).toBeNull();
    expect(reset.state.phase).toBe("DP");
    expect(reset.state.turn).toBe(1);
    expect(reset.state.players.P1.lp).toBe(8000);
    expect(reset.state.players.P2.lp).toBe(8000);
    expect(reset.state.players.P1.hand).toHaveLength(5);
    expect(reset.state.players.P2.hand).toHaveLength(5);
    expect(reset.state.players.P1.mainDeck).toHaveLength(35);
    expect(reset.state.players.P2.mainDeck).toHaveLength(35);
    expect(reset.state).toEqual(first.state);
  });
});

function createCleanDuel(seed: string) {
  return createDuel({
    cards,
    decks: {
      P1: { main: legalMainDeck(40) },
      P2: { main: reversedLegalMainDeck(40) },
    },
    seed,
    firstPlayer: "P1",
  });
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
