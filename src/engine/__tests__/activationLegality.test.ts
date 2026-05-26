import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import { TORRENTIAL_TRIBUTE_ID } from "../cards/scripts/traps";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";
import { createPriorityWindow } from "../rules/priority";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";
const AQUA_MADOOR_ID = "85639257";

describe("activation legality", () => {
  it("rejects invalid targets before mutating state and returns machine-readable errors", () => {
    const state = deepFreeze(stateWithScripts([targetedScript(BATTLE_OX_ID)]));
    const before = JSON.parse(JSON.stringify(state));
    const source = requireHandCard(state, "P1", BATTLE_OX_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "targeted-destroy",
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });

    expect(state).toEqual(before);
    expect(comparableState(result.state)).toEqual(comparableState(before));
    expect(result.errors[0]).toMatchObject({
      code: "illegal-action",
      commandType: "activate-card",
      playerId: "P1",
    });
    expect(result.events[0]).toMatchObject({
      type: "illegal-action",
      commandType: "activate-card",
      playerId: "P1",
    });
  });

  it("rejects trap activation from hand before state mutation", () => {
    const state = deepFreeze(stateWithScripts([quickScript(TORRENTIAL_TRIBUTE_ID)]));
    const before = JSON.parse(JSON.stringify(state));
    const trap = requireHandCard(state, "P1", TORRENTIAL_TRIBUTE_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: trap.instanceId,
      effectId: "quick-noop",
    });

    expect(state).toEqual(before);
    expect(comparableState(result.state)).toEqual(comparableState(before));
    expect(result.errors[0]).toMatchObject({
      code: "illegal-action",
      commandType: "activate-card",
      message: "Trap cards must be Set before they can be activated.",
    });
  });

  it("rejects illegal Spell Speed 1 chain attempts before adding a chain link", () => {
    const state = stateWithScripts([quickScript(BATTLE_OX_ID), speedOneScript(AQUA_MADOOR_ID)]);
    const first = requireHandCard(state, "P1", BATTLE_OX_ID);
    const second = requireHandCard(state, "P1", AQUA_MADOOR_ID);
    const chained = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: first.instanceId,
      effectId: "quick-noop",
    });
    const frozen = deepFreeze(chained.state);
    const before = JSON.parse(JSON.stringify(frozen));
    const rejected = reduceDuel(frozen, {
      type: "activate-card",
      playerId: "P1",
      instanceId: second.instanceId,
      effectId: "speed-one-noop",
    });

    expect(frozen).toEqual(before);
    expect(comparableState(rejected.state)).toEqual(comparableState(before));
    expect(rejected.errors[0]).toMatchObject({
      code: "illegal-action",
      commandType: "activate-card",
      message: "Spell Speed 1 effects cannot be chained manually.",
    });
  });

  it("rejects ignition effects outside Main Phase 1 or Main Phase 2", () => {
    const state = deepFreeze(stateWithScripts([ignitionScript(BATTLE_OX_ID)]));
    const before = JSON.parse(JSON.stringify(state));
    const source = requireHandCard(state, "P1", BATTLE_OX_ID);
    const rejected = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "ignition-noop",
    });

    expect(state).toEqual(before);
    expect(comparableState(rejected.state)).toEqual(comparableState(before));
    expect(rejected.errors[0]).toMatchObject({
      code: "illegal-action",
      commandType: "activate-card",
      message: "Ignition effects can only be activated during Main Phase 1 or Main Phase 2.",
    });
  });

  it("rejects ignition effects after both players pass and the priority window closes", () => {
    const state = advanceToMainPhase(stateWithScripts([ignitionScript(BATTLE_OX_ID)]));
    const source = requireHandCard(state, "P1", BATTLE_OX_ID);
    const passedP1 = reduceDuel(state, { type: "pass-priority", playerId: "P1" });
    const closed = reduceDuel(passedP1.state, { type: "pass-priority", playerId: "P2" });
    const rejected = reduceDuel(closed.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "ignition-noop",
    });

    expect(closed.state.priority.status).toBe("closed");
    expect(rejected.errors[0]).toMatchObject({
      code: "illegal-action",
      commandType: "activate-card",
      message: "Ignition effects can only be activated while that player holds an open priority window.",
    });
  });

  it("persists once-per-turn ignition usage for the same source through zone changes", () => {
    const state = advanceToMainPhase(stateWithScripts([ignitionScript(BATTLE_OX_ID, { oncePerTurn: true })]));
    const source = requireHandCard(state, "P1", BATTLE_OX_ID);
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "ignition-noop",
    });
    const movedSourceState = moveP1HandCardToGraveyard({
      ...activated.state,
      chain: [],
    }, source.instanceId);
    const rejected = reduceDuel(movedSourceState, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "ignition-noop",
    });

    expect(activated.errors).toEqual([]);
    expect(Object.values(activated.state.effectUsage ?? {})).toHaveLength(1);
    expect(rejected.errors[0]).toMatchObject({
      code: "illegal-action",
      commandType: "activate-card",
      message: "That effect has already been activated this turn.",
    });
  });

  it("allows turn-scoped usage again after the turn boundary", () => {
    const state = advanceToMainPhase(stateWithScripts([ignitionScript(BATTLE_OX_ID, { oncePerTurn: true })]));
    const source = requireHandCard(state, "P1", BATTLE_OX_ID);
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "ignition-noop",
    });
    const nextTurn = openNextTurnForP1(activated.state);
    const secondActivation = reduceDuel(nextTurn, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "ignition-noop",
    });

    expect(activated.errors).toEqual([]);
    expect(secondActivation.errors).toEqual([]);
    expect(Object.values(secondActivation.state.effectUsage ?? {})[0]).toMatchObject({
      turn: nextTurn.turn,
      frequency: "turn",
      scope: "source",
    });
  });

  it("blocks card-scoped usage across separate copies during the same turn", () => {
    const state = advanceToMainPhase(stateWithScripts([ignitionScript(BATTLE_OX_ID, {
      oncePerTurn: { scope: "card" },
    })]));
    const firstSource = requireHandCard(state, "P1", BATTLE_OX_ID);
    const secondSource = { ...firstSource, instanceId: `${firstSource.instanceId}-copy` };
    const withSecondCopy: DuelState = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          hand: [...state.players.P1.hand, secondSource],
        },
      },
    };
    const activated = reduceDuel(withSecondCopy, {
      type: "activate-card",
      playerId: "P1",
      instanceId: firstSource.instanceId,
      effectId: "ignition-noop",
    });
    const rejected = reduceDuel({ ...activated.state, chain: [] }, {
      type: "activate-card",
      playerId: "P1",
      instanceId: secondSource.instanceId,
      effectId: "ignition-noop",
    });

    expect(activated.errors).toEqual([]);
    expect(rejected.errors[0]).toMatchObject({
      message: "That effect has already been activated this turn.",
    });
  });

  it("blocks effect-scoped usage across different cards with the same key", () => {
    const state = advanceToMainPhase(stateWithScripts([
      ignitionScript(BATTLE_OX_ID, { oncePerTurn: { scope: "effect", key: "shared-fixture-effect" } }),
      ignitionScript(AQUA_MADOOR_ID, { oncePerTurn: { scope: "effect", key: "shared-fixture-effect" } }),
    ]));
    const battleOx = requireHandCard(state, "P1", BATTLE_OX_ID);
    const aquaMadoor = requireHandCard(state, "P1", AQUA_MADOOR_ID);
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: battleOx.instanceId,
      effectId: "ignition-noop",
    });
    const rejected = reduceDuel({ ...activated.state, chain: [] }, {
      type: "activate-card",
      playerId: "P1",
      instanceId: aquaMadoor.instanceId,
      effectId: "ignition-noop",
    });

    expect(activated.errors).toEqual([]);
    expect(rejected.errors[0]).toMatchObject({
      message: "That effect has already been activated this turn.",
    });
  });

  it("blocks duel-scoped usage after later turn boundaries", () => {
    const state = advanceToMainPhase(stateWithScripts([ignitionScript(BATTLE_OX_ID, {
      oncePerTurn: { scope: "duel", frequency: "duel", key: "once-per-duel-fixture" },
    })]));
    const source = requireHandCard(state, "P1", BATTLE_OX_ID);
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "ignition-noop",
    });
    const nextTurn = openNextTurnForP1(activated.state);
    const rejected = reduceDuel(nextTurn, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "ignition-noop",
    });

    expect(activated.errors).toEqual([]);
    expect(rejected.errors[0]).toMatchObject({
      message: "That effect has already been activated this Duel.",
    });
  });
});

function stateWithScripts(scripts: readonly CardScript[]): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority(scripts.map((script) => script.cardId)),
      P2: deckWithPriority([]),
    },
    seed: "activation-legality",
    shuffleDecks: false,
  }).state;

  return {
    ...state,
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function quickScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "quick-noop",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        resolution: {
          steps: [],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
}

function ignitionScript(
  cardId: string,
  options: { readonly oncePerTurn?: boolean | NonNullable<CardScript["effects"][number]["oncePerTurn"]> } = {},
): CardScript {
  const oncePerTurn = options.oncePerTurn === true ? { scope: "source" as const } : options.oncePerTurn || undefined;

  return {
    cardId,
    effects: [
      {
        id: "ignition-noop",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        ...(oncePerTurn ? { oncePerTurn } : {}),
        resolution: {
          steps: [],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
}

function speedOneScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "speed-one-noop",
        kind: "quick",
        implemented: true,
        spellSpeed: 1,
        resolution: {
          steps: [],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
}

function advanceToMainPhase(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
}

function openNextTurnForP1(state: DuelState): DuelState {
  const priority = createPriorityWindow("P1", "phase-start");

  return {
    ...state,
    turn: state.turn + 1,
    phase: "M1",
    activePlayer: "P1",
    priorityPlayer: "P1",
    priority,
    chain: [],
    prompts: {},
    pendingPromptIds: [],
  };
}

function moveP1HandCardToGraveyard(state: DuelState, instanceId: string): DuelState {
  const card = state.players.P1.hand.find((candidate) => candidate.instanceId === instanceId);

  if (!card) {
    throw new Error(`Expected P1 hand card ${instanceId}.`);
  }

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: state.players.P1.hand.filter((candidate) => candidate.instanceId !== instanceId),
        graveyard: [
          ...state.players.P1.graveyard,
          {
            ...card,
            face: "faceUp",
            position: null,
            visibility: "public",
            counters: {},
            attachments: [],
          },
        ],
      },
    },
  };
}

function targetedScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "targeted-destroy",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        targets: [
          {
            kind: "card",
            controller: "opponent",
            zones: ["monsterZone"],
            cardKinds: ["monster"],
            face: "faceUp",
            min: 1,
            max: 1,
          },
        ],
        resolution: {
          steps: [{ kind: "destroy-targets" }],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
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

function requireHandCard(state: DuelState, playerId: "P1" | "P2", cardId: string) {
  const card = state.players[playerId].hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in ${playerId} hand.`);
  }

  return card;
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

function comparableState(state: DuelState): DuelState {
  return JSON.parse(JSON.stringify({
    ...state,
    eventIds: [],
  })) as DuelState;
}
