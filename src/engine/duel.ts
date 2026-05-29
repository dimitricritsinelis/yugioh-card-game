import type { CardRecord, Phase, ZoneKind } from "../types";
import type { CardInstance as CoreCardInstance, ZoneCard as CoreZoneCard } from "./core/cardRefs";
import type { DuelState as CoreDuelState } from "./core/state";
import { validateDeck } from "./deckValidation";
import { shuffleSeeded } from "./random";
import { createDuel as createCoreDuel, reduceDuel } from "./reducer";
import type { EngineCommand } from "./commands";
import type { EngineEvent } from "./events";
import type { EnginePrompt } from "./result";
import type {
  CreateDuelConfig,
  DeckList,
  DuelAction,
  DuelCardInstance,
  DuelEvent,
  DuelPlayerState,
  DuelPrompt,
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

function handleDraw(state: DuelState, playerId: PlayerId): void {
  if (!requireActivePlayer(state, playerId)) {
    return;
  }

  if (state.phase !== "DP") {
    addEvent(state, "illegal-action", "Cards can only be drawn for turn during the Draw Phase.");
    return;
  }

  if (state.turnFlags.drawnThisTurn) {
    addEvent(state, "illegal-action", "The turn player has already drawn this turn.");
    return;
  }

  drawCards(state, playerId, 1);

  if (state.winner) {
    return;
  }

  state.turnFlags.drawnThisTurn = true;
}

function handleAdvancePhase(state: DuelState, playerId: PlayerId): void {
  if (!requireActivePlayer(state, playerId)) {
    return;
  }

  if (state.phase === "DP" && !state.turnFlags.drawnThisTurn) {
    drawCards(state, playerId, 1);

    if (state.winner) {
      return;
    }

    state.turnFlags.drawnThisTurn = true;
  }

  if (state.phase === "EP") {
    handleEndTurn(state, playerId);
    return;
  }

  const currentIndex = PHASES.indexOf(state.phase);
  const nextPhase = PHASES[currentIndex + 1] ?? "EP";

  if (state.phase === "SP") {
    addEvent(state, "standby-passed", "No Standby Phase actions were available.");
  }

  state.phase = nextPhase;
  state.battleSubstep = nextPhase === "BP" ? "start" : "none";

  if (nextPhase === "BP") {
    state.turnFlags.battlePhaseConducted = true;
  }

  addEvent(state, "phase-advanced", `Entered ${phaseLabel(nextPhase)}.`);
}

function handleSetPhase(state: DuelState, playerId: PlayerId, phase: Phase): void {
  if (!requireActivePlayer(state, playerId)) {
    return;
  }

  state.phase = phase;
  state.battleSubstep = phase === "BP" ? "start" : "none";
  addEvent(state, "phase-set", `Jumped to ${phaseLabel(phase)}.`);
}

function handleEndTurn(state: DuelState, playerId: PlayerId): void {
  if (!requireActivePlayer(state, playerId)) {
    return;
  }

  if (state.phase === "M1" && !hasAvailableAttackers(state, playerId)) {
    addEvent(state, "battle-phase-skipped", "Battle Phase skipped because no attacks were available.");
  }

  discardDownToHandLimit(state, playerId);

  const nextPlayer = state.mode === "solo" ? playerId : opponentOf(playerId);
  state.activePlayer = nextPlayer;
  state.phase = "DP";
  state.turn += 1;
  state.battleSubstep = "none";
  state.turnFlags = {
    drawnThisTurn: false,
    battlePhaseConducted: false,
  };

  for (const player of Object.values(state.players)) {
    player.normalSummonUsed = false;
    player.monsterZones = player.monsterZones.map((zone) =>
      zone
        ? {
            ...zone,
            instance: {
              ...zone.instance,
              attackedThisTurn: false,
            },
          }
        : null,
    );
  }

  addEvent(state, "turn-ended", `Turn ${state.turn} begins.`);
}

function handlePlayCard(
  state: DuelState,
  action: Extract<DuelAction, { type: "play-card" }>,
): void {
  if (!requireActivePlayer(state, action.playerId)) {
    return;
  }

  if (state.phase !== "M1" && state.phase !== "M2") {
    addEvent(state, "illegal-action", "Cards can only be played from hand during Main Phase 1 or Main Phase 2.");
    return;
  }
  const player = state.players[action.playerId];
  const handIndex = player.hand.findIndex((card) => card.instanceId === action.instanceId);

  if (handIndex < 0) {
    addEvent(state, "illegal-action", "Selected card is not in that player's hand.");
    return;
  }

  const instance = player.hand[handIndex];
  const requiredZone: ZoneKind = instance.card.category === "Monster" ? "monster" : "spellTrap";

  if (action.zoneKind !== requiredZone) {
    addEvent(state, "illegal-action", `${instance.card.name} cannot be played to that zone type.`);
    return;
  }

  if (action.zoneKind === "monster") {
    playMonster(state, player, handIndex, action);
    return;
  }

  playSpellTrap(state, player, handIndex, action);
}

function playMonster(
  state: DuelState,
  player: DuelPlayerState,
  handIndex: number,
  action: Extract<DuelAction, { type: "play-card" }>,
): void {
  const instance = player.hand[handIndex];

  if (action.intent === "activate") {
    addEvent(state, "illegal-action", "Monster effects are not activated through play-card yet.");
    return;
  }

  if (!canNormalSummon(player, instance.card)) {
    addEvent(state, "illegal-action", `${instance.card.name} cannot be Normal Summoned or Set right now.`);
    return;
  }

  const tributeCount = requiredTributes(instance.card);
  const tributeIds = action.tributeInstanceIds ?? [];
  const targetZone = player.monsterZones[action.zoneIndex];

  if (tributeCount === 0 && tributeIds.length > 0) {
    addEvent(state, "illegal-action", `${instance.card.name} does not require Tributes.`);
    return;
  }

  if (tributeCount > 0) {
    const validation = validateTributeSelection(player, tributeIds, tributeCount, targetZone);

    if (validation) {
      addEvent(state, "illegal-action", validation);
      return;
    }

    tributeMonsters(state, player, tributeIds);
  } else if (targetZone) {
    addEvent(state, "illegal-action", "That Monster Zone is occupied.");
    return;
  }

  if (player.monsterZones[action.zoneIndex]) {
    addEvent(state, "illegal-action", "That Monster Zone is occupied.");
    return;
  }

  player.hand = removeAt(player.hand, handIndex);
  player.normalSummonUsed = true;
  player.monsterZones[action.zoneIndex] = {
    instance: {
      ...instance,
      summonedTurn: state.turn,
    },
    faceDown: action.intent === "set",
    position: action.intent === "set" ? "defense" : "attack",
    status: action.intent === "set" ? "set" : "summoned",
  };

  addEvent(
    state,
    tributeCount > 0
      ? action.intent === "set"
        ? "monster-tribute-set"
        : "monster-tribute-summoned"
      : action.intent === "set"
        ? "monster-set"
        : "monster-summoned",
    `${player.id} ${
      tributeCount > 0
        ? action.intent === "set"
          ? "Tribute Set"
          : "Tribute Summoned"
        : action.intent === "set"
          ? "Set"
          : "Summoned"
    } ${instance.card.name}.`,
  );
}

function validateTributeSelection(
  player: DuelPlayerState,
  tributeIds: string[],
  tributeCount: number,
  targetZone: DuelZoneCard | null,
): string | null {
  if (tributeIds.length !== tributeCount) {
    return `This monster requires exactly ${tributeCount} Tribute${tributeCount === 1 ? "" : "s"}.`;
  }

  const uniqueTributeIds = new Set(tributeIds);

  if (uniqueTributeIds.size !== tributeIds.length) {
    return "The same monster cannot be Tributed more than once.";
  }

  if (targetZone && !uniqueTributeIds.has(targetZone.instance.instanceId)) {
    return "That Monster Zone is occupied. Tribute that monster or choose an empty zone.";
  }

  for (const tributeId of uniqueTributeIds) {
    if (!player.monsterZones.some((zone) => zone?.instance.instanceId === tributeId)) {
      return "Tributes must be monsters you control.";
    }
  }

  return null;
}

function tributeMonsters(state: DuelState, player: DuelPlayerState, tributeIds: string[]): void {
  const tributeSet = new Set(tributeIds);

  for (const [index, zone] of player.monsterZones.entries()) {
    if (!zone || !tributeSet.has(zone.instance.instanceId)) {
      continue;
    }

    player.monsterZones[index] = null;
    player.graveyard = [{ ...zone, faceDown: false }, ...player.graveyard];
    addEvent(state, "card-tributed", `${player.id} Tributed ${zone.instance.card.name}.`);
  }
}

function playSpellTrap(
  state: DuelState,
  player: DuelPlayerState,
  handIndex: number,
  action: Extract<DuelAction, { type: "play-card" }>,
): void {
  if (player.spellTrapZones[action.zoneIndex]) {
    addEvent(state, "illegal-action", "That Spell/Trap Zone is occupied.");
    return;
  }

  const instance = player.hand[handIndex];

  if (action.intent === "summon") {
    addEvent(state, "illegal-action", "Only monsters can be Summoned.");
    return;
  }

  if (action.intent === "set") {
    player.hand = removeAt(player.hand, handIndex);
    player.spellTrapZones[action.zoneIndex] = {
      instance,
      faceDown: true,
      position: "attack",
      status: "set",
    };
    addEvent(state, "spell-trap-set", `${player.id} Set ${instance.card.name}.`);
    return;
  }

  if (instance.card.category === "Trap") {
    addEvent(state, "illegal-action", "Trap Cards cannot be activated from hand in this engine slice.");
    return;
  }

  player.hand = removeAt(player.hand, handIndex);
  const zoneCard: DuelZoneCard = {
    instance,
    faceDown: false,
    position: "attack",
    status: "activated",
  };
  player.spellTrapZones[action.zoneIndex] = zoneCard;

  if (!shouldRemainOnField(instance.card) && player.spellTrapZones[action.zoneIndex]?.instance.instanceId === instance.instanceId) {
    player.spellTrapZones[action.zoneIndex] = null;
    player.graveyard = [zoneCard, ...player.graveyard];
  }

  addEvent(state, "card-activated", `${player.id} activated ${instance.card.name}.`);
  addEvent(state, "effect-not-implemented", `${instance.card.name} has no implemented effect script yet.`);
}

function handleMoveCard(
  state: DuelState,
  playerId: PlayerId,
  instanceId: string,
  destination: "graveyard" | "banished",
): void {
  const source = removeInstanceFromState(state, instanceId);

  if (!source || source.zone.instance.controller !== playerId) {
    addEvent(state, "illegal-action", "Selected card is not controlled by that player.");
    return;
  }

  const player = state.players[playerId];

  if (destination === "graveyard") {
    player.graveyard = [{ ...source.zone, faceDown: false }, ...player.graveyard];
    addEvent(state, "card-moved", `${source.zone.instance.card.name} was sent to the Graveyard.`);
    return;
  }

  player.banished = [{ ...source.zone, faceDown: false }, ...player.banished];
  addEvent(state, "card-moved", `${source.zone.instance.card.name} was banished.`);
}

function handleAttack(
  state: DuelState,
  playerId: PlayerId,
  attackerInstanceId: string,
  defenderInstanceId?: string,
): void {
  if (!requireActivePlayer(state, playerId)) {
    return;
  }

  if (state.phase !== "BP") {
    addEvent(state, "illegal-action", "Attacks can only be declared during the Battle Phase.");
    return;
  }

  const attacker = findMonsterZone(state, playerId, attackerInstanceId);

  if (!attacker?.zone || attacker.zone.faceDown || attacker.zone.position !== "attack") {
    addEvent(state, "illegal-action", "That monster cannot attack.");
    return;
  }

  if (attacker.zone.instance.attackedThisTurn) {
    addEvent(state, "illegal-action", "That monster has already attacked this turn.");
    return;
  }

  const defenderPlayerId = opponentOf(playerId);
  const defender = defenderInstanceId ? findMonsterZone(state, defenderPlayerId, defenderInstanceId) : null;

  if (!defender && state.players[defenderPlayerId].monsterZones.some(Boolean)) {
    addEvent(state, "illegal-action", "A direct attack is not legal while the opponent controls monsters.");
    return;
  }

  state.battleSubstep = "damageCalculation1";

  if (!defender?.zone) {
    const damage = monsterAtk(attacker.zone);
    setLifePoints(state, defenderPlayerId, state.players[defenderPlayerId].lp - damage);
    markAttacked(state, playerId, attacker.index);
    addEvent(state, "direct-attack", `${attacker.zone.instance.card.name} attacked directly for ${damage}.`);
    state.battleSubstep = "end";
    return;
  }

  resolveBattle(state, playerId, attacker.index, defenderPlayerId, defender.index);
  state.battleSubstep = "end";
}

function resolveBattle(
  state: DuelState,
  attackerPlayerId: PlayerId,
  attackerIndex: number,
  defenderPlayerId: PlayerId,
  defenderIndex: number,
): void {
  const attacker = state.players[attackerPlayerId].monsterZones[attackerIndex];
  const defender = state.players[defenderPlayerId].monsterZones[defenderIndex];

  if (!attacker || !defender) {
    return;
  }

  markAttacked(state, attackerPlayerId, attackerIndex);

  if (defender.faceDown) {
    flipMonsterFaceUp(state, defenderPlayerId, defenderIndex);
  }

  const currentDefender = state.players[defenderPlayerId].monsterZones[defenderIndex];

  if (!currentDefender) {
    return;
  }

  const atk = monsterAtk(attacker);
  const opposingValue = currentDefender.position === "attack" ? monsterAtk(currentDefender) : monsterDef(currentDefender);

  if (currentDefender.position === "attack") {
    if (atk > opposingValue) {
      setLifePoints(state, defenderPlayerId, state.players[defenderPlayerId].lp - (atk - opposingValue));
      destroyMonsterAt(state, defenderPlayerId, defenderIndex);
    } else if (atk < opposingValue) {
      setLifePoints(state, attackerPlayerId, state.players[attackerPlayerId].lp - (opposingValue - atk));
      destroyMonsterAt(state, attackerPlayerId, attackerIndex);
    } else if (atk === opposingValue) {
      destroyMonsterAt(state, attackerPlayerId, attackerIndex);
      destroyMonsterAt(state, defenderPlayerId, defenderIndex);
    }
  } else if (atk > opposingValue) {
    destroyMonsterAt(state, defenderPlayerId, defenderIndex);
  } else if (atk < opposingValue) {
    setLifePoints(state, attackerPlayerId, state.players[attackerPlayerId].lp - (opposingValue - atk));
  }

  addEvent(state, "battle-resolved", `${attacker.instance.card.name} battled ${currentDefender.instance.card.name}.`);
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

function isEnginePrompt(prompt: EnginePrompt | undefined): prompt is EnginePrompt {
  return Boolean(prompt);
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

function createPlayer(
  id: PlayerId,
  mainDeck: DuelCardInstance[],
  deckList: DeckList,
  cards: CardRecord[],
): DuelPlayerState {
  const hand = mainDeck.slice(0, 5);
  const deck = mainDeck.slice(5);
  const cardByPasscode = new Map(cards.map((card) => [card.passcode, card]));

  return {
    id,
    lp: 8000,
    deck,
    hand,
    monsterZones: emptyZones(),
    spellTrapZones: emptyZones(),
    graveyard: [],
    banished: [],
    sideDeck: (deckList.side ?? []).map((passcode) => cardByPasscode.get(passcode)).filter(isCardRecord),
    extraDeck: (deckList.extra ?? []).map((passcode) => cardByPasscode.get(passcode)).filter(isCardRecord),
    normalSummonUsed: false,
    lost: false,
  };
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

function makeInstances(playerId: PlayerId, passcodes: string[], cards: CardRecord[]): DuelCardInstance[] {
  const cardByPasscode = new Map(cards.map((card) => [card.passcode, card]));

  return passcodes.map((passcode, index) => {
    const card = cardByPasscode.get(passcode);

    if (!card) {
      throw new Error(`Unknown card passcode ${passcode}.`);
    }

    return {
      instanceId: `${playerId}-${passcode}-${index + 1}`,
      card,
      owner: playerId,
      controller: playerId,
      createdTurn: 0,
      summonedTurn: null,
      positionChangedTurn: null,
      attackedThisTurn: false,
    };
  });
}

function assertValidDeck(
  deck: DeckList,
  cards: CardRecord[],
  playerId: PlayerId,
  allowUnsupportedCards: boolean,
): void {
  const result = validateDeck(deck, cards, { allowUnsupportedCards });

  if (!result.valid) {
    throw new Error(`${playerId} deck is invalid: ${result.errors.join(" ")}`);
  }
}

function drawCards(state: DuelState, playerId: PlayerId, count: number): void {
  if (state.coreState) {
    const coreResult = reduceDuel(coreStateFromLegacy(state), { type: "draw-card", playerId, count });

    syncLegacyStateFromCoreResult(state, coreResult.state, coreResult.events);
    return;
  }

  const player = state.players[playerId];

  for (let drawn = 0; drawn < count; drawn += 1) {
    const card = player.deck[0];

    if (!card) {
      player.lost = true;
      state.winner = opponentOf(playerId);
      addEvent(state, "deck-out", `${playerId} could not draw a card and lost the duel.`);
      return;
    }

    player.deck = player.deck.slice(1);
    player.hand = [...player.hand, card];
    addEvent(state, "card-drawn", `${playerId} drew a card.`);
  }
}

function flipMonsterFaceUp(state: DuelState, playerId: PlayerId, index: number): void {
  const zone = state.players[playerId].monsterZones[index];

  if (!zone || !zone.faceDown) {
    return;
  }

  state.players[playerId].monsterZones[index] = {
    ...zone,
    faceDown: false,
  };
}

function removeInstanceFromState(state: DuelState, instanceId: string) {
  for (const player of Object.values(state.players)) {
    const areas = [
      ["monsterZones", player.monsterZones] as const,
      ["spellTrapZones", player.spellTrapZones] as const,
      ["graveyard", player.graveyard] as const,
      ["banished", player.banished] as const,
    ];

    const handIndex = player.hand.findIndex((card) => card.instanceId === instanceId);

    if (handIndex >= 0) {
      const instance = player.hand[handIndex];
      player.hand = removeAt(player.hand, handIndex);

      return {
        playerId: player.id,
        area: "hand",
        index: handIndex,
        zone: {
          instance,
          faceDown: false,
          position: "attack",
          status: "activated",
        } satisfies DuelZoneCard,
      };
    }

    for (const [area, zones] of areas) {
      const index = zones.findIndex((zone) => zone?.instance.instanceId === instanceId);

      if (index >= 0) {
        const zone = zones[index];

        if (!zone) {
          continue;
        }

        if (area === "monsterZones") {
          player.monsterZones[index] = null;
        } else if (area === "spellTrapZones") {
          player.spellTrapZones[index] = null;
        } else if (area === "graveyard") {
          player.graveyard = removeAt(player.graveyard, index);
        } else {
          player.banished = removeAt(player.banished, index);
        }

        return {
          playerId: player.id,
          area,
          index,
          zone,
        };
      }
    }
  }

  return null;
}

function destroyMonsterAt(state: DuelState, playerId: PlayerId, index: number): void {
  const zone = state.players[playerId].monsterZones[index];

  if (!zone) {
    return;
  }

  state.players[playerId].monsterZones[index] = null;
  state.players[playerId].graveyard = [{ ...zone, faceDown: false }, ...state.players[playerId].graveyard];
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

function discardDownToHandLimit(state: DuelState, playerId: PlayerId): void {
  const player = state.players[playerId];

  while (player.hand.length > 6) {
    const discarded = player.hand[player.hand.length - 1];
    player.hand = player.hand.slice(0, -1);
    player.graveyard = [
      {
        instance: discarded,
        faceDown: false,
        position: "attack",
        status: "activated",
      },
      ...player.graveyard,
    ];
    addEvent(state, "hand-size-discard", `${playerId} discarded ${discarded.card.name} for hand size.`);
  }
}

function findMonsterZone(state: DuelState, playerId: PlayerId, instanceId: string) {
  const index = state.players[playerId].monsterZones.findIndex(
    (zone) => zone?.instance.instanceId === instanceId,
  );

  return {
    index,
    zone: index >= 0 ? state.players[playerId].monsterZones[index] : null,
  };
}

function shouldAutoAdvancePhase(state: DuelState, playerId: PlayerId): boolean {
  if (state.winner || state.activePlayer !== playerId) {
    return false;
  }

  return state.phase === "DP" || state.phase === "SP" || state.phase === "EP";
}

function hasAvailableAttackers(state: DuelState, playerId: PlayerId): boolean {
  return state.players[playerId].monsterZones.some(
    (zone) => zone && !zone.faceDown && zone.position === "attack" && !zone.instance.attackedThisTurn,
  );
}

function markAttacked(state: DuelState, playerId: PlayerId, zoneIndex: number): void {
  const zone = state.players[playerId].monsterZones[zoneIndex];

  if (!zone) {
    return;
  }

  state.players[playerId].monsterZones[zoneIndex] = {
    ...zone,
    instance: {
      ...zone.instance,
      attackedThisTurn: true,
    },
  };
}

function monsterAtk(zone: DuelZoneCard): number {
  return typeof zone.instance.card.monster?.atk === "number" ? zone.instance.card.monster.atk : 0;
}

function monsterDef(zone: DuelZoneCard): number {
  return typeof zone.instance.card.monster?.def === "number" ? zone.instance.card.monster.def : 0;
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

function shouldRemainOnField(card: CardRecord): boolean {
  return card.spell_trap?.icon === "Continuous" || card.spell_trap?.icon === "Equip" || card.spell_trap?.icon === "Field";
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

function emptyZones(): Array<DuelZoneCard | null> {
  return Array.from({ length: ZONE_COUNT }, () => null);
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

function isCardRecord(card: CardRecord | undefined): card is CardRecord {
  return Boolean(card);
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
