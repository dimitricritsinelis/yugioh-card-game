import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import {
  activateSetCard,
  continueTurnFlow,
  createInitialGameState,
  placeSelectedCard,
} from "../../gameLogic";
import type { CardRecord, GameState } from "../../types";
import {
  clonePlayableDeck,
  KAIBA_PLAYABLE_DECK_FIXTURE,
  selectLegalPlacementActions,
  YUGI_PLAYABLE_DECK_FIXTURE,
} from "../index";
import type { DeckList } from "../types";

const cards = cardsJson as CardRecord[];
const BOOK_OF_MOON_ID = "14087893";
const MIRROR_FORCE_ID = "44095762";

function setCardFromHand(game: GameState, passcode: string): GameState {
  const action = selectLegalPlacementActions(game.engine!, "P1").find(
    (entry) =>
      entry.intent === "set" &&
      entry.zoneKind === "spellTrap" &&
      entry.instanceId.startsWith(`P1-${passcode}`),
  );

  expect(action).toBeDefined();

  return placeSelectedCard(
    { ...game, selectedCardId: action!.instanceId },
    action!.intent,
    action!.zoneKind,
    action!.zoneIndex,
  );
}

function newGame(): GameState {
  return createInitialGameState(cards, {
    decks: {
      P1: deckWithPriority(clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck), [
        BOOK_OF_MOON_ID,
        MIRROR_FORCE_ID,
      ]),
      P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
    },
    seed: "activate-set-card",
    opponentBehavior: "none",
    suppressWarnings: true,
  });
}

describe("activate set Spell/Trap on the field", () => {
  it("flips a Set Spell face-up when activated", () => {
    const game = newGame();
    const afterSet = setCardFromHand(game, BOOK_OF_MOON_ID);
    const setZone = afterSet.player.spellTrapZones.find(
      (zone) => zone?.instance.card.passcode === BOOK_OF_MOON_ID,
    )!;

    expect(setZone.faceDown).toBe(true);

    const afterActivate = activateSetCard(afterSet, setZone.instance.instanceId);
    const activatedZone = afterActivate.player.spellTrapZones.find(
      (zone) => zone?.instance.card.passcode === BOOK_OF_MOON_ID,
    )!;

    expect(activatedZone.faceDown).toBe(false);
    expect(activatedZone.stance).toBe("activated");
  });

  it("blocks activating a Trap the turn it was Set, then allows it next turn", () => {
    const game = newGame();
    const afterSet = setCardFromHand(game, MIRROR_FORCE_ID);
    const trapId = afterSet.player.spellTrapZones.find(
      (zone) => zone?.instance.card.passcode === MIRROR_FORCE_ID,
    )!.instance.instanceId;

    // Same turn: activation is rejected, card stays face-down.
    const sameTurn = activateSetCard(afterSet, trapId);
    const sameTurnZone = sameTurn.player.spellTrapZones.find(
      (zone) => zone?.instance.instanceId === trapId,
    )!;
    expect(sameTurnZone.faceDown).toBe(true);

    // Advance to a later turn (solo mode keeps P1 active), then activate.
    let later = sameTurn;
    const startTurn = later.turn;
    let guard = 0;
    while (later.turn === startTurn && guard < 10) {
      later = continueTurnFlow(later);
      guard += 1;
    }
    expect(later.turn).toBeGreaterThan(startTurn);

    const afterActivate = activateSetCard(later, trapId);
    const trapZone = afterActivate.player.spellTrapZones.find(
      (zone) => zone?.instance.instanceId === trapId,
    )!;
    expect(trapZone.faceDown).toBe(false);
    expect(trapZone.stance).toBe("activated");
  });
});

function deckWithPriority(deck: DeckList, priorityIds: string[]): DeckList {
  const main = [...deck.main];

  for (const id of [...priorityIds].reverse()) {
    const index = main.indexOf(id);
    if (index >= 0) {
      main.splice(index, 1);
      main.unshift(id);
    }
  }

  return { ...deck, main };
}
