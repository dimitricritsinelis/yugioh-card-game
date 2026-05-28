import type { GameState, ZoneCard } from "../../types";
import type { DuelState, OpponentBehavior, PlayerId } from "../types";
import {
  selectActionLog,
  selectOpponentView,
  selectPlayerView,
} from "./viewSelectors";

export interface FrontendProjectionMeta {
  readonly selectedCardId: string | null;
  readonly lastDrawnCardId: string | null;
  readonly lastPlacedCardId: string | null;
  readonly opponentBehavior?: OpponentBehavior;
  readonly opponentTargetMonsterCount?: number;
}

export function projectEngineToGameState(
  engine: DuelState,
  meta: FrontendProjectionMeta,
  viewerId: PlayerId = "P1",
): GameState {
  return {
    engine,
    viewerId,
    opponentBehavior: meta.opponentBehavior ?? "none",
    opponentTargetMonsterCount: meta.opponentTargetMonsterCount ?? 3,
    player: selectPlayerView(engine, viewerId),
    opponent: selectOpponentView(engine, viewerId),
    phase: engine.phase,
    turn: engine.turn,
    selectedCardId: meta.selectedCardId,
    actionLog: selectActionLog(engine, viewerId),
    lastDrawnCardId: meta.lastDrawnCardId,
    lastPlacedCardId: meta.lastPlacedCardId,
  };
}

export function createEmptyFrontendGameState(): GameState {
  return {
    opponentBehavior: "none",
    opponentTargetMonsterCount: 3,
    player: {
      lp: 8000,
      deck: [],
      hand: [],
      monsterZones: emptyZones(),
      spellTrapZones: emptyZones(),
      graveyard: [],
      banished: [],
    },
    opponent: {
      lp: 8000,
      monsterZones: [false, false, false, false, false],
      spellTrapZones: [false, false, false, false, false],
      deckCount: 0,
      graveyardCount: 0,
      banishedCount: 0,
    },
    phase: "DP",
    turn: 1,
    selectedCardId: null,
    actionLog: [],
    lastDrawnCardId: null,
    lastPlacedCardId: null,
  };
}

function emptyZones(): Array<ZoneCard | null> {
  return Array.from({ length: 5 }, () => null);
}
