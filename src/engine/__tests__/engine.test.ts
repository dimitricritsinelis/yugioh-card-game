import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import {
  ACTION_PHASES,
  canEnterBattle,
  continueTurnFlow,
  createInitialGameState,
  getLegalPlacementsForCard,
  getTurnFlowActionLabel,
  getUnavailableHandCardIds,
  placeSelectedCard,
  setLifePoints,
} from "../../gameLogic";
import type { CardRecord, ZoneCard } from "../../types";
import {
  advanceToNextDecision,
  assignRandomTestDecksToDuel,
  applyAction,
  buildGoatTestDeck,
  createDuel as createEngineDuel,
  getLegalActions,
  GOAT_TEST_DECKS,
  KAIBA_GOAT_TEST_DECK,
  runPassiveBoardFillerOpponentTurn,
  serializeDuel,
  validateGoatTestDeckDefinitions,
  validateDeck,
  YUGI_GOAT_TEST_DECK,
} from "../index";
import type { DeckList, DuelCardInstance, DuelState, DuelZoneCard, PlayerId } from "../types";
import { projectEngineToGameState } from "../adapters/frontendAdapter";
import type { DuelState as CoreDuelState } from "../core/state";
import { patchDuelCoreState, putMonsterOnField, putSpellTrapOnField } from "../testing/builders";

const cards = cardsJson as CardRecord[];

function createDuel(config: Parameters<typeof createEngineDuel>[0]): ReturnType<typeof createEngineDuel> {
  return createEngineDuel({ allowUnsupportedCards: true, ...config });
}

// Core-first rigging: test preconditions are applied to the embedded core
// state (the single source of truth) and the legacy shape is re-projected.
function withCorePatch(state: DuelState, patch: (core: CoreDuelState) => CoreDuelState): DuelState {
  return patchDuelCoreState(state, cards, patch);
}

function withCoreMonster(
  core: CoreDuelState,
  playerId: PlayerId,
  name: string,
  zoneIndex: number,
  options: { position?: "attack" | "defense"; face?: "faceUp" | "faceDown" } = {},
): CoreDuelState {
  return putMonsterOnField(core, playerId, cardByName(name), zoneIndex, {
    position: options.position ?? "attack",
    face: options.face ?? "faceUp",
    visibility: options.face === "faceDown" ? "hidden" : "public",
  }).state;
}

describe("deck validation", () => {
  it("rejects copy-limit and forbidden-card violations", () => {
    const deck = deckWith(["Pot of Greed", "Pot of Greed", "Change of Heart"]);
    const result = validateDeck(deck, cards);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Pot of Greed exceeds Limited copy limit");
    expect(result.errors.join(" ")).toContain("Change of Heart exceeds Forbidden copy limit");
  });

  it("rejects Fusion Monsters and Extra Deck inputs in playable decks", () => {
    const fusion = cardByName("Thousand-Eyes Restrict").passcode;
    const nonFusion = cardByName("Battle Ox").passcode;

    expect(validateDeck(deckWith(["Thousand-Eyes Restrict"]), cards).errors.join(" ")).toContain(
      "Extra/Fusion Decks are outside playable scope",
    );

    expect(
      validateDeck(
        {
          main: deckWith([]).main,
          extra: [nonFusion],
        },
        cards,
      ).errors.join(" "),
    ).toContain("Extra Deck is not supported");

    expect(
      validateDeck(
        {
          main: deckWith([]).main,
          extra: [fusion],
        },
        cards,
      ).errors.join(" "),
    ).toContain("Extra Deck is not supported");
  });
});

describe("GOAT test deck presets", () => {
  it("exports the Yugi and Kaiba test decks with 40-card Main Deck specs", () => {
    expect(GOAT_TEST_DECKS.map((deck) => deck.metadata.id)).toEqual([
      "yugi_goat_test",
      "kaiba_goat_test",
    ]);
    expect(YUGI_GOAT_TEST_DECK.metadata.displayName).toBe("Yugi Goat Test Deck");
    expect(KAIBA_GOAT_TEST_DECK.metadata.displayName).toBe("Seto Kaiba Goat Test Deck");

    for (const deck of GOAT_TEST_DECKS) {
      expect(totalSpecCards(deck.mainDeck)).toBe(40);
      expect(deck.mainDeck.every((spec) => spec.count >= 1)).toBe(true);
      expect(totalSpecCards(deck.extraDeck)).toBeGreaterThanOrEqual(0);
      expect(totalSpecCards(deck.extraDeck)).toBeLessThanOrEqual(15);
    }
  });

  it("resolves preset decks to valid local Main Deck-only DeckLists", () => {
    const yugi = buildGoatTestDeck(YUGI_GOAT_TEST_DECK, cards, "yugi-test");
    const kaiba = buildGoatTestDeck(KAIBA_GOAT_TEST_DECK, cards, "kaiba-test");

    expect(yugi.deck.main).toHaveLength(40);
    expect(kaiba.deck.main).toHaveLength(40);
    expect(yugi.deck.side).toBeUndefined();
    expect(yugi.deck.extra).toBeUndefined();
    expect(kaiba.deck.side).toBeUndefined();
    expect(kaiba.deck.extra).toBeUndefined();
    expect(validateDeck(yugi.deck, cards).valid).toBe(true);
    expect(validateDeck(kaiba.deck, cards).valid).toBe(true);
    expect(kaiba.warnings.join(" ")).toContain("Vorse Raider");
    expect(validateGoatTestDeckDefinitions(cards).every((warning) => !warning.includes("exceeds"))).toBe(true);
  });

  it("independently assigns one preset deck to each side and allows every pairing", () => {
    const pairings = [
      assignRandomTestDecksToDuel(cards, sequenceRng([0.1, 0.1, 0.2, 0.3])),
      assignRandomTestDecksToDuel(cards, sequenceRng([0.1, 0.9, 0.2, 0.3])),
      assignRandomTestDecksToDuel(cards, sequenceRng([0.9, 0.1, 0.2, 0.3])),
      assignRandomTestDecksToDuel(cards, sequenceRng([0.9, 0.9, 0.2, 0.3])),
    ];

    expect(pairings.map((assignment) => `${assignment.player.definition.metadata.id}:${assignment.opponent.definition.metadata.id}`)).toEqual([
      "yugi_goat_test:yugi_goat_test",
      "yugi_goat_test:kaiba_goat_test",
      "kaiba_goat_test:yugi_goat_test",
      "kaiba_goat_test:kaiba_goat_test",
    ]);
    expect(pairings.every((assignment) => GOAT_TEST_DECKS.includes(assignment.player.definition))).toBe(true);
    expect(pairings.every((assignment) => GOAT_TEST_DECKS.includes(assignment.opponent.definition))).toBe(true);
  });

  it("creates fresh deck arrays and supports deterministic injected RNG", () => {
    const first = assignRandomTestDecksToDuel(cards, sequenceRng([0.1, 0.9, 0.2, 0.3]));
    const second = assignRandomTestDecksToDuel(cards, sequenceRng([0.1, 0.9, 0.2, 0.3]));

    expect(first.decks.P1.main).toEqual(second.decks.P1.main);
    expect(first.decks.P2.main).toEqual(second.decks.P2.main);
    expect(first.decks.P1.main).not.toBe(first.decks.P2.main);

    const originalOpponentTop = first.decks.P2.main[0];
    first.decks.P1.main[0] = "mutated";

    expect(first.decks.P2.main[0]).toBe(originalOpponentTop);
  });
});

describe("duel core rules", () => {
  it("creates deterministic opening state from a seed", () => {
    const first = createDuel({ cards, seed: "fixed-seed" });
    const second = createDuel({ cards, seed: "fixed-seed" });

    expect(first.players.P1.lp).toBe(8000);
    expect(first.players.P1.hand).toHaveLength(5);
    expect(first.players.P1.deck).toHaveLength(35);
    expect(first.phase).toBe("DP");
    expect(first.players.P1.hand.map((instance) => instance.card.passcode)).toEqual(
      second.players.P1.hand.map((instance) => instance.card.passcode),
    );
  });

  it("keeps the legacy createDuel API as a facade over core reducer state", () => {
    const state = createDuel({ cards, decks: { P1: deckWith([]), P2: deckWith([]) }, firstPlayer: "P1" });
    const result = applyAction(state, { type: "draw", playerId: "P1" });

    expect(state.coreState).toBeDefined();
    expect(state.players.P1.sideDeck).toHaveLength(0);
    expect(state.players.P1.extraDeck).toHaveLength(0);
    expect(state.coreState?.players.P1.hand.map((instance) => instance.instanceId)).toEqual(
      state.players.P1.hand.map((instance) => instance.instanceId),
    );
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ id: "evt-0013", type: "card-drawn" });
    expect(result.state.coreState?.players.P1.hand).toHaveLength(6);
  });

  it("auto-advances Draw and Standby into Main Phase 1 with Goat first-turn draw behavior", () => {
    const state = createDuel({ cards, decks: { P1: deckWith([]), P2: deckWith([]) } });
    const result = advanceToNextDecision(state, "P1");

    expect(result.state.phase).toBe("M1");
    expect(result.state.players.P1.hand).toHaveLength(6);
    expect(result.state.players.P1.deck).toHaveLength(34);
    expect(result.events.map((event) => event.type)).toEqual([
      "card-drawn",
      "phase-changed",
      "phase-changed",
    ]);
  });

  it("stops auto-advance if the turn player decks out during Draw Phase", () => {
    const state = withCorePatch(
      createDuel({ cards, decks: { P1: deckWith([]), P2: deckWith([]) } }),
      (core) => ({
        ...core,
        players: { ...core.players, P1: { ...core.players.P1, mainDeck: [] } },
      }),
    );

    const result = advanceToNextDecision(state, "P1");

    expect(result.state.phase).toBe("DP");
    expect(result.state.winner).toBe("P2");
    expect(result.events.map((event) => event.type)).toEqual(["player-lost", "duel-finished"]);
  });

  it("auto-passes Standby Phase when no prompts exist", () => {
    const state = withCorePatch(
      createDuel({ cards, decks: { P1: deckWith([]), P2: deckWith([]) } }),
      (core) => ({
        ...core,
        phase: "SP",
        turnFlags: { drawnThisTurn: true, battlePhaseConducted: false },
      }),
    );

    const result = advanceToNextDecision(state, "P1");

    expect(result.state.phase).toBe("M1");
    expect(result.events.map((event) => event.type)).toEqual(["phase-changed"]);
  });

  it("advances through the turn phases and resets for the next player", () => {
    let state = createDuel({ cards, decks: { P1: deckWith([]), P2: deckWith([]) }, firstPlayer: "P1" });

    for (const expectedPhase of ["SP", "M1"] as const) {
      state = applyAction(state, { type: "advance-phase", playerId: "P1" }).state;
      expect(state.phase).toBe(expectedPhase);
    }

    // GOAT rules: turn 1 has no Battle Phase, so advancing past Main Phase 1
    // is rejected and the turn ends from Main Phase 1 instead.
    const blocked = applyAction(state, { type: "advance-phase", playerId: "P1" });
    expect(blocked.state.phase).toBe("M1");

    const nextTurn = applyAction(state, { type: "end-turn", playerId: "P1" }).state;

    expect(nextTurn.turn).toBe(2);
    expect(nextTurn.activePlayer).toBe("P2");
    expect(nextTurn.phase).toBe("DP");
    expect(nextTurn.turnFlags.drawnThisTurn).toBe(false);

    // From turn 2 onward every phase, including the Battle Phase, is reachable.
    let secondTurn = nextTurn;
    for (const expectedPhase of ["SP", "M1", "BP", "M2", "EP"] as const) {
      secondTurn = applyAction(secondTurn, { type: "advance-phase", playerId: "P2" }).state;
      expect(secondTurn.phase).toBe(expectedPhase);
    }
  });

  it("offers Main Phase play actions and basic Battle Phase attacks", () => {
    let state = createDuel({
      cards,
      decks: { P1: deckWith(["Battle Ox", "Pot of Greed"]), P2: deckWith([]) },
      firstPlayer: "P1",
    });
    state = applyAction(state, { type: "set-phase", playerId: "P1", phase: "M1" }).state;

    const mainActions = getLegalActions(state, "P1");
    expect(mainActions.some((action) => action.type === "play-card" && action.intent === "summon")).toBe(true);
    expect(mainActions.some((action) => action.type === "play-card" && action.intent === "activate")).toBe(true);

    state = withCorePatch(state, (core) => ({
      ...withCoreMonster(core, "P1", "Battle Ox", 0),
      phase: "BP",
    }));

    expect(getLegalActions(state, "P1")).toContainEqual({
      type: "attack",
      playerId: "P1",
      attackerInstanceId: state.players.P1.monsterZones[0]!.instance.instanceId,
    });
  });

  it("does not offer or allow basic Normal Summon actions for Ritual Monsters", () => {
    let state = createDuel({
      cards,
      decks: { P1: deckWith(["Paladin of White Dragon"]), P2: deckWith([]) },
      firstPlayer: "P1",
    });
    state = applyAction(state, { type: "set-phase", playerId: "P1", phase: "M1" }).state;

    const ritual = state.players.P1.hand.find((instance) => instance.card.name === "Paladin of White Dragon")!;
    const legalActions = getLegalActions(state, "P1").filter(
      (action) => action.type === "play-card" && action.instanceId === ritual.instanceId,
    );

    expect(legalActions).toEqual([]);

    const result = applyAction(state, {
      type: "play-card",
      playerId: "P1",
      instanceId: ritual.instanceId,
      intent: "summon",
      zoneKind: "monster",
      zoneIndex: 0,
    });

    expect(result.events.at(-1)?.type).toBe("illegal-action");
    expect(result.state.players.P1.hand.some((instance) => instance.instanceId === ritual.instanceId)).toBe(true);
    expect(result.state.players.P1.monsterZones[0]).toBeNull();
  });

  it("requires exact Tributes for Level 7+ Tribute Summons and prefers empty target zones", () => {
    const state = withCorePatch(
      createDuel({
        cards,
        decks: { P1: deckWith(["Buster Blader"]), P2: deckWith([]) },
        firstPlayer: "P1",
      }),
      (core) => ({
        ...withCoreMonster(withCoreMonster(core, "P1", "Battle Ox", 0), "P1", "Mystic Tomato", 1),
        phase: "M1",
      }),
    );

    const busterBlader = state.players.P1.hand.find((instance) => instance.card.name === "Buster Blader")!;
    const emptyZoneSummon = getLegalActions(state, "P1").find(
      (action) =>
        action.type === "play-card" &&
        action.instanceId === busterBlader.instanceId &&
        action.intent === "summon" &&
        action.zoneIndex === 2,
    );
    const occupiedZoneSet = getLegalActions(state, "P1").find(
      (action) =>
        action.type === "play-card" &&
        action.instanceId === busterBlader.instanceId &&
        action.intent === "set" &&
        action.zoneIndex === 0,
    );

    expect(emptyZoneSummon).toMatchObject({
      type: "play-card",
      tributeCount: 2,
      requiredTributeInstanceIds: [],
    });
    expect(occupiedZoneSet).toBeUndefined();

    const illegal = applyAction(state, {
      type: "play-card",
      playerId: "P1",
      instanceId: busterBlader.instanceId,
      intent: "summon",
      zoneKind: "monster",
      zoneIndex: 2,
    });

    expect(illegal.events.at(-1)?.type).toBe("illegal-action");
    expect(illegal.state.players.P1.hand.some((instance) => instance.instanceId === busterBlader.instanceId)).toBe(true);

    const result = applyAction(state, {
      type: "play-card",
      playerId: "P1",
      instanceId: busterBlader.instanceId,
      intent: "summon",
      zoneKind: "monster",
      zoneIndex: 2,
      tributeInstanceIds: [
        state.players.P1.monsterZones[0]!.instance.instanceId,
        state.players.P1.monsterZones[1]!.instance.instanceId,
      ],
    });

    expect(result.state.players.P1.monsterZones[0]).toBeNull();
    expect(result.state.players.P1.monsterZones[1]).toBeNull();
    expect(result.state.players.P1.monsterZones[2]?.instance.card.name).toBe("Buster Blader");
    expect(result.state.players.P1.normalSummonUsed).toBe(true);
    expect(result.state.players.P1.graveyard.map((zone) => zone.instance.card.name)).toEqual(
      expect.arrayContaining(["Battle Ox", "Mystic Tomato"]),
    );
    expect(result.events.map((event) => event.type)).toEqual([
      "card-moved",
      "card-moved",
      "summon-declared",
      "summon-successful",
    ]);
  });

  it("offers occupied target zones for Tribute Summons only when all Monster Zones are full", () => {
    const boardNames = ["Battle Ox", "Mystic Tomato", "Sangan", "Magician of Faith", "Apprentice Magician"];
    const state = withCorePatch(
      createDuel({
        cards,
        decks: { P1: deckWith(["Buster Blader"]), P2: deckWith([]) },
        firstPlayer: "P1",
      }),
      (core) => ({
        ...boardNames.reduce((next, name, zoneIndex) => withCoreMonster(next, "P1", name, zoneIndex), core),
        phase: "M1",
      }),
    );

    const busterBlader = state.players.P1.hand.find((instance) => instance.card.name === "Buster Blader")!;
    const occupiedActions = getLegalActions(state, "P1").filter(
      (action) => action.type === "play-card" && action.instanceId === busterBlader.instanceId,
    );

    expect(occupiedActions).toHaveLength(10);
    expect(occupiedActions.every((action) => action.type === "play-card" && action.tributeCount === 2)).toBe(true);
    expect(
      occupiedActions.find((action) => action.type === "play-card" && action.zoneIndex === 0),
    ).toMatchObject({
      requiredTributeInstanceIds: [state.players.P1.monsterZones[0]!.instance.instanceId],
    });

    const result = applyAction(state, {
      type: "play-card",
      playerId: "P1",
      instanceId: busterBlader.instanceId,
      intent: "summon",
      zoneKind: "monster",
      zoneIndex: 0,
      tributeInstanceIds: [
        state.players.P1.monsterZones[0]!.instance.instanceId,
        state.players.P1.monsterZones[1]!.instance.instanceId,
      ],
    });

    expect(result.state.players.P1.monsterZones[0]?.instance.card.name).toBe("Buster Blader");
    expect(result.state.players.P1.monsterZones[1]).toBeNull();
    expect(result.events.map((event) => event.type)).toEqual([
      "card-moved",
      "card-moved",
      "summon-declared",
      "summon-successful",
    ]);
  });

  it("requires one Tribute for Level 5 and 6 Tribute Sets", () => {
    const state = withCorePatch(
      createDuel({
        cards,
        decks: { P1: deckWith(["Summoned Skull"]), P2: deckWith([]) },
        firstPlayer: "P1",
      }),
      (core) => ({
        ...withCoreMonster(core, "P1", "Battle Ox", 0),
        phase: "M1",
      }),
    );

    const summonedSkull = state.players.P1.hand.find((instance) => instance.card.name === "Summoned Skull")!;
    const result = applyAction(state, {
      type: "play-card",
      playerId: "P1",
      instanceId: summonedSkull.instanceId,
      intent: "set",
      zoneKind: "monster",
      zoneIndex: 1,
      tributeInstanceIds: [state.players.P1.monsterZones[0]!.instance.instanceId],
    });

    expect(result.state.players.P1.monsterZones[0]).toBeNull();
    expect(result.state.players.P1.monsterZones[1]?.instance.card.name).toBe("Summoned Skull");
    expect(result.state.players.P1.monsterZones[1]?.faceDown).toBe(true);
    expect(result.events.map((event) => event.type)).toEqual(["card-moved", "monster-set"]);
  });

  it("redacts hidden opponent information during serialization", () => {
    const state = withCorePatch(
      createDuel({ cards, decks: { P1: deckWith([]), P2: deckWith(["Battle Ox"]) } }),
      (core) => {
        const withoutHandCard = {
          ...core,
          players: {
            ...core.players,
            P2: { ...core.players.P2, hand: core.players.P2.hand.slice(1) },
          },
        };

        return withCoreMonster(withoutHandCard, "P2", "Battle Ox", 0, {
          face: "faceDown",
          position: "defense",
        });
      },
    );

    const view = serializeDuel(state, "P1");

    expect(view.players.P1.hand[0].card).not.toBeNull();
    expect(view.players.P2.hand[0].card).toBeNull();
    expect(view.players.P2.monsterZones[0]?.card).toBeNull();
  });

  it("resolves a basic battle and the GOAT 0 ATK vs 0 ATK destruction rule", () => {
    const state = createDuel({
      cards,
      decks: {
        P1: deckWith(["Batteryman AA"]),
        P2: deckWith(["Chaos Necromancer"]),
      },
      firstPlayer: "P1",
    });
    const rigged = withCorePatch(state, (core) => {
      const withEmptyHands = {
        ...core,
        phase: "BP" as const,
        players: {
          ...core.players,
          P1: { ...core.players.P1, hand: [] },
          P2: { ...core.players.P2, hand: [] },
        },
      };

      return withCoreMonster(
        withCoreMonster(withEmptyHands, "P1", "Batteryman AA", 0),
        "P2",
        "Chaos Necromancer",
        0,
      );
    });

    const result = applyAction(rigged, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: rigged.players.P1.monsterZones[0]!.instance.instanceId,
      defenderInstanceId: rigged.players.P2.monsterZones[0]!.instance.instanceId,
    });

    expect(result.state.players.P1.monsterZones[0]).toBeNull();
    expect(result.state.players.P2.monsterZones[0]).toBeNull();
    expect(result.state.players.P1.graveyard[0].instance.card.name).toBe("Batteryman AA");
    expect(result.state.players.P2.graveyard[0].instance.card.name).toBe("Chaos Necromancer");
  });
});

describe("PassiveBoardFillerOpponent", () => {
  it("places up to 3 opponent monsters from hand and deck, then ends the opponent turn", () => {
    const state = createDuel({
      cards,
      decks: {
        P1: deckWith([]),
        P2: deckWith(["Battle Ox", "Mystic Tomato", "Sangan"]),
      },
      firstPlayer: "P2",
      mode: "match",
    });

    const result = runPassiveBoardFillerOpponentTurn(state);
    const opponent = result.state.players.P2;

    expect(opponent.monsterZones.filter(Boolean)).toHaveLength(3);
    expect(opponent.monsterZones.map((zone) => zone?.instance.card.name).filter(Boolean)).toEqual([
      "Battle Ox",
      "Mystic Tomato",
      "Sangan",
    ]);
    expect(result.state.activePlayer).toBe("P1");
    expect(result.state.phase).toBe("DP");
    expect(result.events.map((event) => event.type)).toContain("debug-opponent-monster-placed");
  });

  it("does not exceed the monster zone limit when only one zone is open", () => {
    const boardNames = ["Sangan", "Magician of Faith", "Apprentice Magician", "Old Vindictive Magician"];
    const state = withCorePatch(
      createDuel({
        cards,
        decks: {
          P1: deckWith([]),
          P2: deckWith(["Battle Ox", "Mystic Tomato"]),
        },
        firstPlayer: "P2",
        mode: "match",
      }),
      (core) => boardNames.reduce((next, name, zoneIndex) => withCoreMonster(next, "P2", name, zoneIndex), core),
    );

    const result = runPassiveBoardFillerOpponentTurn(state, { targetMonsterCount: 5 });

    expect(result.state.players.P2.monsterZones.filter(Boolean)).toHaveLength(5);
    expect(result.events.filter((event) => event.type === "debug-opponent-monster-placed")).toHaveLength(1);
  });

  it("does not attack even when attacks would be legal", () => {
    const state = createDuel({
      cards,
      decks: {
        P1: deckWith([]),
        P2: deckWith([]),
      },
      firstPlayer: "P2",
      mode: "match",
    });
    const rigged = withCorePatch(state, (core) => ({
      ...withCoreMonster(withCoreMonster(core, "P1", "Sangan", 0), "P2", "Battle Ox", 0),
      phase: "M1",
    }));

    const result = runPassiveBoardFillerOpponentTurn(rigged);

    expect(result.state.players.P1.lp).toBe(8000);
    expect(result.events.some((event) => event.type === "battle-resolved")).toBe(false);
    expect(result.state.activePlayer).toBe("P1");
  });

  it("does not set trap cards from the opponent hand", () => {
    const state = createDuel({
      cards,
      decks: {
        P1: deckWith([]),
        P2: deckWith(["Trap Hole", "Mirror Force", "Battle Ox"]),
      },
      firstPlayer: "P2",
      mode: "match",
    });

    const result = runPassiveBoardFillerOpponentTurn(state);

    expect(result.state.players.P2.spellTrapZones).toEqual([null, null, null, null, null]);
    expect(result.state.players.P2.hand.map((instance) => instance.card.name)).toEqual(
      expect.arrayContaining(["Trap Hole", "Mirror Force"]),
    );
  });

  it("does not activate set or available trap cards", () => {
    const state = createDuel({
      cards,
      decks: {
        P1: deckWith([]),
        P2: deckWith(["Trap Hole", "Battle Ox"]),
      },
      firstPlayer: "P2",
      mode: "match",
    });
    const trap = state.players.P2.hand.find((instance) => instance.card.name === "Trap Hole")!;
    const rigged = withCorePatch(state, (core) => {
      const withoutHandTrap = {
        ...core,
        players: {
          ...core.players,
          P2: {
            ...core.players.P2,
            hand: core.players.P2.hand.filter((instance) => instance.instanceId !== trap.instanceId),
          },
        },
      };

      return putSpellTrapOnField(withoutHandTrap, "P2", cardByName("Trap Hole"), 0, {}).state;
    });

    const result = runPassiveBoardFillerOpponentTurn(rigged);

    expect(result.state.players.P2.spellTrapZones[0]?.instance.card.name).toBe("Trap Hole");
    expect(result.events.some((event) => event.type === "effect-activated")).toBe(false);
  });

  it("handles no available monsters without crashing", () => {
    const state = createDuel({
      cards,
      decks: {
        P1: deckWith([]),
        P2: deckWithNoMonsters(),
      },
      firstPlayer: "P2",
      mode: "match",
    });

    const result = runPassiveBoardFillerOpponentTurn(state);

    expect(result.state.players.P2.monsterZones.filter(Boolean)).toHaveLength(0);
    expect(result.state.activePlayer).toBe("P1");
    expect(result.events.map((event) => event.type)).toContain("passive-board-filler-empty");
  });

  it("does not affect normal no-op opponent behavior", () => {
    const game = createInitialGameState(cards, {
      decks: {
        P1: deckWith([]),
        P2: deckWith(["Battle Ox", "Mystic Tomato", "Sangan"]),
      },
      allowUnsupportedCards: true,
      opponentBehavior: "none",
      seed: "normal-opponent",
      suppressWarnings: true,
    });

    const nextTurn = continueTurnFlow(game);

    expect(nextTurn.engine?.activePlayer).toBe("P1");
    expect(nextTurn.engine?.players.P2.monsterZones.filter(Boolean)).toHaveLength(0);
  });

  it("removes placed monsters from their previous zones and keeps state references distinct", () => {
    const state = createDuel({
      cards,
      decks: {
        P1: deckWith([]),
        P2: deckWith(["Battle Ox", "Mystic Tomato", "Sangan"]),
      },
      firstPlayer: "P2",
      mode: "match",
    });
    const startingHand = state.players.P2.hand.map((instance) => instance.instanceId);

    const result = runPassiveBoardFillerOpponentTurn(state);
    const placedIds = result.state.players.P2.monsterZones
      .map((zone) => zone?.instance.instanceId)
      .filter((id): id is string => Boolean(id));
    const remainingIds = [
      ...result.state.players.P2.hand.map((instance) => instance.instanceId),
      ...result.state.players.P2.deck.map((instance) => instance.instanceId),
    ];

    expect(placedIds.every((id) => startingHand.includes(id))).toBe(true);
    expect(placedIds.some((id) => remainingIds.includes(id))).toBe(false);
    expect(result.state.players.P2.hand).not.toBe(state.players.P2.hand);
    expect(result.state.players.P2.deck).not.toBe(state.players.P2.deck);
  });

  it("runs through the frontend test-duel flow when configured", () => {
    const game = createInitialGameState(cards, {
      decks: {
        P1: deckWith([]),
        P2: deckWith(["Battle Ox", "Mystic Tomato", "Sangan"]),
      },
      allowUnsupportedCards: true,
      opponentBehavior: "passive-board-filler",
      seed: "passive-flow",
      suppressWarnings: true,
    });

    const nextTurn = continueTurnFlow(game);

    expect(nextTurn.engine?.activePlayer).toBe("P1");
    expect(nextTurn.phase).toBe("M1");
    expect(nextTurn.turn).toBe(3);
    expect(nextTurn.engine?.players.P2.monsterZones.filter(Boolean)).toHaveLength(3);
    expect(nextTurn.engine?.players.P2.spellTrapZones.filter(Boolean)).toHaveLength(0);
    expect(nextTurn.opponent.monsterZones.some(isVisibleZoneCard)).toBe(true);
  });
});

describe("frontend adapter", () => {
  it("projects engine state into the existing duel screen shape", () => {
    const game = createInitialGameState(cards, {
      rng: sequenceRng([0.1, 0.1, 0.2, 0.3]),
      seed: "adapter",
      suppressWarnings: true,
    });
    const adjusted = setLifePoints(game, "opponent", 7200);

    expect(game.engine).toBeDefined();
    expect(game.phase).toBe("M1");
    expect(game.player.hand).toHaveLength(6);
    expect(adjusted.opponent.lp).toBe(7200);
  });

  it("starts default games with independently assigned GOAT test deck presets", () => {
    const game = createInitialGameState(cards, {
      rng: sequenceRng([0.1, 0.9, 0.2, 0.3]),
      seed: "default-presets",
      suppressWarnings: true,
    });
    const expected = assignRandomTestDecksToDuel(cards, sequenceRng([0.1, 0.9, 0.2, 0.3]));
    const playerMain = [
      ...game.engine!.players.P1.hand,
      ...game.engine!.players.P1.deck,
    ].map((instance) => instance.card.passcode);
    const opponentMain = [
      ...game.engine!.players.P2.hand,
      ...game.engine!.players.P2.deck,
    ].map((instance) => instance.card.passcode);

    expect(expected.player.definition.metadata.id).toBe("yugi_goat_test");
    expect(expected.opponent.definition.metadata.id).toBe("kaiba_goat_test");
    expect(playerMain).toHaveLength(40);
    expect(opponentMain).toHaveLength(40);
    expect(sorted(playerMain)).toEqual(sorted(expected.decks.P1.main));
    expect(sorted(opponentMain)).toEqual(sorted(expected.decks.P2.main));
  });

  it("only exposes legal board placement actions and marks unplayable hand cards", () => {
    const game = createInitialGameState(cards, {
      decks: {
        P1: deckWith(["Battle Ox", "Battle Ox", "Pot of Greed"]),
        P2: deckWith([]),
      },
      allowUnsupportedCards: true,
      seed: "legal-placements",
      suppressWarnings: true,
    });
    const firstMonster = game.player.hand.find((card) => card.card.name === "Battle Ox")!;
    const spell = game.player.hand.find((card) => card.card.name === "Pot of Greed")!;

    expect(getLegalPlacementsForCard(game, firstMonster.instanceId).map((action) => action.intent)).toEqual(
      expect.arrayContaining(["summon", "set"]),
    );
    expect(getLegalPlacementsForCard(game, spell.instanceId).map((action) => action.intent)).toEqual(
      expect.arrayContaining(["activate", "set"]),
    );

    const afterSummon = placeSelectedCard(
      { ...game, selectedCardId: firstMonster.instanceId },
      "summon",
      "monster",
      0,
    );
    const secondMonster = afterSummon.player.hand.find((card) => card.card.name === "Battle Ox")!;
    const remainingSpell = afterSummon.player.hand.find((card) => card.card.name === "Pot of Greed")!;

    expect(getLegalPlacementsForCard(afterSummon, secondMonster.instanceId)).toEqual([]);
    expect(getUnavailableHandCardIds(afterSummon)).toContain(secondMonster.instanceId);
    expect(getUnavailableHandCardIds(afterSummon)).not.toContain(remainingSpell.instanceId);
    expect(getLegalPlacementsForCard(afterSummon, remainingSpell.instanceId).map((action) => action.intent)).toEqual(
      expect.arrayContaining(["activate", "set"]),
    );
  });

  it("exposes Tribute Summon placement metadata through the frontend adapter", () => {
    const game = createInitialGameState(cards, {
      decks: {
        P1: deckWith(["Buster Blader"]),
        P2: deckWith([]),
      },
      allowUnsupportedCards: true,
      seed: "tribute-adapter",
      suppressWarnings: true,
    });
    const riggedEngine = withCorePatch(game.engine!, (core) => ({
      ...withCoreMonster(withCoreMonster(core, "P1", "Battle Ox", 0), "P1", "Mystic Tomato", 1),
      phase: "M1",
    }));
    const gameWithTributes = projectEngineToGameState(riggedEngine, {
      selectedCardId: game.player.hand.find((card) => card.card.name === "Buster Blader")!.instanceId,
      lastDrawnCardId: null,
      lastPlacedCardId: null,
    });
    const tributeAId = riggedEngine.players.P1.monsterZones[0]!.instance.instanceId;
    const tributeBId = riggedEngine.players.P1.monsterZones[1]!.instance.instanceId;
    const busterBlader = gameWithTributes.player.hand.find((card) => card.card.name === "Buster Blader")!;
    const placement = getLegalPlacementsForCard(gameWithTributes, busterBlader.instanceId).find(
      (action) => action.intent === "summon" && action.zoneKind === "monster" && action.zoneIndex === 2,
    );

    expect(placement).toMatchObject({ tributeCount: 2 });

    const afterSummon = placeSelectedCard(gameWithTributes, "summon", "monster", 2, [
      tributeAId,
      tributeBId,
    ]);

    expect(afterSummon.player.monsterZones[2]?.instance.card.name).toBe("Buster Blader");
    expect(afterSummon.player.graveyard.map((zone) => zone.instance.card.name)).toEqual(
      expect.arrayContaining(["Battle Ox", "Mystic Tomato"]),
    );
  });

  it("uses action phases only and ends an empty Main Phase 1 turn automatically", () => {
    const game = createInitialGameState(cards, {
      rng: sequenceRng([0.1, 0.1, 0.2, 0.3]),
      seed: "empty-turn",
      suppressWarnings: true,
    });

    expect(ACTION_PHASES).toEqual(["M1", "BP", "M2", "EP"]);
    expect(canEnterBattle(game)).toBe(false);
    expect(getTurnFlowActionLabel(game)).toBe("End Turn");

    const nextTurn = continueTurnFlow(game);

    expect(nextTurn.turn).toBe(2);
    expect(nextTurn.phase).toBe("M1");
    expect(nextTurn.player.hand).toHaveLength(7);
    expect(nextTurn.actionLog.map((entry) => entry.message).join(" ")).toContain("Entered Main Phase 1");
  });

  it("enters Battle Phase when an attack is available and then ends Battle into Main Phase 2", () => {
    const game = createInitialGameState(cards, {
      rng: sequenceRng([0.1, 0.1, 0.2, 0.3]),
      seed: "battle-flow",
      suppressWarnings: true,
    });
    const riggedEngine = withCorePatch(game.engine!, (core) => withCoreMonster(core, "P1", "Battle Ox", 0));
    const gameWithAttacker = projectEngineToGameState(riggedEngine, {
      selectedCardId: null,
      lastDrawnCardId: null,
      lastPlacedCardId: null,
    });

    // GOAT rules: turn 1 has no Battle Phase even with an attacker available.
    expect(canEnterBattle(gameWithAttacker)).toBe(false);
    expect(getTurnFlowActionLabel(gameWithAttacker)).toBe("End Turn");

    const secondTurn = continueTurnFlow(gameWithAttacker);
    expect(secondTurn.engine!.turn).toBe(2);
    expect(canEnterBattle(secondTurn)).toBe(true);
    expect(getTurnFlowActionLabel(secondTurn)).toBe("Battle Phase");

    const battle = continueTurnFlow(secondTurn);
    expect(battle.phase).toBe("BP");
    expect(getTurnFlowActionLabel(battle)).toBe("Main Phase 2");

    const main2 = continueTurnFlow(battle);
    expect(main2.phase).toBe("M2");
    expect(getTurnFlowActionLabel(main2)).toBe("End Turn");
  });
});

function deckWith(priorityNames: string[]): DeckList {
  const priorityPasscodes = priorityNames.map((name) => cardByName(name).passcode);
  const excluded = new Set(priorityPasscodes);
  const filler = cards
    .filter(
      (card) =>
        card.legality.goat_world_pool &&
        card.legality.max_copies > 0 &&
        card.legality.goat_world_pool === true &&
        !excluded.has(card.passcode),
    )
    .slice(0, 40 - priorityPasscodes.length)
    .map((card) => card.passcode);

  return {
    main: [...priorityPasscodes, ...filler],
  };
}

function deckWithNoMonsters(): DeckList {
  const nonMonsterCopies = cards.flatMap((card) => {
    if (
      card.category === "Monster" ||
      card.legality.goat_world_pool !== true ||
      card.legality.max_copies <= 0
    ) {
      return [];
    }

    return Array.from({ length: card.legality.max_copies }, () => card.passcode);
  });

  if (nonMonsterCopies.length < 40) {
    throw new Error("Not enough legal non-monster cards for fixture deck.");
  }

  return {
    main: nonMonsterCopies.slice(0, 40),
  };
}

function cardByName(name: string): CardRecord {
  const card = cards.find((candidate) => candidate.name === name);

  if (!card) {
    throw new Error(`Missing fixture card: ${name}`);
  }

  return card;
}


function isVisibleZoneCard(zone: ZoneCard | boolean | null): zone is ZoneCard {
  return typeof zone === "object" && zone !== null && !zone.faceDown;
}

function totalSpecCards(specs: Array<{ count: number }>): number {
  return specs.reduce((total, spec) => total + spec.count, 0);
}

function sequenceRng(values: number[]) {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}
