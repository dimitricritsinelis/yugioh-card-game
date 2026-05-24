import type { CardInstance, ZoneCard } from "../core/cardRefs";
import type { PlayerState } from "../core/state";

export const HAND_SIZE_LIMIT = 6;

export interface HandSizeDiscard {
  readonly card: CardInstance;
  readonly fromHandIndex: number;
  readonly toGraveyardIndex: number;
}

export interface EndPhaseDiscardResult {
  readonly player: PlayerState;
  readonly discards: readonly HandSizeDiscard[];
}

export function discardHandToLimit(player: PlayerState, handLimit = HAND_SIZE_LIMIT): EndPhaseDiscardResult {
  let hand = [...player.hand];
  let graveyard = [...player.graveyard];
  const discards: HandSizeDiscard[] = [];

  while (hand.length > handLimit) {
    const fromHandIndex = hand.length - 1;
    const [card] = hand.slice(fromHandIndex);

    hand = hand.slice(0, fromHandIndex);
    graveyard = [toGraveyardCard(card), ...graveyard];
    discards.push({
      card,
      fromHandIndex,
      toGraveyardIndex: 0,
    });
  }

  return {
    player: {
      ...player,
      hand,
      graveyard,
    },
    discards,
  };
}

function toGraveyardCard(card: CardInstance): ZoneCard {
  return {
    ...card,
    face: "faceUp",
    position: null,
    visibility: "public",
    counters: {},
    attachments: [],
  };
}
