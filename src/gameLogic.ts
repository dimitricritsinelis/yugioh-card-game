import { createCardInstance, createRandomDeck } from "./cardData";
import type {
  CardAction,
  CardCategory,
  CardInstance,
  CardLocation,
  CardRecord,
  GameState,
  Phase,
  PlayerState,
  ZoneCard,
  ZoneKind,
} from "./types";

export const PHASES: Phase[] = ["DP", "SP", "M1", "BP", "M2", "EP"];
export const MAX_HAND_SLOTS = 6;
export const ZONE_COUNT = 5;

export const PHASE_INFO: Record<Phase, { short: string; full: string }> = {
  DP: { short: "Draw", full: "Draw Phase" },
  SP: { short: "Standby", full: "Standby Phase" },
  M1: { short: "Main 1", full: "Main Phase 1" },
  BP: { short: "Battle", full: "Battle Phase" },
  M2: { short: "Main 2", full: "Main Phase 2" },
  EP: { short: "End", full: "End Phase" },
};

export function createInitialGameState(cards: CardRecord[]): GameState {
  const deck = createRandomDeck(cards, 40);
  const hand = deck.slice(0, 5);
  const remainingDeck = deck.slice(5);

  return {
    player: {
      lp: 8000,
      deck: remainingDeck,
      hand,
      monsterZones: emptyZones(),
      spellTrapZones: emptyZones(),
      graveyard: [],
      banished: [],
    },
    opponent: {
      lp: 8000,
      monsterZones: [false, true, false, true, false],
      spellTrapZones: [true, false, false, false, true],
      deckCount: 35,
      graveyardCount: 0,
      banishedCount: 0,
    },
    phase: "DP",
    turn: 1,
    selectedCardId: hand[0]?.instanceId ?? null,
    actionLog: [
      {
        id: crypto.randomUUID(),
        message: "Duel test initialized. Drew opening hand.",
      },
    ],
    lastDrawnCardId: hand[hand.length - 1]?.instanceId ?? null,
    lastPlacedCardId: null,
  };
}

/**
 * Dev-only board seed. Populates every visual state in one shot — face-up and
 * face-down field cards, an activated spell, occupied Graveyard and Banished
 * piles, and a selected pile card — so a single screenshot verifies layout work
 * without clicking through actions. Activated via `?scenario=demo` (see App.tsx).
 */
export function createDemoGameState(cards: CardRecord[]): GameState {
  const base = createInitialGameState(cards);

  const take = (category: CardCategory, count: number): CardInstance[] =>
    cards
      .filter((card) => card.category === category)
      .slice(0, count)
      .map(createCardInstance);

  const monsters = take("Monster", 4);
  const spells = take("Spell", 2);
  const traps = take("Trap", 3);

  if (monsters.length < 4 || spells.length < 2 || traps.length < 3) {
    return base;
  }

  const fieldCard = (instance: CardInstance, faceDown: boolean): ZoneCard => ({
    instance,
    faceDown,
    stance: faceDown ? "set" : "attack",
  });

  const pileCard = (instance: CardInstance): ZoneCard => ({
    instance,
    faceDown: false,
    stance: "activated",
  });

  return {
    ...base,
    player: {
      ...base.player,
      monsterZones: [
        fieldCard(monsters[0], false),
        null,
        fieldCard(monsters[1], true),
        null,
        fieldCard(monsters[2], false),
      ],
      spellTrapZones: [
        fieldCard(traps[0], true),
        null,
        { instance: spells[0], faceDown: false, stance: "activated" },
        null,
        fieldCard(traps[1], true),
      ],
      graveyard: [pileCard(monsters[3]), pileCard(spells[1])],
      banished: [pileCard(traps[2])],
    },
    opponent: {
      ...base.opponent,
      graveyardCount: 4,
      banishedCount: 2,
    },
    phase: "M1",
    turn: 3,
    selectedCardId: monsters[3].instanceId,
    lastDrawnCardId: null,
    lastPlacedCardId: null,
    actionLog: [
      {
        id: crypto.randomUUID(),
        message: "Demo scenario loaded — every board state populated for visual testing.",
      },
    ],
  };
}

export function drawCard(state: GameState): GameState {
  if (state.player.deck.length === 0) {
    return addLog(state, "Deck is empty.");
  }

  if (state.player.hand.length >= MAX_HAND_SLOTS) {
    return addLog(state, "Hand display is full.");
  }

  const [drawnCard, ...deck] = state.player.deck;
  const hand = [...state.player.hand, drawnCard];

  return addLog(
    {
      ...state,
      player: {
        ...state.player,
        deck,
        hand,
      },
      selectedCardId: drawnCard.instanceId,
      lastDrawnCardId: drawnCard.instanceId,
      lastPlacedCardId: null,
    },
    `Drew ${drawnCard.card.name}.`,
  );
}

export function advancePhase(state: GameState): GameState {
  const currentIndex = PHASES.indexOf(state.phase);

  // The End Phase is the final step of a turn; advancing past it is handled by
  // endTurn() rather than wrapping back to the Draw Phase here.
  if (currentIndex >= PHASES.length - 1) {
    return state;
  }

  const nextPhase = PHASES[currentIndex + 1];

  return addLog(
    {
      ...state,
      phase: nextPhase,
    },
    `Entered ${PHASE_INFO[nextPhase].full}.`,
  );
}

export function endTurn(state: GameState): GameState {
  const nextTurn = state.turn + 1;
  const turnStarted = addLog(
    {
      ...state,
      phase: "DP",
      turn: nextTurn,
    },
    `Turn ${nextTurn} begins.`,
  );

  // Auto-draw for the new turn. drawCard already guards an empty deck and a
  // full hand, logging the reason when it cannot draw.
  return drawCard(turnStarted);
}

export function setPhase(state: GameState, phase: Phase): GameState {
  return addLog(
    {
      ...state,
      phase,
    },
    `Jumped to ${PHASE_INFO[phase].full}.`,
  );
}

export function setLifePoints(
  state: GameState,
  side: "player" | "opponent",
  value: number,
): GameState {
  const lp = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));

  if (side === "player") {
    return addLog(
      { ...state, player: { ...state.player, lp } },
      `Player 1 Life Points set to ${lp.toLocaleString()}.`,
    );
  }

  return addLog(
    { ...state, opponent: { ...state.opponent, lp } },
    `Player 2 Life Points set to ${lp.toLocaleString()}.`,
  );
}

export function placeSelectedCard(
  state: GameState,
  action: CardAction,
  zoneKind: ZoneKind,
  index: number,
): GameState {
  const cardId = state.selectedCardId;

  if (!cardId) {
    return state;
  }

  const location = findCardLocation(state.player, cardId);

  if (!location || location.area !== "hand") {
    return state;
  }

  const instance = state.player.hand[location.index];
  const requiredKind: ZoneKind = instance.card.category === "Monster" ? "monster" : "spellTrap";

  // Card-to-slot compatibility: monsters only go to monster zones, spells/traps to S/T zones.
  if (requiredKind !== zoneKind) {
    return state;
  }

  const targetZones =
    zoneKind === "monster" ? state.player.monsterZones : state.player.spellTrapZones;

  if (targetZones[index]) {
    return state;
  }

  const zoneCard: ZoneCard = {
    instance,
    faceDown: action === "set",
    stance: action === "summon" ? "attack" : action === "activate" ? "activated" : "set",
  };

  const player = removeCardFromPlayer(state.player, cardId);
  const nextZones = [...targetZones];
  nextZones[index] = zoneCard;

  const nextPlayer =
    zoneKind === "monster"
      ? { ...player, monsterZones: nextZones }
      : { ...player, spellTrapZones: nextZones };

  const actionLabel =
    action === "summon" ? "Summoned" : action === "activate" ? "Activated" : "Set";

  return addLog(
    {
      ...state,
      player: nextPlayer,
      selectedCardId: instance.instanceId,
      lastPlacedCardId: instance.instanceId,
      lastDrawnCardId: null,
    },
    `${actionLabel} ${instance.card.name}.`,
  );
}

export function sendSelectedToGraveyard(state: GameState): GameState {
  const selected = getSelectedCardInstance(state);

  if (!selected) {
    return state;
  }

  const player = removeCardFromPlayer(state.player, selected.instanceId);
  const graveCard: ZoneCard = {
    instance: selected,
    faceDown: false,
    stance: "activated",
  };

  return addLog(
    {
      ...state,
      player: {
        ...player,
        graveyard: [graveCard, ...player.graveyard],
      },
      selectedCardId: selected.instanceId,
      lastPlacedCardId: null,
    },
    `Sent ${selected.card.name} to the Graveyard.`,
  );
}

export function banishSelected(state: GameState): GameState {
  const selected = getSelectedCardInstance(state);

  if (!selected) {
    return state;
  }

  const player = removeCardFromPlayer(state.player, selected.instanceId);
  const banishedCard: ZoneCard = {
    instance: selected,
    faceDown: false,
    stance: "activated",
  };

  return addLog(
    {
      ...state,
      player: {
        ...player,
        banished: [banishedCard, ...player.banished],
      },
      selectedCardId: selected.instanceId,
      lastPlacedCardId: null,
    },
    `Banished ${selected.card.name}.`,
  );
}

export function getSelectedCardInstance(state: GameState): CardInstance | null {
  if (!state.selectedCardId) {
    return null;
  }

  return findCardInstance(state.player, state.selectedCardId);
}

export function findCardLocation(player: PlayerState, cardId: string): CardLocation | null {
  const handIndex = player.hand.findIndex((instance) => instance.instanceId === cardId);

  if (handIndex >= 0) {
    return { area: "hand", index: handIndex };
  }

  const monsterIndex = player.monsterZones.findIndex((zoneCard) => zoneCard?.instance.instanceId === cardId);

  if (monsterIndex >= 0) {
    return { area: "monster", index: monsterIndex };
  }

  const spellTrapIndex = player.spellTrapZones.findIndex((zoneCard) => zoneCard?.instance.instanceId === cardId);

  if (spellTrapIndex >= 0) {
    return { area: "spellTrap", index: spellTrapIndex };
  }

  const graveyardIndex = player.graveyard.findIndex((zoneCard) => zoneCard.instance.instanceId === cardId);

  if (graveyardIndex >= 0) {
    return { area: "graveyard", index: graveyardIndex };
  }

  const banishedIndex = player.banished.findIndex((zoneCard) => zoneCard.instance.instanceId === cardId);

  if (banishedIndex >= 0) {
    return { area: "banished", index: banishedIndex };
  }

  return null;
}

function removeCardFromPlayer(player: PlayerState, cardId: string): PlayerState {
  return {
    ...player,
    hand: player.hand.filter((instance) => instance.instanceId !== cardId),
    monsterZones: player.monsterZones.map((zoneCard) =>
      zoneCard?.instance.instanceId === cardId ? null : zoneCard,
    ),
    spellTrapZones: player.spellTrapZones.map((zoneCard) =>
      zoneCard?.instance.instanceId === cardId ? null : zoneCard,
    ),
    graveyard: player.graveyard.filter((zoneCard) => zoneCard.instance.instanceId !== cardId),
    banished: player.banished.filter((zoneCard) => zoneCard.instance.instanceId !== cardId),
  };
}

function findCardInstance(player: PlayerState, cardId: string): CardInstance | null {
  const location = findCardLocation(player, cardId);

  if (!location) {
    return null;
  }

  if (location.area === "hand") {
    return player.hand[location.index];
  }

  if (location.area === "monster") {
    return player.monsterZones[location.index]?.instance ?? null;
  }

  if (location.area === "spellTrap") {
    return player.spellTrapZones[location.index]?.instance ?? null;
  }

  if (location.area === "graveyard") {
    return player.graveyard[location.index].instance;
  }

  return player.banished[location.index].instance;
}

function emptyZones(): Array<ZoneCard | null> {
  return Array.from({ length: ZONE_COUNT }, () => null);
}

function addLog(state: GameState, message: string): GameState {
  return {
    ...state,
    actionLog: [
      {
        id: crypto.randomUUID(),
        message,
      },
      ...state.actionLog,
    ].slice(0, 8),
  };
}
