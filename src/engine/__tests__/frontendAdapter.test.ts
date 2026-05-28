import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import {
  answerActivePrompt,
  attackWithSelectedCard,
  continueTurnFlow,
  createInitialGameState,
  FrontendDeckSelectionError,
  getChainView,
  getLegalAttackTargetsForCard,
  getOverrideCardEntries,
  getPriorityView,
  getPromptView,
  passPriorityForPlayer,
  placeSelectedCard,
  overrideCardLocation,
  resolveCurrentChain,
  validateFrontendDeckSelection,
} from "../../gameLogic";
import type { CardRecord } from "../../types";
import {
  advanceToNextDecision,
  clonePlayableDeck,
  createDuel,
  findCardInstanceInPlayerView,
  findCardLocationInPlayerView,
  getLegalActions,
  KAIBA_PLAYABLE_DECK_FIXTURE,
  projectEngineToGameState,
  selectActionLog,
  selectLegalAttackTargets,
  selectLegalPlacementActions,
  selectOpponentView,
  selectPlayerView,
  selectUnavailableHandCardIds,
  YUGI_PLAYABLE_DECK_FIXTURE,
} from "../index";
import type { DuelAction, DuelCardInstance, DuelState, DuelZoneCard } from "../types";

const cards = cardsJson as CardRecord[];

describe("frontend adapter selectors", () => {
  it("projects engine state into the current frontend board and pile shape", () => {
    const engine = createPlayableDuel();
    const [monster, spell, graveyardCard, banishedCard, handCard] = engine.players.P1.hand;

    engine.players.P1.hand = [handCard];
    engine.players.P1.monsterZones[0] = zoneFromCard(monster, {
      faceDown: false,
      status: "summoned",
    });
    engine.players.P1.spellTrapZones[1] = zoneFromCard(spell, {
      faceDown: false,
      status: "activated",
    });
    engine.players.P1.graveyard = [zoneFromCard(graveyardCard, { faceDown: false, status: "activated" })];
    engine.players.P1.banished = [zoneFromCard(banishedCard, { faceDown: false, status: "activated" })];

    const projected = projectEngineToGameState(engine, {
      selectedCardId: handCard.instanceId,
      lastDrawnCardId: graveyardCard.instanceId,
      lastPlacedCardId: spell.instanceId,
      opponentBehavior: "passive-board-filler",
      opponentTargetMonsterCount: 2,
    });

    expect(projected.engine).toBe(engine);
    expect(projected.phase).toBe(engine.phase);
    expect(projected.turn).toBe(engine.turn);
    expect(projected.selectedCardId).toBe(handCard.instanceId);
    expect(projected.lastDrawnCardId).toBe(graveyardCard.instanceId);
    expect(projected.lastPlacedCardId).toBe(spell.instanceId);
    expect(projected.opponentBehavior).toBe("passive-board-filler");
    expect(projected.opponentTargetMonsterCount).toBe(2);
    expect(projected.player.hand).toEqual([{ instanceId: handCard.instanceId, card: handCard.card }]);
    expect(projected.player.deck).toHaveLength(engine.players.P1.deck.length);
    expect(projected.player.monsterZones[0]).toMatchObject({
      instance: { instanceId: monster.instanceId, card: monster.card },
      faceDown: false,
      stance: "attack",
    });
    expect(projected.player.spellTrapZones[1]).toMatchObject({
      instance: { instanceId: spell.instanceId, card: spell.card },
      faceDown: false,
      stance: "activated",
    });
    expect(projected.player.graveyard).toEqual([
      {
        instance: { instanceId: graveyardCard.instanceId, card: graveyardCard.card },
        faceDown: false,
        stance: "activated",
      },
    ]);
    expect(projected.player.banished).toEqual([
      {
        instance: { instanceId: banishedCard.instanceId, card: banishedCard.card },
        faceDown: false,
        stance: "activated",
      },
    ]);
  });

  it("preserves hidden opponent hand, deck, and face-down field information", () => {
    const engine = createPlayableDuel();
    const hiddenSetCard = engine.players.P2.hand[0];

    engine.players.P2.hand = engine.players.P2.hand.slice(1);
    engine.players.P2.spellTrapZones[0] = zoneFromCard(hiddenSetCard, {
      faceDown: true,
      status: "set",
    });

    const opponent = selectOpponentView(engine, "P1");
    const projected = projectEngineToGameState(engine, {
      selectedCardId: null,
      lastDrawnCardId: null,
      lastPlacedCardId: null,
    });

    expect(opponent.spellTrapZones[0]).toBe(true);
    expect(opponent.deckCount).toBe(engine.players.P2.deck.length);
    expect(opponent.graveyardCount).toBe(engine.players.P2.graveyard.length);
    expect(opponent.banishedCount).toBe(engine.players.P2.banished.length);
    expect(projected.opponent).not.toHaveProperty("hand");
    expect(projected.opponent).not.toHaveProperty("deck");
  });

  it("maps legal engine play-card commands to UI placement actions", () => {
    const readyEngine = advanceToNextDecision(createPlayableDuel(), "P1").state;
    const expectedPlacements = getLegalActions(readyEngine, "P1").filter(isPlayCardAction);
    const placementActions = selectLegalPlacementActions(readyEngine, "P1");
    const firstPlacement = placementActions[0];

    expect(readyEngine.phase).toBe("M1");
    expect(placementActions).toEqual(expectedPlacements);
    expect(placementActions.length).toBeGreaterThan(0);
    expect(selectLegalPlacementActions(readyEngine, "P1", firstPlacement.instanceId)).toEqual(
      expectedPlacements.filter((action) => action.instanceId === firstPlacement.instanceId),
    );
  });

  it("maps legal engine attack commands to direct and monster-zone UI targets", () => {
    const engine = createPlayableDuel();
    const attacker = engine.players.P1.hand[0];
    const defender = engine.players.P2.hand[0];

    engine.phase = "BP";
    engine.activePlayer = "P1";
    engine.players.P1.hand = engine.players.P1.hand.slice(1);
    engine.players.P1.monsterZones[0] = zoneFromCard(attacker, {
      faceDown: false,
      status: "summoned",
    });

    expect(selectLegalAttackTargets(engine, "P1", attacker.instanceId)).toEqual([
      {
        attackerInstanceId: attacker.instanceId,
        target: { kind: "direct" },
        command: {
          type: "attack",
          playerId: "P1",
          attackerInstanceId: attacker.instanceId,
        },
      },
    ]);

    engine.players.P2.hand = engine.players.P2.hand.slice(1);
    engine.players.P2.monsterZones[3] = zoneFromCard(defender, {
      faceDown: true,
      status: "set",
    });

    expect(selectLegalAttackTargets(engine, "P1", attacker.instanceId)).toEqual([
      {
        attackerInstanceId: attacker.instanceId,
        target: { kind: "monster", zoneIndex: 3 },
        command: {
          type: "attack",
          playerId: "P1",
          attackerInstanceId: attacker.instanceId,
          defenderInstanceId: defender.instanceId,
        },
      },
    ]);
  });

  it("routes frontend phase, summon, attack, and debug move actions through engine state", () => {
    const game = createInitialGameState(cards, {
      decks: {
        P1: clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck),
        P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
      },
      seed: "frontend-action-routing",
      opponentBehavior: "none",
      suppressWarnings: true,
    });
    const summon = selectLegalPlacementActions(game.engine!, "P1").find(
      (action) =>
        action.intent === "summon" &&
        action.zoneKind === "monster" &&
        (action.tributeCount ?? 0) === 0,
    );

    expect(summon).toBeDefined();

    const afterSummon = placeSelectedCard(
      { ...game, selectedCardId: summon!.instanceId },
      summon!.intent,
      summon!.zoneKind,
      summon!.zoneIndex,
    );

    expect(afterSummon.engine!.players.P1.monsterZones[summon!.zoneIndex]?.instance.instanceId).toBe(
      summon!.instanceId,
    );
    expect(afterSummon.player.monsterZones[summon!.zoneIndex]?.instance.instanceId).toBe(summon!.instanceId);

    const battleState = continueTurnFlow(afterSummon);
    const attackTargets = getLegalAttackTargetsForCard(battleState, summon!.instanceId);

    expect(battleState.phase).toBe("BP");
    expect(attackTargets).toHaveLength(1);
    expect(attackTargets[0].target).toEqual({ kind: "direct" });

    const afterAttack = attackWithSelectedCard(battleState, attackTargets[0]);

    expect(afterAttack.engine!.players.P2.lp).toBeLessThan(8000);
    expect(afterAttack.actionLog.some((entry) => entry.message.includes("attacked directly"))).toBe(true);

    const afterDebugMove = overrideCardLocation(afterAttack, summon!.instanceId, { zone: "graveyard" });

    expect(afterDebugMove.engine!.players.P1.monsterZones[summon!.zoneIndex]).toBeNull();
    expect(afterDebugMove.engine!.players.P1.graveyard[0].instance.instanceId).toBe(summon!.instanceId);
    expect(afterDebugMove.actionLog[0].message).toContain("Override:");
    expect(afterDebugMove.actionLog[0].message).toContain("to Graveyard");
  });

  it("lists only the viewer's own 40 cards without exposing deck order labels", () => {
    const game = createPlayableGame("override-list-security");
    const entries = getOverrideCardEntries(game);

    expect(entries).toHaveLength(40);
    expect(entries.every((entry) => entry.instanceId.startsWith("P1-"))).toBe(true);
    expect(entries.some((entry) => entry.locationLabel === "Deck")).toBe(true);
    expect(entries.every((entry) => !/^Deck \d/i.test(entry.locationLabel))).toBe(true);
    expect(entries.map((entry) => entry.card.name)).toEqual(
      [...entries].map((entry) => entry.card.name).sort((first, second) => first.localeCompare(second)),
    );

    const p2Game = createInitialGameState(cards, {
      decks: {
        P1: clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck),
        P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
      },
      seed: "override-list-p2",
      viewerId: "P2",
      opponentBehavior: "none",
      suppressWarnings: true,
    });
    const p2Entries = getOverrideCardEntries(p2Game);

    expect(p2Entries).toHaveLength(40);
    expect(p2Entries.every((entry) => entry.instanceId.startsWith("P2-"))).toBe(true);
  });

  it("overrides own cards into public repair destinations and keeps a 40-card own list", () => {
    let game = createPlayableGame("override-destinations");
    const deckMonster = getOverrideCardEntries(game).find(
      (entry) => entry.location.area === "deck" && entry.card.category === "Monster",
    );
    const deckSpellTrap = getOverrideCardEntries(game).find(
      (entry) => entry.location.area === "deck" && entry.card.category !== "Monster",
    );

    expect(deckMonster).toBeDefined();
    expect(deckSpellTrap).toBeDefined();

    game = overrideCardLocation(game, deckMonster!.instanceId, { zone: "hand" });
    expect(game.engine!.players.P1.hand.some((card) => card.instanceId === deckMonster!.instanceId)).toBe(true);
    expect(game.actionLog[0].message).toContain("from Deck to Hand");

    game = overrideCardLocation(game, deckSpellTrap!.instanceId, { zone: "banished" });
    expect(game.engine!.players.P1.banished[0].instance.instanceId).toBe(deckSpellTrap!.instanceId);
    expect(game.actionLog[0].message).toContain("to Banished");

    game = overrideCardLocation(game, deckMonster!.instanceId, {
      zone: "monsterZone",
      index: 0,
      face: "faceDown",
      position: "defense",
    });
    expect(game.engine!.players.P1.monsterZones[0]).toMatchObject({
      faceDown: true,
      position: "defense",
      instance: { instanceId: deckMonster!.instanceId },
    });
    expect(game.actionLog[0].message).toContain("Monster Zone 1 face-down Defense");

    game = overrideCardLocation(game, deckSpellTrap!.instanceId, {
      zone: "spellTrapZone",
      index: 0,
      face: "faceUp",
    });
    expect(game.engine!.players.P1.spellTrapZones[0]).toMatchObject({
      faceDown: false,
      status: "activated",
      instance: { instanceId: deckSpellTrap!.instanceId },
    });
    expect(game.actionLog[0].message).toContain("Spell/Trap Zone 1 face-up Activated");

    game = overrideCardLocation(game, deckSpellTrap!.instanceId, { zone: "graveyard" });
    expect(game.engine!.players.P1.graveyard[0].instance.instanceId).toBe(deckSpellTrap!.instanceId);
    expect(getOverrideCardEntries(game)).toHaveLength(40);
  });

  it("rejects opponent-owned cards, occupied board slots, and wrong board zone types", () => {
    const game = createPlayableGame("override-rejections");
    const ownMonster = getOverrideCardEntries(game).find((entry) => entry.card.category === "Monster")!;
    const opponentCard = game.engine!.players.P2.deck[0];
    const occupied = overrideCardLocation(game, ownMonster.instanceId, {
      zone: "monsterZone",
      index: 0,
      face: "faceUp",
      position: "attack",
    });

    const opponentAttempt = overrideCardLocation(game, opponentCard.instanceId, { zone: "hand" });
    expect(opponentAttempt.actionLog[0].message).toContain("owned by that player");

    const secondMonster = getOverrideCardEntries(occupied).find(
      (entry) => entry.card.category === "Monster" && entry.instanceId !== ownMonster.instanceId,
    )!;
    const occupiedAttempt = overrideCardLocation(occupied, secondMonster.instanceId, {
      zone: "monsterZone",
      index: 0,
      face: "faceUp",
      position: "attack",
    });
    expect(occupiedAttempt.actionLog[0].message).toContain("occupied");
    expect(occupiedAttempt.engine!.players.P1.monsterZones[0]?.instance.instanceId).toBe(ownMonster.instanceId);

    const wrongZoneAttempt = overrideCardLocation(game, ownMonster.instanceId, {
      zone: "spellTrapZone",
      index: 0,
      face: "faceDown",
    });
    expect(wrongZoneAttempt.actionLog[0].message).toContain("Only Spell or Trap Cards");
  });

  it("validates default and provided frontend deck selections before starting a duel", () => {
    const validDecks = {
      P1: clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck),
      P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
    };
    const gracefulCharity = cardByName("Graceful Charity").passcode;
    const thousandEyes = cardByName("Thousand-Eyes Restrict").passcode;
    const invalidDecks = {
      P1: {
        main: [gracefulCharity, ...validDecks.P1.main.slice(1)],
        side: [validDecks.P1.main[0]],
        extra: [thousandEyes],
      },
      P2: validDecks.P2,
    };

    expect(validateFrontendDeckSelection(cards, validDecks)).toEqual({ valid: true, errors: [] });
    expect(createInitialGameState(cards, {
      decks: validDecks,
      seed: "frontend-valid-decks",
      suppressWarnings: true,
    }).engine).toBeDefined();

    const validation = validateFrontendDeckSelection(cards, invalidDecks);

    expect(validation.valid).toBe(false);
    expect(validation.errors.join(" ")).toContain("Player 1: Side Deck is not supported");
    expect(validation.errors.join(" ")).toContain("Player 1: Extra Deck is not supported");
    expect(validation.errors.join(" ")).toContain("Graceful Charity is not supported in playable decks");
    expect(() =>
      createInitialGameState(cards, {
        decks: invalidDecks,
        seed: "frontend-invalid-decks",
        suppressWarnings: true,
      }),
    ).toThrow(FrontendDeckSelectionError);
  });

  it("blocks incomplete or non-40-card frontend deck selections", () => {
    const validDeck = clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck);
    const shortDecks = {
      P1: { main: validDeck.main.slice(0, 39) },
      P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
    };

    expect(validateFrontendDeckSelection(cards, { P1: validDeck }).errors).toContain(
      "Player 2 deck is missing.",
    );
    expect(validateFrontendDeckSelection(cards, shortDecks).errors).toContain(
      "Player 1: Main Deck must contain exactly 40 cards.",
    );
    expect(() =>
      createInitialGameState(cards, {
        decks: shortDecks,
        seed: "frontend-short-deck",
        suppressWarnings: true,
      }),
    ).toThrow("Cannot start duel with invalid deck selection");
  });

  it("exposes and answers active prompt choices through the frontend adapter", () => {
    const game = createPlayableGame("frontend-prompt-choice");

    game.engine!.pendingPrompts = [
      {
        id: "prompt-choice-1",
        playerId: "P1",
        kind: "yes-no",
        message: "Use optional effect?",
        min: 1,
        max: 1,
      },
    ];

    const prompt = getPromptView(game);

    expect(prompt.activePrompt).toMatchObject({
      id: "prompt-choice-1",
      kind: "yes-no",
      message: "Use optional effect?",
    });

    const answered = answerActivePrompt(game, {
      promptId: "prompt-choice-1",
      choiceIds: ["no"],
    });

    expect(answered.engine!.pendingPrompts).toEqual([]);
    expect(answered.actionLog[0].message).toContain("resolved prompt prompt-choice-1");
  });

  it("exposes target, discard, and tribute prompt card candidates", () => {
    const game = createPlayableGame("frontend-prompt-candidates");
    const monster = game.engine!.players.P1.hand[0];

    game.engine!.players.P1.hand = game.engine!.players.P1.hand.slice(1);
    game.engine!.players.P1.monsterZones[0] = zoneFromCard(monster, {
      faceDown: false,
      status: "summoned",
    });
    game.engine!.pendingPrompts = [
      {
        id: "prompt-target-1",
        playerId: "P1",
        kind: "target",
        message: "Choose a target.",
        min: 1,
        max: 1,
      },
    ];

    const prompt = getPromptView(game);
    const monsterCandidate = prompt.candidates.find((candidate) => candidate.instanceId === monster.instanceId);

    expect(monsterCandidate).toMatchObject({
      id: "P1:monsterZone:0",
      zoneRef: { playerId: "P1", zone: "monsterZone", index: 0 },
    });

    const answered = answerActivePrompt(game, {
      promptId: "prompt-target-1",
      candidateIds: [monsterCandidate!.id],
    });

    expect(answered.engine!.pendingPrompts).toEqual([]);
  });

  it("passes priority and reports malformed injected chain links through engine commands", () => {
    const game = createPlayableGame("frontend-priority-chain");
    const source = game.engine!.players.P1.hand[0];

    expect(getPriorityView(game)).toEqual({ currentPlayerId: "P1", canPass: true });

    const afterPass = passPriorityForPlayer(game);

    expect(afterPass.engine!.priorityPlayer).toBe("P2");
    expect(getPriorityView(afterPass)).toEqual({ currentPlayerId: "P2", canPass: false });

    const chainGame = createPlayableGame("frontend-chain");
    const chainSource = chainGame.engine!.players.P1.hand[0];
    const coreLink = {
      id: "chain-1",
      playerId: "P1" as const,
      sourceInstanceId: chainSource.instanceId,
      cardId: chainSource.card.passcode,
      effectId: "fixture-effect",
      spellSpeed: 1 as const,
    };

    chainGame.engine!.coreState = {
      ...chainGame.engine!.coreState!,
      chain: [coreLink],
    };
    chainGame.engine!.chain = [
      {
        ...coreLink,
        targetInstanceIds: [],
      },
    ];

    expect(getChainView(chainGame)).toMatchObject({
      links: [
        {
          id: "chain-1",
          playerId: "P1",
          sourceInstanceId: chainSource.instanceId,
          cardId: chainSource.card.passcode,
          effectId: "fixture-effect",
          spellSpeed: 1,
        },
      ],
      canResolve: true,
    });

    const resolved = resolveCurrentChain(chainGame);

    expect(resolved.engine!.chain).toEqual(chainGame.engine!.chain);
    expect(resolved.actionLog[0].message).toContain("EFFECT_NOT_IMPLEMENTED");
  });

  it("maps recent engine events to action log messages", () => {
    const readyEngine = advanceToNextDecision(createPlayableDuel(), "P1").state;
    const log = selectActionLog(readyEngine, "P1", 3);
    const recentEvents = readyEngine.events.slice(-3).reverse();

    expect(log).toEqual(
      recentEvents.map((event) => ({
        id: event.id,
        message: event.message,
      })),
    );
    expect(projectEngineToGameState(readyEngine, {
      selectedCardId: null,
      lastDrawnCardId: null,
      lastPlacedCardId: null,
    }).actionLog).toEqual(selectActionLog(readyEngine, "P1"));
  });

  it("finds card locations and unavailable hand cards from the projected player view", () => {
    const readyEngine = advanceToNextDecision(createPlayableDuel(), "P1").state;
    const player = selectPlayerView(readyEngine, "P1");
    const handCard = player.hand[0];
    const playableIds = new Set(
      selectLegalPlacementActions(readyEngine, "P1").map((action) => action.instanceId),
    );
    const unavailableIds = selectUnavailableHandCardIds(readyEngine, "P1");

    expect(player.hand).toHaveLength(6);
    expect(player.hand[0]).toEqual({ instanceId: handCard.instanceId, card: handCard.card });
    expect(findCardLocationInPlayerView(player, handCard.instanceId)).toEqual({ area: "hand", index: 0 });
    expect(findCardInstanceInPlayerView(player, handCard.instanceId)).toEqual(handCard);
    expect(unavailableIds).toEqual(
      player.hand
        .filter((card) => !playableIds.has(card.instanceId))
        .map((card) => card.instanceId),
    );
  });
});

function createPlayableDuel(): DuelState {
  return createDuel({
    cards,
    decks: {
      P1: clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck),
      P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
    },
    seed: "frontend-adapter-test",
    firstPlayer: "P1",
  });
}

function createPlayableGame(seed: string) {
  return createInitialGameState(cards, {
    decks: {
      P1: clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck),
      P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
    },
    seed,
    opponentBehavior: "none",
    suppressWarnings: true,
  });
}

function zoneFromCard(
  instance: DuelCardInstance,
  options: Pick<DuelZoneCard, "faceDown" | "status">,
): DuelZoneCard {
  return {
    instance,
    faceDown: options.faceDown,
    position: "attack",
    status: options.status,
  };
}

function isPlayCardAction(action: DuelAction): action is Extract<DuelAction, { type: "play-card" }> {
  return action.type === "play-card";
}

function cardByName(name: string): CardRecord {
  const card = cards.find((candidate) => candidate.name === name);

  if (!card) {
    throw new Error(`Missing fixture card: ${name}`);
  }

  return card;
}
