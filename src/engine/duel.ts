import type { CardRecord, Phase } from "../types";
import type { CardInstance as CoreCardInstance, ZoneCard as CoreZoneCard } from "./core/cardRefs";
import type { DuelState as CoreDuelState } from "./core/state";
import { shuffleSeeded } from "./random";
import { createDuel as createCoreDuel, reduceDuel } from "./reducer";
import type { EngineCommand } from "./commands";
import type { EngineEvent } from "./events";
import type {
  CreateDuelConfig,
  DeckList,
  DuelAction,
  DuelCardInstance,
  DuelEvent,
  DuelPlayerState,
  DuelResult,
  DuelState,
  DuelZoneCard,
  PassiveBoardFillerOptions,
  PlayerId,
  SerializedCard,
  SerializedDuelState,
  SerializedPlayerState,
} from "./types";

const PHASES: Phase[] = ["DP", "SP", "M1", "BP", "M2", "EP"];
const ZONE_COUNT = 5;
const DEFAULT_SEED = "goat-duel";

export function createDuel(config: CreateDuelConfig): DuelState {
  const seed = config.seed ?? DEFAULT_SEED;
  const firstPlayer = config.firstPlayer ?? "P1";
  const mode = config.mode ?? "match";
  const p1Deck = config.decks?.P1 ?? createRandomLegalDeck(config.cards, `${seed}:P1`);
  const p2Deck = config.decks?.P2 ?? createRandomLegalDeck(config.cards, `${seed}:P2`);
  const core = createCoreDuel({
    cards: config.cards,
    decks: {
      P1: p1Deck,
      P2: p2Deck,
    },
    seed,
    firstPlayer,
    mode,
    allowUnsupportedCards: config.allowUnsupportedCards,
    shuffleDecks: false,
  });

  return legacyStateFromCore(core.state, config.cards, mode, core.events);
}

export function getLegalActions(state: DuelState, playerId: PlayerId): DuelAction[] {
  if (state.winner || state.activePlayer !== playerId) {
    return [];
  }

  const player = state.players[playerId];
  const actions: DuelAction[] = [];

  if (state.phase === "DP" && !state.turnFlags.drawnThisTurn) {
    actions.push({ type: "draw", playerId });
  }

  actions.push({ type: state.phase === "EP" ? "end-turn" : "advance-phase", playerId });

  if (state.phase === "M1" || state.phase === "M2") {
    for (const card of player.hand) {
      if (card.card.category === "Monster") {
        if (canNormalSummon(player, card.card)) {
          const tributeCount = requiredTributes(card.card);
          const emptyMonsterZoneIndexes = emptyZoneIndexes(player.monsterZones);
          const zoneTargets = emptyMonsterZoneIndexes.length
            ? emptyMonsterZoneIndexes.map((zoneIndex) => ({
                zoneIndex,
                requiredTributeInstanceIds: [],
              }))
            : player.monsterZones.map((zone, zoneIndex) => ({
                zoneIndex,
                requiredTributeInstanceIds: tributeCount > 0 && zone ? [zone.instance.instanceId] : [],
              }));

          for (const { zoneIndex, requiredTributeInstanceIds } of zoneTargets) {
            actions.push({
              type: "play-card",
              playerId,
              instanceId: card.instanceId,
              intent: "summon",
              zoneKind: "monster",
              zoneIndex,
              tributeCount,
              requiredTributeInstanceIds,
            });
            actions.push({
              type: "play-card",
              playerId,
              instanceId: card.instanceId,
              intent: "set",
              zoneKind: "monster",
              zoneIndex,
              tributeCount,
              requiredTributeInstanceIds,
            });
          }
        }
      } else {
        for (const zoneIndex of emptyZoneIndexes(player.spellTrapZones)) {
          actions.push({
            type: "play-card",
            playerId,
            instanceId: card.instanceId,
            intent: "set",
            zoneKind: "spellTrap",
            zoneIndex,
          });

          if (card.card.category === "Spell") {
            actions.push({
              type: "play-card",
              playerId,
              instanceId: card.instanceId,
              intent: "activate",
              zoneKind: "spellTrap",
              zoneIndex,
            });
          }
        }
      }
    }
  }

  if (state.phase === "BP") {
    const opponent = state.players[opponentOf(playerId)];
    const defenderZones = opponent.monsterZones
      .map((zone, zoneIndex) => ({ zone, zoneIndex }))
      .filter((entry): entry is { zone: DuelZoneCard; zoneIndex: number } => Boolean(entry.zone));

    for (const zone of player.monsterZones) {
      if (zone && !zone.faceDown && zone.position === "attack" && !zone.instance.attackedThisTurn) {
        if (defenderZones.length === 0) {
          actions.push({
            type: "attack",
            playerId,
            attackerInstanceId: zone.instance.instanceId,
          });
          continue;
        }

        for (const defender of defenderZones) {
          actions.push({
            type: "attack",
            playerId,
            attackerInstanceId: zone.instance.instanceId,
            defenderInstanceId: defender.zone.instance.instanceId,
          });
        }
      }
    }
  }

  return actions.filter((action) => isCoreRoutableLegalAction(state, action));
}

export function applyAction(state: DuelState, action: DuelAction): DuelResult {
  const draft = cloneState(state);
  const eventStart = draft.events.length;

  if (draft.winner && action.type !== "set-life-points") {
    addEvent(draft, "illegal-action", "The duel is already over.");
    return result(draft, eventStart);
  }

  switch (action.type) {
    case "draw":
    case "advance-phase":
    case "end-turn":
    case "play-card":
    case "attack":
    case "set-phase":
    case "move-card":
    case "override-card-location":
      handleCoreRoutedAction(draft, action);
      break;
    case "activate-set-card":
      handleActivateSetCard(draft, action.playerId, action.instanceId);
      break;
    case "set-life-points":
      setLifePoints(draft, action.targetPlayerId, action.value);
      break;
  }

  return result(draft, eventStart);
}

// Manual-play activation of a face-down Spell/Trap already on the field: flip it
// face-up. No effect is resolved. Traps cannot be activated the turn they were Set.
function handleActivateSetCard(state: DuelState, playerId: PlayerId, instanceId: string): void {
  if (!requireActivePlayer(state, playerId)) {
    return;
  }

  const player = state.players[playerId];
  const index = player.spellTrapZones.findIndex((zone) => zone?.instance.instanceId === instanceId);
  const zone = index >= 0 ? player.spellTrapZones[index] : null;

  if (!zone) {
    addEvent(state, "illegal-action", "Selected card is not a Set Spell/Trap you control.");
    return;
  }

  if (!zone.faceDown) {
    addEvent(state, "illegal-action", "That card is already face-up.");
    return;
  }

  if (zone.instance.card.category === "Trap" && (zone.setTurn == null || zone.setTurn >= state.turn)) {
    addEvent(state, "illegal-action", "Trap Cards cannot be activated the turn they are Set.");
    return;
  }

  player.spellTrapZones[index] = {
    ...zone,
    faceDown: false,
    position: "attack",
    status: "activated",
  };
  state.coreState = coreStateFromLegacy(state);
  addEvent(state, "card-activated", `${playerId} activated ${zone.instance.card.name}.`);
}

export function advanceToNextDecision(state: DuelState, playerId: PlayerId): DuelResult {
  const draft = cloneState(state);
  const eventStart = draft.events.length;
  let guard = 0;

  while (guard < 12 && shouldAutoAdvancePhase(draft, playerId)) {
    guard += 1;

    if (draft.phase === "EP") {
      handleCoreRoutedAction(draft, { type: "end-turn", playerId });
    } else {
      handleCoreRoutedAction(draft, { type: "advance-phase", playerId });
    }
  }

  return result(draft, eventStart);
}

export function runPassiveBoardFillerOpponentTurn(
  state: DuelState,
  options: PassiveBoardFillerOptions = {},
): DuelResult {
  let draft = advanceToNextDecision(state, "P2").state;
  const eventStart = state.events.length;

  if (draft.winner || draft.activePlayer !== "P2") {
    return result(draft, eventStart);
  }

  if (draft.phase !== "M1") {
    draft = applyAction(draft, { type: "set-phase", playerId: "P2", phase: "M1" }).state;
  }

  fillOpponentMonsterBoardForTestingInternal(draft, {
    targetMonsterCount: options.targetMonsterCount,
  });

  if (!draft.winner && draft.activePlayer === "P2") {
    handleCoreRoutedAction(draft, { type: "end-turn", playerId: "P2" });
  }

  return result(draft, eventStart);
}

export function fillOpponentMonsterBoardForTesting(
  state: DuelState,
  options: PassiveBoardFillerOptions = {},
): DuelResult {
  const draft = cloneState(state);
  const eventStart = draft.events.length;
  fillOpponentMonsterBoardForTestingInternal(draft, options);

  return result(draft, eventStart);
}

export function serializeDuel(state: DuelState, viewerId: PlayerId): SerializedDuelState {
  return {
    id: state.id,
    viewerId,
    turn: state.turn,
    phase: state.phase,
    activePlayer: state.activePlayer,
    battleSubstep: state.battleSubstep,
    players: {
      P1: serializePlayer(state.players.P1, viewerId),
      P2: serializePlayer(state.players.P2, viewerId),
    },
    events: state.events.slice(-12),
    winner: state.winner,
  };
}

function fillOpponentMonsterBoardForTestingInternal(
  state: DuelState,
  options: PassiveBoardFillerOptions,
): void {
  const opponent = state.players.P2;
  const targetMonsterCount = clampTargetMonsterCount(options.targetMonsterCount ?? 3);
  let currentMonsterCount = opponent.monsterZones.filter(Boolean).length;

  while (currentMonsterCount < targetMonsterCount) {
    const zoneIndex = opponent.monsterZones.findIndex((zone) => zone === null);

    if (zoneIndex < 0) {
      return;
    }

    const nextMonster = takePassiveBoardFillerMonster(opponent);

    if (!nextMonster) {
      addEvent(state, "passive-board-filler-empty", "PassiveBoardFillerOpponent found no monsters to place.");
      return;
    }

    debugPlaceMonsterOnOpponentField(state, nextMonster.instance, zoneIndex, nextMonster.source);
    currentMonsterCount += 1;
  }
}

function takePassiveBoardFillerMonster(
  player: DuelPlayerState,
): { instance: DuelCardInstance; source: "hand" | "deck" } | null {
  const handIndex = findPassiveBoardFillerMonsterIndex(player.hand);

  if (handIndex >= 0) {
    const [instance] = player.hand.slice(handIndex, handIndex + 1);
    player.hand = removeAt(player.hand, handIndex);
    return { instance, source: "hand" };
  }

  const deckIndex = findPassiveBoardFillerMonsterIndex(player.deck);

  if (deckIndex >= 0) {
    const [instance] = player.deck.slice(deckIndex, deckIndex + 1);
    player.deck = removeAt(player.deck, deckIndex);
    return { instance, source: "deck" };
  }

  return null;
}

function findPassiveBoardFillerMonsterIndex(instances: DuelCardInstance[]): number {
  const lowLevelIndex = instances.findIndex((instance) => isPassiveBoardFillerMonster(instance.card, true));

  if (lowLevelIndex >= 0) {
    return lowLevelIndex;
  }

  return instances.findIndex((instance) => isPassiveBoardFillerMonster(instance.card, false));
}

function isPassiveBoardFillerMonster(card: CardRecord, lowLevelOnly: boolean): boolean {
  if (card.category !== "Monster" || card.classifications.includes("Fusion")) {
    return false;
  }

  if (!lowLevelOnly) {
    return true;
  }

  return (card.monster?.level ?? 99) <= 4;
}

function debugPlaceMonsterOnOpponentField(
  state: DuelState,
  instance: DuelCardInstance,
  zoneIndex: number,
  source: "hand" | "deck",
): void {
  state.players.P2.monsterZones[zoneIndex] = {
    instance: {
      ...instance,
      summonedTurn: state.turn,
      controller: "P2",
    },
    faceDown: false,
    position: "attack",
    status: "summoned",
  };
  addEvent(
    state,
    "debug-opponent-monster-placed",
    `PassiveBoardFillerOpponent placed ${instance.card.name} from ${source}.`,
  );
}

function clampTargetMonsterCount(targetMonsterCount: number): number {
  if (!Number.isFinite(targetMonsterCount)) {
    return 3;
  }

  return Math.max(0, Math.min(ZONE_COUNT, Math.floor(targetMonsterCount)));
}

function legacyStateFromCore(
  coreState: CoreDuelState,
  cards: readonly CardRecord[],
  mode: CreateDuelConfig["mode"] = "match",
  events: readonly EngineEvent[] = [],
): DuelState {
  const cardByPasscode = new Map(cards.map((card) => [card.passcode, card]));

  return {
    id: coreState.id,
    seed: coreState.seed,
    mode,
    coreState,
    turn: coreState.turn,
    phase: coreState.phase,
    activePlayer: coreState.activePlayer,
    battleSubstep: legacyBattleSubstepFromCore(coreState),
    players: {
      P1: legacyPlayerFromCore(coreState.players.P1, cardByPasscode, coreState.turn),
      P2: legacyPlayerFromCore(coreState.players.P2, cardByPasscode, coreState.turn),
    },
    events: events.map(legacyEventFromCore),
    turnFlags: {
      drawnThisTurn: coreState.turnFlags?.drawnThisTurn ?? false,
      battlePhaseConducted: coreState.turnFlags?.battlePhaseConducted ?? false,
    },
    winner: coreState.winner,
  };
}

function syncLegacyStateFromCoreResult(
  state: DuelState,
  coreState: CoreDuelState,
  events: readonly EngineEvent[],
): void {
  const cards = collectCardRecordsFromLegacyState(state);
  const next = legacyStateFromCore(coreState, cards, state.mode, []);

  state.coreState = coreState;
  state.turn = next.turn;
  state.phase = next.phase;
  state.activePlayer = next.activePlayer;
  state.battleSubstep = next.battleSubstep;
  state.players = next.players;
  state.winner = next.winner;
  state.turnFlags = next.turnFlags;
  state.events = [...state.events, ...events.map(legacyEventFromCore)].slice(-40);
}

function handleCoreRoutedAction(state: DuelState, action: DuelAction): void {
  const routed = coreCommandsFromLegacyAction(state, action);

  if ("error" in routed) {
    addEvent(state, "illegal-action", routed.error);
    return;
  }

  let coreState = coreStateFromLegacy(state);
  const events: EngineEvent[] = [];

  for (const command of routed.commands) {
    const coreResult = reduceDuel(coreState, command);

    coreState = coreResult.state;
    events.push(...coreResult.events);

    if (coreResult.errors.length > 0 || coreState.winner) {
      break;
    }
  }

  syncLegacyStateFromCoreResult(state, coreState, events);
}

function isCoreRoutableLegalAction(state: DuelState, action: DuelAction): boolean {
  if (
    action.type === "play-card" &&
    action.zoneKind === "monster" &&
    (action.tributeCount ?? 0) > (action.tributeInstanceIds?.length ?? 0)
  ) {
    return true;
  }

  const routed = coreCommandsFromLegacyAction(state, action);

  if ("error" in routed) {
    return false;
  }

  let coreState = coreStateFromLegacy(state);

  for (const command of routed.commands) {
    const coreResult = reduceDuel(coreState, command);

    if (coreResult.errors.length > 0) {
      return false;
    }

    coreState = coreResult.state;
  }

  return true;
}

function coreCommandsFromLegacyAction(
  state: DuelState,
  action: DuelAction,
): { readonly commands: readonly EngineCommand[] } | { readonly error: string } {
  switch (action.type) {
    case "draw":
      return { commands: [{ type: "draw-card", playerId: action.playerId }] };
    case "advance-phase": {
      const nextPhase = nextPhaseAfter(state.phase);

      if (!nextPhase) {
        return { error: "No later phase is available; use End Turn from the End Phase." };
      }

      return { commands: [{ type: "change-phase", playerId: action.playerId, phase: nextPhase }] };
    }
    case "set-phase":
      return coreCommandsToReachPhase(state, action.playerId, action.phase);
    case "end-turn":
      return coreCommandsToEndTurn(state, action.playerId);
    case "play-card":
      return coreCommandsFromPlayCardAction(state, action);
    case "move-card":
      return {
        commands: [
          {
            type: "move-card",
            playerId: action.playerId,
            instanceId: action.instanceId,
            destination: {
              playerId: action.playerId,
              zone: action.destination,
              index: 0,
            },
          },
        ],
      };
    case "override-card-location":
      return { commands: [action] };
    case "attack":
      return {
        commands: [
          {
            type: "attack",
            playerId: action.playerId,
            attackerInstanceId: action.attackerInstanceId,
            defenderInstanceId: action.defenderInstanceId,
          },
        ],
      };
    case "activate-set-card":
      return { error: "Activating a Set card is handled directly, not through core routing." };
    case "set-life-points":
      return { error: "Life point editing is handled by the debug life point control." };
  }
}

function coreCommandsFromPlayCardAction(
  state: DuelState,
  action: Extract<DuelAction, { type: "play-card" }>,
): { readonly commands: readonly EngineCommand[] } | { readonly error: string } {
  const player = state.players[action.playerId];
  const instance = player.hand.find((card) => card.instanceId === action.instanceId);

  if (!instance) {
    return { error: "Selected card is not in that player's hand." };
  }

  if (instance.card.category === "Monster") {
    if (action.intent === "activate") {
      return { error: "Monster effects are not activated through play-card yet." };
    }

    if (action.zoneKind !== "monster") {
      return { error: `${instance.card.name} cannot be played to that zone type.` };
    }

    return {
      commands: [
        {
          type: action.intent === "set" ? "set-monster" : "normal-summon",
          playerId: action.playerId,
          instanceId: action.instanceId,
          zoneIndex: action.zoneIndex,
          tributeInstanceIds: action.tributeInstanceIds,
        },
      ],
    };
  }

  if (action.zoneKind !== "spellTrap") {
    return { error: `${instance.card.name} cannot be played to that zone type.` };
  }

  if (action.intent === "summon") {
    return { error: "Only monsters can be Summoned." };
  }

  if (action.intent === "set") {
    return {
      commands: [
        {
          type: "set-spell-trap",
          playerId: action.playerId,
          instanceId: action.instanceId,
          zoneIndex: action.zoneIndex,
        },
      ],
    };
  }

  // Manual-play activation: place the Spell/Trap face-up and log it (no effect).
  return {
    commands: [
      {
        type: "activate-card",
        playerId: action.playerId,
        instanceId: action.instanceId,
        zoneIndex: action.zoneIndex,
      },
    ],
  };
}

function coreCommandsToReachPhase(
  state: DuelState,
  playerId: PlayerId,
  phase: Phase,
): { readonly commands: readonly EngineCommand[] } | { readonly error: string } {
  if (state.phase === phase) {
    return { commands: [] };
  }

  const commands: EngineCommand[] = [];
  let currentPhase: Phase = state.phase;

  while (currentPhase !== phase) {
    const nextPhase = nextPhaseAfter(currentPhase);

    if (!nextPhase) {
      return { error: `Cannot jump from ${phaseLabel(state.phase)} to ${phaseLabel(phase)} through legal phase changes.` };
    }

    commands.push({ type: "change-phase", playerId, phase: nextPhase });
    currentPhase = nextPhase;
  }

  return { commands };
}

function coreCommandsToEndTurn(
  state: DuelState,
  playerId: PlayerId,
): { readonly commands: readonly EngineCommand[] } | { readonly error: string } {
  if (state.turn <= 1 && state.phase === "M1") {
    return {
      commands: [{ type: "end-turn", playerId }],
    };
  }

  const phaseRoute = coreCommandsToReachPhase(state, playerId, "EP");

  if ("error" in phaseRoute) {
    return phaseRoute;
  }

  return {
    commands: [
      ...phaseRoute.commands,
      { type: "end-turn", playerId },
    ],
  };
}

function nextPhaseAfter(phase: Phase): Phase | null {
  const currentIndex = PHASES.indexOf(phase);

  return currentIndex >= 0 ? PHASES[currentIndex + 1] ?? null : null;
}

function coreStateFromLegacy(state: DuelState): CoreDuelState {
  const previousCore = state.coreState;

  return {
    id: state.id,
    seed: state.seed,
    turnMode: state.mode,
    turn: state.turn,
    phase: state.phase,
    activePlayer: state.activePlayer,
    turnFlags: { ...state.turnFlags },
    damageStep: previousCore?.damageStep,
    cardDefinitions: previousCore?.cardDefinitions,
    players: {
      P1: corePlayerFromLegacy(state.players.P1, state.turn),
      P2: corePlayerFromLegacy(state.players.P2, state.turn),
    },
    pendingAttack: previousCore?.pendingAttack ?? null,
    eventIds: previousCore?.eventIds ?? state.events.map((event) => event.id),
    winner: state.winner,
  };
}

function legacyPlayerFromCore(
  player: CoreDuelState["players"][PlayerId],
  cardByPasscode: ReadonlyMap<string, CardRecord>,
  turn: number,
): DuelPlayerState {
  return {
    id: player.id,
    lp: player.lp,
    deck: player.mainDeck.map((card) => legacyInstanceFromCore(card, cardByPasscode)),
    hand: player.hand.map((card) => legacyInstanceFromCore(card, cardByPasscode)),
    monsterZones: player.monsterZones.map((card) => legacyZoneFromCore(card, cardByPasscode, turn)),
    spellTrapZones: player.spellTrapZones.map((card) => legacyZoneFromCore(card, cardByPasscode, turn)),
    graveyard: player.graveyard.map((card) => legacyZoneFromCore(card, cardByPasscode, turn)).filter(isDuelZoneCard),
    banished: player.banished.map((card) => legacyZoneFromCore(card, cardByPasscode, turn)).filter(isDuelZoneCard),
    sideDeck: [],
    extraDeck: [],
    normalSummonUsed: player.normalSummonUsed,
    lost: player.lost,
  };
}

function corePlayerFromLegacy(player: DuelPlayerState, turn = 0): CoreDuelState["players"][PlayerId] {
  return {
    id: player.id,
    lp: player.lp,
    mainDeck: player.deck.map(coreInstanceFromLegacy),
    hand: player.hand.map(coreInstanceFromLegacy),
    monsterZones: player.monsterZones.map((zone) => coreZoneFromLegacy(zone, turn)),
    spellTrapZones: player.spellTrapZones.map((zone) => coreZoneFromLegacy(zone, turn)),
    graveyard: player.graveyard.map((zone) => coreZoneFromLegacy(zone, turn)).filter(isCoreZoneCard),
    banished: player.banished.map((zone) => coreZoneFromLegacy(zone, turn)).filter(isCoreZoneCard),
    fieldZone: null,
    normalSummonUsed: player.normalSummonUsed,
    lost: player.lost,
  };
}

function legacyInstanceFromCore(
  instance: CoreCardInstance,
  cardByPasscode: ReadonlyMap<string, CardRecord>,
): DuelCardInstance {
  const card = cardByPasscode.get(instance.cardId);

  if (!card) {
    throw new Error(`Unknown card passcode ${instance.cardId}.`);
  }

  return {
    instanceId: instance.instanceId,
    card,
    owner: instance.owner,
    controller: instance.controller,
    createdTurn: 0,
    summonedTurn: null,
    positionChangedTurn: null,
    attackedThisTurn: false,
  };
}

function coreInstanceFromLegacy(instance: DuelCardInstance): CoreCardInstance {
  return {
    instanceId: instance.instanceId,
    cardId: instance.card.passcode,
    owner: instance.owner,
    controller: instance.controller,
  };
}

function legacyZoneFromCore(
  card: CoreZoneCard | null,
  cardByPasscode: ReadonlyMap<string, CardRecord>,
  turn: number,
): DuelZoneCard | null {
  if (!card) {
    return null;
  }

  const instance = legacyInstanceFromCore(card, cardByPasscode);

  return {
    instance: {
      ...instance,
      summonedTurn: card.summonedTurn ?? null,
      positionChangedTurn: card.positionChangedTurn ?? null,
      attackedThisTurn: card.attackedTurn === turn,
    },
    faceDown: card.face === "faceDown",
    position: card.position ?? "attack",
    status: card.face === "faceDown" ? "set" : card.position ? "summoned" : "activated",
    setTurn: card.setTurn ?? null,
  };
}

function coreZoneFromLegacy(zone: DuelZoneCard | null, turn = 0): CoreZoneCard | null {
  if (!zone) {
    return null;
  }

  return {
    ...coreInstanceFromLegacy(zone.instance),
    face: zone.faceDown ? "faceDown" : "faceUp",
    position: zone.status === "activated" ? null : zone.position,
    visibility: zone.faceDown ? "hidden" : "public",
    counters: {},
    attachments: [],
    summonedTurn: zone.instance.summonedTurn,
    positionChangedTurn: zone.instance.positionChangedTurn,
    attackedTurn: zone.instance.attackedThisTurn ? turn : null,
    setTurn: zone.setTurn ?? null,
  };
}

function legacyEventFromCore(event: EngineEvent): DuelEvent {
  return {
    id: event.id,
    type: event.type,
    message: event.message,
  };
}

function legacyBattleSubstepFromCore(coreState: CoreDuelState): DuelState["battleSubstep"] {
  if (coreState.pendingAttack) {
    return "beforeDamageCalculation";
  }

  switch (coreState.damageStep?.substep) {
    case "start":
      return "start";
    case "before-damage-calculation":
      return "beforeDamageCalculation";
    case "damage-calculation":
      return "damageCalculation1";
    case "after-damage-calculation":
      return "afterDamageCalculation";
    case "end":
      return "end";
    case "none":
    case undefined:
      return coreState.phase === "BP" ? "start" : "none";
  }
}

function collectCardRecordsFromLegacyState(state: DuelState): CardRecord[] {
  const cardByPasscode = new Map<string, CardRecord>();

  for (const player of Object.values(state.players)) {
    for (const instance of [...player.deck, ...player.hand]) {
      cardByPasscode.set(instance.card.passcode, instance.card);
    }

    for (const zone of [
      ...player.monsterZones,
      ...player.spellTrapZones,
      ...player.graveyard,
      ...player.banished,
    ]) {
      if (zone) {
        cardByPasscode.set(zone.instance.card.passcode, zone.instance.card);
      }
    }
  }

  return [...cardByPasscode.values()];
}

function createRandomLegalDeck(cards: CardRecord[], seed: string): DeckList {
  const legalCopies = cards.flatMap((card) => {
    if (
      card.legality.goat_world_pool !== true ||
      card.legality.max_copies <= 0 ||
      card.classifications?.includes("Fusion")
    ) {
      return [];
    }

    return Array.from({ length: card.legality.max_copies }, () => card.passcode);
  });

  return {
    main: shuffleSeeded(legalCopies, seed).slice(0, 40),
  };
}

function setLifePoints(state: DuelState, playerId: PlayerId, value: number): void {
  const lp = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  state.players[playerId].lp = lp;

  if (lp === 0 && !state.winner) {
    state.players[playerId].lost = true;
    state.winner = opponentOf(playerId);
    addEvent(state, "lp-zero", `${playerId} has 0 Life Points.`);
  }

  state.coreState = coreStateFromLegacy(state);
}

function shouldAutoAdvancePhase(state: DuelState, playerId: PlayerId): boolean {
  if (state.winner || state.activePlayer !== playerId) {
    return false;
  }

  return state.phase === "DP" || state.phase === "SP" || state.phase === "EP";
}

function canNormalSummon(player: DuelPlayerState, card: CardRecord): boolean {
  if (player.normalSummonUsed || !isNormalSummonableMonster(card)) {
    return false;
  }

  const tributeCount = requiredTributes(card);

  return player.monsterZones.filter(Boolean).length >= tributeCount;
}

function isNormalSummonableMonster(card: CardRecord): boolean {
  return (
    card.category === "Monster" &&
    !card.classifications.includes("Fusion") &&
    !card.classifications.includes("Ritual")
  );
}

function requiredTributes(card: CardRecord): number {
  const level = card.monster?.level ?? 0;

  if (level >= 7) {
    return 2;
  }

  if (level >= 5) {
    return 1;
  }

  return 0;
}

function requireActivePlayer(state: DuelState, playerId: PlayerId): boolean {
  if (state.activePlayer === playerId) {
    return true;
  }

  addEvent(state, "illegal-action", `It is not ${playerId}'s turn.`);
  return false;
}

function serializePlayer(player: DuelPlayerState, viewerId: PlayerId): SerializedPlayerState {
  const ownPlayer = player.id === viewerId;

  return {
    id: player.id,
    lp: player.lp,
    deckCount: player.deck.length,
    hand: player.hand.map((instance) => ({
      instanceId: instance.instanceId,
      card: ownPlayer ? instance.card : null,
    })),
    monsterZones: player.monsterZones.map((zone) => serializeZone(zone, ownPlayer)),
    spellTrapZones: player.spellTrapZones.map((zone) => serializeZone(zone, ownPlayer)),
    graveyard: player.graveyard.map((zone) => serializeZone(zone, true)).filter(isSerializedCard),
    banished: player.banished.map((zone) => serializeZone(zone, true)).filter(isSerializedCard),
    sideDeckCount: player.sideDeck.length,
    extraDeckCount: player.extraDeck.length,
    normalSummonUsed: player.normalSummonUsed,
  };
}

function serializeZone(zone: DuelZoneCard | null, revealControllerInfo: boolean): SerializedCard | null {
  if (!zone) {
    return null;
  }

  const revealCard = !zone.faceDown || revealControllerInfo;

  return {
    instanceId: zone.instance.instanceId,
    owner: zone.instance.owner,
    controller: zone.instance.controller,
    card: revealCard ? zone.instance.card : null,
    faceDown: zone.faceDown,
    position: zone.position,
    status: zone.status,
  };
}

function cloneState(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      P1: clonePlayer(state.players.P1),
      P2: clonePlayer(state.players.P2),
    },
    events: state.events.map((event) => ({ ...event })),
    turnFlags: { ...state.turnFlags },
  };
}

function clonePlayer(player: DuelPlayerState): DuelPlayerState {
  return {
    ...player,
    deck: player.deck.map(cloneInstance),
    hand: player.hand.map(cloneInstance),
    monsterZones: player.monsterZones.map(cloneZone),
    spellTrapZones: player.spellTrapZones.map(cloneZone),
    graveyard: player.graveyard.map((zone) => cloneZone(zone)!),
    banished: player.banished.map((zone) => cloneZone(zone)!),
    sideDeck: [...player.sideDeck],
    extraDeck: [...player.extraDeck],
  };
}

function cloneZone(zone: DuelZoneCard | null): DuelZoneCard | null {
  return zone
    ? {
        ...zone,
        instance: cloneInstance(zone.instance),
      }
    : null;
}

function cloneInstance(instance: DuelCardInstance): DuelCardInstance {
  return {
    ...instance,
  };
}

function result(state: DuelState, eventStart: number): DuelResult {
  return {
    state,
    events: state.events.slice(eventStart),
    prompts: [],
  };
}

function addEvent(state: DuelState, type: string, message: string): void {
  state.events = [...state.events, createEvent(state, type, message)].slice(-40);
}

function createEvent(state: DuelState, type: string, message: string): DuelEvent {
  const eventNumber = (state.coreState?.eventIds.length ?? 0) + state.events.length + 1;

  return {
    id: `compat-${eventNumber.toString().padStart(4, "0")}`,
    type,
    message,
  };
}

function emptyZoneIndexes(zones: Array<DuelZoneCard | null>): number[] {
  return zones.flatMap((zone, index) => (zone === null ? [index] : []));
}

function removeAt<T>(items: T[], index: number): T[] {
  return [...items.slice(0, index), ...items.slice(index + 1)];
}

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}

function phaseLabel(phase: Phase): string {
  return (
    {
      DP: "Draw Phase",
      SP: "Standby Phase",
      M1: "Main Phase 1",
      BP: "Battle Phase",
      M2: "Main Phase 2",
      EP: "End Phase",
    } satisfies Record<Phase, string>
  )[phase];
}

function isSerializedCard(card: SerializedCard | null): card is SerializedCard {
  return Boolean(card);
}

function isDuelZoneCard(card: DuelZoneCard | null): card is DuelZoneCard {
  return Boolean(card);
}

function isCoreZoneCard(card: CoreZoneCard | null): card is CoreZoneCard {
  return Boolean(card);
}
