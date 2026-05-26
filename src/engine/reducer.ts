import type { CardRecord } from "../types";
import type { DeckMonsterFilter, EffectDefinition, EffectResolutionStep } from "./cards/CardScript";
import { getCardScriptForDefinitions, EFFECT_NOT_IMPLEMENTED } from "./cards/unsupported";
import type { EngineCommand } from "./commands";
import type { AttachmentLeaveBehavior, CardInstance, TokenData, ZoneCard, ZoneRef } from "./core/cardRefs";
import { cloneDuelState } from "./core/clone";
import type { DuelState, PendingAttackState, PlayerState } from "./core/state";
import { findCardByInstanceId, insertIntoZone, removeFromZone, setCardFace, updateMonsterPosition } from "./core/zones";
import type { CardDefinition } from "./data/cardCatalog";
import { normalizeCard } from "./data/normalizeCard";
import { validateDeck, type DeckValidationOptions } from "./deckValidation";
import {
  canAttackDirectly,
  deriveBattleStats,
  hasPiercingDamage,
  validateContinuousActivationRestrictions,
  validateContinuousAttackRestrictions,
  validateDirectAttackRestrictions,
} from "./effects/continuous";
import { payCosts, type PaidCost } from "./effects/costs";
import { addLingeringEffect } from "./effects/lingering";
import { findDestructionReplacement } from "./effects/replacement";
import { validateStoredTargets, validateTargetSelection, type SelectedTargets, type TargetSpec } from "./effects/targets";
import type { EngineError } from "./errors";
import type {
  CardDrawnEvent,
  CardMovedEvent,
  AttackDeclaredEvent,
  BattleCompletedEvent,
  BattleDamageEvent,
  CardBanishedEvent,
  CardDestroyedEvent,
  ChainLinkCreatedEvent,
  ChainResolvedEvent,
  CostPaidEvent,
  DuelFinishedEvent,
  EffectActivatedEvent,
  EffectNotImplementedEvent,
  EffectResolvedWithoutEffectEvent,
  DuelStartedEvent,
  EngineEvent,
  IllegalActionEvent,
  LpChangedEvent,
  MonsterFlippedFaceUpEvent,
  MonsterSetEvent,
  PhaseChangedEvent,
  PlayerLostEvent,
  PositionChangedEvent,
  PromptCreatedEvent,
  PromptResolvedEvent,
  SpellTrapSetEvent,
  SummonDeclaredEvent,
  SummonSuccessfulEvent,
  TargetsChosenEvent,
  TurnStartedEvent,
} from "./events";
import { createPrompt, type PromptDefinition } from "./prompts/prompt";
import { validatePromptAnswer } from "./prompts/selection";
import type { EnginePrompt, EngineResult } from "./result";
import { createRngState, nextRandom, shuffleWithRng, type RngState } from "./random";
import { addChainLink, createChainLink, resolveChainLifo, type ChainLink } from "./rules/chain";
import {
  createDamageCalculationStep,
  getMonsterBattleStats,
  resolveMonsterBattle,
  validateAttackDeclaration,
} from "./rules/battle";
import {
  closeDamageStep,
  validateDamageStepActivation,
} from "./rules/damageStep";
import { discardHandToLimit, type HandSizeDiscard } from "./rules/endPhase";
import { getNextPhase, isNextPhase, phaseLabel } from "./rules/phases";
import { validateManualPositionChange } from "./rules/positionChange";
import { applyStateBasedCleanup } from "./rules/stateBasedCleanup";
import {
  createPriorityWindow,
  passPriority,
  PASS_PRIORITY,
  validatePriorityPass,
  type PriorityWindowReason,
} from "./rules/priority";
import { validateSpellSpeedForChain } from "./rules/spellSpeed";
import {
  collectTriggerCandidates,
  createOptionalTriggerPrompt,
  createTriggerTargetPrompt,
  triggerCandidateFromPrompt,
  type TriggerCandidate,
  type TriggerTiming,
} from "./rules/triggers";
import {
  isMainPhase,
  validateFlipSummonCard,
  validateMonsterPlay,
  type MonsterPlayKind,
} from "./rules/summons";
import {
  findExodiaWinner,
  implementedCardIdsFromRegistry,
  playerWithZeroLp,
  type LossReason,
} from "./rules/winConditions";
import type { DeckList, PlayerId, TurnMode } from "./types";

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

interface RitualSummonCard {
  readonly ref: ZoneRef;
  readonly card: CardInstance | ZoneCard;
  readonly definition: CardDefinition;
}

interface RitualSummonSelection {
  readonly ritualMonster: RitualSummonCard;
  readonly tributes: readonly RitualSummonCard[];
  readonly requiredLevel: number;
  readonly levelRequirement: "at-least" | "exact";
  readonly totalTributeLevel: number;
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
    priorityPlayer: firstPlayer,
    turnFlags: {
      drawnThisTurn: false,
      battlePhaseConducted: false,
    },
    priority: createPriorityWindow(firstPlayer, "phase-start"),
    damageStep: closeDamageStep(),
    cardDefinitions: buildDuelCardDefinitions(config.cards, config.decks),
    implementedCardIds: implementedCardIdsFromRegistry(validationOptions.coverageRegistry),
    players,
    chain: [],
    lingeringEffects: [],
    controlChangeReturns: [],
    effectUsage: {},
    negatedChainLinkIds: [],
    prompts: {},
    pendingPromptIds: [],
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
    case PASS_PRIORITY:
      return passPriorityCommand(state, command);
    case "resolve-chain":
      return resolveChain(state, command);
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
      return activateCard(state, command);
    case "answer-prompt":
      return answerPrompt(state, command);
    case "set-spell-trap":
      return setSpellTrap(state, command);
    case "move-card":
      return unimplementedCommand(state, command);
  }
}

function changePhase(state: DuelState, command: Extract<EngineCommand, { type: "change-phase" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  const pendingProcedure = validateNoPendingPhaseProcedure(state);

  if (pendingProcedure) {
    return illegalResult(state, command, pendingProcedure, command.playerId);
  }

  if (!isNextPhase(state.phase, command.phase)) {
    return illegalResult(
      state,
      command,
      `Cannot move from ${phaseLabel(state.phase)} to ${phaseLabel(command.phase)}.`,
      command.playerId,
    );
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
    applyStateBasedCleanup(
      withPriorityWindow(
        {
          ...nextState,
          phase: command.phase,
          turnFlags: {
            drawnThisTurn: nextState.turnFlags?.drawnThisTurn ?? state.turnFlags?.drawnThisTurn ?? false,
            battlePhaseConducted:
              command.phase === "BP" || nextState.turnFlags?.battlePhaseConducted === true,
          },
          damageStep: closeDamageStep(),
        },
        command.playerId,
        "phase-start",
      ),
    ),
    [phaseChanged],
  );
  const controlReturns = command.phase === "EP"
    ? applyScheduledControlReturns(nextState, eventBuilder)
    : { state: nextState, events: [] as EngineEvent[] };

  nextState = appendEventIds(controlReturns.state, controlReturns.events);
  const sourceEvents = [phaseChanged, ...controlReturns.events];
  const triggers = collectTriggers(nextState, sourceEvents, "after-action", eventBuilder);

  return result(command, triggers.state, [...events, phaseChanged, ...controlReturns.events, ...triggers.events], triggers.prompts);
}

function endTurn(state: DuelState, command: Extract<EngineCommand, { type: "end-turn" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  const pendingProcedure = validateNoPendingPhaseProcedure(state);

  if (pendingProcedure) {
    return illegalResult(state, command, pendingProcedure, command.playerId);
  }

  if (state.phase !== "EP") {
    return illegalResult(state, command, "Turns can only be ended from the End Phase.", command.playerId);
  }

  const cleanedState = applyStateBasedCleanup(state);
  const eventBuilder = createEventBuilder(cleanedState.eventIds.length);
  const discardResult = discardHandToLimit(cleanedState.players[command.playerId]);
  const discardEvents = discardResult.discards.map((discard) =>
    createHandSizeDiscardEvent(eventBuilder, command.playerId, discard, state.turn, state.phase),
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
    ...priorityWindowFields(nextPlayer, "phase-start"),
    players: {
      P1: resetPlayerForNewTurn(players.P1),
      P2: resetPlayerForNewTurn(players.P2),
    },
  };
  const events = [...discardEvents, phaseChanged, turnStarted];
  const withEvents = appendEventIds(nextState, events);
  const triggers = collectTriggers(withEvents, events, "after-action", eventBuilder);

  return result(command, triggers.state, [...events, ...triggers.events], triggers.prompts);
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
        toPublicZoneCard(tribute),
        { playerId: command.playerId, zone: "monsterZone", index: tributeIndex },
        { playerId: command.playerId, zone: "graveyard", index: 0 },
        state.turn,
        state.phase,
        state.chain.length,
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
    withPostMonsterPlayPriority(
      {
        ...cloneDuelState(state),
        players: {
          ...state.players,
          [command.playerId]: nextPlayer,
        },
      },
      command.playerId,
      playKind,
    ),
    events,
  );
  const triggers = collectTriggers(nextState, events, "after-action", eventBuilder);

  return result(command, triggers.state, [...events, ...triggers.events], triggers.prompts);
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
    withPriorityWindow(
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
      command.playerId,
      "summon-successful",
    ),
    events,
  );
  const triggers = collectTriggers(nextState, events, "after-action", eventBuilder);

  return result(command, triggers.state, [...events, ...triggers.events], triggers.prompts);
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
  const triggers = collectTriggers(nextState, [event], "after-action", eventBuilder);

  return result(command, triggers.state, [event, ...triggers.events], triggers.prompts);
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
  const canDirectAttack = attacker
    ? canAttackDirectly(state, {
        playerId: attackerPlayerId,
        card: attacker,
      })
    : false;
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

  const attackRestriction = validateContinuousAttackRestrictions(
    state,
    attackerPlayerId,
    attacker,
    defender ? { playerId: defenderPlayerId, card: defender } : null,
  );

  if (attackRestriction) {
    return illegalResult(state, command, attackRestriction, command.playerId);
  }

  if (!command.defenderInstanceId) {
    const directAttackRestriction = validateDirectAttackRestrictions(state, attackerPlayerId, attacker);

    if (directAttackRestriction) {
      return illegalResult(state, command, directAttackRestriction, command.playerId);
    }
  }

  const attackerBaseStats = getBattleStatsForZoneCard(state, attacker);

  if (!attackerBaseStats) {
    return illegalResult(state, command, "Attacking monster is missing numeric battle stats.", command.playerId);
  }

  if (defender && !getBattleStatsForZoneCard(state, defender)) {
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
  const attackTriggers = collectTriggers(declaredState, events, "after-action", eventBuilder);

  if (attackTriggers.events.length > 0 || attackTriggers.prompts.length > 0) {
    return result(command, attackTriggers.state, [...events, ...attackTriggers.events], attackTriggers.prompts);
  }

  const battle = resolvePendingAttack(declaredState, eventBuilder);
  const withBattleEvents = appendEventIds(battle.state, battle.events);
  const triggers = collectTriggers(withBattleEvents, battle.events, "after-action", eventBuilder);

  return result(command, triggers.state, [...events, ...battle.events, ...triggers.events], triggers.prompts);
}

function activateCard(state: DuelState, command: Extract<EngineCommand, { type: "activate-card" }>): EngineResult {
  const preflight = validatePlayerCommand(state, command);

  if (preflight) {
    return preflight;
  }

  const located = findCardByInstanceId(state, command.instanceId);

  if (!located) {
    return illegalResult(state, command, "Selected card was not found.", command.playerId);
  }

  if (located.ref.playerId !== command.playerId) {
    return illegalResult(state, command, "Selected card is not controlled by that player.", command.playerId);
  }

  const script = getCardScriptForDefinitions(located.card.cardId, state.cardDefinitions, state.cardScripts);

  if (!script) {
    return missingEffectResult(state, command, located.card.cardId, located.card.instanceId);
  }

  const effect = command.effectId
    ? script.effects.find((candidate) => candidate.id === command.effectId)
    : script.effects[0];

  if (!effect || !effect.implemented) {
    return illegalResult(state, command, "That card has no activatable effects.", command.playerId);
  }

  const cardDefinition = state.cardDefinitions?.[located.card.cardId];

  if (cardDefinition?.kind === "trap") {
    if (located.ref.zone !== "spellTrapZone") {
      return illegalResult(state, command, "Trap cards must be Set before they can be activated.", command.playerId);
    }

    if (isZoneCard(located.card) && located.card.setTurn === state.turn) {
      return illegalResult(state, command, "Trap cards cannot be activated the turn they were Set.", command.playerId);
    }
  }

  if (cardDefinition) {
    const activationRestriction = validateContinuousActivationRestrictions(state, command.playerId, cardDefinition.kind);

    if (activationRestriction) {
      return illegalResult(state, command, activationRestriction, command.playerId);
    }
  }

  if (effect.kind === "trigger") {
    return illegalResult(state, command, "Trigger effects can only be activated by their trigger timing.", command.playerId);
  }

  const activationWindowError = validateActivationWindow(state, effect, command.playerId);

  if (activationWindowError) {
    return illegalResult(state, command, activationWindowError, command.playerId);
  }

  const ignitionError = validateIgnitionActivation(state, effect, command.playerId);

  if (ignitionError) {
    return illegalResult(state, command, ignitionError, command.playerId);
  }

  const oncePerTurnError = validateOncePerTurnUsage(
    state,
    command.playerId,
    located.card.cardId,
    located.card.instanceId,
    effect,
  );

  if (oncePerTurnError) {
    return illegalResult(state, command, oncePerTurnError, command.playerId);
  }

  const damageStepError = validateDamageStepActivation(state, effect);

  if (damageStepError) {
    return illegalResult(state, command, damageStepError, command.playerId);
  }

  if (script.canActivate?.({ state, command, sourceInstanceId: located.card.instanceId }) === false) {
    return illegalResult(state, command, "That effect cannot be activated right now.", command.playerId);
  }

  const promptRequests = activationPromptsForEffect(effect.prompts, effect.targets, command);

  if (promptRequests.length > 0) {
    return createPromptResult(state, command, promptRequests);
  }

  const targetResult = validateTargetSelection(
    state,
    command.playerId,
    effect.targets ?? [],
    {
      targetRefs: command.targetRefs ?? [],
      targetPlayerIds: command.targetPlayerIds ?? [],
    },
  );

  if (!targetResult.valid) {
    return illegalResult(state, command, targetResult.reason ?? "Invalid effect targets.", command.playerId);
  }

  const procedureError = validateProcedureSelection(
    state,
    command.playerId,
    located.card.instanceId,
    effect,
    targetResult.selectedTargets,
  );

  if (procedureError) {
    return illegalResult(state, command, procedureError, command.playerId);
  }

  const costResult = payCosts(state, command.playerId, effect.costs ?? [], {
    instanceIds: command.costInstanceIds ?? [],
    sourceInstanceId: located.card.instanceId,
  });

  if (!costResult.valid) {
    return illegalResult(state, command, costResult.reason ?? "Cost could not be paid.", command.playerId);
  }

  const spellSpeed = effect.spellSpeed ?? 1;
  const spellSpeedError = validateSpellSpeedForChain(state.chain, spellSpeed);

  if (spellSpeedError) {
    return illegalResult(state, command, spellSpeedError, command.playerId);
  }

  const eventBuilder = createEventBuilder(state.eventIds.length);
  const chainLink = createChainLink(
    {
      playerId: command.playerId,
      sourceInstanceId: located.card.instanceId,
      cardId: located.card.cardId,
      effectId: effect.id,
      spellSpeed,
      ...(costResult.paidCosts.length > 0 ? { paidCosts: costResult.paidCosts } : {}),
      ...(effect.targets && effect.targets.length > 0 ? { targetSpecs: effect.targets } : {}),
      ...(targetResult.selectedTargets.targetRefs.length > 0 || targetResult.selectedTargets.targetPlayerIds.length > 0
        ? { selectedTargets: targetResult.selectedTargets }
        : {}),
    },
    state.chain,
  );
  const events: EngineEvent[] = [
    ...costResult.paidCosts.map((paidCost) => createCostPaidEvent(eventBuilder, command.playerId, paidCost, state.turn)),
    ...(targetResult.selectedTargets.targetRefs.length > 0
      ? [createTargetsChosenEvent(eventBuilder, command.playerId, chainLink, targetResult.selectedTargets.targetRefs, state.turn)]
      : []),
    createEffectActivatedEvent(eventBuilder, chainLink, state.turn),
    createChainLinkCreatedEvent(eventBuilder, chainLink, state.turn),
  ];
  const stateWithUsage = markOncePerTurnUsage(
    costResult.state,
    command.playerId,
    located.card.cardId,
    located.card.instanceId,
    effect,
  );
  const stateWithSourceRevealed = revealActivationSource(stateWithUsage, located.ref);
  const nextState: DuelState = appendEventIds(
    {
      ...cloneDuelState(stateWithSourceRevealed),
      chain: addChainLink(state.chain, chainLink),
    },
    events,
  );

  return result(command, nextState, events);
}

function passPriorityCommand(
  state: DuelState,
  command: Extract<EngineCommand, { type: typeof PASS_PRIORITY }>,
): EngineResult {
  if (!isPlayerId(command.playerId)) {
    return illegalResult(state, command, `Unknown player: ${command.playerId}.`, command.playerId);
  }

  if (isDuelFinished(state)) {
    return illegalResult(state, command, "The duel is already over.", command.playerId);
  }

  const validation = validatePriorityPass(state.priority, command.playerId);

  if (validation) {
    return illegalResult(state, command, validation, command.playerId);
  }

  const nextPriority = passPriority(state.priority, command.playerId, state.activePlayer);
  const nextState: DuelState = {
    ...cloneDuelState(state),
    priority: nextPriority,
    priorityPlayer: nextPriority.holder,
  };

  return result(command, nextState);
}

function answerPrompt(state: DuelState, command: Extract<EngineCommand, { type: "answer-prompt" }>): EngineResult {
  const preflight = validatePromptCommand(state, command);

  if (preflight) {
    return preflight;
  }

  const prompt = state.prompts[command.promptId];

  if (!prompt || !state.pendingPromptIds.includes(command.promptId)) {
    return illegalResult(state, command, "Prompt is not pending.", command.playerId);
  }

  if (state.pendingPromptIds[0] !== command.promptId) {
    return illegalResult(state, command, "Pending prompts must be answered in order.", command.playerId);
  }

  if (prompt.playerId !== command.playerId) {
    return illegalResult(state, command, "Prompt belongs to another player.", command.playerId);
  }

  const validation = validatePromptAnswer(prompt, command);

  if (validation) {
    return illegalResult(state, command, validation, command.playerId);
  }

  const triggerTarget = prompt.kind === "target" ? validateTriggerTargetPrompt(state, prompt, command) : null;

  if (triggerTarget?.error) {
    return illegalResult(state, command, triggerTarget.error, command.playerId);
  }

  const eventBuilder = createEventBuilder(state.eventIds.length);
  const event = createPromptResolvedEvent(eventBuilder, prompt, state.turn);
  const { [prompt.id]: _resolved, ...remainingPrompts } = state.prompts;
  let nextState: DuelState = {
    ...cloneDuelState(state),
    prompts: remainingPrompts,
    pendingPromptIds: state.pendingPromptIds.filter((promptId) => promptId !== prompt.id),
  };
  const events: EngineEvent[] = [event];
  const optionalTrigger = command.choiceIds?.[0] === "yes" ? triggerCandidateFromPrompt(prompt) : null;

  if (optionalTrigger) {
    const queued = queueTriggerChainLink(nextState, optionalTrigger, eventBuilder);
    nextState = queued.state;
    events.push(...queued.events);
  }

  if (triggerTarget?.candidate) {
    const queued = queueTriggerChainLink(nextState, triggerTarget.candidate, eventBuilder, {
      selectedTargets: triggerTarget.selectedTargets,
      targetSpecs: triggerTarget.targetSpecs,
    });

    nextState = queued.state;
    events.push(...queued.events);
  }

  if (nextState.pendingAttack && nextState.chain.length === 0 && nextState.pendingPromptIds.length === 0) {
    const battle = resolvePendingAttack(applyStateBasedCleanup(nextState), eventBuilder);
    const withBattleEvents = appendEventIds(battle.state, battle.events);
    const triggers = collectTriggers(withBattleEvents, battle.events, "after-action", eventBuilder);

    return result(command, triggers.state, [...events, ...battle.events, ...triggers.events], triggers.prompts);
  }

  return result(command, appendEventIds(nextState, events), events);
}

function resolveChain(state: DuelState, command: Extract<EngineCommand, { type: "resolve-chain" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  if (state.pendingPromptIds.length > 0) {
    return illegalResult(state, command, "Pending prompts must be answered before resolving the chain.", command.playerId);
  }

  if (state.chain.length === 0) {
    return illegalResult(state, command, "No chain is currently active.", command.playerId);
  }

  const resolved = resolveChainLifo(state.chain);
  const brokenLink = resolved.resolvedLinks
    .map((link) => validateResolvableChainLink(state, link))
    .find((linkResult) => linkResult !== null);

  if (brokenLink) {
    if (brokenLink.kind === "effect-not-implemented") {
      return unresolvedChainLinkResult(state, command, brokenLink.link, brokenLink.reason);
    }

    return illegalResult(state, command, brokenLink.reason, command.playerId);
  }

  const eventBuilder = createEventBuilder(state.eventIds.length);
  const chainEvents = resolved.resolvedLinks.map((link) => createChainResolvedEvent(eventBuilder, link, state.turn));
  const applied = applyResolvedChainLinkEffects(
    withPriorityWindow(
      {
        ...cloneDuelState(state),
        chain: resolved.remainingChain,
      },
      state.activePlayer,
      "chain-resolved",
    ),
    resolved.resolvedLinks,
    eventBuilder,
  );
  const pendingAttack = resolvePendingAttack(applyStateBasedCleanup(applied.state), eventBuilder);
  const terminal = applyAutomaticWinConditionsUnrecorded(applyStateBasedCleanup(pendingAttack.state), eventBuilder);
  const events = [...chainEvents, ...applied.events, ...pendingAttack.events, ...terminal.events];
  const nextState = appendEventIds({ ...terminal.state, negatedChainLinkIds: [] }, events);
  const triggers = collectTriggers(nextState, events, "chain-resolved", eventBuilder);

  return result(command, triggers.state, [...events, ...triggers.events], triggers.prompts);
}

type UnresolvableChainLink =
  | { readonly kind: "illegal"; readonly link: ChainLink; readonly reason: string }
  | { readonly kind: "effect-not-implemented"; readonly link: ChainLink; readonly reason: string };

function validateResolvableChainLink(state: DuelState, link: ChainLink): UnresolvableChainLink | null {
  if (!link.cardId || !link.effectId || !link.sourceInstanceId) {
    return {
      kind: "illegal",
      link,
      reason: `Malformed chain link ${link.id} cannot be resolved.`,
    };
  }

  const script = getCardScriptForDefinitions(link.cardId, state.cardDefinitions, state.cardScripts);

  if (!script) {
    return {
      kind: "effect-not-implemented",
      link,
      reason: `card ${link.cardId} has no implemented effect script`,
    };
  }

  const effect = script.effects.find((candidate) => candidate.id === link.effectId);

  if (!effect || !effect.implemented) {
    return {
      kind: "effect-not-implemented",
      link,
      reason: `effect ${link.effectId} is not implemented for card ${link.cardId}`,
    };
  }

  if (effect.kind === "lingering" && effect.lingering) {
    return null;
  }

  if (!effect.resolution) {
    return {
      kind: "effect-not-implemented",
      link,
      reason: `effect ${link.effectId} for card ${link.cardId} has no implemented resolution`,
    };
  }

  return null;
}

function applyResolvedChainLinkEffects(
  state: DuelState,
  links: readonly ChainLink[],
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  return links.reduce(
    (resultState, link) => {
      if (isDuelFinished(resultState.state)) {
        return resultState;
      }

      const resolved = applyResolvedChainLinkEffect(resultState.state, link, eventBuilder, links);

      return {
        state: resolved.state,
        events: [...resultState.events, ...resolved.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyResolvedChainLinkEffect(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
  resolvingLinks: readonly ChainLink[],
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const script = getCardScriptForDefinitions(link.cardId, state.cardDefinitions, state.cardScripts);
  const effect = script?.effects.find((candidate) => candidate.id === link.effectId);

  if (state.negatedChainLinkIds?.includes(link.id)) {
    const skipped = createEffectResolvedWithoutEffectEvent(eventBuilder, link, "Chain link was negated.", state.turn);
    const sourceMoved =
      effect?.resolution?.sendSourceToGraveyard === false
        ? { state, events: [] as EngineEvent[] }
        : sendSourceToGraveyard(state, link, eventBuilder);

    return {
      state: sourceMoved.state,
      events: [skipped, ...sourceMoved.events],
    };
  }

  const targetValidation = validateStoredTargets(state, link.playerId, link.targetSpecs, link.selectedTargets);

  if (!targetValidation.valid) {
    const reason = targetValidation.reason ?? "Stored targets are no longer valid.";
    const skipped = createEffectResolvedWithoutEffectEvent(eventBuilder, link, reason, state.turn);
    const sourceMoved =
      effect?.resolution?.sendSourceToGraveyard === false
        ? { state, events: [] as EngineEvent[] }
        : sendSourceToGraveyard(state, link, eventBuilder);

    return {
      state: sourceMoved.state,
      events: [skipped, ...sourceMoved.events],
    };
  }

  if (effect?.kind === "lingering" && effect.implemented && effect.lingering) {
    return {
      state: addLingeringEffect(state, link, effect.lingering),
      events: [],
    };
  }

  if (!effect?.implemented || !effect.resolution) {
    return { state, events: [] };
  }

  const resolved = effect.resolution.steps.reduce(
    (stepResult, step) => {
      if (isDuelFinished(stepResult.state)) {
        return stepResult;
      }

      const resolvedStep = applyResolutionStep(stepResult.state, link, effect, step, eventBuilder, resolvingLinks);

      return {
        state: resolvedStep.state,
        events: [...stepResult.events, ...resolvedStep.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );

  if (effect.resolution.sendSourceToGraveyard === false || isDuelFinished(resolved.state)) {
    return resolved;
  }

  const sourceMoved = sendSourceToGraveyard(resolved.state, link, eventBuilder);

  return {
    state: sourceMoved.state,
    events: [...resolved.events, ...sourceMoved.events],
  };
}

function applyResolutionStep(
  state: DuelState,
  link: ChainLink,
  _effect: EffectDefinition,
  step: EffectResolutionStep,
  eventBuilder: EventBuilder,
  resolvingLinks: readonly ChainLink[],
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  switch (step.kind) {
    case "add-lingering-effect":
      return {
        state: addLingeringEffect(state, link, step.lingering),
        events: [],
      };
    case "draw":
      return applyDrawResolutionStep(state, playerForSelector(link.playerId, step.player), step.count, eventBuilder);
    case "add-counter-to-source":
      return applyAddCounterToSourceStep(state, link, step.counterType, step.count, step.max);
    case "modify-pending-battle-atk":
      return applyModifyPendingBattleAtkStep(state, link, step.amount);
    case "set-pending-battle-atk":
      return applySetPendingBattleAtkStep(state, link, step.value);
    case "damage-attacker-by-battle-atk-destroy-source":
      return applyDamageAttackerByBattleAtkDestroySourceStep(state, link, eventBuilder);
    case "destroy-targets-damage-both-players-by-monster-atk":
      return applyDestroyTargetsDamageBothPlayersByMonsterAtkStep(state, link, eventBuilder);
    case "destroy-targets":
      return applyDestroyTargetsStep(state, link, eventBuilder);
    case "destroy-targets-if-spell":
      return applyDestroyTargetsIfSpellStep(state, link, eventBuilder);
    case "destroy-face-up-monsters-by-type":
      return applyDestroyFaceUpMonstersByTypeStep(state, step.monsterType, eventBuilder);
    case "draw-then-destroy-controlled-face-up-card-id-if-count":
      return applyDrawThenDestroyControlledFaceUpCardIdIfCountStep(
        state,
        link.playerId,
        step.cardId,
        step.count,
        step.drawCount,
        eventBuilder,
      );
    case "destroy-opponent-face-up-monsters-by-level":
      return applyDestroyOpponentFaceUpMonstersByLevelStep(state, link.playerId, step.level, eventBuilder);
    case "banish-battle-participants":
      return applyBanishBattleParticipantsStep(state, link, eventBuilder);
    case "destroy-all-spells-traps":
      return applyDestroyAllSpellsTrapsStep(state, link.playerId, step.controller, eventBuilder);
    case "destroy-all-spells-traps-if-targets-returned-to-hand":
      return applyDestroyAllSpellsTrapsIfTargetsReturnedToHandStep(state, link, step.controller, eventBuilder);
    case "destroy-all-monsters":
      return applyDestroyAllMonstersStep(state, link.playerId, step.controller, eventBuilder);
    case "destroy-face-up-monsters":
      return applyDestroyFaceUpMonstersStep(state, link.playerId, step.controller, eventBuilder);
    case "destroy-attack-source":
      return applyDestroyAttackSourceStep(state, link, eventBuilder);
    case "destroy-opponent-attack-position-monsters":
      return applyDestroyOpponentAttackPositionMonstersStep(state, link.playerId, eventBuilder);
    case "negate-attack":
      return applyNegateAttackStep(state);
    case "gain-lp-by-attack-source-atk":
      return applyGainLpByAttackSourceAtkStep(state, link, eventBuilder);
    case "negate-previous-chain-link":
      return applyNegatePreviousChainLinkStep(state, link, eventBuilder, resolvingLinks);
    case "place-source-in-spell-trap-zone":
      return applyPlaceSourceInSpellTrapZoneStep(state, link, eventBuilder);
    case "place-source-in-field-zone":
      return applyPlaceSourceInFieldZoneStep(state, link, eventBuilder);
    case "add-lingering-stat-modifiers-to-targets":
      return applyAddLingeringStatModifiersToTargetsStep(state, link, step);
    case "search-deck-to-hand":
      return applySearchDeckToHandStep(state, playerForSelector(link.playerId, step.player), step.cardIds, step.count, eventBuilder);
    case "move-targets-to-deck-top-or-hand-if-field-card":
      return applyMoveTargetsToDeckTopOrHandIfFieldCardStep(state, link, step.fieldCardId, eventBuilder);
    case "special-summon-from-deck":
      return applySpecialSummonFromDeckStep(
        state,
        playerForSelector(link.playerId, step.player),
        step.cardIds,
        step.monsterFilter,
        step.count,
        step.position ?? "attack",
        eventBuilder,
      );
    case "special-summon-target-from-graveyard":
      return applySpecialSummonTargetFromGraveyardStep(
        state,
        link,
        step.position ?? "attack",
        step.linkToSource ?? false,
        eventBuilder,
      );
    case "special-summon-targets":
      return applySpecialSummonTargetsStep(
        state,
        link,
        step.position ?? "attack",
        step.linkToSource ?? false,
        step.maxLevel,
        step.preventDirectAttacks ?? false,
        eventBuilder,
      );
    case "random-own-hand-card-special-summon-or-send-to-graveyard":
      return applyRandomOwnHandCardSpecialSummonOrSendToGraveyardStep(
        state,
        link,
        step.position ?? "attack",
        eventBuilder,
      );
    case "create-tokens":
      return applyCreateTokensStep(
        state,
        playerForSelector(link.playerId, step.player),
        step,
        step.position ?? "attack",
        eventBuilder,
      );
    case "fusion-summon":
      return applyFusionSummonStep(
        state,
        link,
        step.fusionCardId,
        step.materialCardIds,
        step.materialZones ?? ["hand", "monsterZone"],
        step.position ?? "attack",
        eventBuilder,
      );
    case "ritual-summon":
      return applyRitualSummonStep(
        state,
        link,
        step.ritualMonsterCardIds,
        step.ritualMonsterAttribute,
        step.levelRequirement ?? "at-least",
        step.requiredLevel,
        step.position ?? "attack",
        eventBuilder,
      );
    case "special-summon-fusion-by-tributed-level":
      return applySpecialSummonFusionByTributedLevelStep(
        state,
        link,
        step.position ?? "attack",
        step.maxLevel,
        step.preventDirectAttacks ?? false,
        eventBuilder,
      );
    case "return-targets-to-fusion-deck":
      return applyReturnTargetsToFusionDeckStep(state, link, eventBuilder);
    case "take-control-of-targets":
      return applyTakeControlOfTargetsStep(
        state,
        link,
        step.linkToSource ?? false,
        step.sourceLeaveBehavior,
        step.returnAtEndPhase ?? false,
        eventBuilder,
      );
    case "swap-control-targets":
      return applySwapControlTargetsStep(state, link, eventBuilder);
    case "equip-source-to-target":
      return applyEquipSourceToTargetStep(state, link, eventBuilder);
    case "return-source-to-hand":
      return applyReturnSourceToHandStep(state, link, eventBuilder);
    case "change-position":
      return applyChangePositionStep(state, link, step.position, eventBuilder);
    case "change-position-all-face-up-monsters":
      return applyChangePositionAllFaceUpMonstersStep(state, link.playerId, step.controller, step.position, eventBuilder);
    case "set-source-face":
      return applySetSourceFaceStep(state, link, step.face, step.position, eventBuilder);
    case "set-face":
      return applySetFaceStep(state, link, step.face, step.position, eventBuilder);
    case "return-targets-to-hand":
      return applyReturnTargetsToHandStep(state, link, eventBuilder);
    case "return-targets-to-deck-top":
      return applyReturnTargetsToDeckTopStep(state, link, eventBuilder);
    case "lp-change-by-count":
      return applyLpChangeByCountStep(
        state,
        link.playerId,
        playerForSelector(link.playerId, step.player),
        step.amountPer,
        step.count,
        eventBuilder,
      );
    case "lp-change":
      return applyLpChangeStep(state, playerForSelector(link.playerId, step.player), step.amount, eventBuilder);
  }
}

function applyModifyPendingBattleAtkStep(
  state: DuelState,
  link: ChainLink,
  amount: number,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const pending = state.pendingAttack;

  if (
    !pending ||
    (pending.attackerInstanceId !== link.sourceInstanceId && pending.defenderInstanceId !== link.sourceInstanceId)
  ) {
    return { state, events: [] };
  }

  return {
    state: {
      ...state,
      pendingAttack: {
        ...pending,
        atkModifiers: [
          ...(pending.atkModifiers ?? []),
          {
            instanceId: link.sourceInstanceId,
            amount,
          },
        ],
      },
    },
    events: [],
  };
}

function applySetPendingBattleAtkStep(
  state: DuelState,
  link: ChainLink,
  value: number,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const pending = state.pendingAttack;

  if (
    !pending ||
    (pending.attackerInstanceId !== link.sourceInstanceId && pending.defenderInstanceId !== link.sourceInstanceId)
  ) {
    return { state, events: [] };
  }

  return {
    state: {
      ...state,
      pendingAttack: {
        ...pending,
        atkModifiers: [
          ...(pending.atkModifiers ?? []),
          {
            instanceId: link.sourceInstanceId,
            setTo: value,
          },
        ],
      },
    },
    events: [],
  };
}

function applyDamageAttackerByBattleAtkDestroySourceStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const battleEvent = link.triggerEvent?.type === "battle-completed" ? link.triggerEvent : null;

  if (
    !battleEvent ||
    battleEvent.defenderInstanceId !== link.sourceInstanceId ||
    battleEvent.defenderBattlePosition !== "attack"
  ) {
    return { state, events: [] };
  }

  const damaged = applyEffectDamage(state, battleEvent.attackerPlayerId, battleEvent.attackerBattleAtk, eventBuilder);

  if (isDuelFinished(damaged.state)) {
    return damaged;
  }

  const destroyed = destroySourceMonsterIfOnField(damaged.state, link, eventBuilder);

  return {
    state: destroyed.state,
    events: [...damaged.events, ...destroyed.events],
  };
}

function applyEffectDamage(
  state: DuelState,
  playerId: PlayerId,
  amount: number,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  if (amount <= 0) {
    return { state, events: [] };
  }

  const previous = state.players[playerId].lp;
  const next = Math.max(0, previous - amount);
  const lpChanged = createLpChangedEvent(eventBuilder, playerId, previous, next, state.turn);
  const damagedState = setPlayerLp(state, playerId, next);
  const terminal = applyAutomaticWinConditions(damagedState, eventBuilder);

  return {
    state: terminal.state,
    events: [lpChanged, ...terminal.events],
  };
}

function applyEffectDamageToBothPlayers(
  state: DuelState,
  amount: number,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  if (amount <= 0) {
    return { state, events: [] };
  }

  let nextState = state;
  const events: EngineEvent[] = [];

  for (const playerId of PLAYERS) {
    const previous = nextState.players[playerId].lp;
    const next = Math.max(0, previous - amount);

    events.push(createLpChangedEvent(eventBuilder, playerId, previous, next, nextState.turn));
    nextState = setPlayerLp(nextState, playerId, next);
  }

  const zeroLpPlayers = PLAYERS.filter((playerId) => nextState.players[playerId].lp <= 0);

  if (zeroLpPlayers.length === 2) {
    const draw = finishDuelAsDraw(nextState, eventBuilder);

    return {
      state: draw.state,
      events: [...events, ...draw.events],
    };
  }

  if (zeroLpPlayers.length === 1) {
    const finished = finishDuel(nextState, zeroLpPlayers[0], "lp-zero", eventBuilder);

    return {
      state: finished.state,
      events: [...events, ...finished.events],
    };
  }

  return { state: nextState, events };
}

function destroySourceMonsterIfOnField(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const located = findCardByInstanceId(state, link.sourceInstanceId);

  if (!located || located.ref.zone !== "monsterZone") {
    return { state, events: [] };
  }

  return destroyCardAtRef(state, located.ref, eventBuilder);
}

function applyDestroyTargetsDamageBothPlayersByMonsterAtkStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  return (link.selectedTargets?.targetRefs ?? []).reduce(
    (resultState, targetRef) => {
      const target = cardAtRef(resultState.state, targetRef);

      if (!isZoneCard(target) || targetRef.zone !== "monsterZone") {
        return resultState;
      }

      const base = getBattleStatsForZoneCard(resultState.state, target);

      if (!base) {
        return resultState;
      }

      const targetAtk = deriveBattleStats(resultState.state, {
        playerId: targetRef.playerId,
        card: target,
        base,
      }).atk;
      const destroyed = destroyCardAtRef(resultState.state, targetRef, eventBuilder);
      const damaged = applyEffectDamageToBothPlayers(destroyed.state, targetAtk, eventBuilder);

      return {
        state: damaged.state,
        events: [...resultState.events, ...destroyed.events, ...damaged.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyBanishBattleParticipantsStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const battleEvent = link.triggerEvent?.type === "battle-completed" ? link.triggerEvent : null;

  if (!battleEvent) {
    return { state, events: [] };
  }

  const opponentInstanceId = battleEvent.attackerInstanceId === link.sourceInstanceId
    ? battleEvent.defenderInstanceId
    : battleEvent.attackerInstanceId;

  return [link.sourceInstanceId, opponentInstanceId].reduce(
    (resultState, instanceId) => {
      const banished = banishCardByInstanceId(resultState.state, instanceId, eventBuilder);

      return {
        state: banished.state,
        events: [...resultState.events, ...banished.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyDestroyFaceUpMonstersByTypeStep(
  state: DuelState,
  monsterType: string,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const targetRefs: ZoneRef[] = [];

  for (const playerId of PLAYERS) {
    state.players[playerId].monsterZones.forEach((card, index) => {
      const definition = card ? state.cardDefinitions?.[card.cardId] : null;

      if (card?.face === "faceUp" && definition?.kind === "monster" && definition.monster.type === monsterType) {
        targetRefs.push({ playerId, zone: "monsterZone", index });
      }
    });
  }

  return targetRefs.reduce(
    (resultState, targetRef) => {
      const destroyed = destroyCardAtRef(resultState.state, targetRef, eventBuilder);

      return {
        state: destroyed.state,
        events: [...resultState.events, ...destroyed.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyDestroyOpponentFaceUpMonstersByLevelStep(
  state: DuelState,
  playerId: PlayerId,
  level: number,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const opponent = opponentOf(playerId);
  const targetRefs: ZoneRef[] = [];

  state.players[opponent].monsterZones.forEach((card, index) => {
    const definition = card ? state.cardDefinitions?.[card.cardId] : null;

    if (card?.face === "faceUp" && definition?.kind === "monster" && definition.monster.level === level) {
      targetRefs.push({ playerId: opponent, zone: "monsterZone", index });
    }
  });

  return targetRefs.reduce(
    (resultState, targetRef) => {
      const destroyed = destroyCardAtRef(resultState.state, targetRef, eventBuilder);

      return {
        state: destroyed.state,
        events: [...resultState.events, ...destroyed.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyAddCounterToSourceStep(
  state: DuelState,
  link: ChainLink,
  counterType: string,
  count: number,
  max: number | undefined,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const located = findCardByInstanceId(state, link.sourceInstanceId);

  if (!located || !isZoneCard(located.card)) {
    return { state, events: [] };
  }

  const current = located.card.counters[counterType] ?? 0;
  const nextCount = max === undefined ? current + count : Math.min(max, current + count);
  const nextCard: ZoneCard = {
    ...located.card,
    counters: {
      ...located.card.counters,
      [counterType]: nextCount,
    },
  };

  return {
    state: replaceZoneCardAtRef(state, located.ref, nextCard),
    events: [],
  };
}

function applyDrawResolutionStep(
  state: DuelState,
  playerId: PlayerId,
  count: number,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  for (let drawIndex = 0; drawIndex < count; drawIndex += 1) {
    const [card, ...remainingDeck] = nextState.players[playerId].mainDeck;

    if (!card) {
      const finished = finishDuelUnrecorded(nextState, playerId, "deck-out", eventBuilder);

      return {
        state: finished.state,
        events: [...events, ...finished.events],
      };
    }

    events.push(createCardDrawnEvent(eventBuilder, playerId, card, nextState.turn));
    nextState = {
      ...nextState,
      players: {
        ...nextState.players,
        [playerId]: {
          ...nextState.players[playerId],
          mainDeck: remainingDeck,
          hand: [...nextState.players[playerId].hand, card],
        },
      },
    };
  }

  return { state: nextState, events };
}

function applyDestroyTargetsStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  return (link.selectedTargets?.targetRefs ?? []).reduce(
    (resultState, targetRef) => {
      const destroyed = destroyCardAtRef(resultState.state, targetRef, eventBuilder);

      return {
        state: destroyed.state,
        events: [...resultState.events, ...destroyed.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyDestroyTargetsIfSpellStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const targetInstanceIds = link.selectedTargets?.targetInstanceIds ?? [];
  const targetRefs = link.selectedTargets?.targetRefs ?? [];

  return targetRefs.reduce(
    (resultState, targetRef, index) => {
      const located = targetInstanceIds[index] ? findCardByInstanceId(resultState.state, targetInstanceIds[index]) : null;
      const target = located?.card ?? cardAtRef(resultState.state, targetRef);
      const sourceRef = located?.ref ?? targetRef;
      const definition = target ? resultState.state.cardDefinitions?.[target.cardId] : undefined;

      if (definition?.kind !== "spell") {
        return resultState;
      }

      const destroyed = destroyCardAtRef(resultState.state, sourceRef, eventBuilder);

      return {
        state: destroyed.state,
        events: [...resultState.events, ...destroyed.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyDrawThenDestroyControlledFaceUpCardIdIfCountStep(
  state: DuelState,
  playerId: PlayerId,
  cardId: string,
  count: number,
  drawCount: number,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const refs = controlledFaceUpCardRefsById(state, playerId, cardId);

  if (refs.length < count) {
    return { state, events: [] };
  }

  const drawn = applyDrawResolutionStep(state, playerId, drawCount, eventBuilder);

  if (isDuelFinished(drawn.state)) {
    return drawn;
  }

  return refs.reduce(
    (resultState, ref) => {
      const destroyed = destroyCardAtRef(resultState.state, ref, eventBuilder);

      return {
        state: destroyed.state,
        events: [...resultState.events, ...destroyed.events],
      };
    },
    { state: drawn.state, events: [...drawn.events] as EngineEvent[] },
  );
}

function applyDestroyAllSpellsTrapsStep(
  state: DuelState,
  activatingPlayerId: PlayerId,
  controller: "self" | "opponent" | "all",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  return spellTrapRefsForController(state, activatingPlayerId, controller).reduce(
    (resultState, targetRef) => {
      const destroyed = destroyCardAtRef(resultState.state, targetRef, eventBuilder);

      return {
        state: destroyed.state,
        events: [...resultState.events, ...destroyed.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyDestroyAllSpellsTrapsIfTargetsReturnedToHandStep(
  state: DuelState,
  link: ChainLink,
  controller: "self" | "opponent" | "all",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const returned = applyReturnTargetsToHandStep(state, link, eventBuilder);
  const returnedToHand = returned.events.some((event) => event.type === "card-moved" && event.to.zone === "hand");

  if (!returnedToHand) {
    return returned;
  }

  const destroyed = applyDestroyAllSpellsTrapsStep(returned.state, link.playerId, controller, eventBuilder);

  return {
    state: destroyed.state,
    events: [...returned.events, ...destroyed.events],
  };
}

function applyDestroyAllMonstersStep(
  state: DuelState,
  activatingPlayerId: PlayerId,
  controller: "self" | "opponent" | "all",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  return monsterRefsForController(state, activatingPlayerId, controller).reduce(
    (resultState, targetRef) => {
      const destroyed = destroyCardAtRef(resultState.state, targetRef, eventBuilder);

      return {
        state: destroyed.state,
        events: [...resultState.events, ...destroyed.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyDestroyFaceUpMonstersStep(
  state: DuelState,
  activatingPlayerId: PlayerId,
  controller: "self" | "opponent" | "all",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  return monsterRefsForController(state, activatingPlayerId, controller)
    .filter((targetRef) => targetRef.zone === "monsterZone" && state.players[targetRef.playerId].monsterZones[targetRef.index]?.face === "faceUp")
    .reduce(
      (resultState, targetRef) => {
        const destroyed = destroyCardAtRef(resultState.state, targetRef, eventBuilder);

        return {
          state: destroyed.state,
          events: [...resultState.events, ...destroyed.events],
        };
      },
      { state, events: [] as EngineEvent[] },
    );
}

function applyDestroyAttackSourceStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const attackEvent = link.triggerEvent?.type === "attack-declared" ? link.triggerEvent : null;

  if (!attackEvent?.attackerInstanceId) {
    return { state, events: [] };
  }

  const located = findCardByInstanceId(state, attackEvent.attackerInstanceId);

  if (!located || located.ref.zone !== "monsterZone") {
    return { state, events: [] };
  }

  return destroyCardAtRef(state, located.ref, eventBuilder);
}

function applyDestroyOpponentAttackPositionMonstersStep(
  state: DuelState,
  playerId: PlayerId,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  return state.players[opponentOf(playerId)].monsterZones.reduce(
    (resultState, card, index) => {
      if (!card || card.position !== "attack") {
        return resultState;
      }

      const destroyed = destroyCardAtRef(resultState.state, { playerId: opponentOf(playerId), zone: "monsterZone", index }, eventBuilder);

      return {
        state: destroyed.state,
        events: [...resultState.events, ...destroyed.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyNegateAttackStep(state: DuelState): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  if (!state.pendingAttack) {
    return { state, events: [] };
  }

  return {
    state: {
      ...state,
      pendingAttack: {
        ...state.pendingAttack,
        negated: true,
      },
    },
    events: [],
  };
}

function applyGainLpByAttackSourceAtkStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const attackEvent = link.triggerEvent?.type === "attack-declared" ? link.triggerEvent : null;
  const attackerInstanceId = attackEvent?.attackerInstanceId ?? state.pendingAttack?.attackerInstanceId;

  if (!attackerInstanceId) {
    return { state, events: [] };
  }

  const located = findCardByInstanceId(state, attackerInstanceId);

  if (!located || located.ref.zone !== "monsterZone" || !isZoneCard(located.card)) {
    return { state, events: [] };
  }

  const baseStats = getBattleStatsForZoneCard(state, located.card);

  if (!baseStats) {
    return { state, events: [] };
  }

  const derivedStats = deriveBattleStats(state, {
    playerId: located.ref.playerId,
    card: located.card,
    base: baseStats,
  });
  const battleStats = state.pendingAttack
    ? applyPendingBattleAtkModifiers(derivedStats, state.pendingAttack, attackerInstanceId)
    : derivedStats;

  return applyLpChangeStep(state, link.playerId, Math.max(0, battleStats.atk), eventBuilder);
}

function applyNegatePreviousChainLinkStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
  resolvingLinks: readonly ChainLink[],
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const previousLinkId = previousChainLinkId(link.id);
  const previousLink = resolvingLinks.find((candidate) => candidate.id === previousLinkId);

  if (!previousLinkId || !previousLink) {
    return { state, events: [] };
  }

  const previousScript = getCardScriptForDefinitions(previousLink.cardId, state.cardDefinitions, state.cardScripts);
  const previousEffect = previousScript?.effects.find((candidate) => candidate.id === previousLink.effectId);

  if (previousEffect?.cannotBeNegated) {
    return { state, events: [] };
  }

  const nextState = {
    ...state,
    negatedChainLinkIds: [...(state.negatedChainLinkIds ?? []), previousLinkId],
  };
  const destroyed = sendSourceToGraveyard(nextState, previousLink, eventBuilder);

  return {
    state: destroyed.state,
    events: destroyed.events,
  };
}

function previousChainLinkId(chainLinkId: string): string | null {
  const match = /^chain-(\d+)$/.exec(chainLinkId);
  const index = match ? Number(match[1]) : NaN;

  if (!Number.isInteger(index) || index <= 1) {
    return null;
  }

  return `chain-${index - 1}`;
}

function applySearchDeckToHandStep(
  state: DuelState,
  playerId: PlayerId,
  cardIds: readonly string[],
  count: number,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  for (let searchIndex = 0; searchIndex < count; searchIndex += 1) {
    const deckIndex = nextState.players[playerId].mainDeck.findIndex((card) => cardIds.includes(card.cardId));

    if (deckIndex < 0) {
      break;
    }

    const source: ZoneRef = { playerId, zone: "mainDeck", index: deckIndex };
    const card = nextState.players[playerId].mainDeck[deckIndex];
    const destination: ZoneRef = {
      playerId,
      zone: "hand",
      index: nextState.players[playerId].hand.length,
    };

    nextState = insertIntoZone(removeFromZone(nextState, source).state, destination, card);
    events.push(
      createCardMovedEvent(
        eventBuilder,
        playerId,
        toPublicEventCard(card),
        source,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "effect-search",
      ),
    );
  }

  return { state: nextState, events };
}

function applyMoveTargetsToDeckTopOrHandIfFieldCardStep(
  state: DuelState,
  link: ChainLink,
  fieldCardId: string,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  for (const targetRef of link.selectedTargets?.targetRefs ?? []) {
    const target = cardAtRef(nextState, targetRef);

    if (!target) {
      continue;
    }

    const destinationPlayerId = target.owner;
    const moveToHand = isFaceUpFieldCardActive(nextState, fieldCardId);
    const destination: ZoneRef = moveToHand
      ? { playerId: destinationPlayerId, zone: "hand", index: nextState.players[destinationPlayerId].hand.length }
      : { playerId: destinationPlayerId, zone: "mainDeck", index: 0 };
    const removed = removeFromZone(nextState, targetRef);

    nextState = insertIntoZone(removed.state, destination, removed.card);
    events.push(
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        isZoneCard(target) ? toPublicZoneCard(target) : toPublicEventCard(target),
        targetRef,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        moveToHand ? "effect-search-to-hand" : "effect-search-to-deck-top",
      ),
    );
  }

  return { state: nextState, events };
}

function isFaceUpFieldCardActive(state: DuelState, cardId: string): boolean {
  return PLAYERS.some((playerId) => {
    const fieldCard = state.players[playerId].fieldZone;

    return fieldCard?.cardId === cardId && fieldCard.face === "faceUp";
  });
}

function applySpecialSummonFromDeckStep(
  state: DuelState,
  playerId: PlayerId,
  cardIds: readonly string[] | undefined,
  monsterFilter: DeckMonsterFilter | undefined,
  count: number,
  position: "attack" | "defense",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  for (let summonIndex = 0; summonIndex < count; summonIndex += 1) {
    const zoneIndex = nextState.players[playerId].monsterZones.findIndex((card) => card === null);
    const deckIndex = nextState.players[playerId].mainDeck.findIndex((card) =>
      matchesSpecialSummonFromDeckSelector(nextState, card, cardIds, monsterFilter),
    );

    if (zoneIndex < 0 || deckIndex < 0) {
      break;
    }

    const source: ZoneRef = { playerId, zone: "mainDeck", index: deckIndex };
    const destination: ZoneRef = { playerId, zone: "monsterZone", index: zoneIndex };
    const card = nextState.players[playerId].mainDeck[deckIndex];

    nextState = insertIntoZone(removeFromZone(nextState, source).state, destination, card, {
      face: "faceUp",
      position,
      visibility: "public",
    });
    events.push(
      createCardMovedEvent(
        eventBuilder,
        playerId,
        toPublicEventCard(card),
        source,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "effect-special-summon",
      ),
    );
    events.push(
      createSummonSuccessfulEvent(
        eventBuilder,
        playerId,
        toZoneEventCard(card, { position }),
        zoneIndex,
        "special",
        state.turn,
      ),
    );
  }

  return { state: nextState, events };
}

function matchesSpecialSummonFromDeckSelector(
  state: DuelState,
  card: CardInstance,
  cardIds: readonly string[] | undefined,
  monsterFilter: DeckMonsterFilter | undefined,
): boolean {
  if (cardIds && !cardIds.includes(card.cardId)) {
    return false;
  }

  if (!monsterFilter) {
    return Boolean(cardIds);
  }

  const definition = state.cardDefinitions?.[card.cardId];

  if (!definition || definition.kind !== "monster") {
    return false;
  }

  if (monsterFilter.attribute && definition.monster.attribute !== monsterFilter.attribute) {
    return false;
  }

  if (
    typeof monsterFilter.maxAtk === "number" &&
    (typeof definition.monster.atk !== "number" || definition.monster.atk > monsterFilter.maxAtk)
  ) {
    return false;
  }

  if (monsterFilter.excludeClassifications?.some((classification) => definition.classifications.includes(classification))) {
    return false;
  }

  return true;
}

function applyPlaceSourceInSpellTrapZoneStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const source = findCardByInstanceId(state, link.sourceInstanceId);

  if (!source || source.ref.zone === "spellTrapZone" || source.ref.zone === "fieldZone") {
    return { state, events: [] };
  }

  if (source.ref.zone !== "hand") {
    return { state, events: [] };
  }

  const zoneIndex = state.players[link.playerId].spellTrapZones.findIndex((card) => card === null);

  if (zoneIndex < 0) {
    return { state, events: [] };
  }

  const destination: ZoneRef = { playerId: link.playerId, zone: "spellTrapZone", index: zoneIndex };
  const removed = removeFromZone(state, source.ref);
  const nextState = insertIntoZone(removed.state, destination, removed.card, {
    face: "faceUp",
    position: null,
    visibility: "public",
    ...sentToGraveyardMetadata(state.turn, source.ref),
  });
  const eventCard = isZoneCard(source.card)
    ? toPublicZoneCard({ ...source.card, position: null })
    : toZoneEventCard(source.card, { position: null });

  return {
    state: nextState,
    events: [
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        eventCard,
        source.ref,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "effect-resolution",
      ),
    ],
  };
}

function applyPlaceSourceInFieldZoneStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const source = findCardByInstanceId(state, link.sourceInstanceId);

  if (!source || source.ref.zone === "fieldZone") {
    return { state, events: [] };
  }

  if (source.ref.zone !== "hand" && source.ref.zone !== "spellTrapZone") {
    return { state, events: [] };
  }

  const cleared = (["P1", "P2"] as const).reduce(
    (result, playerId) => {
      const fieldCard = result.state.players[playerId].fieldZone;

      if (!fieldCard || fieldCard.instanceId === link.sourceInstanceId) {
        return result;
      }

      const destroyed = destroyCardAtRef(result.state, { playerId, zone: "fieldZone" }, eventBuilder);

      return {
        state: destroyed.state,
        events: [...result.events, ...destroyed.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
  const currentSource = findCardByInstanceId(cleared.state, link.sourceInstanceId);

  if (!currentSource || currentSource.ref.zone === "fieldZone" || cleared.state.players[link.playerId].fieldZone) {
    return cleared;
  }

  const destination: ZoneRef = { playerId: link.playerId, zone: "fieldZone" };
  const removed = removeFromZone(cleared.state, currentSource.ref);
  const nextState = insertIntoZone(removed.state, destination, removed.card, {
    face: "faceUp",
    position: null,
    visibility: "public",
    ...sentToGraveyardMetadata(state.turn, currentSource.ref),
  });
  const eventCard = isZoneCard(currentSource.card)
    ? toPublicZoneCard({ ...currentSource.card, position: null })
    : toZoneEventCard(currentSource.card, { position: null });

  return {
    state: nextState,
    events: [
      ...cleared.events,
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        eventCard,
        currentSource.ref,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "effect-resolution",
      ),
    ],
  };
}

function applyAddLingeringStatModifiersToTargetsStep(
  state: DuelState,
  link: ChainLink,
  step: Extract<EffectResolutionStep, { kind: "add-lingering-stat-modifiers-to-targets" }>,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const targetInstanceIds = link.selectedTargets?.targetInstanceIds ?? [];
  const targetRefs = link.selectedTargets?.targetRefs ?? [];
  const instanceIds = targetInstanceIds.length > 0
    ? targetInstanceIds
    : targetRefs
        .map((ref) => cardAtRef(state, ref))
        .filter((card): card is ZoneCard => isZoneCard(card))
        .map((card) => card.instanceId);

  if (instanceIds.length === 0 || step.modifiers.length === 0) {
    return { state, events: [] };
  }

  const nextState = addLingeringEffect(state, link, {
    duration: "until-end-phase",
    statModifiers: step.modifiers.map((modifier) => ({
      stat: modifier.stat,
      amount: modifier.amount,
      target: {
        instanceIds,
        face: "faceUp",
      },
    })),
  });

  return { state: nextState, events: [] };
}

function applySpecialSummonTargetFromGraveyardStep(
  state: DuelState,
  link: ChainLink,
  position: "attack" | "defense",
  linkToSource: boolean,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  for (const targetRef of link.selectedTargets?.targetRefs ?? []) {
    const zoneIndex = nextState.players[link.playerId].monsterZones.findIndex((card) => card === null);
    const target = cardAtRef(nextState, targetRef);

    if (targetRef.zone !== "graveyard" || !target || zoneIndex < 0) {
      continue;
    }

    const source: ZoneRef = targetRef;
    const destination: ZoneRef = { playerId: link.playerId, zone: "monsterZone", index: zoneIndex };
    const removed = removeFromZone(nextState, source);

    nextState = insertIntoZone(removed.state, destination, removed.card, {
      face: "faceUp",
      position,
      visibility: "public",
    });

    if (linkToSource) {
      nextState = linkCardsByInstanceId(nextState, link.sourceInstanceId, target.instanceId);
    }

    const eventCard = isZoneCard(target)
      ? toPublicZoneCard({ ...target, position })
      : toZoneEventCard(target, { position });

    events.push(
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        eventCard,
        source,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "effect-special-summon",
      ),
    );
    events.push(
      createSummonSuccessfulEvent(
        eventBuilder,
        link.playerId,
        eventCard,
        zoneIndex,
        "special",
        state.turn,
      ),
    );
  }

  return { state: nextState, events };
}

function applySpecialSummonTargetsStep(
  state: DuelState,
  link: ChainLink,
  position: "attack" | "defense",
  linkToSource: boolean,
  maxLevel: number | undefined,
  preventDirectAttacks: boolean,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  const targetInstanceIds = link.selectedTargets?.targetInstanceIds ?? [];
  const targetRefs = link.selectedTargets?.targetRefs ?? [];

  for (let index = 0; index < Math.max(targetRefs.length, targetInstanceIds.length); index += 1) {
    const targetRef = targetRefs[index];
    const located = targetInstanceIds[index] ? findCardByInstanceId(nextState, targetInstanceIds[index]) : null;
    const sourceRef = located?.ref ?? targetRef;

    if (!sourceRef || !isSpecialSummonSourceZone(sourceRef.zone)) {
      continue;
    }

    const zoneIndex = nextState.players[link.playerId].monsterZones.findIndex((card) => card === null);
    const target = located?.card ?? cardAtRef(nextState, sourceRef);

    if (!target || zoneIndex < 0) {
      continue;
    }

    if (!isFusionLevelAllowed(nextState, target.cardId, maxLevel)) {
      continue;
    }

    const destination: ZoneRef = { playerId: link.playerId, zone: "monsterZone", index: zoneIndex };
    const removed = removeFromZone(nextState, sourceRef);

    nextState = insertIntoZone(removed.state, destination, removed.card, {
      face: "faceUp",
      position,
      visibility: "public",
    });

    if (linkToSource) {
      nextState = linkCardsByInstanceId(nextState, link.sourceInstanceId, target.instanceId);
    }

    if (preventDirectAttacks) {
      nextState = addDirectAttackRestriction(nextState, link.playerId, target.instanceId, target.cardId, link.effectId);
    }

    const eventCard = isZoneCard(target)
      ? toPublicZoneCard({ ...target, position })
      : toZoneEventCard(target, { position });

    events.push(
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        eventCard,
        sourceRef,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "effect-special-summon",
      ),
    );
    events.push(
      createSummonSuccessfulEvent(
        eventBuilder,
        link.playerId,
        eventCard,
        zoneIndex,
        "special",
        state.turn,
      ),
    );
  }

  return { state: nextState, events };
}

function isSpecialSummonSourceZone(zone: ZoneRef["zone"]): boolean {
  return zone === "hand" || zone === "mainDeck" || zone === "graveyard" || zone === "banished" || zone === "fusionDeck";
}

function applyRandomOwnHandCardSpecialSummonOrSendToGraveyardStep(
  state: DuelState,
  link: ChainLink,
  position: "attack" | "defense",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const hand = state.players[link.playerId].hand;

  if (hand.length === 0) {
    return { state, events: [] };
  }

  const random = nextRandom(createRngState(`${state.seed}:${state.turn}:${state.phase}:${state.eventIds.length}:${link.id}:${link.sourceInstanceId}`));
  const handIndex = Math.min(hand.length - 1, Math.floor(random.value * hand.length));
  const source: ZoneRef = { playerId: link.playerId, zone: "hand", index: handIndex };
  const selected = hand[handIndex];

  if (!selected) {
    return { state, events: [] };
  }

  const definition = state.cardDefinitions?.[selected.cardId];
  const summonZoneIndex = state.players[link.playerId].monsterZones.findIndex((card) => card === null);
  const canSpecialSummon = definition?.kind === "monster" && summonZoneIndex >= 0;
  const destination: ZoneRef = canSpecialSummon
    ? { playerId: link.playerId, zone: "monsterZone", index: summonZoneIndex }
    : { playerId: link.playerId, zone: "graveyard", index: 0 };
  const removed = removeFromZone(state, source);
  const nextState = insertIntoZone(removed.state, destination, removed.card, canSpecialSummon
    ? { face: "faceUp", position, visibility: "public" }
    : {
        face: "faceUp",
        visibility: "public",
        ...sentToGraveyardMetadata(state.turn, source),
      });
  const eventCard = toZoneEventCard(selected, { position: canSpecialSummon ? position : null });
  const events: EngineEvent[] = [
    createCardMovedEvent(
      eventBuilder,
      link.playerId,
      eventCard,
      source,
      destination,
      state.turn,
      state.phase,
      state.chain.length,
      canSpecialSummon ? "effect-special-summon" : "effect-send-to-graveyard",
    ),
  ];

  if (canSpecialSummon) {
    events.push(
      createSummonSuccessfulEvent(
        eventBuilder,
        link.playerId,
        eventCard,
        summonZoneIndex,
        "special",
        state.turn,
      ),
    );
  }

  return { state: nextState, events };
}

function sentToGraveyardMetadata(turn: number, ref: ZoneRef) {
  return {
    sentToGraveyardTurn: turn,
    sentToGraveyardFromController: ref.playerId,
    sentToGraveyardFromZone: ref.zone,
  };
}

function applyCreateTokensStep(
  state: DuelState,
  playerId: PlayerId,
  token: Extract<EffectResolutionStep, { kind: "create-tokens" }>,
  position: "attack" | "defense",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const availableZones = state.players[playerId].monsterZones
    .map((card, index) => card === null ? index : -1)
    .filter((index) => index >= 0);

  if (availableZones.length < token.count) {
    return { state, events: [] };
  }

  let nextState = state;
  const events: EngineEvent[] = [];
  const tokenData: TokenData = {
    name: token.name,
    monsterType: token.monsterType,
    attribute: token.attribute,
    level: token.level,
    atk: token.atk,
    def: token.def,
    ...(token.cannotBeTributedForTributeSummon ? { cannotBeTributedForTributeSummon: true } : {}),
  };

  for (let tokenIndex = 0; tokenIndex < token.count; tokenIndex += 1) {
    const zoneIndex = availableZones[tokenIndex];
    const instanceId = `${playerId}-token-${slugTokenName(token.name)}-${state.turn}-${state.eventIds.length}-${tokenIndex + 1}`;
    const tokenCard: ZoneCard = {
      instanceId,
      cardId: `token:${slugTokenName(token.name)}`,
      owner: playerId,
      controller: playerId,
      face: "faceUp",
      position,
      visibility: "public",
      counters: {},
      attachments: [],
      summonedTurn: state.turn,
      positionChangedTurn: null,
      attackedTurn: null,
      token: tokenData,
    };
    const destination: ZoneRef = { playerId, zone: "monsterZone", index: zoneIndex };

    nextState = insertIntoZone(nextState, destination, tokenCard, {
      face: "faceUp",
      position,
      visibility: "public",
    });
    events.push(
      createCardMovedEvent(
        eventBuilder,
        playerId,
        tokenCard,
        { playerId, zone: "banished", index: 0 },
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "token-created",
      ),
    );
    events.push(createSummonSuccessfulEvent(eventBuilder, playerId, tokenCard, zoneIndex, "special", state.turn));
  }

  return { state: nextState, events };
}

function slugTokenName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function applyFusionSummonStep(
  state: DuelState,
  link: ChainLink,
  fusionCardId: string,
  materialCardIds: readonly string[],
  materialZones: readonly ("hand" | "monsterZone")[],
  position: "attack" | "defense",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const materialRefs = link.selectedTargets?.targetRefs ?? [];
  const materialCards = materialRefs.map((ref) => ({ ref, card: cardAtRef(state, ref) }));

  if (
    materialCards.length !== materialCardIds.length ||
    !materialCards.every((material) =>
      material.card &&
      materialZones.includes(material.ref.zone as "hand" | "monsterZone") &&
      material.card.owner === link.playerId,
    ) ||
    !matchesExactMaterialIds(materialCards.map((material) => material.card!.cardId), materialCardIds)
  ) {
    return { state, events: [] };
  }

  const fusionIndex = state.players[link.playerId].fusionDeck?.findIndex((card) => card.cardId === fusionCardId) ?? -1;
  const zoneIndex = state.players[link.playerId].monsterZones.findIndex((card) => card === null);

  if (fusionIndex < 0 || zoneIndex < 0) {
    return { state, events: [] };
  }

  let nextState = state;
  const events: EngineEvent[] = [];

  for (const material of materialCards) {
    const located = findCardByInstanceId(nextState, material.card!.instanceId);

    if (!located) {
      return { state, events };
    }

    const destination: ZoneRef = { playerId: located.card.owner, zone: "graveyard", index: 0 };
    const removed = removeFromZone(nextState, located.ref);
    nextState = insertIntoZone(removed.state, destination, removed.card, {
      face: "faceUp",
      position: null,
      visibility: "public",
      ...sentToGraveyardMetadata(state.turn, located.ref),
    });
    events.push(
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        isZoneCard(located.card) ? toPublicZoneCard({ ...located.card, position: null }) : toPublicEventCard(located.card),
        located.ref,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "fusion-material",
      ),
    );
  }

  return specialSummonFusionFromDeck(nextState, link.playerId, fusionCardId, position, eventBuilder, state, events);
}

function validateProcedureSelection(
  state: DuelState,
  playerId: PlayerId,
  sourceInstanceId: string,
  effect: EffectDefinition,
  selectedTargets: SelectedTargets,
): string | null {
  for (const step of effect.resolution?.steps ?? []) {
    if (step.kind === "ritual-summon") {
      const selection = getRitualSummonSelection(
        state,
        playerId,
        selectedTargets.targetRefs,
        step.ritualMonsterCardIds,
        step.ritualMonsterAttribute,
        step.levelRequirement ?? "at-least",
        step.requiredLevel,
      );

      if (selection.error) {
        return selection.error;
      }
    }

    if (step.kind === "equip-source-to-target") {
      const error = validateEquipSourceToTargetSelection(state, playerId, sourceInstanceId, selectedTargets.targetRefs);

      if (error) {
        return error;
      }
    }

    if (step.kind === "create-tokens") {
      const tokenPlayerId = playerForSelector(playerId, step.player);
      const availableZones = state.players[tokenPlayerId].monsterZones.filter((card) => card === null).length;

      if (availableZones < step.count) {
        return "Not enough Monster Zones are available for those Tokens.";
      }
    }
  }

  return null;
}

function applyRitualSummonStep(
  state: DuelState,
  link: ChainLink,
  ritualMonsterCardIds: readonly string[] | undefined,
  ritualMonsterAttribute: string | undefined,
  levelRequirement: "at-least" | "exact",
  requiredLevel: number | undefined,
  position: "attack" | "defense",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const selection = getRitualSummonSelection(
    state,
    link.playerId,
    link.selectedTargets?.targetRefs ?? [],
    ritualMonsterCardIds,
    ritualMonsterAttribute,
    levelRequirement,
    requiredLevel,
  );

  if (!selection.selection) {
    return { state, events: [] };
  }

  let nextState = state;
  const events: EngineEvent[] = [];

  for (const tribute of selection.selection.tributes) {
    const located = findCardByInstanceId(nextState, tribute.card.instanceId);

    if (!located) {
      return { state, events };
    }

    const destination: ZoneRef = { playerId: located.card.owner, zone: "graveyard", index: 0 };
    const removed = removeFromZone(nextState, located.ref);
    nextState = insertIntoZone(removed.state, destination, removed.card, {
      face: "faceUp",
      position: null,
      visibility: "public",
      ...sentToGraveyardMetadata(state.turn, located.ref),
    });
    events.push(
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        isZoneCard(located.card) ? toPublicZoneCard({ ...located.card, position: null }) : toPublicEventCard(located.card),
        located.ref,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "ritual-tribute",
      ),
    );
  }

  const ritual = findCardByInstanceId(nextState, selection.selection.ritualMonster.card.instanceId);
  const zoneIndex = nextState.players[link.playerId].monsterZones.findIndex((card) => card === null);

  if (!ritual || ritual.ref.zone !== "hand" || zoneIndex < 0) {
    return { state, events };
  }

  const destination: ZoneRef = { playerId: link.playerId, zone: "monsterZone", index: zoneIndex };
  const zoneCard = toZoneEventCard(ritual.card, { position });
  const removed = removeFromZone(nextState, ritual.ref);
  nextState = insertIntoZone(removed.state, destination, ritual.card, {
    face: "faceUp",
    position,
    visibility: "public",
  });
  events.push(
    createCardMovedEvent(
      eventBuilder,
      link.playerId,
      zoneCard,
      ritual.ref,
      destination,
      state.turn,
      state.phase,
      state.chain.length,
      "ritual-summon",
    ),
  );
  events.push(createSummonSuccessfulEvent(eventBuilder, link.playerId, zoneCard, zoneIndex, "special", state.turn));

  return { state: nextState, events };
}

function getRitualSummonSelection(
  state: DuelState,
  playerId: PlayerId,
  targetRefs: readonly ZoneRef[],
  ritualMonsterCardIds: readonly string[] | undefined,
  ritualMonsterAttribute: string | undefined,
  levelRequirement: "at-least" | "exact",
  requiredLevel: number | undefined,
): { readonly selection?: RitualSummonSelection; readonly error?: string } {
  if (targetRefs.length === 0) {
    return { error: "Ritual Summon requires a Ritual Monster and Tributes." };
  }

  if (state.players[playerId].monsterZones.every((card) => card !== null)) {
    return { error: "No Monster Zone is available for the Ritual Summon." };
  }

  const selectedCards: RitualSummonCard[] = [];
  const seenInstanceIds = new Set<string>();

  for (const ref of targetRefs) {
    const card = cardAtRef(state, ref);
    const definition = card ? state.cardDefinitions?.[card.cardId] : undefined;

    if (!card || !definition) {
      return { error: "Ritual Summon selection contains a missing card." };
    }

    if (seenInstanceIds.has(card.instanceId)) {
      return { error: "Ritual Summon selection cannot use the same card more than once." };
    }

    seenInstanceIds.add(card.instanceId);
    selectedCards.push({ ref, card, definition });
  }

  const ritualMonsters = selectedCards.filter((candidate) =>
    candidate.ref.playerId === playerId &&
    candidate.ref.zone === "hand" &&
    isRitualMonsterDefinition(candidate.definition),
  );

  if (ritualMonsters.length !== 1) {
    return { error: "Ritual Summon requires exactly one Ritual Monster from your hand." };
  }

  const ritualMonster = ritualMonsters[0];

  if (ritualMonsterCardIds && !ritualMonsterCardIds.includes(ritualMonster.card.cardId)) {
    return { error: "Ritual Spell cannot Ritual Summon that monster." };
  }

  if (
    ritualMonsterAttribute &&
    ritualMonster.definition.kind === "monster" &&
    ritualMonster.definition.monster.attribute !== ritualMonsterAttribute
  ) {
    return { error: `Ritual Monster must be ${ritualMonsterAttribute}.` };
  }

  const tributes = selectedCards.filter((candidate) => candidate.card.instanceId !== ritualMonster.card.instanceId);

  if (tributes.length === 0) {
    return { error: "Ritual Summon requires at least one Tribute." };
  }

  for (const tribute of tributes) {
    const controlledFieldMonster = tribute.ref.playerId === playerId &&
      tribute.ref.zone === "monsterZone" &&
      isZoneCard(tribute.card) &&
      tribute.card.controller === playerId;
    const ownHandMonster = tribute.ref.playerId === playerId && tribute.ref.zone === "hand";

    if (tribute.definition.kind !== "monster" || (!controlledFieldMonster && !ownHandMonster)) {
      return { error: "Ritual Tributes must be monsters from your hand or field." };
    }
  }

  const required = requiredLevel ?? (ritualMonster.definition.kind === "monster" ? ritualMonster.definition.monster.level ?? 0 : 0);
  const total = tributes.reduce((sum, tribute) => {
    return sum + (tribute.definition.kind === "monster" ? tribute.definition.monster.level ?? 0 : 0);
  }, 0);
  const levelValid = levelRequirement === "exact" ? total === required : total >= required;

  if (!levelValid) {
    return {
      error: levelRequirement === "exact"
        ? `Ritual Tribute Levels must equal ${required}.`
        : `Ritual Tribute Levels must equal ${required} or more.`,
    };
  }

  return {
    selection: {
      ritualMonster,
      tributes: Object.freeze([...tributes]),
      requiredLevel: required,
      levelRequirement,
      totalTributeLevel: total,
    },
  };
}

function isRitualMonsterDefinition(definition: CardDefinition): boolean {
  return definition.kind === "monster" && definition.classifications.includes("Ritual");
}

function applySpecialSummonFusionByTributedLevelStep(
  state: DuelState,
  link: ChainLink,
  position: "attack" | "defense",
  maxLevel: number | undefined,
  preventDirectAttacks: boolean,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const fusionRef = link.selectedTargets?.targetRefs?.find((ref) => ref.zone === "fusionDeck");
  const tributeInstanceId = link.paidCosts
    ?.find((cost) => cost.kind === "tribute-source" || cost.kind === "tribute")
    ?.instanceIds?.[0];
  const tribute = tributeInstanceId ? findCardByInstanceId(state, tributeInstanceId) : null;
  const tributeLevel = tribute ? monsterLevel(state, tribute.card.cardId) : null;
  const fusionCard = fusionRef ? cardAtRef(state, fusionRef) : null;
  const fusionLevel = fusionCard ? monsterLevel(state, fusionCard.cardId) : null;

  if (
    !fusionRef ||
    !fusionCard ||
    tributeLevel === null ||
    fusionLevel !== tributeLevel ||
    (maxLevel !== undefined && fusionLevel > maxLevel)
  ) {
    return { state, events: [] };
  }

  const summoned = specialSummonFusionFromDeck(state, link.playerId, fusionCard.cardId, position, eventBuilder, state, []);

  if (!preventDirectAttacks || summoned.events.length === 0) {
    return summoned;
  }

  const summonedCard = summoned.state.players[link.playerId].monsterZones.find((card) => card?.cardId === fusionCard.cardId);

  return {
    state: summonedCard
      ? addDirectAttackRestriction(summoned.state, link.playerId, summonedCard.instanceId, summonedCard.cardId, link.effectId)
      : summoned.state,
    events: summoned.events,
  };
}

function applyReturnTargetsToFusionDeckStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  for (const targetRef of link.selectedTargets?.targetRefs ?? []) {
    const target = cardAtRef(nextState, targetRef);

    if (!target || !isFusionMonsterCard(nextState, target.cardId)) {
      continue;
    }

    const destination: ZoneRef = {
      playerId: target.owner,
      zone: "fusionDeck",
      index: nextState.players[target.owner].fusionDeck?.length ?? 0,
    };
    const removed = removeFromZone(nextState, targetRef);
    nextState = insertIntoZone(removed.state, destination, removed.card);
    events.push(
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        isZoneCard(target) ? toPublicZoneCard({ ...target, position: null }) : toPublicEventCard(target),
        targetRef,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "fusion-return",
      ),
    );
  }

  return { state: nextState, events };
}

function specialSummonFusionFromDeck(
  state: DuelState,
  playerId: PlayerId,
  fusionCardId: string,
  position: "attack" | "defense",
  eventBuilder: EventBuilder,
  eventState: DuelState,
  previousEvents: readonly EngineEvent[],
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const fusionIndex = state.players[playerId].fusionDeck?.findIndex((card) => card.cardId === fusionCardId) ?? -1;
  const zoneIndex = state.players[playerId].monsterZones.findIndex((card) => card === null);

  if (fusionIndex < 0 || zoneIndex < 0) {
    return { state, events: previousEvents };
  }

  const source: ZoneRef = { playerId, zone: "fusionDeck", index: fusionIndex };
  const destination: ZoneRef = { playerId, zone: "monsterZone", index: zoneIndex };
  const fusionCard = state.players[playerId].fusionDeck![fusionIndex];
  const nextState = insertIntoZone(removeFromZone(state, source).state, destination, fusionCard, {
    face: "faceUp",
    position,
    visibility: "public",
  });
  const eventCard = toZoneEventCard(fusionCard, { position });
  const events: EngineEvent[] = [...previousEvents];

  events.push(
    createCardMovedEvent(
      eventBuilder,
      playerId,
      eventCard,
      source,
      destination,
      eventState.turn,
      eventState.phase,
      eventState.chain.length,
      "fusion-summon",
    ),
  );
  events.push(createSummonSuccessfulEvent(eventBuilder, playerId, eventCard, zoneIndex, "special", eventState.turn));

  return { state: nextState, events };
}

function matchesExactMaterialIds(actualCardIds: readonly string[], requiredCardIds: readonly string[]): boolean {
  const actual = [...actualCardIds].sort();
  const required = [...requiredCardIds].sort();

  return actual.length === required.length && actual.every((cardId, index) => cardId === required[index]);
}

function monsterLevel(state: DuelState, cardId: string): number | null {
  const definition = state.cardDefinitions?.[cardId];

  return definition?.kind === "monster" && typeof definition.monster.level === "number" ? definition.monster.level : null;
}

function getBattleStatsForZoneCard(state: DuelState, card: ZoneCard) {
  if (card.token) {
    return {
      atk: card.token.atk,
      def: card.token.def,
    };
  }

  return getMonsterBattleStats(state.cardDefinitions?.[card.cardId]);
}

function isFusionLevelAllowed(state: DuelState, cardId: string, maxLevel: number | undefined): boolean {
  if (maxLevel === undefined) {
    return true;
  }

  const level = monsterLevel(state, cardId);

  return level !== null && level <= maxLevel;
}

function isFusionMonsterCard(state: DuelState, cardId: string): boolean {
  return state.cardDefinitions?.[cardId]?.classifications.includes("Fusion") === true;
}

function addDirectAttackRestriction(
  state: DuelState,
  playerId: PlayerId,
  instanceId: string,
  cardId: string,
  effectId: string,
): DuelState {
  return {
    ...state,
    lingeringEffects: [
      ...(state.lingeringEffects ?? []),
      {
        id: `lingering-${state.eventIds.length + (state.lingeringEffects?.length ?? 0) + 1}`,
        playerId,
        sourceInstanceId: instanceId,
        sourceCardId: cardId,
        effectId,
        expiresAtTurn: state.turn,
        expiresAtPhase: "EP",
        definition: {
          duration: "until-end-phase",
          removeWhenSourceLeavesField: true,
          directAttackRestrictions: [
            {
              target: { instanceIds: [instanceId] },
              reason: "That Fusion Monster cannot attack directly this turn.",
            },
          ],
        },
      },
    ],
  };
}

function applyTakeControlOfTargetsStep(
  state: DuelState,
  link: ChainLink,
  linkToSource: boolean,
  sourceLeaveBehavior: AttachmentLeaveBehavior | undefined,
  returnAtEndPhase: boolean,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  for (const targetRef of link.selectedTargets?.targetRefs ?? []) {
    const target = cardAtRef(nextState, targetRef);
    const zoneIndex = nextState.players[link.playerId].monsterZones.findIndex((card) => card === null);

    if (targetRef.zone !== "monsterZone" || !isZoneCard(target) || zoneIndex < 0) {
      continue;
    }

    const source: ZoneRef = targetRef;
    const destination: ZoneRef = { playerId: link.playerId, zone: "monsterZone", index: zoneIndex };
    const returnPlayerId = targetRef.playerId;
    const controlledTarget: ZoneCard = {
      ...target,
      controller: link.playerId,
    };
    const removed = removeFromZone(nextState, source);

    nextState = {
      ...removed.state,
      players: {
        ...removed.state.players,
        [link.playerId]: {
          ...removed.state.players[link.playerId],
          monsterZones: replaceArrayIndex(removed.state.players[link.playerId].monsterZones, zoneIndex, controlledTarget),
        },
      },
    };

    if (linkToSource) {
      nextState = linkCardsByInstanceId(nextState, link.sourceInstanceId, target.instanceId, {
        firstBehaviorForSecond: sourceLeaveBehavior,
        secondBehaviorForFirst: "destroy-linked",
      });
    }

    if (returnAtEndPhase) {
      nextState = scheduleControlReturn(nextState, target.instanceId, returnPlayerId);
    }

    events.push(
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        toPublicZoneCard(controlledTarget),
        source,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "control-change",
      ),
    );
  }

  return { state: nextState, events };
}

function applySwapControlTargetsStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const targetRefs = link.selectedTargets?.targetRefs ?? [];

  if (targetRefs.length !== 2) {
    return { state, events: [] };
  }

  const ownRef = targetRefs.find((ref) => ref.playerId === link.playerId && ref.zone === "monsterZone");
  const opponentRef = targetRefs.find((ref) => ref.playerId !== link.playerId && ref.zone === "monsterZone");
  const ownTarget = ownRef ? cardAtRef(state, ownRef) : null;
  const opponentTarget = opponentRef ? cardAtRef(state, opponentRef) : null;

  if (!ownRef || !opponentRef || !isZoneCard(ownTarget) || !isZoneCard(opponentTarget)) {
    return { state, events: [] };
  }

  const opponentPlayerId = opponentRef.playerId;
  const controlledOwn: ZoneCard = { ...ownTarget, controller: opponentPlayerId };
  const controlledOpponent: ZoneCard = { ...opponentTarget, controller: link.playerId };
  const withoutOwn = removeFromZone(state, ownRef);
  const withoutBoth = removeFromZone(withoutOwn.state, opponentRef);
  let nextState = insertIntoZone(withoutBoth.state, ownRef, controlledOpponent);
  nextState = insertIntoZone(nextState, opponentRef, controlledOwn);

  return {
    state: nextState,
    events: [
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        toPublicZoneCard(controlledOpponent),
        opponentRef,
        ownRef,
        state.turn,
        state.phase,
        state.chain.length,
        "control-change",
      ),
      createCardMovedEvent(
        eventBuilder,
        opponentPlayerId,
        toPublicZoneCard(controlledOwn),
        ownRef,
        opponentRef,
        state.turn,
        state.phase,
        state.chain.length,
        "control-change",
      ),
    ],
  };
}

function scheduleControlReturn(state: DuelState, instanceId: string, returnPlayerId: PlayerId): DuelState {
  const existing = state.controlChangeReturns ?? [];

  return {
    ...state,
    controlChangeReturns: [
      ...existing.filter((controlReturn) => controlReturn.instanceId !== instanceId),
      {
        id: `control-return-${state.eventIds.length + existing.length + 1}`,
        instanceId,
        returnPlayerId,
        expiresAtTurn: state.turn,
        expiresAtPhase: "EP",
      },
    ],
  };
}

function applyScheduledControlReturns(
  state: DuelState,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];
  const remainingReturns = (state.controlChangeReturns ?? []).filter((controlReturn) => {
    if (controlReturn.expiresAtPhase !== "EP" || state.phase !== "EP" || controlReturn.expiresAtTurn > state.turn) {
      return true;
    }

    const returned = returnControlOfCardToPlayer(
      nextState,
      controlReturn.instanceId,
      controlReturn.returnPlayerId,
      undefined,
      eventBuilder,
    );

    nextState = returned.state;
    events.push(...returned.events);
    return false;
  });

  return {
    state: {
      ...nextState,
      controlChangeReturns: remainingReturns,
    },
    events,
  };
}

function validateEquipSourceToTargetSelection(
  state: DuelState,
  playerId: PlayerId,
  sourceInstanceId: string,
  targetRefs: readonly ZoneRef[],
): string | null {
  const source = findCardByInstanceId(state, sourceInstanceId);

  if (!source || source.ref.playerId !== playerId) {
    return "Equip source is not controlled by that player.";
  }

  if (source.ref.zone !== "hand" && source.ref.zone !== "spellTrapZone") {
    return "Equip source must be in hand or the Spell/Trap Zone.";
  }

  if (isZoneCard(source.card) && source.card.attachments.length > 0) {
    return "Equip source is already equipped.";
  }

  if (source.ref.zone === "hand" && state.players[playerId].spellTrapZones.every((card) => card !== null)) {
    return "No Spell/Trap Zone is available for that Equip Card.";
  }

  if (targetRefs.length !== 1) {
    return "Equip activation requires exactly one target monster.";
  }

  const targetRef = targetRefs[0];
  const target = cardAtRef(state, targetRef);

  if (targetRef.zone !== "monsterZone" || !isZoneCard(target)) {
    return "Equip target must be a monster on the field.";
  }

  if (target.face !== "faceUp") {
    return "Equip target must be face-up.";
  }

  if (target.attachments.includes(sourceInstanceId)) {
    return "Equip source is already equipped to that monster.";
  }

  return null;
}

function applyEquipSourceToTargetStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const targetRef = link.selectedTargets?.targetRefs?.[0];
  const target = targetRef ? cardAtRef(state, targetRef) : null;

  if (!targetRef || targetRef.zone !== "monsterZone" || !isZoneCard(target) || target.face !== "faceUp") {
    return { state, events: [] };
  }

  let nextState = state;
  const events: EngineEvent[] = [];
  let source = findCardByInstanceId(nextState, link.sourceInstanceId);

  if (!source || source.ref.playerId !== link.playerId || (source.ref.zone !== "hand" && source.ref.zone !== "spellTrapZone")) {
    return { state, events: [] };
  }

  if (isZoneCard(source.card) && source.card.attachments.length > 0) {
    return { state, events: [] };
  }

  if (source.ref.zone === "hand") {
    const zoneIndex = nextState.players[link.playerId].spellTrapZones.findIndex((card) => card === null);

    if (zoneIndex < 0) {
      return { state, events: [] };
    }

    const destination: ZoneRef = { playerId: link.playerId, zone: "spellTrapZone", index: zoneIndex };
    const removed = removeFromZone(nextState, source.ref);
    nextState = insertIntoZone(removed.state, destination, removed.card, {
      face: "faceUp",
      position: null,
      visibility: "public",
    });
    events.push(
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        isZoneCard(source.card) ? toPublicZoneCard({ ...source.card, position: null }) : toZoneEventCard(source.card, { position: null }),
        source.ref,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "equip",
      ),
    );
    source = findCardByInstanceId(nextState, link.sourceInstanceId);
  }

  const currentTarget = findCardByInstanceId(nextState, target.instanceId);

  if (
    !source ||
    !currentTarget ||
    source.ref.zone !== "spellTrapZone" ||
    currentTarget.ref.zone !== "monsterZone" ||
    !isZoneCard(source.card) ||
    !isZoneCard(currentTarget.card) ||
    currentTarget.card.face !== "faceUp"
  ) {
    return { state, events };
  }

  const linked = linkCardsByInstanceId(nextState, source.card.instanceId, currentTarget.card.instanceId, {
      firstBehaviorForSecond: "detach-linked",
    });
  const linkedSource = findCardByInstanceId(linked, source.card.instanceId);

  if (!linkedSource || !isZoneCard(linkedSource.card)) {
    return { state: linked, events };
  }

  return {
    state: replaceZoneCardAtRef(linked, linkedSource.ref, addEffectMarker(linkedSource.card, link.effectId)),
    events,
  };
}

function applyReturnSourceToHandStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const located = findCardByInstanceId(state, link.sourceInstanceId);

  if (!located || located.ref.zone === "hand" || located.ref.zone === "mainDeck") {
    return { state, events: [] };
  }

  const destination: ZoneRef = {
    playerId: located.card.owner,
    zone: "hand",
    index: state.players[located.card.owner].hand.length,
  };
  const eventCard = isZoneCard(located.card) ? located.card : toPublicEventCard(located.card);
  const nextState = insertIntoZone(removeFromZone(state, located.ref).state, destination, located.card);

  return {
    state: nextState,
    events: [
      createCardMovedEvent(
        eventBuilder,
        located.ref.playerId,
        eventCard,
        located.ref,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "effect",
      ),
    ],
  };
}

function applyChangePositionStep(
  state: DuelState,
  link: ChainLink,
  position: "attack" | "defense",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  for (const targetRef of link.selectedTargets?.targetRefs ?? []) {
    const card = cardAtRef(nextState, targetRef);

    if (!isZoneCard(card) || targetRef.zone !== "monsterZone" || card.position === null || card.position === position) {
      continue;
    }

    nextState = updateMonsterPosition(nextState, targetRef, position);
    events.push(createPositionChangedEvent(eventBuilder, targetRef.playerId, card, card.position, position, nextState.turn));
  }

  return { state: nextState, events };
}

function applyChangePositionAllFaceUpMonstersStep(
  state: DuelState,
  activatingPlayerId: PlayerId,
  controller: "self" | "opponent" | "all",
  position: "attack" | "defense" | undefined,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];
  const targetPlayerIds: PlayerId[] =
    controller === "self"
      ? [activatingPlayerId]
      : controller === "opponent"
        ? [opponentOf(activatingPlayerId)]
        : ["P1", "P2"];

  for (const playerId of targetPlayerIds) {
    nextState.players[playerId].monsterZones.forEach((card, index) => {
      if (!card || card.face !== "faceUp" || card.position === null) {
        return;
      }

      const nextPosition: "attack" | "defense" =
        position ?? (card.position === "attack" ? "defense" : "attack");

      if (nextPosition === card.position) {
        return;
      }

      const ref: ZoneRef = { playerId, zone: "monsterZone", index };
      const previous = card.position;
      nextState = updateMonsterPosition(nextState, ref, nextPosition);
      const updated = cardAtRef(nextState, ref);

      if (isZoneCard(updated)) {
        events.push(createPositionChangedEvent(eventBuilder, playerId, updated, previous, nextPosition, nextState.turn));
      }
    });
  }

  return { state: nextState, events };
}

function applySetFaceStep(
  state: DuelState,
  link: ChainLink,
  face: "faceUp" | "faceDown",
  position: "attack" | "defense" | undefined,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  for (const targetRef of link.selectedTargets?.targetRefs ?? []) {
    const card = cardAtRef(nextState, targetRef);

    if (!isZoneCard(card) || targetRef.zone === "mainDeck" || targetRef.zone === "hand") {
      continue;
    }

    nextState = setCardFace(nextState, targetRef, face, face === "faceUp" ? "public" : "hidden");

    if (targetRef.zone === "monsterZone" && position) {
      nextState = updateMonsterPosition(nextState, targetRef, position);
    }

    if (targetRef.zone === "monsterZone" && face === "faceDown" && isZoneCard(card) && card.attachments.length > 0) {
      const updated = findCardByInstanceId(nextState, card.instanceId);

      if (updated && isZoneCard(updated.card)) {
        const detached = handleLinkedCardsOnIllegalAttachment(nextState, updated.card, eventBuilder);
        nextState = detached.state;
        events.push(...detached.events);
      }
    }

    if (targetRef.zone === "monsterZone" && card.face === "faceDown" && face === "faceUp") {
      events.push(createMonsterFlippedFaceUpEvent(eventBuilder, targetRef.playerId, {
        ...card,
        face: "faceUp",
        visibility: "public",
      }, targetRef.index, "effect", nextState.turn));
    }
  }

  return { state: nextState, events };
}

function applySetSourceFaceStep(
  state: DuelState,
  link: ChainLink,
  face: "faceUp" | "faceDown",
  position: "attack" | "defense" | undefined,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const source = findCardByInstanceId(state, link.sourceInstanceId);

  if (!source || !isZoneCard(source.card) || source.ref.zone === "mainDeck" || source.ref.zone === "hand") {
    return { state, events: [] };
  }

  const selectedLink: ChainLink = {
    ...link,
    selectedTargets: {
      targetRefs: [source.ref],
      targetPlayerIds: [],
    },
  };

  return applySetFaceStep(state, selectedLink, face, position, eventBuilder);
}

function applyReturnTargetsToHandStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const targetInstanceIds = link.selectedTargets?.targetInstanceIds ?? [];
  const targetRefs = link.selectedTargets?.targetRefs ?? [];

  return targetRefs.reduce(
    (resultState, targetRef, index) => {
      const moved = moveTargetToHand(resultState.state, targetRef, eventBuilder, targetInstanceIds[index]);

      return {
        state: moved.state,
        events: [...resultState.events, ...moved.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
}

function applyReturnTargetsToDeckTopStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];
  const targetInstanceIds = link.selectedTargets?.targetInstanceIds ?? [];
  const targetRefs = link.selectedTargets?.targetRefs ?? [];

  for (let index = 0; index < Math.max(targetInstanceIds.length, targetRefs.length); index += 1) {
    const located = targetInstanceIds[index]
      ? findCardByInstanceId(nextState, targetInstanceIds[index])
      : targetRefs[index]
        ? { card: cardAtRef(nextState, targetRefs[index]), ref: targetRefs[index] }
        : null;

    if (!located || !located.card || located.ref.zone === "mainDeck") {
      continue;
    }

    const destination: ZoneRef = { playerId: located.card.owner, zone: "mainDeck", index: 0 };
    const removed = removeFromZone(nextState, located.ref);
    nextState = insertIntoZone(removed.state, destination, removed.card);
    events.push(
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        isZoneCard(located.card) ? toPublicZoneCard(located.card) : toPublicEventCard(located.card),
        located.ref,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "effect-return-to-deck-top",
      ),
    );
  }

  return { state: nextState, events };
}

function applyLpChangeStep(
  state: DuelState,
  playerId: PlayerId,
  amount: number,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const previous = state.players[playerId].lp;
  const next = Math.max(0, previous + amount);
  const event = createLpChangedEvent(eventBuilder, playerId, previous, next, state.turn);

  return {
    state: setPlayerLp(state, playerId, next),
    events: [event],
  };
}

function applyLpChangeByCountStep(
  state: DuelState,
  activatingPlayerId: PlayerId,
  affectedPlayerId: PlayerId,
  amountPer: number,
  countKind: Extract<EffectResolutionStep, { kind: "lp-change-by-count" }>["count"],
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const count = countLpChangeObjects(state, activatingPlayerId, countKind);

  return applyLpChangeStep(state, affectedPlayerId, amountPer * count, eventBuilder);
}

function countLpChangeObjects(
  state: DuelState,
  activatingPlayerId: PlayerId,
  countKind: Extract<EffectResolutionStep, { kind: "lp-change-by-count" }>["count"],
): number {
  const opponent = opponentOf(activatingPlayerId);

  switch (countKind) {
    case "opponent-graveyard-cards":
      return state.players[opponent].graveyard.length;
    case "opponent-banished-cards":
      return state.players[opponent].banished.length;
    case "opponent-monsters":
      return state.players[opponent].monsterZones.filter((card) => card !== null).length;
    case "opponent-hand-cards":
      return state.players[opponent].hand.length;
    case "own-face-up-light-monsters":
      return state.players[activatingPlayerId].monsterZones.filter((card) => {
        if (!card || card.face !== "faceUp") {
          return false;
        }

        const definition = state.cardDefinitions?.[card.cardId];

        return definition?.kind === "monster" && definition.monster.attribute === "LIGHT";
      }).length;
    case "all-monsters-on-field":
      return (
        state.players.P1.monsterZones.filter((card) => card !== null).length +
        state.players.P2.monsterZones.filter((card) => card !== null).length
      );
    case "opponent-spell-trap-cards": {
      const opponentState = state.players[opponent];

      return opponentState.spellTrapZones.filter((card) => card !== null).length + (opponentState.fieldZone ? 1 : 0);
    }
  }
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

  const replacement = findDestructionReplacement(state, {
    playerId: targetRef.playerId,
    card: target,
    reason: "effect",
  });

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
    ...(destinationZone === "graveyard" ? sentToGraveyardMetadata(state.turn, targetRef) : {}),
  });
  const movedCard = toPublicZoneCard(target);
  const moveReason = destinationZone === "banished" ? "destruction-replacement" : "effect-destruction";
  const events: EngineEvent[] = [
    ...(destinationZone === "graveyard"
      ? [createCardDestroyedEvent(eventBuilder, targetRef.playerId, target, state.turn, "effect")]
      : []),
    createCardMovedEvent(
      eventBuilder,
      targetRef.playerId,
      movedCard,
      targetRef,
      destination,
      state.turn,
      state.phase,
      state.chain.length,
      moveReason,
    ),
  ];
  const linked = handleLinkedCardsOnLeave(nextState, target, eventBuilder);

  return { state: linked.state, events: [...events, ...linked.events] };
}

function moveTargetToHand(
  state: DuelState,
  targetRef: ZoneRef,
  eventBuilder: EventBuilder,
  targetInstanceId?: string,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const located = targetInstanceId ? findCardByInstanceId(state, targetInstanceId) : null;
  const target = located?.card ?? cardAtRef(state, targetRef);
  const sourceRef = located?.ref ?? targetRef;

  if (!target || sourceRef.zone === "hand") {
    return { state, events: [] };
  }

  const removed = removeFromZone(state, sourceRef);
  const destination: ZoneRef = {
    playerId: target.owner,
    zone: "hand",
    index: removed.state.players[target.owner].hand.length,
  };
  const nextState = insertIntoZone(removed.state, destination, removed.card);
  const eventCard = isZoneCard(target) ? target : { ...target, face: "faceUp" as const, position: null, visibility: "public" as const, counters: {}, attachments: [] };

  return {
    state: nextState,
    events: [
      createCardMovedEvent(
        eventBuilder,
        sourceRef.playerId,
        eventCard,
        sourceRef,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "effect",
      ),
    ],
  };
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

      if (behavior === "detach-linked") {
        return {
          state: replaceZoneCardAtRef(resultState.state, located.ref, removeAttachmentFromCard(located.card, leavingCard.instanceId)),
          events: resultState.events,
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

function handleLinkedCardsOnIllegalAttachment(
  state: DuelState,
  illegalCard: ZoneCard,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  return illegalCard.attachments.reduce(
    (resultState, instanceId) => {
      const located = findCardByInstanceId(resultState.state, instanceId);
      const behavior = illegalCard.attachmentBehaviors?.[instanceId] ?? "destroy-linked";

      if (!located || !isZoneCard(located.card) || !["spellTrapZone", "fieldZone"].includes(located.ref.zone)) {
        return resultState;
      }

      if (behavior === "destroy-linked") {
        const destroyed = destroyCardAtRef(resultState.state, located.ref, eventBuilder);

        return {
          state: destroyed.state,
          events: [...resultState.events, ...destroyed.events],
        };
      }

      return resultState;
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

  if (!located || !isZoneCard(located.card)) {
    return { state, events: [] };
  }

  return returnControlOfCardToPlayer(state, instanceId, located.card.owner, sourceInstanceId, eventBuilder);
}

function returnControlOfCardToPlayer(
  state: DuelState,
  instanceId: string,
  returnPlayerId: PlayerId,
  sourceInstanceId: string | undefined,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const located = findCardByInstanceId(state, instanceId);

  if (!located || !isZoneCard(located.card) || located.ref.zone !== "monsterZone") {
    return { state, events: [] };
  }

  const returnedCardBase: ZoneCard = {
    ...located.card,
    controller: returnPlayerId,
  };
  const returnedCard = sourceInstanceId
    ? removeAttachmentFromCard(returnedCardBase, sourceInstanceId)
    : returnedCardBase;

  if (located.ref.playerId === returnPlayerId) {
    return {
      state: replaceZoneCardAtRef(state, located.ref, returnedCard),
      events: [],
    };
  }

  const zoneIndex = state.players[returnPlayerId].monsterZones.findIndex((card) => card === null);

  if (zoneIndex < 0) {
    return destroyCardAtRef(state, located.ref, eventBuilder);
  }

  const source: ZoneRef = located.ref;
  const destination: ZoneRef = { playerId: returnPlayerId, zone: "monsterZone", index: zoneIndex };
  const removed = removeFromZone(state, source);
  const nextState: DuelState = {
    ...removed.state,
    players: {
      ...removed.state.players,
      [returnPlayerId]: {
        ...removed.state.players[returnPlayerId],
        monsterZones: replaceArrayIndex(removed.state.players[returnPlayerId].monsterZones, zoneIndex, returnedCard),
      },
    },
  };

  return {
    state: nextState,
    events: [
      createCardMovedEvent(
        eventBuilder,
        returnPlayerId,
        toPublicZoneCard(returnedCard),
        source,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "control-return",
      ),
    ],
  };
}

function banishCardByInstanceId(
  state: DuelState,
  instanceId: string,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const located = findCardByInstanceId(state, instanceId);

  if (!located || located.ref.zone === "banished") {
    return { state, events: [] };
  }

  const removed = removeFromZone(state, located.ref);
  const destination: ZoneRef = { playerId: located.card.owner, zone: "banished", index: 0 };
  const nextState = insertIntoZone(removed.state, destination, removed.card, {
    face: "faceUp",
    position: null,
    visibility: "public",
  });
  const eventCard = isZoneCard(located.card)
    ? toPublicZoneCard({ ...located.card, position: null })
    : toPublicEventCard(located.card);
  const events: EngineEvent[] = [
    createCardBanishedEvent(eventBuilder, located.ref.playerId, eventCard, state.turn, "effect"),
    createCardMovedEvent(
      eventBuilder,
      located.ref.playerId,
      eventCard,
      located.ref,
      destination,
      state.turn,
      state.phase,
      state.chain.length,
      "effect-banish",
    ),
  ];

  return {
    state: nextState,
    events,
  };
}

function sendSourceToGraveyard(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const source = findCardByInstanceId(state, link.sourceInstanceId);

  if (!source || !["hand", "spellTrapZone", "fieldZone"].includes(source.ref.zone)) {
    return { state, events: [] };
  }

  const removed = removeFromZone(state, source.ref);
  const destination: ZoneRef = { playerId: source.card.owner, zone: "graveyard", index: 0 };
  const nextState = insertIntoZone(removed.state, destination, removed.card, {
    face: "faceUp",
    position: null,
    visibility: "public",
  });
  const eventCard = isZoneCard(source.card)
    ? source.card
    : { ...source.card, face: "faceUp" as const, position: null, visibility: "public" as const, counters: {}, attachments: [] };

  return {
    state: nextState,
    events: [
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        eventCard,
        source.ref,
        destination,
        state.turn,
        state.phase,
        state.chain.length,
        "effect-resolution",
      ),
    ],
  };
}

function spellTrapRefsForController(
  state: DuelState,
  activatingPlayerId: PlayerId,
  controller: "self" | "opponent" | "all",
): readonly ZoneRef[] {
  const playerIds = PLAYERS.filter((playerId) => {
    if (controller === "all") {
      return true;
    }

    if (controller === "self") {
      return playerId === activatingPlayerId;
    }

    return playerId !== activatingPlayerId;
  });
  const refs: ZoneRef[] = [];

  for (const playerId of playerIds) {
    state.players[playerId].spellTrapZones.forEach((card, index) => {
      if (card) {
        refs.push({ playerId, zone: "spellTrapZone", index });
      }
    });

    if (state.players[playerId].fieldZone) {
      refs.push({ playerId, zone: "fieldZone" });
    }
  }

  return refs;
}

function monsterRefsForController(
  state: DuelState,
  activatingPlayerId: PlayerId,
  controller: "self" | "opponent" | "all",
): readonly ZoneRef[] {
  const playerIds = PLAYERS.filter((playerId) => {
    if (controller === "all") {
      return true;
    }

    if (controller === "self") {
      return playerId === activatingPlayerId;
    }

    return playerId !== activatingPlayerId;
  });
  const refs: ZoneRef[] = [];

  for (const playerId of playerIds) {
    state.players[playerId].monsterZones.forEach((card, index) => {
      if (card) {
        refs.push({ playerId, zone: "monsterZone", index });
      }
    });
  }

  return refs;
}

function controlledFaceUpCardRefsById(state: DuelState, playerId: PlayerId, cardId: string): readonly ZoneRef[] {
  const refs: ZoneRef[] = [];

  state.players[playerId].monsterZones.forEach((card, index) => {
    if (card?.cardId === cardId && card.face === "faceUp") {
      refs.push({ playerId, zone: "monsterZone", index });
    }
  });

  state.players[playerId].spellTrapZones.forEach((card, index) => {
    if (card?.cardId === cardId && card.face === "faceUp") {
      refs.push({ playerId, zone: "spellTrapZone", index });
    }
  });

  if (state.players[playerId].fieldZone?.cardId === cardId && state.players[playerId].fieldZone?.face === "faceUp") {
    refs.push({ playerId, zone: "fieldZone" });
  }

  return refs;
}

function revealActivationSource(state: DuelState, ref: ZoneRef): DuelState {
  if (ref.zone !== "spellTrapZone" && ref.zone !== "fieldZone") {
    return state;
  }

  const card = cardAtRef(state, ref);

  if (!isZoneCard(card) || card.face === "faceUp") {
    return state;
  }

  return setCardFace(state, ref, "faceUp", "public");
}

function revealTriggerSource(state: DuelState, candidate: TriggerCandidate): DuelState {
  const located = findCardByInstanceId(state, candidate.sourceInstanceId);

  return located ? revealActivationSource(state, located.ref) : state;
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
    case "fusionDeck":
    case "hand":
    case "graveyard":
    case "banished":
      return state;
  }
}

function linkCardsByInstanceId(
  state: DuelState,
  firstInstanceId: string,
  secondInstanceId: string,
  options: {
    readonly firstBehaviorForSecond?: AttachmentLeaveBehavior;
    readonly secondBehaviorForFirst?: AttachmentLeaveBehavior;
  } = {},
): DuelState {
  const first = findCardByInstanceId(state, firstInstanceId);
  const second = findCardByInstanceId(state, secondInstanceId);

  if (!first || !second || !isZoneCard(first.card) || !isZoneCard(second.card)) {
    return state;
  }

  const withFirstLinked = replaceZoneCardAtRef(
    state,
    first.ref,
    addAttachment(first.card, secondInstanceId, options.firstBehaviorForSecond),
  );
  const updatedSecond = findCardByInstanceId(withFirstLinked, secondInstanceId);

  if (!updatedSecond || !isZoneCard(updatedSecond.card)) {
    return withFirstLinked;
  }

  return replaceZoneCardAtRef(
    withFirstLinked,
    updatedSecond.ref,
    addAttachment(updatedSecond.card, firstInstanceId, options.secondBehaviorForFirst),
  );
}

function addAttachment(
  card: ZoneCard,
  instanceId: string,
  behavior?: AttachmentLeaveBehavior,
): ZoneCard {
  const attachmentBehaviors = behavior
    ? {
        ...(card.attachmentBehaviors ?? {}),
        [instanceId]: behavior,
      }
    : card.attachmentBehaviors;

  if (card.attachments.includes(instanceId)) {
    return {
      ...card,
      ...(attachmentBehaviors ? { attachmentBehaviors } : {}),
    };
  }

  return {
    ...card,
    attachments: [...card.attachments, instanceId],
    ...(attachmentBehaviors ? { attachmentBehaviors } : {}),
  };
}

function addEffectMarker(card: ZoneCard, effectId: string): ZoneCard {
  if (card.effectMarkers?.includes(effectId)) {
    return card;
  }

  return {
    ...card,
    effectMarkers: [...(card.effectMarkers ?? []), effectId],
  };
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
    case "fusionDeck":
      return player.fusionDeck?.[ref.index] ?? null;
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

function playerForSelector(playerId: PlayerId, selector: "self" | "opponent"): PlayerId {
  return selector === "self" ? playerId : opponentOf(playerId);
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
    .reduce((current, modifier) => modifier.setTo ?? current + (modifier.amount ?? 0), stats.atk);

  return {
    ...stats,
    atk: Math.max(0, atkDelta),
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

  const attackerBaseStats = getBattleStatsForZoneCard(nextState, attacker);

  if (!attackerBaseStats) {
    return { state: nextState, events: [] };
  }

  const attackerStats = deriveBattleStats({ ...nextState, pendingAttack: pending }, {
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

  const defenderBaseStats = getBattleStatsForZoneCard(nextState, defender);

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

  if (defender.face === "faceDown") {
    events.push(createMonsterFlippedFaceUpEvent(
      eventBuilder,
      pending.defenderPlayerId,
      revealedDefender,
      defenderIndex,
      "battle",
      state.turn,
    ));
  }

  const stateWithPendingAttack = { ...nextState, pendingAttack: pending };
  const defenderStats = deriveBattleStats(stateWithPendingAttack, {
    playerId: pending.defenderPlayerId,
    card: revealedDefender,
    base: defenderBaseStats,
  });
  const modifiedDefenderStats = applyPendingBattleAtkModifiers(defenderStats, pending, revealedDefender.instanceId);
  const outcome = resolveMonsterBattle(modifiedAttackerStats, modifiedDefenderStats, revealedDefender.position);
  const piercingDamage = revealedDefender.position === "defense" &&
    modifiedAttackerStats.atk > modifiedDefenderStats.def &&
    hasPiercingDamage(stateWithPendingAttack, { playerId: pending.attackerPlayerId, card: attacker })
      ? modifiedAttackerStats.atk - modifiedDefenderStats.def
      : 0;
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
  const fusionDeck = createDeckInstances(playerId, deck.extra ?? [], "fusion");
  const shuffled = shuffleDeck ? shuffleWithRng(instances, rng) : { items: instances, rng };
  const hand = shuffled.items.slice(0, OPENING_HAND_SIZE);
  const mainDeck = shuffled.items.slice(OPENING_HAND_SIZE);

  return {
    player: {
      id: playerId,
      lp: STARTING_LIFE_POINTS,
      mainDeck,
      fusionDeck,
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

function createDeckInstances(playerId: PlayerId, mainDeck: readonly string[], zonePrefix?: string): CardInstance[] {
  const copyCounts = new Map<string, number>();

  return mainDeck.map((cardId) => {
    const copyNumber = (copyCounts.get(cardId) ?? 0) + 1;
    copyCounts.set(cardId, copyNumber);

    return {
      instanceId: zonePrefix
        ? `${playerId}-${zonePrefix}-${cardId}-${copyNumber}`
        : `${playerId}-${cardId}-${copyNumber}`,
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
  const preflight = validatePlayerCommand(state, command);

  if (preflight) {
    return preflight;
  }

  if (state.activePlayer !== command.playerId) {
    return illegalResult(state, command, `It is not ${command.playerId}'s turn.`, command.playerId);
  }

  if (state.priority.status === "open" && state.priority.holder !== command.playerId) {
    return illegalResult(state, command, `${state.priority.holder} currently holds priority.`, command.playerId);
  }

  return null;
}

function validateNoPendingPhaseProcedure(state: DuelState): string | null {
  if (state.pendingPromptIds.length > 0) {
    return "Pending phase procedure prompts must be answered before changing phases.";
  }

  if (state.chain.length > 0) {
    return "Pending chain links must be resolved before changing phases.";
  }

  return null;
}

function validatePlayerCommand(
  state: DuelState,
  command: Extract<EngineCommand, { playerId: PlayerId }>,
): EngineResult | null {
  if (!isPlayerId(command.playerId)) {
    return illegalResult(state, command, `Unknown player: ${command.playerId}.`, command.playerId);
  }

  if (isDuelFinished(state)) {
    return illegalResult(state, command, "The duel is already over.", command.playerId);
  }

  return null;
}

function validateActivationWindow(
  state: DuelState,
  effect: EffectDefinition,
  playerId: PlayerId,
): string | null {
  if (effect.kind === "quick") {
    if (state.priority.status !== "open" || state.priority.holder !== playerId) {
      return "Quick effects can only be activated while that player holds an open priority window.";
    }

    return null;
  }

  if (state.activePlayer !== playerId) {
    return `It is not ${playerId}'s turn.`;
  }

  if (state.priority.status === "open" && state.priority.holder !== playerId) {
    return `${state.priority.holder} currently holds priority.`;
  }

  return null;
}

function validateIgnitionActivation(
  state: DuelState,
  effect: EffectDefinition,
  playerId: PlayerId,
): string | null {
  if (effect.kind !== "ignition") {
    return null;
  }

  if (!isMainPhase(state.phase)) {
    return "Ignition effects can only be activated during Main Phase 1 or Main Phase 2.";
  }

  if (state.priority.status !== "open" || state.priority.holder !== playerId) {
    return "Ignition effects can only be activated while that player holds an open priority window.";
  }

  if (state.pendingPromptIds.length > 0) {
    return "Ignition effects cannot be activated while a prompt is pending.";
  }

  if (state.pendingAttack) {
    return "Ignition effects cannot be activated while an attack is pending.";
  }

  return null;
}

function validateOncePerTurnUsage(
  state: DuelState,
  playerId: PlayerId,
  cardId: string,
  sourceInstanceId: string,
  effect: EffectDefinition,
): string | null {
  if (!effect.oncePerTurn) {
    return null;
  }

  const usage = state.effectUsage?.[oncePerTurnKey(playerId, cardId, sourceInstanceId, effect)];

  if (usage && effect.oncePerTurn.frequency === "duel") {
    return "That effect has already been activated this Duel.";
  }

  if (usage?.turn === state.turn) {
    return "That effect has already been activated this turn.";
  }

  return null;
}

function markOncePerTurnUsage(
  state: DuelState,
  playerId: PlayerId,
  cardId: string,
  sourceInstanceId: string,
  effect: EffectDefinition,
): DuelState {
  if (!effect.oncePerTurn) {
    return state;
  }

  const key = oncePerTurnKey(playerId, cardId, sourceInstanceId, effect);

  return {
    ...state,
    effectUsage: {
      ...(state.effectUsage ?? {}),
      [key]: {
        turn: state.turn,
        playerId,
        cardId,
        effectId: effect.id,
        sourceInstanceId,
        key,
        frequency: effect.oncePerTurn.frequency ?? "turn",
        scope: effect.oncePerTurn.scope ?? "source",
      },
    },
  };
}

function oncePerTurnKey(
  playerId: PlayerId,
  cardId: string,
  sourceInstanceId: string,
  effect: EffectDefinition,
): string {
  const scope = effect.oncePerTurn?.scope ?? "source";
  const baseKey = effect.oncePerTurn?.key ?? `${cardId}:${effect.id}`;

  switch (scope) {
    case "card":
      return `${playerId}:card:${baseKey}`;
    case "effect":
      return `${playerId}:effect:${baseKey}`;
    case "duel":
      return `duel:${baseKey}`;
    case "source":
      return `${playerId}:source:${sourceInstanceId}:${baseKey}`;
  }
}

function validatePromptCommand(
  state: DuelState,
  command: Extract<EngineCommand, { playerId: PlayerId }>,
): EngineResult | null {
  if (!isPlayerId(command.playerId)) {
    return illegalResult(state, command, `Unknown player: ${command.playerId}.`, command.playerId);
  }

  if (isDuelFinished(state)) {
    return illegalResult(state, command, "The duel is already over.", command.playerId);
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
    playerId: playerId ?? state.priorityPlayer,
    commandType: command.type,
    reason: message,
    turn: state.turn,
  };

  return result(command, appendEventIds(cloneDuelState(state), [event]), [event], [], [error]);
}

function missingEffectResult(
  state: DuelState,
  command: Extract<EngineCommand, { type: "activate-card" }>,
  cardId: string,
  instanceId: string,
): EngineResult {
  const eventBuilder = createEventBuilder(state.eventIds.length);
  const message = `${EFFECT_NOT_IMPLEMENTED}: card ${cardId} has no implemented effect script.`;
  const error: EngineError = {
    code: "unsupported-card",
    message,
    playerId: command.playerId,
    commandType: command.type,
    cardId,
    instanceId,
  };
  const event = createEffectNotImplementedEvent(eventBuilder, command.playerId, cardId, instanceId, state.turn);

  return result(command, appendEventIds(cloneDuelState(state), [event]), [event], [], [error]);
}

function unresolvedChainLinkResult(
  state: DuelState,
  command: Extract<EngineCommand, { type: "resolve-chain" }>,
  link: ChainLink,
  reason: string,
): EngineResult {
  const eventBuilder = createEventBuilder(state.eventIds.length);
  const message = `${EFFECT_NOT_IMPLEMENTED}: ${reason}.`;
  const error: EngineError = {
    code: "unsupported-card",
    message,
    playerId: link.playerId,
    commandType: command.type,
    cardId: link.cardId,
    instanceId: link.sourceInstanceId,
  };
  const event = createEffectNotImplementedEvent(
    eventBuilder,
    link.playerId,
    link.cardId,
    link.sourceInstanceId,
    state.turn,
    message,
  );

  return result(command, appendEventIds(cloneDuelState(state), [event]), [event], [], [error]);
}

function createPromptResult(
  state: DuelState,
  command: Extract<EngineCommand, { type: "activate-card" }>,
  promptDefinitions: readonly PromptDefinition[],
): EngineResult {
  const eventBuilder = createEventBuilder(state.eventIds.length);
  const prompts = promptDefinitions.map((definition, index) =>
    createPrompt(definition, command.playerId, nextPromptId(state, index)),
  );
  const events = prompts.map((prompt) => createPromptCreatedEvent(eventBuilder, prompt, state.turn));
  const promptEntries = Object.fromEntries(prompts.map((prompt) => [prompt.id, prompt]));
  const nextState = appendEventIds(
    {
      ...cloneDuelState(state),
      prompts: {
        ...state.prompts,
        ...promptEntries,
      },
      pendingPromptIds: [...state.pendingPromptIds, ...prompts.map((prompt) => prompt.id)],
    },
    events,
  );

  return result(command, nextState, events, prompts);
}

function validateTriggerTargetPrompt(
  state: DuelState,
  prompt: EnginePrompt,
  command: Extract<EngineCommand, { type: "answer-prompt" }>,
): {
  readonly candidate?: TriggerCandidate;
  readonly selectedTargets?: SelectedTargets;
  readonly targetSpecs?: readonly TargetSpec[];
  readonly error?: string;
} | null {
  const candidate = triggerCandidateFromPrompt(prompt);

  if (!candidate) {
    return null;
  }

  const script = getCardScriptForDefinitions(candidate.cardId, state.cardDefinitions, state.cardScripts);
  const effect = script?.effects.find((entry) => entry.id === candidate.effectId);
  const targetSpecs = effect?.targets ?? [];
  const targetResult = validateTargetSelection(state, prompt.playerId, targetSpecs, {
    targetRefs: command.targetRefs ?? [],
    targetPlayerIds: command.targetPlayerIds ?? [],
  });

  if (!targetResult.valid) {
    return {
      error: targetResult.reason ?? "Invalid effect targets.",
    };
  }

  return {
    candidate,
    selectedTargets: targetResult.selectedTargets,
    targetSpecs,
  };
}

function collectTriggers(
  state: DuelState,
  sourceEvents: readonly EngineEvent[],
  timing: TriggerTiming,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[]; readonly prompts: readonly EnginePrompt[] } {
  const candidates = collectTriggerCandidates(state, sourceEvents, timing);
  let nextState = state;
  const events: EngineEvent[] = [];
  const prompts: EnginePrompt[] = [];

  for (const candidate of candidates) {
    if (candidate.optional) {
      const prompt = createOptionalTriggerPrompt(candidate, nextPromptId(nextState, 0));

      prompts.push(prompt);
      events.push(createPromptCreatedEvent(eventBuilder, prompt, nextState.turn));
      nextState = {
        ...nextState,
        prompts: {
          ...nextState.prompts,
          [prompt.id]: prompt,
        },
        pendingPromptIds: [...nextState.pendingPromptIds, prompt.id],
      };
      continue;
    }

    if ((candidate.targetSpecs ?? []).some((targetSpec) => targetSpec.kind === "card" && targetSpec.min > 0)) {
      const prompt = createTriggerTargetPrompt(candidate, nextPromptId(nextState, 0));

      prompts.push(prompt);
      events.push(createPromptCreatedEvent(eventBuilder, prompt, nextState.turn));
      nextState = {
        ...nextState,
        prompts: {
          ...nextState.prompts,
          [prompt.id]: prompt,
        },
        pendingPromptIds: [...nextState.pendingPromptIds, prompt.id],
      };
      continue;
    }

    const queued = queueTriggerChainLink(nextState, candidate, eventBuilder);

    nextState = queued.state;
    events.push(...queued.events);
  }

  return {
    state: appendEventIds(nextState, events),
    events,
    prompts,
  };
}

function queueTriggerChainLink(
  state: DuelState,
  candidate: TriggerCandidate,
  eventBuilder: EventBuilder,
  targetSelection: {
    readonly selectedTargets?: SelectedTargets;
    readonly targetSpecs?: readonly TargetSpec[];
  } = {},
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const script = getCardScriptForDefinitions(candidate.cardId, state.cardDefinitions, state.cardScripts);
  const effect = script?.effects.find((entry) => entry.id === candidate.effectId);
  const costResult = payCosts(state, candidate.playerId, effect?.costs ?? [], {
    sourceInstanceId: candidate.sourceInstanceId,
  });

  if (!costResult.valid) {
    return {
      state,
      events: [],
    };
  }

  const chainLink = createChainLink(
    {
      playerId: candidate.playerId,
      sourceInstanceId: candidate.sourceInstanceId,
      cardId: candidate.cardId,
      effectId: candidate.effectId,
      spellSpeed: candidate.spellSpeed,
      ...(costResult.paidCosts.length > 0 ? { paidCosts: costResult.paidCosts } : {}),
      ...(candidate.triggerEvent?.type === "attack-declared" || candidate.triggerEvent?.type === "battle-completed"
        ? { triggerEvent: candidate.triggerEvent }
        : {}),
      ...((targetSelection.targetSpecs?.length ?? 0) > 0 ? { targetSpecs: targetSelection.targetSpecs } : {}),
      ...(targetSelection.selectedTargets ? { selectedTargets: targetSelection.selectedTargets } : {}),
    },
    costResult.state.chain,
  );
  const events: EngineEvent[] = [
    ...costResult.paidCosts.map((paidCost) => createCostPaidEvent(eventBuilder, candidate.playerId, paidCost, state.turn)),
    createEffectActivatedEvent(eventBuilder, chainLink, state.turn),
    createChainLinkCreatedEvent(eventBuilder, chainLink, state.turn),
  ];

  return {
    state: {
      ...revealTriggerSource(costResult.state, candidate),
      chain: addChainLink(costResult.state.chain, chainLink),
    },
    events,
  };
}

function activationPromptsForEffect(
  promptDefinitions: readonly PromptDefinition[] | undefined,
  targetSpecs: Parameters<typeof validateTargetSelection>[2] | undefined,
  command: Extract<EngineCommand, { type: "activate-card" }>,
): readonly PromptDefinition[] {
  const prompts: PromptDefinition[] = [...(promptDefinitions ?? [])];
  const needsCardTargets = (targetSpecs ?? []).some(
    (targetSpec) => targetSpec.kind === "card" && targetSpec.min > 0,
  );
  const needsPlayerTargets = (targetSpecs ?? []).some(
    (targetSpec) => targetSpec.kind === "player" && targetSpec.min > 0,
  );
  const hasTargetPrompt = prompts.some((prompt) => prompt.kind === "target");

  if (!hasTargetPrompt && needsCardTargets && (command.targetRefs?.length ?? 0) === 0) {
    const firstCardTarget = (targetSpecs ?? []).find((targetSpec) => targetSpec.kind === "card");

    if (firstCardTarget?.kind === "card") {
      prompts.push({
        kind: "target",
        message: `${command.playerId} must choose target cards.`,
        min: firstCardTarget.min,
        max: firstCardTarget.max,
      });
    }
  }

  if (!hasTargetPrompt && needsPlayerTargets && (command.targetPlayerIds?.length ?? 0) === 0) {
    const firstPlayerTarget = (targetSpecs ?? []).find((targetSpec) => targetSpec.kind === "player");

    if (firstPlayerTarget?.kind === "player") {
      prompts.push({
        kind: "target",
        message: `${command.playerId} must choose target players.`,
        min: firstPlayerTarget.min,
        max: firstPlayerTarget.max,
      });
    }
  }

  return prompts;
}

function nextPromptId(state: DuelState, offset: number): string {
  return `prompt-${state.pendingPromptIds.length + offset + 1}`;
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

function priorityWindowFields(holder: PlayerId, reason: PriorityWindowReason): Pick<DuelState, "priority" | "priorityPlayer"> {
  const priority = createPriorityWindow(holder, reason);

  return {
    priority,
    priorityPlayer: priority.holder,
  };
}

function withPriorityWindow(state: DuelState, holder: PlayerId, reason: PriorityWindowReason): DuelState {
  return {
    ...state,
    ...priorityWindowFields(holder, reason),
  };
}

function withPostMonsterPlayPriority(
  state: DuelState,
  holder: PlayerId,
  playKind: MonsterPlayKind,
): DuelState {
  if (playKind !== "normal-summon") {
    return state;
  }

  return withPriorityWindow(state, holder, "summon-successful");
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

function createCardBanishedEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: ZoneCard,
  turn: number,
  reason: CardBanishedEvent["reason"] = "effect",
): CardBanishedEvent {
  return {
    id: builder.nextId(),
    type: "card-banished",
    message: `${playerId}'s card was banished by ${reason}.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    reason,
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
  phase: DuelState["phase"],
  chainDepth: number,
  reason: string,
): CardMovedEvent {
  return {
    id: builder.nextId(),
    type: "card-moved",
    message: `${playerId} moved a card to ${to.zone}.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    owner: card.owner,
    controller: card.controller,
    from,
    to,
    visibility: card.visibility,
    reason,
    phase,
    chainDepth,
    turn,
    metadata: { reason, phase, chainDepth },
  };
}

function createCostPaidEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  paidCost: PaidCost,
  turn: number,
): CostPaidEvent {
  return {
    id: builder.nextId(),
    type: "cost-paid",
    message: `${playerId} paid a cost.`,
    playerId,
    costKind: eventCostKind(paidCost),
    instanceIds: paidCost.instanceIds,
    amount: paidCost.amount,
    turn,
  };
}

function createTargetsChosenEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  chainLink: ChainLink,
  targetRefs: readonly ZoneRef[],
  turn: number,
): TargetsChosenEvent {
  return {
    id: builder.nextId(),
    type: "targets-chosen",
    message: `${playerId} chose effect targets.`,
    playerId,
    sourceInstanceId: chainLink.sourceInstanceId,
    targetRefs,
    turn,
  };
}

function createEffectActivatedEvent(
  builder: EventBuilder,
  chainLink: ChainLink,
  turn: number,
): EffectActivatedEvent {
  return {
    id: builder.nextId(),
    type: "effect-activated",
    message: `${chainLink.playerId} activated an effect.`,
    playerId: chainLink.playerId,
    instanceId: chainLink.sourceInstanceId,
    cardId: chainLink.cardId,
    chainLinkId: chainLink.id,
    turn,
  };
}

function createPromptCreatedEvent(
  builder: EventBuilder,
  prompt: EnginePrompt,
  turn: number,
): PromptCreatedEvent {
  return {
    id: builder.nextId(),
    type: "prompt-created",
    message: prompt.message,
    playerId: prompt.playerId,
    promptId: prompt.id,
    promptKind: prompt.kind,
    turn,
  };
}

function createPromptResolvedEvent(
  builder: EventBuilder,
  prompt: EnginePrompt,
  turn: number,
): PromptResolvedEvent {
  return {
    id: builder.nextId(),
    type: "prompt-resolved",
    message: `${prompt.playerId} resolved prompt ${prompt.id}.`,
    playerId: prompt.playerId,
    promptId: prompt.id,
    turn,
  };
}

function eventCostKind(paidCost: PaidCost): CostPaidEvent["costKind"] {
  switch (paidCost.kind) {
    case "discard":
      return "discard";
    case "tribute":
    case "tribute-matching-face-up-card":
    case "tribute-source":
      return "tribute";
    case "banish-from-graveyard":
      return "banish";
    case "pay-lp":
      return "life-points";
    case "none":
    case "remove-counter-from-source":
    case "send-to-graveyard":
    case "reveal":
    case "return-to-hand":
      return "other";
  }
}

function createChainLinkCreatedEvent(
  builder: EventBuilder,
  chainLink: ChainLink,
  turn: number,
): ChainLinkCreatedEvent {
  return {
    id: builder.nextId(),
    type: "chain-link-created",
    message: `Chain link ${chainLink.id} was created.`,
    playerId: chainLink.playerId,
    chainLinkId: chainLink.id,
    sourceInstanceId: chainLink.sourceInstanceId,
    cardId: chainLink.cardId,
    spellSpeed: chainLink.spellSpeed,
    turn,
  };
}

function createChainResolvedEvent(
  builder: EventBuilder,
  chainLink: ChainLink,
  turn: number,
): ChainResolvedEvent {
  return {
    id: builder.nextId(),
    type: "chain-resolved",
    message: `Chain link ${chainLink.id} resolved.`,
    chainLinkId: chainLink.id,
    sourceInstanceId: chainLink.sourceInstanceId,
    turn,
    playerId: chainLink.playerId,
  };
}

function createEffectResolvedWithoutEffectEvent(
  builder: EventBuilder,
  chainLink: ChainLink,
  reason: string,
  turn: number,
): EffectResolvedWithoutEffectEvent {
  return {
    id: builder.nextId(),
    type: "effect-resolved-without-effect",
    message: `Chain link ${chainLink.id} resolved without effect: ${reason}`,
    playerId: chainLink.playerId,
    chainLinkId: chainLink.id,
    sourceInstanceId: chainLink.sourceInstanceId,
    cardId: chainLink.cardId,
    effectId: chainLink.effectId,
    reason,
    turn,
  };
}

function createEffectNotImplementedEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  cardId: string,
  instanceId: string,
  turn: number,
  message = `${EFFECT_NOT_IMPLEMENTED}: card ${cardId} has no implemented effect script.`,
): EffectNotImplementedEvent {
  return {
    id: builder.nextId(),
    type: "effect-not-implemented",
    message,
    playerId,
    cardId,
    instanceId,
    turn,
    metadata: {
      reasonCode: EFFECT_NOT_IMPLEMENTED,
    },
  };
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

function createMonsterFlippedFaceUpEvent(
  builder: EventBuilder,
  playerId: PlayerId,
  card: ZoneCard,
  zoneIndex: number,
  reason: MonsterFlippedFaceUpEvent["reason"],
  turn: number,
): MonsterFlippedFaceUpEvent {
  return {
    id: builder.nextId(),
    type: "monster-flipped-face-up",
    message: `${playerId}'s monster was flipped face-up.`,
    playerId,
    instanceId: card.instanceId,
    cardId: card.cardId,
    zone: { playerId, zone: "monsterZone", index: zoneIndex },
    reason,
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
  phase: DuelState["phase"],
): CardMovedEvent {
  return {
    id: builder.nextId(),
    type: "card-moved",
    message: `${playerId} discarded a card for hand size.`,
    playerId,
    instanceId: discard.card.instanceId,
    cardId: discard.card.cardId,
    owner: discard.card.owner,
    controller: discard.card.controller,
    from: { playerId, zone: "hand", index: discard.fromHandIndex },
    to: { playerId, zone: "graveyard", index: discard.toGraveyardIndex },
    visibility: "public",
    reason: "hand-size-discard",
    phase,
    chainDepth: 0,
    turn,
    metadata: { reason: "hand-size-discard", phase, chainDepth: 0 },
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

function applyAutomaticWinConditionsUnrecorded(
  state: DuelState,
  builder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  if (isDuelFinished(state)) {
    return { state, events: [] };
  }

  const lpZeroLoser = playerWithZeroLp(state);

  if (lpZeroLoser) {
    return finishDuelUnrecorded(state, lpZeroLoser, "lp-zero", builder);
  }

  const exodiaWinner = findExodiaWinner(state);

  if (exodiaWinner) {
    return finishDuelUnrecorded(state, opponentOf(exodiaWinner), "exodia", builder);
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

function finishDuelAsDraw(
  state: DuelState,
  builder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const playerLostEvents = PLAYERS.map((playerId) => createPlayerLostEvent(builder, playerId, "lp-zero", state.turn));
  const duelFinished = createDuelFinishedEvent(builder, null, "draw", state.turn);
  const events = [...playerLostEvents, duelFinished];
  const finishedState = appendEventIds(
    {
      ...state,
      winner: null,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          lost: true,
        },
        P2: {
          ...state.players.P2,
          lost: true,
        },
      },
    },
    events,
  );

  return {
    state: finishedState,
    events,
  };
}

function finishDuelUnrecorded(
  state: DuelState,
  loser: PlayerId,
  reason: LossReason,
  builder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const winner = opponentOf(loser);
  const playerLost = createPlayerLostEvent(builder, loser, reason, state.turn);
  const duelFinished = createDuelFinishedEvent(builder, winner, reason, state.turn);

  return {
    state: {
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

  const replacement = findDestructionReplacement(state, {
    playerId,
    card,
    reason: "battle",
  });

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
          banished: card.token
            ? playersWithoutMonster[destinationPlayerId].banished
            : [banishedCard, ...playersWithoutMonster[destinationPlayerId].banished],
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
        state.phase,
        state.chain.length,
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
        graveyard: card.token
          ? playersWithoutMonster[destinationPlayerId].graveyard
          : [destroyedCard, ...playersWithoutMonster[destinationPlayerId].graveyard],
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
      state.phase,
      state.chain.length,
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
  const cardIds = new Set([
    ...decks.P1.main,
    ...(decks.P1.extra ?? []),
    ...decks.P2.main,
    ...(decks.P2.extra ?? []),
  ]);
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
