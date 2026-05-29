import type { DuelState, PlayerState } from "./state";

export function cloneDuelState(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      P1: clonePlayerState(state.players.P1),
      P2: clonePlayerState(state.players.P2),
    },
    damageStep: state.damageStep ? { ...state.damageStep } : undefined,
    cardDefinitions: state.cardDefinitions ? { ...state.cardDefinitions } : undefined,
    pendingAttack: state.pendingAttack
      ? {
          ...state.pendingAttack,
          atkModifiers: state.pendingAttack.atkModifiers?.map((modifier) => ({ ...modifier })),
        }
      : state.pendingAttack,
    eventIds: [...state.eventIds],
  };
}

export function clonePlayerState(player: PlayerState): PlayerState {
  return {
    ...player,
    mainDeck: player.mainDeck.map((card) => ({ ...card })),
    hand: player.hand.map((card) => ({ ...card })),
    monsterZones: player.monsterZones.map((card) => cloneZoneCard(card)),
    spellTrapZones: player.spellTrapZones.map((card) => cloneZoneCard(card)),
    graveyard: player.graveyard.map((card) => cloneZoneCard(card)!),
    banished: player.banished.map((card) => cloneZoneCard(card)!),
    fieldZone: cloneZoneCard(player.fieldZone),
  };
}

function cloneZoneCard<T extends PlayerState["fieldZone"]>(card: T): T {
  if (!card) {
    return card;
  }

  return {
    ...card,
    counters: { ...card.counters },
    attachments: [...card.attachments],
    ...(card.attachmentBehaviors ? { attachmentBehaviors: { ...card.attachmentBehaviors } } : {}),
  };
}
