import type { CardRecord, Phase, ZoneKind } from "../types";
import { validateDeck } from "./deckValidation";
import { shuffleSeeded } from "./random";
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

  assertValidDeck(p1Deck, config.cards, "P1");
  assertValidDeck(p2Deck, config.cards, "P2");

  const p1Main = makeInstances("P1", p1Deck.main, config.cards);
  const p2Main = makeInstances("P2", p2Deck.main, config.cards);

  return {
    id: `duel-${seed}`,
    seed,
    mode,
    turn: 1,
    phase: "DP",
    activePlayer: firstPlayer,
    priorityPlayer: firstPlayer,
    battleSubstep: "none",
    players: {
      P1: createPlayer("P1", p1Main, p1Deck, config.cards),
      P2: createPlayer("P2", p2Main, p2Deck, config.cards),
    },
    chain: [],
    pendingPrompts: [],
    events: [
      createEvent("duel-created", "Duel initialized. Each player drew an opening hand of 5 cards."),
    ],
    turnFlags: {
      drawnThisTurn: false,
      battlePhaseConducted: false,
    },
    winner: null,
  };
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
    for (const zone of player.monsterZones) {
      if (zone && !zone.faceDown && zone.position === "attack" && !zone.instance.attackedThisTurn) {
        actions.push({
          type: "attack",
          playerId,
          attackerInstanceId: zone.instance.instanceId,
        });
      }
    }
  }

  return actions;
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
      handleDraw(draft, action.playerId);
      break;
    case "advance-phase":
      handleAdvancePhase(draft, action.playerId);
      break;
    case "set-phase":
      handleSetPhase(draft, action.playerId, action.phase);
      break;
    case "end-turn":
      handleEndTurn(draft, action.playerId);
      break;
    case "play-card":
      handlePlayCard(draft, action);
      break;
    case "move-card":
      handleMoveCard(draft, action.playerId, action.instanceId, action.destination);
      break;
    case "attack":
      handleAttack(draft, action.playerId, action.attackerInstanceId, action.defenderInstanceId);
      break;
    case "set-life-points":
      setLifePoints(draft, action.targetPlayerId, action.value);
      break;
  }

  return result(draft, eventStart);
}

export function advanceToNextDecision(state: DuelState, playerId: PlayerId): DuelResult {
  const draft = cloneState(state);
  const eventStart = draft.events.length;
  let guard = 0;

  while (guard < 12 && shouldAutoAdvancePhase(draft, playerId)) {
    guard += 1;

    if (draft.phase === "EP") {
      handleEndTurn(draft, playerId);
    } else {
      handleAdvancePhase(draft, playerId);
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
    handleEndTurn(draft, "P2");
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
    priorityPlayer: state.priorityPlayer,
    battleSubstep: state.battleSubstep,
    players: {
      P1: serializePlayer(state.players.P1, viewerId),
      P2: serializePlayer(state.players.P2, viewerId),
    },
    chain: state.chain,
    pendingPrompts: state.pendingPrompts.filter((prompt) => prompt.playerId === viewerId),
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
  state.priorityPlayer = state.activePlayer;
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
  state.priorityPlayer = playerId;
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
  state.priorityPlayer = nextPlayer;
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
      card.classifications.includes("Fusion")
    ) {
      return [];
    }

    return Array.from({ length: card.legality.max_copies }, () => card.passcode);
  });

  return {
    main: shuffleSeeded(legalCopies, seed).slice(0, 40),
    side: [],
    extra: [],
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

function assertValidDeck(deck: DeckList, cards: CardRecord[], playerId: PlayerId): void {
  const result = validateDeck(deck, cards);

  if (!result.valid) {
    throw new Error(`${playerId} deck is invalid: ${result.errors.join(" ")}`);
  }
}

function drawCards(state: DuelState, playerId: PlayerId, count: number): void {
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

  if (state.pendingPrompts.some((prompt) => prompt.playerId === playerId)) {
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
  if (player.normalSummonUsed || card.classifications.includes("Fusion")) {
    return false;
  }

  const tributeCount = requiredTributes(card);

  return player.monsterZones.filter(Boolean).length >= tributeCount;
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
    chain: state.chain.map((link) => ({ ...link, targetInstanceIds: [...link.targetInstanceIds] })),
    pendingPrompts: state.pendingPrompts.map((prompt) => ({ ...prompt })),
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
    prompts: state.pendingPrompts,
  };
}

function addEvent(state: DuelState, type: string, message: string): void {
  state.events = [...state.events, createEvent(type, message)].slice(-40);
}

function createEvent(type: string, message: string): DuelEvent {
  return {
    id: crypto.randomUUID(),
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
