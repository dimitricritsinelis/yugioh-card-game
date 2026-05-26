import type { DuelState, PlayerState } from "./state";

export function cloneDuelState(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      P1: clonePlayerState(state.players.P1),
      P2: clonePlayerState(state.players.P2),
    },
    priority: {
      ...state.priority,
      passedPlayerIds: [...state.priority.passedPlayerIds],
    },
    damageStep: state.damageStep ? { ...state.damageStep } : undefined,
    cardDefinitions: state.cardDefinitions ? { ...state.cardDefinitions } : undefined,
    cardScripts: state.cardScripts ? { ...state.cardScripts } : undefined,
    implementedCardIds: state.implementedCardIds ? [...state.implementedCardIds] : undefined,
    chain: state.chain.map((link) => ({ ...link })),
    pendingAttack: state.pendingAttack
      ? {
          ...state.pendingAttack,
          atkModifiers: state.pendingAttack.atkModifiers?.map((modifier) => ({ ...modifier })),
        }
      : state.pendingAttack,
    lingeringEffects: state.lingeringEffects?.map((effect) => ({
      ...effect,
      definition: {
        ...effect.definition,
        statModifiers: effect.definition.statModifiers?.map((modifier) => ({
          ...modifier,
          target: { ...modifier.target },
        })),
        attackRestrictions: effect.definition.attackRestrictions?.map((restriction) => ({
          ...restriction,
          target: { ...restriction.target },
          defender: restriction.defender ? { ...restriction.defender } : undefined,
        })),
        directAttackRestrictions: effect.definition.directAttackRestrictions?.map((restriction) => ({
          ...restriction,
          target: { ...restriction.target },
        })),
        directAttack: effect.definition.directAttack?.map((directAttack) => ({
          ...directAttack,
          target: { ...directAttack.target },
        })),
        piercingDamage: effect.definition.piercingDamage?.map((piercingDamage) => ({
          ...piercingDamage,
          target: { ...piercingDamage.target },
        })),
      },
    })),
    controlChangeReturns: state.controlChangeReturns?.map((controlReturn) => ({ ...controlReturn })),
    effectUsage: state.effectUsage
      ? Object.fromEntries(Object.entries(state.effectUsage).map(([key, usage]) => [key, { ...usage }]))
      : undefined,
    negatedChainLinkIds: state.negatedChainLinkIds ? [...state.negatedChainLinkIds] : undefined,
    prompts: Object.fromEntries(Object.entries(state.prompts).map(([id, prompt]) => [id, { ...prompt }])),
    pendingPromptIds: [...state.pendingPromptIds],
    eventIds: [...state.eventIds],
  };
}

export function clonePlayerState(player: PlayerState): PlayerState {
  return {
    ...player,
    mainDeck: player.mainDeck.map((card) => ({ ...card })),
    fusionDeck: player.fusionDeck?.map((card) => ({ ...card })) ?? [],
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
    ...(card.effectMarkers ? { effectMarkers: [...card.effectMarkers] } : {}),
    ...(card.token ? { token: { ...card.token } } : {}),
  };
}
