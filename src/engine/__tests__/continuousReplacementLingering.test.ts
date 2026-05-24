import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript, EffectKind, SpellSpeed } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { deriveBattleStats, type ContinuousEffectDefinition } from "../effects/continuous";
import type { ActiveLingeringEffect, LingeringEffectDefinition } from "../effects/lingering";
import type { ReplacementEffectDefinition } from "../effects/replacement";
import { createDuel, reduceDuel } from "../reducer";
import { getMonsterBattleStats } from "../rules/battle";
import { applyStateBasedCleanup } from "../rules/stateBasedCleanup";

const cards = cardsJson as CardRecord[];
const ATTACKER_ID = "05053103";
const DEFENDER_ID = "85639257";
const STRONG_ATTACKER_ID = "89631139";
const CONTINUOUS_SOURCE_ID = "27125110";
const REPLACEMENT_SOURCE_ID = "47372349";
const LINGERING_SOURCE_ID = "23771716";

describe("continuous, replacement, and lingering effect foundations", () => {
  it("derives battle damage from continuous ATK modifiers without mutating input state", () => {
    const state = deepFreeze(battleState([
      script(CONTINUOUS_SOURCE_ID, "own-boost", "continuous", {
        continuous: {
          statModifiers: [
            {
              stat: "atk",
              amount: 600,
              target: { controller: "own", face: "faceUp" },
            },
          ],
        },
      }),
    ], {
      attackerId: ATTACKER_ID,
      p1SpellTrap: zoneCard("p1-boost-source", CONTINUOUS_SOURCE_ID, "P1"),
    }));
    const before = JSON.parse(JSON.stringify(state));
    const attacker = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });

    expect(state).toEqual(before);
    expect(result.errors).toEqual([]);
    expect(result.state.players.P2.lp).toBe(5700);
  });

  it("blocks attacks using continuous attack restrictions", () => {
    const state = battleState([
      script(CONTINUOUS_SOURCE_ID, "opponent-cannot-attack", "continuous", {
        continuous: {
          attackRestrictions: [
            {
              target: { controller: "opponent", face: "faceUp" },
              reason: "A fixture continuous effect prevents this monster from attacking.",
            },
          ],
        },
      }),
    ], {
      attackerId: ATTACKER_ID,
      p2SpellTrap: zoneCard("p2-restrict-source", CONTINUOUS_SOURCE_ID, "P2"),
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });

    expect(result.errors[0]?.message).toBe("A fixture continuous effect prevents this monster from attacking.");
    expect(result.state.players.P2.lp).toBe(8000);
    expect(result.state.players.P1.monsterZones[0]?.attackedTurn).toBeNull();
  });

  it("prevents battle destruction through replacement effects", () => {
    const state = battleState([
      script(REPLACEMENT_SOURCE_ID, "protect-own-monsters", "replacement", {
        replacement: {
          destruction: {
            target: { controller: "own", face: "faceUp" },
            reasons: ["battle"],
            action: "prevent",
          },
        },
      }),
    ], {
      attackerId: STRONG_ATTACKER_ID,
      defenderId: DEFENDER_ID,
      defenderOverrides: { position: "defense" },
      p2SpellTrap: zoneCard("p2-replacement-source", REPLACEMENT_SOURCE_ID, "P2"),
    });
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: defender.instanceId });
    expect(result.state.players.P2.graveyard).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual(["attack-declared", "battle-completed"]);
  });

  it("applies lingering modifiers on chain resolution and expires them at the End Phase", () => {
    let state = mainPhaseState([
      script(LINGERING_SOURCE_ID, "until-end-phase-boost", "lingering", {
        spellSpeed: 1,
        lingering: {
          duration: "until-end-phase",
          statModifiers: [
            {
              stat: "atk",
              amount: 800,
              target: { controller: "own", face: "faceUp" },
            },
          ],
        },
      }),
    ], [LINGERING_SOURCE_ID, ATTACKER_ID]);
    const source = requireHandCard(state, LINGERING_SOURCE_ID);
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "until-end-phase-boost",
    });
    const resolved = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });

    state = {
      ...resolved.state,
      players: {
        ...resolved.state.players,
        P1: {
          ...resolved.state.players.P1,
          monsterZones: [zoneCard("p1-attacker", ATTACKER_ID, "P1"), null, null, null, null],
        },
      },
    };

    expect(resolved.errors).toEqual([]);
    expect(state.lingeringEffects).toHaveLength(1);
    expect(derivedAtk(state, "P1", 0)).toBe(2500);

    state = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "BP" }).state;
    state = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "M2" }).state;
    state = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "EP" }).state;

    expect(state.lingeringEffects).toEqual([]);
    expect(derivedAtk(state, "P1", 0)).toBe(1700);
  });

  it("cleans up lingering effects whose source leaves the field", () => {
    const source = zoneCard("p1-lingering-source", LINGERING_SOURCE_ID, "P1");
    const effect = activeLingering({
      sourceInstanceId: source.instanceId,
      sourceCardId: source.cardId,
      removeWhenSourceLeavesField: true,
    });
    const base = mainPhaseState([], [ATTACKER_ID]);
    const withSource: DuelState = {
      ...base,
      lingeringEffects: [effect],
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [source, null, null, null, null],
        },
      },
    };
    const cleanedWithSource = applyStateBasedCleanup(withSource);
    const withoutSource = {
      ...withSource,
      players: {
        ...withSource.players,
        P1: {
          ...withSource.players.P1,
          monsterZones: [null, null, null, null, null],
        },
      },
    };

    expect(cleanedWithSource.lingeringEffects).toEqual([effect]);
    expect(applyStateBasedCleanup(withoutSource).lingeringEffects).toEqual([]);
  });
});

function battleState(
  scripts: readonly CardScript[],
  options: {
    readonly attackerId: string;
    readonly defenderId?: string;
    readonly p1SpellTrap?: ZoneCard;
    readonly p2SpellTrap?: ZoneCard;
    readonly defenderOverrides?: Partial<ZoneCard>;
  },
): DuelState {
  const state = advanceToBattlePhase(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(uniqueIds([options.attackerId, ...scripts.map((script) => script.cardId)])),
      P2: deckWithPriority(uniqueIds([
        ...(options.defenderId ? [options.defenderId] : []),
        ...scripts.map((script) => script.cardId),
      ])),
    },
    seed: "continuous-replacement-lingering",
    shuffleDecks: false,
  }).state);

  return {
    ...state,
    cardScripts: createCardScriptRegistry(scripts),
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-attacker", options.attackerId, "P1"), null, null, null, null],
        spellTrapZones: [options.p1SpellTrap ?? null, null, null, null, null],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [
          options.defenderId
            ? zoneCard("p2-defender", options.defenderId, "P2", options.defenderOverrides)
            : null,
          null,
          null,
          null,
          null,
        ],
        spellTrapZones: [options.p2SpellTrap ?? null, null, null, null, null],
      },
    },
  };
}

function mainPhaseState(scripts: readonly CardScript[], priorityIds: readonly string[]): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority(uniqueIds([...priorityIds, ...scripts.map((script) => script.cardId)])),
      P2: deckWithPriority([]),
    },
    seed: "lingering-main-phase",
    shuffleDecks: false,
  }).state;

  return {
    ...advanceToMainPhase(state),
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function advanceToMainPhase(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
}

function advanceToBattlePhase(state: DuelState): DuelState {
  return reduceDuel(advanceToMainPhase(state), { type: "change-phase", playerId: "P1", phase: "BP" }).state;
}

function script(
  cardId: string,
  effectId: string,
  kind: EffectKind,
  options: {
    readonly spellSpeed?: SpellSpeed;
    readonly continuous?: ContinuousEffectDefinition;
    readonly replacement?: ReplacementEffectDefinition;
    readonly lingering?: LingeringEffectDefinition;
  },
): CardScript {
  return Object.freeze({
    cardId,
    effects: Object.freeze([
      Object.freeze({
        id: effectId,
        kind,
        implemented: true,
        spellSpeed: options.spellSpeed,
        continuous: options.continuous,
        replacement: options.replacement,
        lingering: options.lingering,
      }),
    ]),
  });
}

function activeLingering(input: {
  readonly sourceInstanceId: string;
  readonly sourceCardId: string;
  readonly removeWhenSourceLeavesField: boolean;
}): ActiveLingeringEffect {
  return {
    id: "lingering-test",
    playerId: "P1",
    sourceInstanceId: input.sourceInstanceId,
    sourceCardId: input.sourceCardId,
    effectId: "cleanup-test",
    expiresAtTurn: 1,
    expiresAtPhase: "EP",
    definition: {
      duration: "until-end-phase",
      removeWhenSourceLeavesField: input.removeWhenSourceLeavesField,
      statModifiers: [
        {
          stat: "atk",
          amount: 300,
          target: { controller: "own", face: "faceUp" },
        },
      ],
    },
  };
}

function derivedAtk(state: DuelState, playerId: "P1" | "P2", zoneIndex: number): number {
  const card = state.players[playerId].monsterZones[zoneIndex];

  if (!card) {
    throw new Error(`Expected ${playerId} monster at zone ${zoneIndex}.`);
  }

  const base = getMonsterBattleStats(state.cardDefinitions?.[card.cardId]);

  if (!base) {
    throw new Error(`Expected numeric stats for ${card.cardId}.`);
  }

  return deriveBattleStats(state, { playerId, card, base }).atk;
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

function uniqueIds(ids: readonly string[]): readonly string[] {
  return [...new Set(ids)];
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
