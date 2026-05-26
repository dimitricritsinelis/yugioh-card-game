import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardEffectContext, CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import { TORRENTIAL_TRIBUTE_ID } from "../cards/scripts/traps";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const A_TEAM_TRAP_DISPOSAL_UNIT_ID = "13026402";

describe("quick effect activation windows", () => {
  it("lets a monster quick effect respond to and negate an opponent Trap activation", () => {
    const state = fieldState([
      drawTrapScript(TORRENTIAL_TRIBUTE_ID),
      trapNegationMonsterScript(A_TEAM_TRAP_DISPOSAL_UNIT_ID),
    ]);
    const p1HandBefore = state.players.P1.hand.length;
    const trap = state.players.P1.spellTrapZones[0]!;
    const negator = state.players.P2.monsterZones[0]!;
    const trapActivated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: trap.instanceId,
      effectId: "draw-one-trap",
    });
    const priorityPassed = reduceDuel(trapActivated.state, { type: "pass-priority", playerId: "P1" });
    const negationActivated = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: negator.instanceId,
      effectId: "tribute-negate-trap",
    });
    const responseClosed = reduceDuel(negationActivated.state, { type: "pass-priority", playerId: "P2" });
    const resolved = reduceDuel(responseClosed.state, { type: "resolve-chain", playerId: "P1" });

    expect(trapActivated.errors).toEqual([]);
    expect(priorityPassed.state.priority.holder).toBe("P2");
    expect(negationActivated.errors).toEqual([]);
    expect(negationActivated.state.chain.map((link) => [link.id, link.playerId, link.effectId])).toEqual([
      ["chain-1", "P1", "draw-one-trap"],
      ["chain-2", "P2", "tribute-negate-trap"],
    ]);
    expect(responseClosed.state.priority.status).toBe("closed");
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "effect-resolved-without-effect",
      chainLinkId: "chain-1",
      reason: "Chain link was negated.",
    }));
    expect(resolved.state.players.P1.hand).toHaveLength(p1HandBefore);
    expect(resolved.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({
      instanceId: trap.instanceId,
      cardId: TORRENTIAL_TRIBUTE_ID,
    }));
    expect(resolved.state.players.P2.graveyard).toContainEqual(expect.objectContaining({
      instanceId: negator.instanceId,
      cardId: A_TEAM_TRAP_DISPOSAL_UNIT_ID,
    }));
  });

  it("rejects an activation-response quick effect when its timing predicate is not met", () => {
    const state = fieldState([
      drawTrapScript(TORRENTIAL_TRIBUTE_ID),
      trapNegationMonsterScript(A_TEAM_TRAP_DISPOSAL_UNIT_ID),
    ]);
    const priorityPassed = reduceDuel(state, { type: "pass-priority", playerId: "P1" });
    const negator = priorityPassed.state.players.P2.monsterZones[0]!;
    const rejected = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: negator.instanceId,
      effectId: "tribute-negate-trap",
    });

    expect(priorityPassed.state.priority.holder).toBe("P2");
    expect(rejected.errors[0]).toMatchObject({
      code: "illegal-action",
      commandType: "activate-card",
      message: "That effect cannot be activated right now.",
    });
    expect(rejected.state.players.P2.monsterZones[0]).toMatchObject({
      instanceId: negator.instanceId,
      cardId: A_TEAM_TRAP_DISPOSAL_UNIT_ID,
    });
  });
});

function fieldState(scripts: readonly CardScript[]): DuelState {
  const created = createDuel({
    cards,
    decks: {
      P1: deckWithPriority([TORRENTIAL_TRIBUTE_ID]),
      P2: deckWithPriority([A_TEAM_TRAP_DISPOSAL_UNIT_ID]),
    },
    seed: "quick-effects",
    shuffleDecks: false,
    allowUnsupportedCards: true,
  }).state;
  const advanced = advanceToMainPhase(created);
  const trap = requireHandCard(advanced, "P1", TORRENTIAL_TRIBUTE_ID);
  const negator = requireHandCard(advanced, "P2", A_TEAM_TRAP_DISPOSAL_UNIT_ID);

  return {
    ...advanced,
    cardScripts: createCardScriptRegistry(scripts),
    players: {
      ...advanced.players,
      P1: {
        ...advanced.players.P1,
        hand: advanced.players.P1.hand.filter((card) => card.instanceId !== trap.instanceId),
        spellTrapZones: [
          zoneCard(trap.instanceId, TORRENTIAL_TRIBUTE_ID, "P1", {
            face: "faceDown",
            position: null,
            visibility: "hidden",
            setTurn: 0,
          }),
          null,
          null,
          null,
          null,
        ],
      },
      P2: {
        ...advanced.players.P2,
        hand: advanced.players.P2.hand.filter((card) => card.instanceId !== negator.instanceId),
        monsterZones: [zoneCard(negator.instanceId, A_TEAM_TRAP_DISPOSAL_UNIT_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function drawTrapScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "draw-one-trap",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        resolution: {
          steps: [{ kind: "draw", player: "self", count: 1 }],
          sendSourceToGraveyard: true,
        },
      },
    ],
  };
}

function trapNegationMonsterScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "tribute-negate-trap",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        costs: [{ kind: "tribute-source" }],
        resolution: {
          steps: [{ kind: "negate-previous-chain-link" }],
          sendSourceToGraveyard: false,
        },
      },
    ],
    canActivate: canActivateTrapNegation,
  };
}

function canActivateTrapNegation({ state, command, sourceInstanceId }: CardEffectContext): boolean {
  const topLink = state.chain[state.chain.length - 1];

  if (command?.type !== "activate-card" || !sourceInstanceId || !topLink || topLink.playerId === command.playerId) {
    return false;
  }

  const source = findFieldMonster(state, command.playerId, sourceInstanceId);
  const chainedCard = state.cardDefinitions?.[topLink.cardId];

  return source?.face === "faceUp" && chainedCard?.kind === "trap";
}

function findFieldMonster(state: DuelState, playerId: "P1" | "P2", instanceId: string): ZoneCard | null {
  return state.players[playerId].monsterZones.find((card) => card?.instanceId === instanceId) ?? null;
}

function advanceToMainPhase(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
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
