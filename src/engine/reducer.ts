import type { CardRecord } from "../types";
import type { EffectDefinition, EffectResolutionStep } from "./cards/CardScript";
import { getCardScriptForDefinitions, EFFECT_NOT_IMPLEMENTED } from "./cards/unsupported";
import type { EngineCommand } from "./commands";
import type { AttachmentLeaveBehavior, CardInstance, ZoneCard, ZoneRef } from "./core/cardRefs";
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
import { createRngState, shuffleWithRng, type RngState } from "./random";
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
  const triggers = collectTriggers(nextState, [phaseChanged], "after-action", eventBuilder);

  return result(command, triggers.state, [...events, phaseChanged, ...triggers.events], triggers.prompts);
}

function endTurn(state: DuelState, command: Extract<EngineCommand, { type: "end-turn" }>): EngineResult {
  const preflight = validateTurnCommand(state, command);

  if (preflight) {
    return preflight;
  }

  if (state.phase !== "EP") {
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

  const attackRestriction = validateContinuousAttackRestrictions(state, attackerPlayerId, attacker);

  if (attackRestriction) {
    return illegalResult(state, command, attackRestriction, command.playerId);
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
  const preflight = validateTurnCommand(state, command);

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
  const stateWithSourceRevealed = revealActivationSource(costResult.state, located.ref);
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
  const nextState = appendEventIds(terminal.state, events);
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

      const resolved = applyResolvedChainLinkEffect(resultState.state, link, eventBuilder);

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
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const script = getCardScriptForDefinitions(link.cardId, state.cardDefinitions, state.cardScripts);
  const effect = script?.effects.find((candidate) => candidate.id === link.effectId);

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

      const resolvedStep = applyResolutionStep(stepResult.state, link, effect, step, eventBuilder);

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
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  switch (step.kind) {
    case "draw":
      return applyDrawResolutionStep(state, playerForSelector(link.playerId, step.player), step.count, eventBuilder);
    case "add-counter-to-source":
      return applyAddCounterToSourceStep(state, link, step.counterType, step.count, step.max);
    case "modify-pending-battle-atk":
      return applyModifyPendingBattleAtkStep(state, link, step.amount);
    case "damage-attacker-by-battle-atk-destroy-source":
      return applyDamageAttackerByBattleAtkDestroySourceStep(state, link, eventBuilder);
    case "destroy-targets-damage-both-players-by-monster-atk":
      return applyDestroyTargetsDamageBothPlayersByMonsterAtkStep(state, link, eventBuilder);
    case "destroy-targets":
      return applyDestroyTargetsStep(state, link, eventBuilder);
    case "destroy-face-up-monsters-by-type":
      return applyDestroyFaceUpMonstersByTypeStep(state, step.monsterType, eventBuilder);
    case "banish-battle-participants":
      return applyBanishBattleParticipantsStep(state, link, eventBuilder);
    case "destroy-all-spells-traps":
      return applyDestroyAllSpellsTrapsStep(state, link.playerId, step.controller, eventBuilder);
    case "destroy-all-monsters":
      return applyDestroyAllMonstersStep(state, link.playerId, step.controller, eventBuilder);
    case "destroy-attack-source":
      return applyDestroyAttackSourceStep(state, link, eventBuilder);
    case "destroy-opponent-attack-position-monsters":
      return applyDestroyOpponentAttackPositionMonstersStep(state, link.playerId, eventBuilder);
    case "negate-attack":
      return applyNegateAttackStep(state);
    case "place-source-in-spell-trap-zone":
      return applyPlaceSourceInSpellTrapZoneStep(state, link, eventBuilder);
    case "search-deck-to-hand":
      return applySearchDeckToHandStep(state, playerForSelector(link.playerId, step.player), step.cardIds, step.count, eventBuilder);
    case "special-summon-from-deck":
      return applySpecialSummonFromDeckStep(
        state,
        playerForSelector(link.playerId, step.player),
        step.cardIds,
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
    case "take-control-of-targets":
      return applyTakeControlOfTargetsStep(
        state,
        link,
        step.linkToSource ?? false,
        step.sourceLeaveBehavior,
        eventBuilder,
      );
    case "return-source-to-hand":
      return applyReturnSourceToHandStep(state, link, eventBuilder);
    case "change-position":
      return applyChangePositionStep(state, link, step.position, eventBuilder);
    case "set-face":
      return applySetFaceStep(state, link, step.face, step.position);
    case "return-targets-to-hand":
      return applyReturnTargetsToHandStep(state, link, eventBuilder);
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

      const base = getMonsterBattleStats(resultState.state.cardDefinitions?.[target.cardId]);

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
    events.push(createCardMovedEvent(eventBuilder, playerId, toPublicEventCard(card), source, destination, state.turn, "effect-search"));
  }

  return { state: nextState, events };
}

function applySpecialSummonFromDeckStep(
  state: DuelState,
  playerId: PlayerId,
  cardIds: readonly string[],
  count: number,
  position: "attack" | "defense",
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;
  const events: EngineEvent[] = [];

  for (let summonIndex = 0; summonIndex < count; summonIndex += 1) {
    const zoneIndex = nextState.players[playerId].monsterZones.findIndex((card) => card === null);
    const deckIndex = nextState.players[playerId].mainDeck.findIndex((card) => cardIds.includes(card.cardId));

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
    events.push(createCardMovedEvent(eventBuilder, playerId, toPublicEventCard(card), source, destination, state.turn, "effect-special-summon"));
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
  });
  const eventCard = isZoneCard(source.card)
    ? toPublicZoneCard({ ...source.card, position: null })
    : toZoneEventCard(source.card, { position: null });

  return {
    state: nextState,
    events: [
      createCardMovedEvent(eventBuilder, link.playerId, eventCard, source.ref, destination, state.turn, "effect-resolution"),
    ],
  };
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

    events.push(createCardMovedEvent(eventBuilder, link.playerId, eventCard, source, destination, state.turn, "effect-special-summon"));
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

function applyTakeControlOfTargetsStep(
  state: DuelState,
  link: ChainLink,
  linkToSource: boolean,
  sourceLeaveBehavior: AttachmentLeaveBehavior | undefined,
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

    events.push(
      createCardMovedEvent(
        eventBuilder,
        link.playerId,
        toPublicZoneCard(controlledTarget),
        source,
        destination,
        state.turn,
        "control-change",
      ),
    );
  }

  return { state: nextState, events };
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
    events: [createCardMovedEvent(eventBuilder, located.ref.playerId, eventCard, located.ref, destination, state.turn, "effect")],
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

function applySetFaceStep(
  state: DuelState,
  link: ChainLink,
  face: "faceUp" | "faceDown",
  position: "attack" | "defense" | undefined,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  let nextState = state;

  for (const targetRef of link.selectedTargets?.targetRefs ?? []) {
    const card = cardAtRef(nextState, targetRef);

    if (!isZoneCard(card) || targetRef.zone === "mainDeck" || targetRef.zone === "hand") {
      continue;
    }

    nextState = setCardFace(nextState, targetRef, face, face === "faceUp" ? "public" : "hidden");

    if (targetRef.zone === "monsterZone" && position) {
      nextState = updateMonsterPosition(nextState, targetRef, position);
    }
  }

  return { state: nextState, events: [] };
}

function applyReturnTargetsToHandStep(
  state: DuelState,
  link: ChainLink,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  return (link.selectedTargets?.targetRefs ?? []).reduce(
    (resultState, targetRef) => {
      const moved = moveTargetToHand(resultState.state, targetRef, eventBuilder);

      return {
        state: moved.state,
        events: [...resultState.events, ...moved.events],
      };
    },
    { state, events: [] as EngineEvent[] },
  );
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

function moveTargetToHand(
  state: DuelState,
  targetRef: ZoneRef,
  eventBuilder: EventBuilder,
): { readonly state: DuelState; readonly events: readonly EngineEvent[] } {
  const target = cardAtRef(state, targetRef);

  if (!target || targetRef.zone === "hand") {
    return { state, events: [] };
  }

  const removed = removeFromZone(state, targetRef);
  const destination: ZoneRef = {
    playerId: target.owner,
    zone: "hand",
    index: removed.state.players[target.owner].hand.length,
  };
  const nextState = insertIntoZone(removed.state, destination, removed.card);
  const eventCard = isZoneCard(target) ? target : { ...target, face: "faceUp" as const, position: null, visibility: "public" as const, counters: {}, attachments: [] };

  return {
    state: nextState,
    events: [createCardMovedEvent(eventBuilder, targetRef.playerId, eventCard, targetRef, destination, state.turn, "effect")],
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
    createCardMovedEvent(eventBuilder, located.ref.playerId, eventCard, located.ref, destination, state.turn, "effect-banish"),
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
  const piercingDamage = revealedDefender.position === "defense" &&
    modifiedAttackerStats.atk > modifiedDefenderStats.def &&
    hasPiercingDamage(nextState, { playerId: pending.attackerPlayerId, card: attacker })
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

  if (state.priority.status === "open" && state.priority.holder !== command.playerId) {
    return illegalResult(state, command, `${state.priority.holder} currently holds priority.`, command.playerId);
  }

  return null;
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
