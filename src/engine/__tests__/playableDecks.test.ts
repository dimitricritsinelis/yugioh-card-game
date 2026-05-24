import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import { createInitialGameState } from "../../gameLogic";
import type { CardRecord } from "../../types";
import {
  assignRandomPlayableDecksToDuel,
  clonePlayableDeck,
  createCoreDuel,
  getCardCoverage,
  isInitialSupportedCard,
  KAIBA_PLAYABLE_DECK_FIXTURE,
  PLAYABLE_DECK_FIXTURES,
  validateDeck,
  validatePlayableDeckFixtures,
  YUGI_PLAYABLE_DECK_FIXTURE,
} from "../index";
import type { DeckList } from "../types";

const cards = cardsJson as CardRecord[];

describe("supported playable deck fixtures", () => {
  it("exports two exact-40 Main Deck-only fixtures using supported cardIds", () => {
    expect(PLAYABLE_DECK_FIXTURES.map((fixture) => fixture.id)).toEqual([
      "yugi_playable_fixture",
      "kaiba_playable_fixture",
    ]);
    expect(validatePlayableDeckFixtures(cards)).toEqual([]);

    for (const fixture of PLAYABLE_DECK_FIXTURES) {
      const deck = clonePlayableDeck(fixture.deck);

      expect(deck.main).toHaveLength(40);
      expect(deck.side).toBeUndefined();
      expect(deck.extra).toBeUndefined();
      expect(validateDeck(deck, cards)).toEqual({ valid: true, errors: [] });
      assertSupportedCardIds(deck);
      assertCopyLimits(deck);
    }
  });

  it("starts a core duel with both playable fixture decks", () => {
    const result = createCoreDuel({
      cards,
      decks: {
        P1: clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck),
        P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
      },
      seed: "playable-fixture-duel",
      shuffleDecks: false,
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P1.hand).toHaveLength(5);
    expect(result.state.players.P1.mainDeck).toHaveLength(35);
    expect(result.state.players.P2.hand).toHaveLength(5);
    expect(result.state.players.P2.mainDeck).toHaveLength(35);
    expect(result.state.winner).toBeNull();
  });

  it("assigns fixture decks independently and returns fresh deck arrays", () => {
    const first = assignRandomPlayableDecksToDuel(cards, sequenceRng([0.1, 0.9]));
    const second = assignRandomPlayableDecksToDuel(cards, sequenceRng([0.1, 0.9]));

    expect(first.player).toBe(YUGI_PLAYABLE_DECK_FIXTURE);
    expect(first.opponent).toBe(KAIBA_PLAYABLE_DECK_FIXTURE);
    expect(first.warnings).toEqual([]);
    expect(first.decks.P1.main).toEqual(second.decks.P1.main);
    expect(first.decks.P2.main).toEqual(second.decks.P2.main);
    expect(first.decks.P1.main).not.toBe(first.decks.P2.main);

    const originalFixtureTop = YUGI_PLAYABLE_DECK_FIXTURE.deck.main[0];
    const originalOpponentTop = first.decks.P2.main[0];
    first.decks.P1.main[0] = "mutated";

    expect(first.decks.P2.main[0]).toBe(originalOpponentTop);
    expect(YUGI_PLAYABLE_DECK_FIXTURE.deck.main[0]).toBe(originalFixtureTop);
  });

  it("uses playable fixture decks for default local game setup", () => {
    const game = createInitialGameState(cards, {
      rng: sequenceRng([0.1, 0.9]),
      seed: "default-playable-fixtures",
      suppressWarnings: true,
    });
    const playerMain = [
      ...game.engine!.players.P1.hand,
      ...game.engine!.players.P1.deck,
    ].map((instance) => instance.card.passcode);
    const opponentMain = [
      ...game.engine!.players.P2.hand,
      ...game.engine!.players.P2.deck,
    ].map((instance) => instance.card.passcode);

    expect(playerMain).toHaveLength(40);
    expect(opponentMain).toHaveLength(40);
    expect(sorted(playerMain)).toEqual(sorted(YUGI_PLAYABLE_DECK_FIXTURE.deck.main));
    expect(sorted(opponentMain)).toEqual(sorted(KAIBA_PLAYABLE_DECK_FIXTURE.deck.main));
  });
});

function assertSupportedCardIds(deck: DeckList): void {
  for (const cardId of deck.main) {
    const card = cardById(cardId);
    const coverage = getCardCoverage(card);

    expect(isInitialSupportedCard(card)).toBe(true);
    expect(["goatVanilla", "goatTemplate", "goatCustom"]).toContain(coverage.status);
  }
}

function assertCopyLimits(deck: DeckList): void {
  const counts = new Map<string, number>();

  for (const cardId of deck.main) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }

  for (const [cardId, count] of counts) {
    expect(count).toBeLessThanOrEqual(cardById(cardId).legality.max_copies);
  }
}

function cardById(cardId: string): CardRecord {
  const card = cards.find((candidate) => candidate.passcode === cardId);

  if (!card) {
    throw new Error(`Missing fixture cardId: ${cardId}`);
  }

  return card;
}

function sequenceRng(values: number[]) {
  let index = 0;

  return () => values[index++] ?? values.at(-1) ?? 0;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((first, second) => first.localeCompare(second));
}
