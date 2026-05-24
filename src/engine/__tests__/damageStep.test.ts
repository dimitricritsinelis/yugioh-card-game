import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import {
  closeDamageStep,
  createDamageStepState,
  DAMAGE_STEP_ACTIVATION_ERROR,
  type DamageStepEffectPermission,
} from "../rules/damageStep";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const DEFAULT_EFFECT_ID = "05053103";
const COUNTER_EFFECT_ID = "85639257";
const MODIFIER_EFFECT_ID = "89631139";
const ATTACK_REACTION_ID = "27125110";
const DAMAGE_REACTION_ID = "47372349";
const BATTLE_DESTRUCTION_ID = "23771716";

describe("Damage Step restrictions", () => {
  it("blocks default quick effects during an active Damage Step without mutating state", () => {
    const state = deepFreeze(activeDamageStepState([
      script(DEFAULT_EFFECT_ID, "default-quick-effect", 2),
    ]));
    const before = JSON.parse(JSON.stringify(state));
    const source = requireHandCard(state, DEFAULT_EFFECT_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "default-quick-effect",
    });

    expect(state).toEqual(before);
    expect(result.errors[0]?.message).toBe(DAMAGE_STEP_ACTIVATION_ERROR);
    expect(result.state.chain).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual(["illegal-action"]);
  });

  it("rejects attack-reaction, damage-reaction, and battle-destruction style effects in the Damage Step", () => {
    const scripts = [
      script(ATTACK_REACTION_ID, "attack-reaction-style", 2),
      script(DAMAGE_REACTION_ID, "damage-reaction-style", 2),
      script(BATTLE_DESTRUCTION_ID, "battle-destruction-style", 2),
    ];
    const state = activeDamageStepState(scripts);

    for (const candidate of scripts) {
      const source = requireHandCard(state, candidate.cardId);
      const result = reduceDuel(state, {
        type: "activate-card",
        playerId: "P1",
        instanceId: source.instanceId,
        effectId: candidate.effects[0].id,
      });

      expect(result.errors[0]?.message).toBe(DAMAGE_STEP_ACTIVATION_ERROR);
      expect(result.state.chain).toEqual([]);
    }
  });

  it("allows Counter Trap speed effects during the Damage Step", () => {
    const state = activeDamageStepState([
      script(COUNTER_EFFECT_ID, "counter-speed-effect", 3),
    ]);
    const source = requireHandCard(state, COUNTER_EFFECT_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "counter-speed-effect",
    });

    expect(result.errors).toEqual([]);
    expect(result.state.chain[0]).toMatchObject({
      id: "chain-1",
      playerId: "P1",
      cardId: COUNTER_EFFECT_ID,
      effectId: "counter-speed-effect",
      spellSpeed: 3,
    });
  });

  it("allows scripted direct ATK/DEF modifiers during the Damage Step", () => {
    const state = activeDamageStepState([
      script(MODIFIER_EFFECT_ID, "direct-stat-modifier", 2, { kind: "atk-def-modifier" }),
    ]);
    const source = requireHandCard(state, MODIFIER_EFFECT_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "direct-stat-modifier",
    });

    expect(result.errors).toEqual([]);
    expect(result.state.chain[0]).toMatchObject({
      id: "chain-1",
      playerId: "P1",
      cardId: MODIFIER_EFFECT_ID,
      effectId: "direct-stat-modifier",
      spellSpeed: 2,
    });
  });

  it("closes Damage Step state after atomic battle resolution", () => {
    const state = battleState();
    const attacker = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.damageStep).toEqual(closeDamageStep());
  });
});

function activeDamageStepState(scripts: readonly CardScript[]): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority(uniqueCardIds(scripts)),
      P2: deckWithPriority([]),
    },
    seed: "damage-step",
    shuffleDecks: false,
  }).state;

  const advanced = advanceToBattlePhase(state);

  return {
    ...advanced,
    cardScripts: createCardScriptRegistry(scripts),
    damageStep: createDamageStepState({
      substep: "damage-calculation",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    }),
    players: {
      ...advanced.players,
      P1: {
        ...advanced.players.P1,
        monsterZones: [zoneCard("p1-attacker", DEFAULT_EFFECT_ID, "P1"), null, null, null, null],
      },
      P2: {
        ...advanced.players.P2,
        monsterZones: [zoneCard("p2-defender", COUNTER_EFFECT_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function battleState(): DuelState {
  const state = advanceToBattlePhase(createDuel({
    cards,
    decks: {
      P1: deckWithPriority([DEFAULT_EFFECT_ID]),
      P2: deckWithPriority([]),
    },
    seed: "damage-step-battle",
    shuffleDecks: false,
  }).state);

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-attacker", DEFAULT_EFFECT_ID, "P1"), null, null, null, null],
      },
    },
  };
}

function advanceToBattlePhase(state: DuelState): DuelState {
  let current = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  for (const phase of ["M1", "BP"] as const) {
    current = reduceDuel(current, { type: "change-phase", playerId: "P1", phase }).state;
  }

  return current;
}

function script(
  cardId: string,
  effectId: string,
  spellSpeed: 1 | 2 | 3,
  damageStep?: DamageStepEffectPermission,
): CardScript {
  return Object.freeze({
    cardId,
    effects: Object.freeze([
      Object.freeze({
        id: effectId,
        kind: "quick",
        implemented: true,
        spellSpeed,
        damageStep,
      }),
    ]),
  });
}

function uniqueCardIds(scripts: readonly CardScript[]): readonly string[] {
  return [...new Set(scripts.map((candidate) => candidate.cardId))];
}

function deckWithPriority(priorityIds: readonly string[]) {
  const excluded = new Set(priorityIds);
  const filler = legalMainDeck(40 + excluded.size).filter((passcode) => !excluded.has(passcode));

  return {
    main: [...priorityIds, ...filler].slice(0, 40),
  };
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

function requireHandCard(state: DuelState, cardId: string) {
  const card = state.players.P1.hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in P1 hand.`);
  }

  return card;
}

function zoneCard(
  instanceId: string,
  cardId: string,
  owner: "P1" | "P2",
  overrides: Partial<ZoneCard> = {},
): ZoneCard {
  return {
    instanceId,
    cardId,
    owner,
    controller: owner,
    face: "faceUp",
    position: "attack",
    visibility: "public",
    counters: {},
    attachments: [],
    summonedTurn: 0,
    positionChangedTurn: null,
    attackedTurn: null,
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return value;
}
