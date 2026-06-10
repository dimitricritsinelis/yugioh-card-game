import type { CardRecord } from "../types";
import type { EngineCommand } from "./commands";
import type { CardInstance, ZoneCard, ZoneRef } from "./core/cardRefs";
import { cloneDuelState } from "./core/clone";
import type { DuelState, PendingAttackState, PlayerState } from "./core/state";
import {
  findCardByInstanceId,
  insertIntoZone,
  removeFromZone,
  type ZoneCardOptions,
} from "./core/zones";
import type { CardDefinition } from "./data/cardCatalog";
import { normalizeCard } from "./data/normalizeCard";
import { validateDeck, type DeckValidationOptions } from "./deckValidation";
import type { EngineError } from "./errors";
import type {
  CardDrawnEvent,
  CardMovedEvent,
  AttackDeclaredEvent,
  BattleCompletedEvent,
  BattleDamageEvent,
  CardDestroyedEvent,
  DuelFinishedEvent,
  DuelStartedEvent,
  EngineEvent,
  IllegalActionEvent,
  LpChangedEvent,
  MonsterSetEvent,
  PhaseChangedEvent,
  PlayerLostEvent,
  PositionChangedEvent,
  SpellTrapSetEvent,
  SummonDeclaredEvent,
  SummonSuccessfulEvent,
  TurnStartedEvent,
} from "./events";
import type { EnginePrompt, EngineResult } from "./result";
import { createRngState, shuffleWithRng, type RngState } from "./random";
import {
  createDamageCalculationStep,
  deriveBattleStats,
  getMonsterBattleStats,
  resolveMonsterBattle,
  validateAttackDeclaration,
} from "./rules/battle";
import { closeDamageStep } from "./rules/damageStep";
import { discardHandToLimit, type HandSizeDiscard } from "./rules/endPhase";
import { isNextPhase, phaseLabel } from "./rules/phases";
import { validateManualPositionChange } from "./rules/positionChange";
import { applyStateBasedCleanup } from "./rules/stateBasedCleanup";
import {
  isMainPhase,
  validateFlipSummonCard,
  validateMonsterPlay,
  type MonsterPlayKind,
} from "./rules/summons";
import { findExodiaWinner, playerWithZeroLp, type LossReason } from "./rules/winConditions";
import type { DeckList, OverrideCardDestination, PlayerId, TurnMode } from "./types";

const DEFAULT_SEED = "goat-core-duel";
const STARTING_LIFE_POINTS = 8000;
const OPENING_HAND_SIZE = 5;
const ZONE_COUNT = 5;
const PLAYERS: readonly PlayerId[] = ["P1", "P2"];

export interface CreateCoreDuelConfig {
  readonly cards: readonly CardRecord[];
  readonly decks: Readonly<Record<PlayerId, DeckList>>;
  readonly seed?: string;
  readonly firstPlayer?: PlayerId;
  readonly mode?: TurnMode;
  readonly allowUnsupportedCards?: boolean;
  readonly deckValidation?: DeckValidationOptions;
  readonly shuffleDecks?: boolean;
}

export interface CreateDuelResult {
  readonly state: DuelState;
  readonly events: readonly EngineEvent[];
  readonly prompts: readonly EnginePrompt[];
  readonly errors: readonly EngineError[];
}

interface EventBuilder {
  readonly nextId: () => string;
}

export function createDuel(config: CreateCoreDuelConfig): CreateDuelResult {
  const seed = config.seed ?? DEFAULT_SEED;
  const firstPlayer = config.firstPlayer ?? "P1";
  const shuffleDecks = config.shuffleDecks ?? true;
  const validationOptions: DeckValidationOptions = {
    ...config.deckValidation,
    allowUnsupportedCards: config.allowUnsupportedCards ?? config.deckValidation?.allowUnsupportedCards,
  };

  for (const playerId of PLAYERS) {
    assertValidInitialDeck(playerId, config.decks[playerId], config.cards, validationOptions);
  }

  let rng = createRngState(seed);
  const events: EngineEvent[] = [];
  const eventBuilder = createEventBuilder();
  const players = {} as Record<PlayerId, PlayerState>;

  events.push(createDuelStartedEvent(eventBuilder, seed, firstPlayer));

  for (const playerId of PLAYERS) {
    const built = createPlayer(playerId, config.decks[playerId], rng, shuffleDecks);

    rng = built.rng;
    players[playerId] = built.player;
    events.push(...createOpeningDrawEvents(eventBuilder, playerId, built.player.hand));
  }

  events.push(createTurnStartedEvent(eventBuilder, firstPlayer, 1));

  const state: DuelState = {
    id: `duel-${seed}`,
    seed,
    turnMode: config.mode ?? "match",
    turn: 1,
    phase: "DP",
    activePlayer: firstPlayer,
    turnFlags: {
      drawnThisTurn: false,
      battlePhaseConducted: false,
    },
    damageStep: closeDamageStep(),
    cardDefinitions: buildDuelCardDefinitions(config.cards, config.decks),
    players,
    eventIds: events.map((event) => event.id),
    winner: null,
  };
  const terminal = applyAutomaticWinConditions(state, eventBuilder);

  return {
    state: terminal.state,
    events: [...events, ...terminal.events],
    prompts: [],
    errors: [],
  };
}

export function reduceDuel(state: DuelState, command: EngineCommand): EngineResult {
  switch (command.type) {
    case "start-duel":
      return result(command, cloneDuelState(state));
    case "draw-card":
      return drawCards(state, command);
    case "change-phase":
      return changePhase(state, command);
    case "end-turn":
      return endTurn(state, command);
    case "normal-summon":
      return playMonsterFromHand(state, command, "normal-summon");
    case "set-monster":
      return playMonsterFromHand(state, command, "set-monster");
    case "flip-summon":
      return flipSummon(state, command);
    case "change-position":
      return changePosition(state, command);
    case "attack":
      return attack(state, command);
    case "activate-card":
      return activateSpellTrap(state, command);
    case "set-spell-trap":
      return setSpellTrap(state, command);
    case "override-card-location":
      return overrideCardLocation(state, command);
    case "move-card":
      return unimplementedCommand(state, command);
  }
}

function changePhase(state: DuelState, command: Extract<EngineCommand, { type: "change-phase" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  if (!isNextPhase(state.phase, command.phase)) {
    return illegalResult(
      state,
      command,
      `Cannot move from ${phaseLabel(state.phase)} to ${phaseLabel(command.phase)}.`,
      command.playerId,
    );
  }

  if (command.phase === "BP" && state.turn <= 1) {
    return illegalResult(state, command, "Battle Phase cannot be entered on the first turn.", command.playerId);
  }

  let nextState = cloneDuelState(state);
  const events: EngineEvent[] = [];

  if (state.phase === "DP" && !state.turnFlags?.drawnThisTurn) {
    const drawResult = drawCards(nextState, { type: "draw-card", playerId: command.playerId });

    nextState = drawResult.state;
    events.push(...drawResult.events);

    if (isDuelFinished(nextState)) {
      return result(command, nextState, events);
    }
  }

  const eventBuilder = createEventBuilder(nextState.eventIds.length);
  const phaseChanged = createPhaseChangedEvent(eventBuilder, command.playerId, state.phase, command.phase, nextState.turn);

  nextState = appendEventIds(
    applyStateBasedCleanup({
      ...nextState,
      phase: command.phase,
      turnFlags: {
        drawnThisTurn: nextState.turnFlags?.drawnThisTurn ?? state.turnFlags?.drawnThisTurn ?? false,
        battlePhaseConducted:
          command.phase === "BP" || nextState.turnFlags?.battlePhaseConducted === true,
      },
      damageStep: closeDamageStep(),
    }),
    [phaseChanged],
  );

  return result(command, nextState, [...events, phaseChanged]);
}

function endTurn(state: DuelState, command: Extract<EngineCommand, { type: "end-turn" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  if (state.phase !== "EP" && !(state.turn <= 1 && state.phase === "M1")) {
    return illegalResult(state, command, "Turns can only be ended from the End Phase.", command.playerId);
  }

  const cleanedState = applyStateBasedCleanup(state);
  const eventBuilder = createEventBuilder(cleanedState.eventIds.length);
  const discardResult = discardHandToLimit(cleanedState.players[command.playerId]);
  const discardEvents = discardResult.discards.map((discard) =>
    createHandSizeDiscardEvent(eventBuilder, command.playerId, discard, state.turn),
  );
  const nextPlayer = state.turnMode === "solo" ? command.playerId : opponentOf(command.playerId);
  const nextTurn = state.turn + 1;
  const phaseChanged = createPhaseChangedEvent(eventBuilder, nextPlayer, "EP", "DP", nextTurn);
  const turnStarted = createTurnStartedEvent(eventBuilder, nextPlayer, nextTurn);
  const players: Record<PlayerId, PlayerState> = {
    ...state.players,
    [command.playerId]: discardResult.player,
  };

  const nextState: DuelState = {
    ...cloneDuelState(cleanedState),
    turn: nextTurn,
    phase: "DP",
    activePlayer: nextPlayer,
    turnFlags: {
      drawnThisTurn: false,
      battlePhaseConducted: false,
    },
    damageStep: closeDamageStep(),
    players: {
      P1: resetPlayerForNewTurn(players.P1),
      P2: resetPlayerForNewTurn(players.P2),
    },
  };
  const events = [...discardEvents, phaseChanged, turnStarted];
  const withEvents = appendEventIds(nextState, events);

  return result(command, withEvents, events);
}

function playMonsterFromHand(
  state: DuelState,
  command: Extract<EngineCommand, { type: "normal-summon" | "set-monster" }>,
  playKind: MonsterPlayKind,
): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  if (!isMainPhase(state.phase)) {
    return illegalResult(state, command, "Monsters can only be Summoned or Set during Main Phase 1 or Main Phase 2.", command.playerId);
  }

  const handIndex = state.players[command.playerId].hand.findIndex((card) => card.instanceId === command.instanceId);

  if (handIndex < 0) {
    return illegalResult(state, command, "Selected card is not in that player's hand.", command.playerId);
  }

  const player = state.players[command.playerId];
  const handCard = player.hand[handIndex];
  const card = state.cardDefinitions?.[handCard.cardId];
  const validation = validateMonsterPlay(player, card, command.zoneIndex, command.tributeInstanceIds ?? []);

  if (!validation.valid) {
    return illegalResult(state, command, validation.reason ?? "That monster cannot be played.", command.playerId);
  }

  let nextPlayer: PlayerState = {
    ...player,
    hand: player.hand.filter((_, index) => index !== handIndex),
    normalSummonUsed: true,
  };
  const eventBuilder = createEventBuilder(state.eventIds.length);
  const events: EngineEvent[] = [];

  for (const tributeId of command.tributeInstanceIds ?? []) {
    const tributeIndex = nextPlayer.monsterZones.findIndex((zone) => zone?.instanceId === tributeId);
    const tribute = nextPlayer.monsterZones[tributeIndex];

    if (!tribute) {
      return illegalResult(state, command, "Tributes must be monsters you control.", command.playerId);
    }

    nextPlayer = {
      ...nextPlayer,
      monsterZones: replaceArrayIndex(nextPlayer.monsterZones, tributeIndex, null),
      graveyard: [toPublicZoneCard(tribute), ...nextPlayer.graveyard],
    };
    events.push(
      createCardMovedEvent(
        eventBuilder,
        command.playerId,
        tribute,
        { playerId: command.playerId, zone: "monsterZone", index: tributeIndex },
        { playerId: command.playerId, zone: "graveyard", index: 0 },
        state.turn,
        "tribute",
      ),
    );
  }

  const summonKind = validation.requiredTributes > 0 ? "tribute" : "normal";
  const zoneCard = toMonsterZoneCard(handCard, playKind, state.turn);

  nextPlayer = {
    ...nextPlayer,
    monsterZones: replaceArrayIndex(nextPlayer.monsterZones, command.zoneIndex, zoneCard),
  };

  if (playKind === "set-monster") {
    events.push(createMonsterSetEvent(eventBuilder, command.playerId, zoneCard, command.zoneIndex, command.tributeInstanceIds, state.turn));
  } else {
    events.push(createSummonDeclaredEvent(eventBuilder, command.playerId, zoneCard, summonKind, command.tributeInstanceIds, state.turn));
    events.push(createSummonSuccessfulEvent(eventBuilder, command.playerId, zoneCard, command.zoneIndex, summonKind, state.turn));
  }

  const nextState = appendEventIds(
    {
      ...cloneDuelState(state),
      players: {
        ...state.players,
        [command.playerId]: nextPlayer,
      },
    },
    events,
  );

  return result(command, nextState, events);
}

// Manual-play activation: place a Spell/Trap from the hand into the Spell/Trap Zone
// face-up and log it. No effect is resolved — players carry out the effect manually.
function activateSpellTrap(state: DuelState, command: Extract<EngineCommand, { type: "activate-card" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  if (!isMainPhase(state.phase)) {
    return illegalResult(state, command, "Cards can only be activated during Main Phase 1 or Main Phase 2.", command.playerId);
  }

  const player = state.players[command.playerId];
  const handIndex = player.hand.findIndex((card) => card.instanceId === command.instanceId);

  if (handIndex < 0) {
    return illegalResult(state, command, "Selected card is not in that player's hand.", command.playerId);
  }

  if (command.zoneIndex < 0 || command.zoneIndex >= player.spellTrapZones.length) {
    return illegalResult(state, command, "Spell/Trap Zone index is outside zone bounds.", command.playerId);
  }

  if (player.spellTrapZones[command.zoneIndex]) {
    return illegalResult(state, command, "Selected Spell/Trap Zone is occupied.", command.playerId);
  }

  const handCard = player.hand[handIndex];
  const definition = state.cardDefinitions?.[handCard.cardId];

  if (!definition || (definition.kind !== "spell" && definition.kind !== "trap")) {
    return illegalResult(state, command, "Only Spell or Trap cards can be activated into the Spell/Trap Zone.", command.playerId);
  }

  const activatedCard: ZoneCard = {
    ...toSpellTrapZoneCard(handCard, state.turn),
    face: "faceUp",
    visibility: "public",
  };
  const nextPlayer: PlayerState = {
    ...player,
    hand: player.hand.filter((_, index) => index !== handIndex),
    spellTrapZones: replaceArrayIndex(player.spellTrapZones, command.zoneIndex, activatedCard),
  };
  const eventBuilder = createEventBuilder(state.eventIds.length);
  const event = createSpellTrapSetEvent(eventBuilder, command.playerId, activatedCard, command.zoneIndex, state.turn);
  const nextState = appendEventIds(
    {
      ...cloneDuelState(state),
      players: {
        ...state.players,
        [command.playerId]: nextPlayer,
      },
    },
    [event],
  );

  return result(command, nextState, [event]);
}

function setSpellTrap(state: DuelState, command: Extract<EngineCommand, { type: "set-spell-trap" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  if (!isMainPhase(state.phase)) {
    return illegalResult(state, command, "Spell/Trap cards can only be Set during Main Phase 1 or Main Phase 2.", command.playerId);
  }

  const player = state.players[command.playerId];
  const handIndex = player.hand.findIndex((card) => card.instanceId === command.instanceId);

  if (handIndex < 0) {
    return illegalResult(state, command, "Selected card is not in that player's hand.", command.playerId);
  }

  if (command.zoneIndex < 0 || command.zoneIndex >= player.spellTrapZones.length) {
    return illegalResult(state, command, "Spell/Trap Zone index is outside zone bounds.", command.playerId);
  }

  if (player.spellTrapZones[command.zoneIndex]) {
    return illegalResult(state, command, "Selected Spell/Trap Zone is occupied.", command.playerId);
  }

  const handCard = player.hand[handIndex];
  const definition = state.cardDefinitions?.[handCard.cardId];

  if (!definition || (definition.kind !== "spell" && definition.kind !== "trap")) {
    return illegalResult(state, command, "Only Spell or Trap cards can be Set in the Spell/Trap Zone.", command.playerId);
  }

  const setCard = toSpellTrapZoneCard(handCard, state.turn);
  const nextPlayer: PlayerState = {
    ...player,
    hand: player.hand.filter((_, index) => index !== handIndex),
    spellTrapZones: replaceArrayIndex(player.spellTrapZones, command.zoneIndex, setCard),
  };
  const eventBuilder = createEventBuilder(state.eventIds.length);
  const event = createSpellTrapSetEvent(eventBuilder, command.playerId, setCard, command.zoneIndex, state.turn);
  const nextState = appendEventIds(
    {
      ...cloneDuelState(state),
      players: {
        ...state.players,
        [command.playerId]: nextPlayer,
      },
    },
    [event],
  );

  return result(command, nextState, [event]);
}

function overrideCardLocation(
  state: DuelState,
  command: Extract<EngineCommand, { type: "override-card-location" }>,
): EngineResult {
  if (!isPlayerId(command.playerId)) {
    return illegalResult(state, command, `Unknown player: ${command.playerId}.`, command.playerId);
  }

  const located = findCardByInstanceId(state, command.instanceId);

  if (!located) {
    return illegalResult(state, command, "Selected card was not found.", command.playerId);
  }

  if (located.card.owner !== command.playerId) {
    return illegalResult(state, command, "Override can only move cards owned by that player.", command.playerId);
  }

  const validation = validateOverrideDestination(
    state,
    command.playerId,
    located.ref,
    located.card.cardId,
    command.destination,
  );

  if (validation) {
    return illegalResult(state, command, validation, command.playerId);
  }

  const eventBuilder = createEventBuilder(state.eventIds.length);
  const eventCard = isZoneCard(located.card) ? toPublicZoneCard(located.card) : toPublicEventCard(located.card);
  const removed = removeFromZone(state, located.ref);
  const destinationRef = overrideDestinationRef(removed.state, command.playerId, command.destination);
  const nextState = insertIntoZone(
    removed.state,
    destinationRef,
    withController(removed.card, command.playerId),
    overrideZoneOptions(command.destination),
  );
  const event = createManualOverrideMovedEvent(
    eventBuilder,
    command.playerId,
    eventCard,
    located.ref,
    destinationRef,
    state.turn,
    state,
    command.destination,
  );

  return result(command, appendEventIds(nextState, [event]), [event]);
}

function flipSummon(state: DuelState, command: Extract<EngineCommand, { type: "flip-summon" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  if (!isMainPhase(state.phase)) {
    return illegalResult(state, command, "Monsters can only be Flip Summoned during Main Phase 1 or Main Phase 2.", command.playerId);
  }

  const player = state.players[command.playerId];
  const zoneIndex = player.monsterZones.findIndex((zone) => zone?.instanceId === command.instanceId);
  const zoneCard = player.monsterZones[zoneIndex];

  if (!zoneCard) {
    return illegalResult(state, command, "Selected card is not a monster controlled by that player.", command.playerId);
  }

  const validation = validateFlipSummonCard(state.cardDefinitions?.[zoneCard.cardId]);

  if (validation) {
    return illegalResult(state, command, validation, command.playerId);
  }

  if (zoneCard.face !== "faceDown" || zoneCard.position !== "defense") {
    return illegalResult(state, command, "Only face-down Defense Position monsters can be Flip Summoned.", command.playerId);
  }

  const flipped: ZoneCard = {
    ...zoneCard,
    face: "faceUp",
    position: "attack",
    visibility: "public",
    summonedTurn: state.turn,
  };
  const eventBuilder = createEventBuilder(state.eventIds.length);
  const events: EngineEvent[] = [
    createSummonDeclaredEvent(eventBuilder, command.playerId, flipped, "flip", [], state.turn),
    createSummonSuccessfulEvent(eventBuilder, command.playerId, flipped, zoneIndex, "flip", state.turn),
  ];
  const nextState = appendEventIds(
    {
      ...cloneDuelState(state),
      players: {
        ...state.players,
        [command.playerId]: {
          ...player,
          monsterZones: replaceArrayIndex(player.monsterZones, zoneIndex, flipped),
        },
      },
    },
    events,
  );

  return result(command, nextState, events);
}

function changePosition(state: DuelState, command: Extract<EngineCommand, { type: "change-position" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  const player = state.players[command.playerId];
  const zoneIndex = player.monsterZones.findIndex((zone) => zone?.instanceId === command.instanceId);
  const zoneCard = player.monsterZones[zoneIndex];

  if (!zoneCard) {
    return illegalResult(state, command, "Selected card is not a monster controlled by that player.", command.playerId);
  }

  const validation = validateManualPositionChange(state.phase, state.turn, zoneCard, command.position);

  if (validation) {
    return illegalResult(state, command, validation, command.playerId);
  }

  const previousPosition = zoneCard.position;

  if (!previousPosition) {
    return illegalResult(state, command, "Only monsters can manually change battle position.", command.playerId);
  }

  const changed: ZoneCard = {
    ...zoneCard,
    position: command.position,
    positionChangedTurn: state.turn,
  };
  const eventBuilder = createEventBuilder(state.eventIds.length);
  const event = createPositionChangedEvent(eventBuilder, command.playerId, changed, previousPosition, command.position, state.turn);
  const nextState = appendEventIds(
    {
      ...cloneDuelState(state),
      players: {
        ...state.players,
        [command.playerId]: {
          ...player,
          monsterZones: replaceArrayIndex(player.monsterZones, zoneIndex, changed),
        },
      },
    },
    [event],
  );

  return result(command, nextState, [event]);
}

function attack(state: DuelState, command: Extract<EngineCommand, { type: "attack" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  const attackerPlayerId = command.playerId;
  const defenderPlayerId = opponentOf(attackerPlayerId);
  const attackerIndex = state.players[attackerPlayerId].monsterZones.findIndex(
    (zone) => zone?.instanceId === command.attackerInstanceId,
  );
  const attacker = state.players[attackerPlayerId].monsterZones[attackerIndex] ?? null;
  const defenderIndex = command.defenderInstanceId
    ? state.players[defenderPlayerId].monsterZones.findIndex((zone) => zone?.instanceId === command.defenderInstanceId)
    : -1;
  const defender = defenderIndex >= 0 ? state.players[defenderPlayerId].monsterZones[defenderIndex] : null;
  const canDirectAttack = false;
  const validation = validateAttackDeclaration({
    phase: state.phase,
    turn: state.turn,
    attacker,
    defender,
    defenderRequested: Boolean(command.defenderInstanceId),
    opponentControlsMonsters: !canDirectAttack && state.players[defenderPlayerId].monsterZones.some(Boolean),
  });

  if (validation) {
    return illegalResult(state, command, validation, command.playerId);
  }

  if (!attacker || attackerIndex < 0) {
    return illegalResult(state, command, "Selected attacker is not controlled by that player.", command.playerId);
  }

  const attackerBaseStats = getMonsterBattleStats(state.cardDefinitions?.[attacker.cardId]);

  if (!attackerBaseStats) {
    return illegalResult(state, command, "Attacking monster is missing numeric battle stats.", command.playerId);
  }

  if (defender && !getMonsterBattleStats(state.cardDefinitions?.[defender.cardId])) {
    return illegalResult(state, command, "Defending monster is missing numeric battle stats.", command.playerId);
  }

  let nextState: DuelState = cloneDuelState(state);
  const eventBuilder = createEventBuilder(nextState.eventIds.length);
  const events: EngineEvent[] = [createAttackDeclaredEvent(eventBuilder, attackerPlayerId, attacker, defender ?? undefined, state.turn)];
  const markedAttacker: ZoneCard = {
    ...attacker,
    attackedTurn: state.turn,
  };

  nextState = setMonsterZone(nextState, attackerPlayerId, attackerIndex, markedAttacker);

  const pendingAttack: PendingAttackState = {
    attackerPlayerId,
    defenderPlayerId,
    attackerInstanceId: attacker.instanceId,
    defenderInstanceId: defender?.instanceId ?? null,
  };
  const declaredState = appendEventIds({ ...nextState, pendingAttack }, events);

  const battle = resolvePendingAttack(declaredState, eventBuilder);
  const withBattleEvents = appendEventIds(battle.state, battle.events);

  return result(command, withBattleEvents, [...events, ...battle.events]);
}

function destroyCardAtRef(
  state: DuelState,
  targetRef: ZoneRef,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const target = cardAtRef(state, targetRef);

  if (!isZoneCard(target)) {
    return { state, events: [] };
  }

  const replacement: { replaced: boolean; action?: "prevent" | "banish-instead" } = { replaced: false };

  if (replacement.replaced && replacement.action === "prevent") {
    return { state, events: [] };
  }

  const destinationZone = replacement.replaced && replacement.action === "banish-instead" ? "banished" : "graveyard";
  const destination: ZoneRef = { playerId: target.owner, zone: destinationZone, index: 0 };
  const removed = removeFromZone(state, targetRef);
  const nextState = insertIntoZone(removed.state, destination, removed.card, {
    face: "faceUp",
    position: null,
    visibility: "public",
  });
  const movedCard = toPublicZoneCard(target);
  const moveReason = destinationZone === "banished" ? "destruction-replacement" : "effect-destruction";
  const events: EngineEvent[] = [
    ...(destinationZone === "graveyard"
      ? [createCardDestroyedEvent(eventBuilder, targetRef.playerId, target, state.turn, "effect")]
      : []),
    createCardMovedEvent(eventBuilder, targetRef.playerId, movedCard, targetRef, destination, state.turn, moveReason),
  ];
  const linked = handleLinkedCardsOnLeave(nextState, target, eventBuilder);

  return { state: linked.state, events: [...events, ...linked.events] };
}

function handleLinkedCardsOnLeave(
  state: DuelState,
  leavingCard: ZoneCard,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  return leavingCard.attachments.reduce(
    (resultState, instanceId) => {
      const located = findCardByInstanceId(resultState.state, instanceId);
      const behavior = leavingCard.attachmentBehaviors?.[instanceId] ?? "destroy-linked";

      if (
        !located ||
        !isZoneCard(located.card) ||
        !["monsterZone", "spellTrapZone", "fieldZone"].includes(located.ref.zone)
      ) {
        return resultState;
      }

      if (behavior === "return-control") {
        const returned = returnControlOfLinkedCardToOwner(
          resultState.state,
          instanceId,
          leavingCard.instanceId,
          eventBuilder,
        );

        return {
          state: returned.state,
          events: [...resultState.events, ...returned.events],
        };
      }

      const destroyed = destroyCardAtRef(resultState.state, located.ref, eventBuilder);

      return {
        state: destroyed.state,
        events: [...resultState.events, ...destroyed.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function returnControlOfLinkedCardToOwner(
  state: DuelState,
  instanceId: string,
  sourceInstanceId: string,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const located = findCardByInstanceId(state, instanceId);

  if (!located || !isZoneCard(located.card) || located.ref.zone !== "monsterZone") {
    return { state, events: [] };
  }

  const owner = located.card.owner;
  const returnedCard = removeAttachmentFromCard(
    {
      ...located.card,
      controller: owner,
    },
    sourceInstanceId,
  );

  if (located.ref.playerId === owner) {
    return {
      state: replaceZoneCardAtRef(state, located.ref, returnedCard),
      events: [],
    };
  }

  const zoneIndex = state.players[owner].monsterZones.findIndex((card) => card === null);

  if (zoneIndex < 0) {
    return destroyCardAtRef(state, located.ref, eventBuilder);
  }

  const source: ZoneRef = located.ref;
  const destination: ZoneRef = { playerId: owner, zone: "monsterZone", index: zoneIndex };
  const removed = removeFromZone(state, source);
  const nextState: DuelState = {
    ...removed.state,
    players: {
      ...removed.state.players,
      [owner]: {
        ...removed.state.players[owner],
        monsterZones: replaceArrayIndex(removed.state.players[owner].monsterZones, zoneIndex, returnedCard),
      },
    },
  };

  return {
    state: nextState,
    events: [
      createCardMovedEvent(
        eventBuilder,
        owner,
        toPublicZoneCard(returnedCard),
        source,
        destination,
        state.turn,
        "control-return",
      ),
    ],
  };
}

function replaceZoneCardAtRef(state: DuelState, ref: ZoneRef, card: ZoneCard): DuelState {
  switch (ref.zone) {
    case "monsterZone":
      return {
        ...state,
        players: {
          ...state.players,
          [ref.playerId]: {
            ...state.players[ref.playerId],
            monsterZones: replaceArrayIndex(state.players[ref.playerId].monsterZones, ref.index, card),
          },
        },
      };
    case "spellTrapZone":
      return {
        ...state,
        players: {
          ...state.players,
          [ref.playerId]: {
            ...state.players[ref.playerId],
            spellTrapZones: replaceArrayIndex(state.players[ref.playerId].spellTrapZones, ref.index, card),
          },
        },
      };
    case "fieldZone":
      return {
        ...state,
        players: {
          ...state.players,
          [ref.playerId]: {
            ...state.players[ref.playerId],
            fieldZone: card,
          },
        },
      };
    case "mainDeck":
    case "hand":
    case "graveyard":
    case "banished":
      return state;
  }
}

function removeAttachmentFromCard(card: ZoneCard, instanceId: string): ZoneCard {
  const attachments = card.attachments.filter((attachment) => attachment !== instanceId);
  const attachmentBehaviors = card.attachmentBehaviors
    ? Object.fromEntries(
        Object.entries(card.attachmentBehaviors).filter(([attachmentInstanceId]) => attachmentInstanceId !== instanceId),
      )
    : undefined;
  const { attachmentBehaviors: _attachmentBehaviors, ...cardWithoutAttachmentBehaviors } = card;

  return {
    ...cardWithoutAttachmentBehaviors,
    attachments,
    ...(attachmentBehaviors && Object.keys(attachmentBehaviors).length > 0 ? { attachmentBehaviors } : {}),
  };
}

function cardAtRef(state: DuelState, ref: ZoneRef): CardInstance | ZoneCard | null {
  const player = state.players[ref.playerId];

  switch (ref.zone) {
    case "mainDeck":
      return player.mainDeck[ref.index] ?? null;
    case "hand":
      return player.hand[ref.index] ?? null;
    case "monsterZone":
      return player.monsterZones[ref.index] ?? null;
    case "spellTrapZone":
      return player.spellTrapZones[ref.index] ?? null;
    case "graveyard":
      return player.graveyard[ref.index] ?? null;
    case "banished":
      return player.banished[ref.index] ?? null;
    case "fieldZone":
      return player.fieldZone;
  }
}

function isZoneCard(card: CardInstance | ZoneCard | null): card is ZoneCard {
  return card !== null && "face" in card;
}

function validateOverrideDestination(
  state: DuelState,
  playerId: PlayerId,
  sourceRef: ZoneRef,
  cardId: string,
  destination: OverrideCardDestination,
): string | null {
  const player = state.players[playerId];

  switch (destination.zone) {
    case "hand":
    case "graveyard":
    case "banished":
    case "deck":
      return null;
    case "monsterZone": {
      const definition = state.cardDefinitions?.[cardId];

      if (definition?.kind !== "monster") {
        return "Only Monster Cards can be overridden into a Monster Zone.";
      }

      if (!isValidOverrideIndex(destination.index, player.monsterZones.length)) {
        return "Monster Zone index is outside zone bounds.";
      }

      if (destination.face === "faceDown" && destination.position !== "defense") {
        return "Face-down monsters must be placed in Defense Position.";
      }

      const destinationRef: ZoneRef = { playerId, zone: "monsterZone", index: destination.index };
      const occupied = player.monsterZones[destination.index];

      return occupied && !sameZoneRef(sourceRef, destinationRef) ? "Selected Monster Zone is occupied." : null;
    }
    case "spellTrapZone": {
      const definition = state.cardDefinitions?.[cardId];

      if (!definition || definition.kind === "monster") {
        return "Only Spell or Trap Cards can be overridden into a Spell/Trap Zone.";
      }

      if (!isValidOverrideIndex(destination.index, player.spellTrapZones.length)) {
        return "Spell/Trap Zone index is outside zone bounds.";
      }

      const destinationRef: ZoneRef = { playerId, zone: "spellTrapZone", index: destination.index };
      const occupied = player.spellTrapZones[destination.index];

      return occupied && !sameZoneRef(sourceRef, destinationRef) ? "Selected Spell/Trap Zone is occupied." : null;
    }
  }
}

function overrideDestinationRef(
  state: DuelState,
  playerId: PlayerId,
  destination: OverrideCardDestination,
): ZoneRef {
  switch (destination.zone) {
    case "hand":
      return { playerId, zone: "hand", index: state.players[playerId].hand.length };
    case "graveyard":
      return { playerId, zone: "graveyard", index: 0 };
    case "banished":
      return { playerId, zone: "banished", index: 0 };
    case "deck":
      return {
        playerId,
        zone: "mainDeck",
        index: destination.position === "top" ? 0 : state.players[playerId].mainDeck.length,
      };
    case "monsterZone":
      return { playerId, zone: "monsterZone", index: destination.index };
    case "spellTrapZone":
      return { playerId, zone: "spellTrapZone", index: destination.index };
  }
}

function overrideZoneOptions(destination: OverrideCardDestination): ZoneCardOptions {
  switch (destination.zone) {
    case "monsterZone":
      return {
        face: destination.face,
        position: destination.position,
        visibility: destination.face === "faceDown" ? "hidden" : "public",
      };
    case "spellTrapZone":
      return {
        face: destination.face,
        position: null,
        visibility: destination.face === "faceDown" ? "hidden" : "public",
      };
    case "hand":
    case "graveyard":
    case "banished":
    case "deck":
      return {
        face: "faceUp",
        position: null,
        visibility: "public",
      };
  }
}

function withController<T extends CardInstance | ZoneCard>(card: T, controller: PlayerId): T {
  return {
    ...card,
    controller,
  } as T;
}

function sameZoneRef(first: ZoneRef, second: ZoneRef): boolean {
  if (first.playerId !== second.playerId || first.zone !== second.zone) {
    return false;
  }

  return "index" in first || "index" in second
    ? "index" in first && "index" in second && first.index === second.index
    : true;
}

function isValidOverrideIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

function isDuelFinished(state: DuelState): boolean {
  return state.winner !== null || PLAYERS.some((playerId) => state.players[playerId].lost);
}

function applyPendingBattleAtkModifiers(
  stats: { readonly atk: number; readonly def: number },
  pending: PendingAttackState,
  instanceId: string,
): { readonly atk: number; readonly def: number } {
  const atkDelta = (pending.atkModifiers ?? [])
    .filter((modifier) => modifier.instanceId === instanceId)
    .reduce((total, modifier) => total + modifier.amount, 0);

  return {
    ...stats,
    atk: Math.max(0, stats.atk + atkDelta),
  };
}

function resolvePendingAttack(
  state: DuelState,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const pending = state.pendingAttack;

  if (!pending) {
    return { state, events: [] };
  }

  let nextState: DuelState = {
    ...state,
    pendingAttack: null,
    damageStep: closeDamageStep(),
  };

  if (pending.negated) {
    return { state: nextState, events: [] };
  }

  const attackerLocation = findCardByInstanceId(nextState, pending.attackerInstanceId);

  if (!attackerLocation || attackerLocation.ref.zone !== "monsterZone" || !isZoneCard(attackerLocation.card)) {
    return { state: nextState, events: [] };
  }

  const attacker = attackerLocation.card;
  const attackerIndex = attackerLocation.ref.index;
  const defenderLocation = pending.defenderInstanceId ? findCardByInstanceId(nextState, pending.defenderInstanceId) : null;
  const defender = defenderLocation && defenderLocation.ref.zone === "monsterZone" && isZoneCard(defenderLocation.card)
    ? defenderLocation.card
    : null;

  if (pending.defenderInstanceId && !defender) {
    return { state: nextState, events: [] };
  }

  const attackerBaseStats = getMonsterBattleStats(nextState.cardDefinitions?.[attacker.cardId]);

  if (!attackerBaseStats) {
    return { state: nextState, events: [] };
  }

  const attackerStats = deriveBattleStats(nextState, {
    playerId: pending.attackerPlayerId,
    card: attacker,
    base: attackerBaseStats,
  });
  const modifiedAttackerStats = applyPendingBattleAtkModifiers(attackerStats, pending, attacker.instanceId);
  const events: EngineEvent[] = [];

  nextState = {
    ...nextState,
    damageStep: createDamageCalculationStep(attacker, defender),
  };

  if (!defender) {
    const damageEvents = createDamageEvents(eventBuilder, pending.defenderPlayerId, modifiedAttackerStats.atk, attacker, nextState);

    return {
      state: { ...damageEvents.state, damageStep: closeDamageStep() },
      events: [...events, ...damageEvents.events],
    };
  }

  const defenderBaseStats = getMonsterBattleStats(nextState.cardDefinitions?.[defender.cardId]);

  if (!defenderBaseStats || !defenderLocation || defenderLocation.ref.zone !== "monsterZone") {
    return { state: { ...nextState, damageStep: closeDamageStep() }, events };
  }

  const defenderIndex = defenderLocation.ref.index;
  const revealedDefender: ZoneCard = {
    ...defender,
    face: "faceUp",
    visibility: "public",
  };

  nextState = setMonsterZone(nextState, pending.defenderPlayerId, defenderIndex, revealedDefender);

  const defenderStats = deriveBattleStats(nextState, {
    playerId: pending.defenderPlayerId,
    card: revealedDefender,
    base: defenderBaseStats,
  });
  const modifiedDefenderStats = applyPendingBattleAtkModifiers(defenderStats, pending, revealedDefender.instanceId);
  const outcome = resolveMonsterBattle(modifiedAttackerStats, modifiedDefenderStats, revealedDefender.position);
  const piercingDamage = 0;
  const battleCompleted = createBattleCompletedEvent(
    eventBuilder,
    pending.attackerPlayerId,
    pending.defenderPlayerId,
    attacker,
    modifiedAttackerStats.atk,
    revealedDefender,
    state.turn,
  );

  events.push(battleCompleted);

  if (!outcome.damagePlayerId && piercingDamage > 0) {
    const damageEvents = createDamageEvents(eventBuilder, pending.defenderPlayerId, piercingDamage, attacker, nextState);

    nextState = damageEvents.state;
    events.push(...damageEvents.events);
  }

  if (outcome.damagePlayerId && outcome.damage > 0) {
    const damagedPlayerId = outcome.damagePlayerId === "attacker" ? pending.attackerPlayerId : pending.defenderPlayerId;
    const source = outcome.damagePlayerId === "attacker" ? revealedDefender : attacker;
    const damageEvents = createDamageEvents(eventBuilder, damagedPlayerId, outcome.damage, source, nextState);

    nextState = damageEvents.state;
    events.push(...damageEvents.events);
  }

  if (outcome.destroyAttacker) {
    const destroyed = destroyMonster(nextState, pending.attackerPlayerId, attackerIndex, eventBuilder, state.turn);

    nextState = destroyed.state;
    events.push(...destroyed.events);
  }

  if (outcome.destroyDefender) {
    const destroyed = destroyMonster(nextState, pending.defenderPlayerId, defenderIndex, eventBuilder, state.turn);

    nextState = destroyed.state;
    events.push(...destroyed.events);
  }

  return {
    state: {
      ...nextState,
      damageStep: closeDamageStep(),
    },
    events,
  };
}

function createPlayer(
  playerId: PlayerId,
  deck: DeckList,
  rng: RngState,
  shuffleDeck: boolean,
): { readonly player: PlayerState; readonly rng: RngState } {
  const instances = createDeckInstances(playerId, deck.main);
  const shuffled = shuffleDeck ? shuffleWithRng(instances, rng) : { items: instances, rng };
  const hand = shuffled.items.slice(0, OPENING_HAND_SIZE);
  const mainDeck = shuffled.items.slice(OPENING_HAND_SIZE);

  return {
    player: {
      id: playerId,
      lp: STARTING_LIFE_POINTS,
      mainDeck,
      hand,
      monsterZones: emptyZones(),
      spellTrapZones: emptyZones(),
      graveyard: [],
      banished: [],
      fieldZone: null,
      normalSummonUsed: false,
      lost: false,
    },
    rng: shuffled.rng,
  };
}

function createDeckInstances(playerId: PlayerId, mainDeck: readonly string[]): CardInstance[] {
  const copyCounts = new Map<string, number>();

  return mainDeck.map((cardId) => {
    const copyNumber = (copyCounts.get(cardId) ?? 0) + 1;
    copyCounts.set(cardId, copyNumber);

    return {
      instanceId: `${playerId}-${cardId}-${copyNumber}`,
      cardId,
      owner: playerId,
      controller: playerId,
    };
  });
}

function drawCards(state: DuelState, command: Extract<EngineCommand, { type: "draw-card" }>): EngineResult {
  if (!isPlayerId(command.playerId)) {
    return illegalResult(state, command, `Unknown player: ${command.playerId}.`, command.playerId);
  }

  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  if (state.phase !== "DP") {
    return illegalResult(state, command, "Cards can only be drawn for turn during the Draw Phase.", command.playerId);
  }

  if (state.turnFlags?.drawnThisTurn) {
    return illegalResult(state, command, "The turn player has already drawn this turn.", command.playerId);
  }

  const count = command.count ?? 1;

  if (!Number.isInteger(count) || count < 1) {
    return illegalResult(state, command, "Draw count must be a positive integer.", command.playerId);
  }

  let nextState = cloneDuelState(state);
  const player = nextState.players[command.playerId];
  const eventBuilder = createEventBuilder(nextState.eventIds.length);
  const events: EngineEvent[] = [];

  for (let drawIndex = 0; drawIndex < count; drawIndex += 1) {
    const [card, ...remainingDeck] = nextState.players[command.playerId].mainDeck;

    if (!card) {
      const finished = finishDuel(appendEventIds(nextState, events), command.playerId, "deck-out", eventBuilder);

      return result(command, finished.state, [...events, ...finished.events]);
    }

    const drawnEvent = createCardDrawnEvent(eventBuilder, command.playerId, card, nextState.turn);
    events.push(drawnEvent);
    nextState = {
      ...nextState,
      players: {
        ...nextState.players,
        [command.playerId]: {
          ...player,
          mainDeck: remainingDeck,
          hand: [...nextState.players[command.playerId].hand, card],
        },
      },
    };
  }

  const terminal = applyAutomaticWinConditions(appendEventIds(nextState, events), eventBuilder);

  return result(
    command,
    {
      ...terminal.state,
      turnFlags: {
        drawnThisTurn: true,
        battlePhaseConducted: terminal.state.turnFlags?.battlePhaseConducted ?? false,
      },
    },
    [...events, ...terminal.events],
  );
}

function validateTurnCommand(
  state: DuelState,
  command: Extract<EngineCommand, { playerId: PlayerId }>,
): EngineResult | null {
  if (!isPlayerId(command.playerId)) {
    return illegalResult(state, command, `Unknown player: ${command.playerId}.`, command.playerId);
  }

  if (isDuelFinished(state)) {
    return illegalResult(state, command, "The duel is already over.", command.playerId);
  }

  if (state.activePlayer !== command.playerId) {
    return illegalResult(state, command, `It is not ${command.playerId}'s turn.`, command.playerId);
  }

  return null;
}

function unimplementedCommand(
  state: DuelState,
  command: Extract<EngineCommand, { playerId: PlayerId }>,
): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  return illegalResult(state, command, `${command.type} is not implemented in the reducer shell yet.`, command.playerId);
}

function assertValidInitialDeck(
  playerId: PlayerId,
  deck: DeckList | undefined,
  cards: readonly CardRecord[],
  options: DeckValidationOptions,
): asserts deck is DeckList {
  if (!deck) {
    throw new Error(`${playerId} requires an exact 40-card Main Deck.`);
  }

  const validation = validateDeck(deck, [...cards], options);

  if (!validation.valid) {
    throw new Error(`${playerId} deck is invalid: ${validation.errors.join(" ")}`);
  }
}

function result(
  command: EngineCommand,
  state: DuelState,
  events: readonly EngineEvent[] = [],
  prompts: readonly EnginePrompt[] = [],
  errors: readonly EngineError[] = [],
): EngineResult {
  return {
    state,
    command,
    events,
    prompts,
    errors,
  };
}

function illegalResult(
  state: DuelState,
  command: EngineCommand,
  message: string,
  playerId?: PlayerId,
): EngineResult {
  const eventBuilder = createEventBuilder(state.eventIds.length);
  const error: EngineError = {
    code: "illegal-action",
    message,
    playerId,
    commandType: command.type,
  };
  const event: IllegalActionEvent = {
    id: eventBuilder.nextId(),
    type: "illegal-action",
    message,
    playerId: playerId ?? state.activePlayer,
    commandType: command.type,
    reason: message,
    turn: state.turn,
  };

  return result(command, appendEventIds(cloneDuelState(state), [event]), [event], [], [error]);
}

function createEventBuilder(startIndex = 0): EventBuilder {
  let eventIndex = startIndex;

  return {
    nextId: () => {
      eventIndex += 1;
      return `evt-${eventIndex.toString().padStart(4, "0")}`;
    },
  };
}

function createDuelStartedEvent(builder: EventBuilder, seed: string, firstPlayer: PlayerId): DuelStartedEvent {
  return {
    id: builder.nextId(),
    type: "duel-started",
    message: `Duel started. ${firstPlayer} has priority in the Draw Phase.`,
    seed,
    firstPlayer,
    turn: 1,
    playerId: firstPlayer,
  };
}

function createOpeningDrawEvents(
  builder: EventBuilder,
  playerId: PlayerId,
  hand: readonly CardInstance[],
): CardDrawnEvent[] {
  return hand.map((card) => createCardDrawnEvent(builder, playerId, card, 1));
}

function createTurnStartedEvent(builder: EventBuilder, playerId: PlayerId, turn: number): TurnStartedEvent {
  return {
    id: builder.nextId(),
    type: "turn-started",
    message: `${playerId} started turn ${turn}.`,
    playerId,
    turn,
  };
}

function createCardDrawnEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: CardInstance,
  turn: number,
): CardDrawnEvent {
  return {
    id: builder.nextId(),
    type: "card-drawn",
    message: `${playerId} drew a card.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    turn,
  };
}

function createAttackDeclaredEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  attacker: ZoneCard,
  defender: ZoneCard | undefined,
  turn: number,
): AttackDeclaredEvent {
  return {
    id: builder.nextId(),
    type: "attack-declared",
    message: defender ? `${playerId} declared an attack on a monster.` : `${playerId} attacked directly.`,
    playerId,
    attackerInstanceId: attacker.instanceId,
    attackerCardId: attacker.cardId,
    defenderInstanceId: defender?.instanceId,
    defenderCardId: defender?.cardId,
    turn,
  };
}

function createBattleCompletedEvent(
  builder: EventBuilder,
  attackerPlayerId: PlayerId,
  defenderPlayerId: PlayerId,
  attacker: ZoneCard,
  attackerBattleAtk: number,
  defender: ZoneCard,
  turn: number,
): BattleCompletedEvent {
  return {
    id: builder.nextId(),
    type: "battle-completed",
    message: "A monster battle completed.",
    playerId: attackerPlayerId,
    attackerPlayerId,
    defenderPlayerId,
    attackerInstanceId: attacker.instanceId,
    attackerCardId: attacker.cardId,
    attackerBattleAtk,
    attackerBattlePosition: attacker.position,
    defenderInstanceId: defender.instanceId,
    defenderCardId: defender.cardId,
    defenderBattlePosition: defender.position,
    turn,
  };
}

function createBattleDamageEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  amount: number,
  source: ZoneCard,
  turn: number,
): BattleDamageEvent {
  return {
    id: builder.nextId(),
    type: "battle-damage",
    message: `${playerId} took ${amount} battle damage.`,
    playerId,
    amount,
    sourceInstanceId: source.instanceId,
    turn,
  };
}

function createLpChangedEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  previous: number,
  next: number,
  turn: number,
): LpChangedEvent {
  return {
    id: builder.nextId(),
    type: "lp-changed",
    message: `${playerId} LP changed from ${previous} to ${next}.`,
    playerId,
    previous,
    next,
    delta: next - previous,
    turn,
  };
}

function createCardDestroyedEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: ZoneCard,
  turn: number,
  reason: CardDestroyedEvent["reason"] = "battle",
): CardDestroyedEvent {
  return {
    id: builder.nextId(),
    type: "card-destroyed",
    message: `${playerId}'s card was destroyed by ${reason}.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    reason,
    turn,
  };
}

function createCardMovedEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: ZoneCard,
  from: ZoneRef,
  to: ZoneRef,
  turn: number,
  reason: string,
): CardMovedEvent {
  return {
    id: builder.nextId(),
    type: "card-moved",
    message: `${playerId} moved a card to ${to.zone}.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    from,
    to,
    turn,
    metadata: { reason },
  };
}

function createManualOverrideMovedEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: ZoneCard,
  from: ZoneRef,
  to: ZoneRef,
  turn: number,
  state: DuelState,
  destination: OverrideCardDestination,
): CardMovedEvent {
  const cardName = state.cardDefinitions?.[card.cardId]?.display.name ?? `card ${card.cardId}`;
  const destinationState = overrideDestinationStateLabel(destination);
  const destinationLabel = `${zoneRefDisplayLabel(to)}${destinationState ? ` ${destinationState}` : ""}`;

  return {
    id: builder.nextId(),
    type: "card-moved",
    message: `Override: ${playerId} moved ${cardName} from ${zoneRefDisplayLabel(from)} to ${destinationLabel}.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    from,
    to,
    turn,
    metadata: {
      reason: "manual-override",
      override: true,
      from: zoneRefDisplayLabel(from),
      to: zoneRefDisplayLabel(to),
      destinationState: destinationState || null,
    },
  };
}

function zoneRefDisplayLabel(ref: ZoneRef): string {
  switch (ref.zone) {
    case "mainDeck":
      return "Deck";
    case "hand":
      return "Hand";
    case "monsterZone":
      return `Monster Zone ${ref.index + 1}`;
    case "spellTrapZone":
      return `Spell/Trap Zone ${ref.index + 1}`;
    case "graveyard":
      return "Graveyard";
    case "banished":
      return "Banished";
    case "fieldZone":
      return "Field Zone";
  }
}

function overrideDestinationStateLabel(destination: OverrideCardDestination): string {
  if (destination.zone === "monsterZone") {
    return destination.face === "faceDown"
      ? "face-down Defense"
      : `face-up ${destination.position === "attack" ? "Attack" : "Defense"}`;
  }

  if (destination.zone === "spellTrapZone") {
    return destination.face === "faceDown" ? "Set" : "face-up Activated";
  }

  if (destination.zone === "deck") {
    return destination.position;
  }

  return "";
}

function createSummonDeclaredEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: ZoneCard,
  summonKind: SummonDeclaredEvent["summonKind"],
  tributeInstanceIds: readonly string[] | undefined,
  turn: number,
): SummonDeclaredEvent {
  return {
    id: builder.nextId(),
    type: "summon-declared",
    message: `${playerId} declared a ${summonKind} summon.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    summonKind,
    tributeInstanceIds,
    turn,
  };
}

function createSummonSuccessfulEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: ZoneCard,
  zoneIndex: number,
  summonKind: SummonSuccessfulEvent["summonKind"],
  turn: number,
): SummonSuccessfulEvent {
  return {
    id: builder.nextId(),
    type: "summon-successful",
    message: `${playerId} successfully ${summonKind === "flip" ? "Flip Summoned" : "Summoned"} a monster.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    zone: { playerId, zone: "monsterZone", index: zoneIndex },
    summonKind,
    turn,
  };
}

function createMonsterSetEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: ZoneCard,
  zoneIndex: number,
  tributeInstanceIds: readonly string[] | undefined,
  turn: number,
): MonsterSetEvent {
  return {
    id: builder.nextId(),
    type: "monster-set",
    message: `${playerId} Set a monster.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    zone: { playerId, zone: "monsterZone", index: zoneIndex },
    tributeInstanceIds,
    turn,
  };
}

function createSpellTrapSetEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: ZoneCard,
  zoneIndex: number,
  turn: number,
): SpellTrapSetEvent {
  return {
    id: builder.nextId(),
    type: "spell-trap-set",
    message: `${playerId} Set a Spell/Trap card.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    zone: { playerId, zone: "spellTrapZone", index: zoneIndex },
    turn,
  };
}

function createPositionChangedEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: ZoneCard,
  from: PositionChangedEvent["from"],
  to: PositionChangedEvent["to"],
  turn: number,
): PositionChangedEvent {
  return {
    id: builder.nextId(),
    type: "position-changed",
    message: `${playerId} changed a monster to ${to} position.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    from,
    to,
    turn,
  };
}

function createPhaseChangedEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  from: PhaseChangedEvent["from"],
  to: PhaseChangedEvent["to"],
  turn: number,
): PhaseChangedEvent {
  const standbyPrefix = from === "SP" && to === "M1" ? "No Standby Phase actions were available. " : "";

  return {
    id: builder.nextId(),
    type: "phase-changed",
    message: `${standbyPrefix}Entered ${phaseLabel(to)}.`,
    playerId,
    from,
    to,
    turn,
    metadata: from === "SP" && to === "M1" ? { standbyPlaceholder: true } : undefined,
  };
}

function createHandSizeDiscardEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  discard: HandSizeDiscard,
  turn: number,
): CardMovedEvent {
  return {
    id: builder.nextId(),
    type: "card-moved",
    message: `${playerId} discarded a card for hand size.`,
    playerId,
    instanceId: discard.card.instanceId,
    cardId: discard.card.cardId,
    from: { playerId, zone: "hand", index: discard.fromHandIndex },
    to: { playerId, zone: "graveyard", index: discard.toGraveyardIndex },
    turn,
    metadata: { reason: "hand-size-discard" },
  };
}

function createPlayerLostEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  reason: PlayerLostEvent["reason"],
  turn: number,
): PlayerLostEvent {
  return {
    id: builder.nextId(),
    type: "player-lost",
    message: `${playerId} lost by ${reason}.`,
    playerId,
    reason,
    turn,
  };
}

function createDuelFinishedEvent(
  builder: EventBuilder,
  winner: PlayerId | null,
  reason: DuelFinishedEvent["reason"],
  turn: number,
): DuelFinishedEvent {
  return {
    id: builder.nextId(),
    type: "duel-finished",
    message: winner ? `${winner} won by ${reason}.` : "The duel ended in a draw.",
    winner,
    reason,
    turn,
    playerId: winner ?? undefined,
  };
}

function appendEventIds(state: DuelState, events: readonly EngineEvent[]): DuelState {
  if (events.length === 0) {
    return state;
  }

  return {
    ...state,
    eventIds: [...state.eventIds, ...events.map((event) => event.id)],
  };
}

function resetPlayerForNewTurn(player: PlayerState): PlayerState {
  return {
    ...player,
    normalSummonUsed: false,
  };
}

function setMonsterZone(state: DuelState, playerId: PlayerId, zoneIndex: number, card: ZoneCard | null): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        monsterZones: replaceArrayIndex(state.players[playerId].monsterZones, zoneIndex, card),
      },
    },
  };
}

function setPlayerLp(state: DuelState, playerId: PlayerId, lp: number): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        lp,
      },
    },
  };
}

function createDamageEvents(
  builder: EventBuilder,
  playerId: PlayerId,
  amount: number,
  source: ZoneCard,
  state: DuelState,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  if (amount <= 0) {
    return { state, events: [] };
  }

  const previous = state.players[playerId].lp;
  const next = Math.max(0, previous - amount);
  const events = [
    createBattleDamageEvent(builder, playerId, amount, source, state.turn),
    createLpChangedEvent(builder, playerId, previous, next, state.turn),
  ];
  const damagedState = setPlayerLp(state, playerId, next);
  const terminal = applyAutomaticWinConditions(damagedState, builder);

  return {
    state: terminal.state,
    events: [...events, ...terminal.events],
  };
}

function applyAutomaticWinConditions(
  state: DuelState,
  builder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  if (isDuelFinished(state)) {
    return { state, events: [] };
  }

  const lpZeroLoser = playerWithZeroLp(state);

  if (lpZeroLoser) {
    return finishDuel(state, lpZeroLoser, "lp-zero", builder);
  }

  const exodiaWinner = findExodiaWinner(state);

  if (exodiaWinner) {
    return finishDuel(state, opponentOf(exodiaWinner), "exodia", builder);
  }

  return { state, events: [] };
}

function finishDuel(
  state: DuelState,
  loser: PlayerId,
  reason: LossReason,
  builder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const winner = opponentOf(loser);
  const playerLost = createPlayerLostEvent(builder, loser, reason, state.turn);
  const duelFinished = createDuelFinishedEvent(builder, winner, reason, state.turn);
  const finishedState = appendEventIds(
    {
      ...state,
      winner,
      players: {
        ...state.players,
        [loser]: {
          ...state.players[loser],
          lost: true,
        },
      },
    },
    [playerLost, duelFinished],
  );

  return {
    state: finishedState,
    events: [playerLost, duelFinished],
  };
}

function destroyMonster(
  state: DuelState,
  playerId: PlayerId,
  zoneIndex: number,
  builder: EventBuilder,
  turn: number,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const card = state.players[playerId].monsterZones[zoneIndex];

  if (!card) {
    return { state, events: [] };
  }

  const replacement: { replaced: boolean; action?: "prevent" | "banish-instead" } = { replaced: false };

  if (replacement.replaced && replacement.action === "prevent") {
    return { state, events: [] };
  }

  if (replacement.replaced && replacement.action === "banish-instead") {
    const banishedCard: ZoneCard = {
      ...toPublicZoneCard(card),
      position: null,
    };
    const destinationPlayerId = card.owner;
    const playersWithoutMonster: Record<PlayerId, PlayerState> = {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        monsterZones: replaceArrayIndex(state.players[playerId].monsterZones, zoneIndex, null),
      },
    };
    const withoutMonster = applyStateBasedCleanup({
      ...state,
      players: {
        ...playersWithoutMonster,
        [destinationPlayerId]: {
          ...playersWithoutMonster[destinationPlayerId],
          banished: [banishedCard, ...playersWithoutMonster[destinationPlayerId].banished],
        },
      },
    });
    const events: EngineEvent[] = [
      createCardMovedEvent(
        builder,
        playerId,
        banishedCard,
        { playerId, zone: "monsterZone", index: zoneIndex },
        { playerId: destinationPlayerId, zone: "banished", index: 0 },
        turn,
        "destruction-replacement",
      ),
    ];
    const linked = handleLinkedCardsOnLeave(withoutMonster, card, builder);

    return {
      state: linked.state,
      events: [...events, ...linked.events],
    };
  }

  const destroyedCard: ZoneCard = {
    ...toPublicZoneCard(card),
    position: null,
  };
  const destinationPlayerId = card.owner;
  const playersWithoutMonster: Record<PlayerId, PlayerState> = {
    ...state.players,
    [playerId]: {
      ...state.players[playerId],
      monsterZones: replaceArrayIndex(state.players[playerId].monsterZones, zoneIndex, null),
    },
  };
  const withoutMonster = applyStateBasedCleanup({
    ...state,
    players: {
      ...playersWithoutMonster,
      [destinationPlayerId]: {
        ...playersWithoutMonster[destinationPlayerId],
        graveyard: [destroyedCard, ...playersWithoutMonster[destinationPlayerId].graveyard],
      },
    },
  });
  const events: EngineEvent[] = [
    createCardDestroyedEvent(builder, playerId, card, turn),
    createCardMovedEvent(
      builder,
      playerId,
      destroyedCard,
      { playerId, zone: "monsterZone", index: zoneIndex },
      { playerId: destinationPlayerId, zone: "graveyard", index: 0 },
      turn,
      "battle-destruction",
    ),
  ];
  const linked = handleLinkedCardsOnLeave(withoutMonster, card, builder);

  return {
    state: linked.state,
    events: [...events, ...linked.events],
  };
}

function buildDuelCardDefinitions(
  cards: readonly CardRecord[],
  decks: Readonly<Record<PlayerId, DeckList>>,
): Readonly<Record<string, CardDefinition>> {
  const cardIds = new Set([...decks.P1.main, ...decks.P2.main]);
  const definitions: Record<string, CardDefinition> = {};

  for (const card of cards) {
    if (cardIds.has(card.passcode)) {
      definitions[card.passcode] = normalizeCard(card);
    }
  }

  return definitions;
}

function toMonsterZoneCard(card: CardInstance, playKind: MonsterPlayKind, turn: number): ZoneCard {
  return {
    ...card,
    face: playKind === "set-monster" ? "faceDown" : "faceUp",
    position: playKind === "set-monster" ? "defense" : "attack",
    visibility: playKind === "set-monster" ? "hidden" : "public",
    counters: {},
    attachments: [],
    summonedTurn: turn,
    positionChangedTurn: null,
    attackedTurn: null,
  };
}

function toSpellTrapZoneCard(card: CardInstance, turn: number): ZoneCard {
  return {
    ...card,
    face: "faceDown",
    position: null,
    visibility: "hidden",
    counters: {},
    attachments: [],
    setTurn: turn,
  };
}

function toZoneEventCard(
  card: CardInstance,
  options: { readonly position?: "attack" | "defense" | null } = {},
): ZoneCard {
  return {
    ...card,
    face: "faceUp",
    position: options.position ?? null,
    visibility: "public",
    counters: {},
    attachments: [],
  };
}

function toPublicEventCard(card: CardInstance): ZoneCard {
  return toZoneEventCard(card);
}

function toPublicZoneCard(card: ZoneCard): ZoneCard {
  return {
    ...card,
    face: "faceUp",
    visibility: "public",
  };
}

function replaceArrayIndex<T>(items: readonly T[], index: number, item: T): readonly T[] {
  if (index < 0 || index >= items.length) {
    throw new Error(`Replace index ${index} is outside zone bounds.`);
  }

  return items.map((current, currentIndex) => (currentIndex === index ? item : current));
}

function emptyZones(): readonly null[] {
  return Array.from({ length: ZONE_COUNT }, () => null);
}

function isPlayerId(playerId: string): playerId is PlayerId {
  return playerId === "P1" || playerId === "P2";
}

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}
