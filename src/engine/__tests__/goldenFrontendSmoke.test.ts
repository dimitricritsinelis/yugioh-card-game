import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import {
  attackWithSelectedCard,
  continueTurnFlow,
  createInitialGameState,
  getLegalAttackTargetsForCard,
  placeSelectedCard,
} from "../../gameLogic";
import type { CardRecord } from "../../types";
import {
  clonePlayableDeck,
  KAIBA_PLAYABLE_DECK_FIXTURE,
  selectLegalPlacementActions,
  YUGI_PLAYABLE_DECK_FIXTURE,
} from "../index";
import type { DeckList } from "../types";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";
const BOOK_OF_MOON_ID = "14087893";

describe("golden frontend smoke scenario", () => {
  it("starts supported decks, sets a Spell/Trap, summons, enters battle, and attacks through the adapter", () => {
    const game = createInitialGameState(cards, {
      decks: {
        P1: deckWithPriority(clonePlayableDeck(YUGI_PLAYABLE_DECK_FIXTURE.deck), [
          BATTLE_OX_ID,
          BOOK_OF_MOON_ID,
        ]),
        P2: clonePlayableDeck(KAIBA_PLAYABLE_DECK_FIXTURE.deck),
      },
      seed: "golden-frontend-smoke",
      opponentBehavior: "none",
      suppressWarnings: true,
    });
    const setSpellTrap = selectLegalPlacementActions(game.engine!, "P1").find(
      (action) => action.intent === "set" && action.zoneKind === "spellTrap" && action.instanceId.startsWith(`P1-${BOOK_OF_MOON_ID}`),
    );

    expect(game.engine).toBeDefined();
    expect(game.engine!.phase).toBe("M1");
    expect(setSpellTrap).toBeDefined();

    const afterSet = placeSelectedCard(
      { ...game, selectedCardId: setSpellTrap!.instanceId },
      setSpellTrap!.intent,
      setSpellTrap!.zoneKind,
      setSpellTrap!.zoneIndex,
    );
    const summon = selectLegalPlacementActions(afterSet.engine!, "P1").find(
      (action) => action.intent === "summon" && action.zoneKind === "monster" && action.instanceId.startsWith(`P1-${BATTLE_OX_ID}`),
    );

    expect(afterSet.engine!.players.P1.spellTrapZones[setSpellTrap!.zoneIndex]).toMatchObject({
      instance: { card: { passcode: BOOK_OF_MOON_ID } },
      faceDown: true,
    });
    expect(summon).toBeDefined();

    const afterSummon = placeSelectedCard(
      { ...afterSet, selectedCardId: summon!.instanceId },
      summon!.intent,
      summon!.zoneKind,
      summon!.zoneIndex,
    );
    // Turn 1 has no Battle Phase: the first flow advance ends the turn (solo
    // mode keeps the same player), the second one enters battle on turn 2.
    const secondTurn = continueTurnFlow(afterSummon);
    const battleState = continueTurnFlow(secondTurn);
    const attackTargets = getLegalAttackTargetsForCard(battleState, summon!.instanceId);
    const afterAttack = attackWithSelectedCard(
      { ...battleState, selectedCardId: summon!.instanceId },
      attackTargets[0],
    );

    expect(afterSummon.engine!.players.P1.monsterZones[summon!.zoneIndex]).toMatchObject({
      instance: { card: { passcode: BATTLE_OX_ID } },
      faceDown: false,
    });
    expect(secondTurn.engine!.turn).toBe(2);
    expect(secondTurn.phase).toBe("M1");
    expect(battleState.phase).toBe("BP");
    expect(attackTargets).toHaveLength(1);
    expect(attackTargets[0].target).toEqual({ kind: "direct" });
    expect(afterAttack.engine!.players.P2.lp).toBe(6300);
    expect(afterAttack.actionLog.some((entry) => entry.message.includes("attacked directly"))).toBe(true);
  });
});

function deckWithPriority(deck: DeckList, priorityIds: readonly string[]): DeckList {
  const remaining = [...deck.main];

  for (const cardId of priorityIds) {
    const index = remaining.indexOf(cardId);

    if (index < 0) {
      throw new Error(`Fixture deck is missing cardId ${cardId}.`);
    }

    remaining.splice(index, 1);
  }

  return {
    main: [...priorityIds, ...remaining],
  };
}
