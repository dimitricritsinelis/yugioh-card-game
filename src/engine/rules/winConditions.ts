import type { CardId } from "../data/cardCatalog";
import type { DuelState } from "../core/state";
import type { CardCoverageRegistry } from "../cards/coverage";
import { ENGINE_CARD_COVERAGE } from "../cards/registry";
import type { PlayerId } from "../types";

export const EXODIA_CARD_IDS = Object.freeze([
  "33396948",
  "07902349",
  "70903634",
  "44519536",
  "08124921",
] as const satisfies readonly CardId[]);

export type LossReason = "lp-zero" | "deck-out" | "exodia" | "rule";

export interface TerminalResult {
  readonly finished: boolean;
  readonly winner: PlayerId | null;
  readonly loser: PlayerId | null;
  readonly reason: LossReason;
}

export function playerWithZeroLp(state: DuelState): PlayerId | null {
  for (const playerId of ["P1", "P2"] as const) {
    if (state.players[playerId].lp <= 0) {
      return playerId;
    }
  }

  return null;
}

export function findExodiaWinner(state: DuelState): PlayerId | null {
  if (!isExodiaWinEnabled(state.implementedCardIds ?? implementedCardIdsFromRegistry())) {
    return null;
  }

  for (const playerId of ["P1", "P2"] as const) {
    const handIds = new Set(state.players[playerId].hand.map((card) => card.cardId));

    if (EXODIA_CARD_IDS.every((cardId) => handIds.has(cardId))) {
      return playerId;
    }
  }

  return null;
}

export function isExodiaWinEnabled(implementedCardIds: readonly CardId[]): boolean {
  const implemented = new Set(implementedCardIds);

  return EXODIA_CARD_IDS.every((cardId) => implemented.has(cardId));
}

export function implementedCardIdsFromRegistry(
  registry: CardCoverageRegistry = ENGINE_CARD_COVERAGE,
): readonly CardId[] {
  return Object.entries(registry).flatMap(([cardId, status]) => (status === "implemented" ? [cardId] : []));
}

export function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}
