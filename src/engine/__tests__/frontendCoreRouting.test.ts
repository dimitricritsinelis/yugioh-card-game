import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import {
  createInitialGameState,
  placeSelectedCard,
  resolveCurrentChain,
} from "../../gameLogic";
import type { CardRecord } from "../../types";
import {
  applyAction,
  clonePlayableDeck,
  KAIBA_PLAYABLE_DECK_FIXTURE,
  YUGI_PLAYABLE_DECK_FIXTURE,
} from "../index";
import type { DeckList, DuelState } from "../types";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";
const BOOK_OF_MOON_ID = "14087893";
const MYSTICAL_SPACE_TYPHOON_ID = "05318639";
const POT_OF_GREED_ID = "55144522";

describe("frontend-compatible core reducer routing", () => {
  it("resolves Pot of Greed through the UI-facing activation and chain helpers", () => {
    const game = createInitialGameState(cards, {
      decks: {
        P1: deckWithPriority(clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck), [POT_OF_GREED_ID]),
        P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
      },
      seed: "frontend-pot-core-routing",
      opponentBehavior: "none",
      suppressWarnings: true,
    });
    const pot = requireHandCard(game.engine!, "P1", POT_OF_GREED_ID);
    const handBefore = game.engine!.players.P1.hand.length;
    const deckBefore = game.engine!.players.P1.deck.length;

    const activated = placeSelectedCard(
      { ...game, selectedCardId: pot.instanceId },
      "activate",
      "spellTrap",
      0,
    );

    expect(activated.engine!.events.map((event) => event.type)).not.toContain("effect-not-implemented");
    expect(activated.engine!.chain).toHaveLength(1);
    expect(activated.engine!.coreState?.chain[0]).toMatchObject({
      cardId: POT_OF_GREED_ID,
      effectId: "activate",
      sourceInstanceId: pot.instanceId,
    });

    const resolved = resolveCurrentChain(activated);

    expect(resolved.engine!.events.map((event) => event.type)).not.toContain("effect-not-implemented");
    expect(resolved.engine!.players.P1.hand).toHaveLength(handBefore + 1);
    expect(resolved.engine!.players.P1.deck).toHaveLength(deckBefore - 2);
    expect(resolved.engine!.players.P1.graveyard[0]).toMatchObject({
      instance: { instanceId: pot.instanceId, card: { passcode: POT_OF_GREED_ID } },
    });
    expect(resolved.engine!.chain).toEqual([]);
    expectLegacyProjectionMatchesCore(resolved.engine!);
  });

  it("routes target refs from the frontend-compatible play-card action into core activate-card", () => {
    const game = createInitialGameState(cards, {
      decks: {
        P1: deckWithPriority(clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck), [MYSTICAL_SPACE_TYPHOON_ID]),
        P2: deckWithPriority(clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck), [BOOK_OF_MOON_ID]),
      },
      seed: "frontend-target-core-routing",
      opponentBehavior: "none",
      suppressWarnings: true,
    });
    const mst = requireHandCard(game.engine!, "P1", MYSTICAL_SPACE_TYPHOON_ID);
    const target = requireHandCard(game.engine!, "P2", BOOK_OF_MOON_ID);
    const engineWithTarget = putOpponentSpellTrapOnField(game.engine!, target.instanceId);
    const targetRef = { playerId: "P2" as const, zone: "spellTrapZone" as const, index: 0 };
    const activated = applyAction(engineWithTarget, {
      type: "play-card",
      playerId: "P1",
      instanceId: mst.instanceId,
      intent: "activate",
      zoneKind: "spellTrap",
      zoneIndex: 0,
      targetRefs: [targetRef],
    });

    expect(activated.events.map((event) => event.type)).toEqual([
      "targets-chosen",
      "effect-activated",
      "chain-link-created",
    ]);
    expect(activated.state.coreState?.chain[0]?.selectedTargets).toMatchObject({
      targetRefs: [targetRef],
      targetPlayerIds: [],
    });

    const resolved = applyAction(activated.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.events.map((event) => event.type)).toContain("card-destroyed");
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({
      instance: { instanceId: target.instanceId, card: { passcode: BOOK_OF_MOON_ID } },
    });
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({
      instance: { instanceId: mst.instanceId, card: { passcode: MYSTICAL_SPACE_TYPHOON_ID } },
    });
    expectLegacyProjectionMatchesCore(resolved.state);
  });

  it("gives deterministic results for the same frontend-compatible action sequence", () => {
    const first = runFrontendActionSequence();
    const second = runFrontendActionSequence();

    expect(second.events).toEqual(first.events);
    expect(second.state).toEqual(first.state);
  });
});

function runFrontendActionSequence(): { readonly state: DuelState; readonly events: readonly unknown[] } {
  let state = createInitialGameState(cards, {
    decks: {
      P1: deckWithPriority(clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck), [
        BATTLE_OX_ID,
        BOOK_OF_MOON_ID,
        POT_OF_GREED_ID,
      ]),
      P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
    },
    seed: "frontend-deterministic-sequence",
    opponentBehavior: "none",
    suppressWarnings: true,
  }).engine!;
  const events = [];
  const battleOx = requireHandCard(state, "P1", BATTLE_OX_ID);
  const book = requireHandCard(state, "P1", BOOK_OF_MOON_ID);
  const pot = requireHandCard(state, "P1", POT_OF_GREED_ID);

  for (const action of [
    {
      type: "play-card" as const,
      playerId: "P1" as const,
      instanceId: book.instanceId,
      intent: "set" as const,
      zoneKind: "spellTrap" as const,
      zoneIndex: 0,
    },
    {
      type: "play-card" as const,
      playerId: "P1" as const,
      instanceId: battleOx.instanceId,
      intent: "summon" as const,
      zoneKind: "monster" as const,
      zoneIndex: 0,
    },
    {
      type: "play-card" as const,
      playerId: "P1" as const,
      instanceId: pot.instanceId,
      intent: "activate" as const,
      zoneKind: "spellTrap" as const,
      zoneIndex: 1,
    },
    { type: "resolve-chain" as const, playerId: "P1" as const },
    { type: "advance-phase" as const, playerId: "P1" as const },
    {
      type: "attack" as const,
      playerId: "P1" as const,
      attackerInstanceId: battleOx.instanceId,
    },
  ]) {
    const result = applyAction(state, action);
    state = result.state;
    events.push(...result.events);
  }

  return { state, events };
}

function deckWithPriority(deck: DeckList, priorityIds: readonly string[]): DeckList {
  const remaining = [...deck.main];

  for (const cardId of priorityIds) {
    const index = remaining.indexOf(cardId);

    if (index < 0) {
      throw new Error(`Fixture deck is missing cardId ${cardId}.`);
    }

    remaining.splice(index, 1);
  }

  return {
    main: [...priorityIds, ...remaining],
  };
}

function requireHandCard(state: DuelState, playerId: "P1" | "P2", cardId: string) {
  const card = state.players[playerId].hand.find((candidate) => candidate.card.passcode === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in ${playerId} hand.`);
  }

  return card;
}

function putOpponentSpellTrapOnField(state: DuelState, instanceId: string): DuelState {
  const target = state.players.P2.hand.find((card) => card.instanceId === instanceId);

  if (!target) {
    throw new Error(`Expected ${instanceId} in P2 hand.`);
  }

  return {
    ...state,
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        hand: state.players.P2.hand.filter((card) => card.instanceId !== instanceId),
        spellTrapZones: [
          {
            instance: target,
            faceDown: true,
            position: "attack",
            status: "set",
          },
          ...state.players.P2.spellTrapZones.slice(1),
        ],
      },
    },
  };
}

function expectLegacyProjectionMatchesCore(state: DuelState): void {
  expect(state.coreState?.players.P1.hand.map((card) => card.instanceId)).toEqual(
    state.players.P1.hand.map((card) => card.instanceId),
  );
  expect(state.coreState?.players.P1.mainDeck.map((card) => card.instanceId)).toEqual(
    state.players.P1.deck.map((card) => card.instanceId),
  );
  expect(state.coreState?.players.P1.graveyard.map((card) => card.instanceId)).toEqual(
    state.players.P1.graveyard.map((card) => card.instance.instanceId),
  );
  expect(state.coreState?.chain.map((link) => link.id)).toEqual(state.chain.map((link) => link.id));
}
