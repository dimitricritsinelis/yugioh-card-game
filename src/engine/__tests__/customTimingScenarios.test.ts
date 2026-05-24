import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { isPlayableCard } from "../cards/coverage";
import {
  BREAKER_THE_MAGICAL_WARRIOR_ID,
  CALL_OF_THE_HAUNTED_ID,
  DD_WARRIOR_LADY_ID,
  INJECTION_FAIRY_LILY_ID,
  PREMATURE_BURIAL_ID,
  REFLECT_BOUNDER_ID,
  RING_OF_DESTRUCTION_ID,
  SINISTER_SERPENT_ID,
  SNATCH_STEAL_ID,
  TRIBE_INFECTING_VIRUS_ID,
  tribeEffectId,
} from "../cards/scripts/custom/staples";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const POT_OF_GREED_ID = "55144522";
const BATTLE_OX_ID = "05053103";
const BLUE_EYES_ID = "89631139";

describe("custom staple timing scenarios", () => {
  it("does not place Breaker's Spell Counter when Breaker is Set instead of Normal Summoned", () => {
    const state = stateWithPriority([BREAKER_THE_MAGICAL_WARRIOR_ID], []);
    const breaker = requireHandCard(state, "P1", BREAKER_THE_MAGICAL_WARRIOR_ID);
    const set = reduceDuel(state, {
      type: "set-monster",
      playerId: "P1",
      instanceId: breaker.instanceId,
      zoneIndex: 0,
    });

    expect(set.errors).toEqual([]);
    expect(set.state.chain).toEqual([]);
    expect(set.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: BREAKER_THE_MAGICAL_WARRIOR_ID,
      face: "faceDown",
      counters: {},
    });
  });

  it("does not allow Breaker's destruction effect before the summon trigger places its counter", () => {
    const state = withTargetSpellTrap(stateWithPriority([BREAKER_THE_MAGICAL_WARRIOR_ID], [POT_OF_GREED_ID]));
    const breaker = requireHandCard(state, "P1", BREAKER_THE_MAGICAL_WARRIOR_ID);
    const summoned = reduceDuel(state, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: breaker.instanceId,
      zoneIndex: 0,
    });
    const activation = reduceDuel(summoned.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: summoned.state.players.P1.monsterZones[0]!.instanceId,
      effectId: "remove-spell-counter-destroy",
      targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 0 }],
    });

    expect(summoned.errors).toEqual([]);
    expect(summoned.state.players.P1.monsterZones[0]?.counters.spell).toBeUndefined();
    expect(activation.errors[0]?.message).toBe("That effect cannot be activated right now.");
    expect(activation.state.players.P2.spellTrapZones[0]).toMatchObject({ instanceId: "p2-target-spell" });
  });

  it("requires Tribe-Infecting Virus to discard a card for its declared-Type destruction effect", () => {
    const state = withTribeOnly(stateWithPriority([TRIBE_INFECTING_VIRUS_ID, BATTLE_OX_ID], []));
    const tribe = state.players.P1.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: tribe.instanceId,
      effectId: tribeEffectId("Aqua"),
    });

    expect(activation.errors[0]?.message).toBe("Cost requires exactly 1 card(s).");
    expect(activation.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: tribe.instanceId });
  });

  it("does not allow Tribe-Infecting Virus to activate while face-down", () => {
    const state = withFaceDownTribe(stateWithPriority([TRIBE_INFECTING_VIRUS_ID, BATTLE_OX_ID], []));
    const tribe = state.players.P1.monsterZones[0]!;
    const discard = requireHandCard(state, "P1", BATTLE_OX_ID);
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: tribe.instanceId,
      effectId: tribeEffectId("Aqua"),
      costInstanceIds: [discard.instanceId],
    });

    expect(activation.errors[0]?.message).toBe("That effect cannot be activated right now.");
    expect(activation.state.players.P1.hand.some((card) => card.instanceId === discard.instanceId)).toBe(true);
  });

  it("does not trigger Sinister Serpent during the opponent's Standby Phase", () => {
    const state = withOpponentGraveyardCard(drawPhaseStateWithPriority([], [SINISTER_SERPENT_ID]), SINISTER_SERPENT_ID);
    const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" });

    expect(standby.errors).toEqual([]);
    expect(standby.prompts).toEqual([]);
    expect(standby.state.chain).toEqual([]);
    expect(standby.state.players.P2.graveyard[0]).toMatchObject({ cardId: SINISTER_SERPENT_ID });
  });

  it("leaves Sinister Serpent in Graveyard when its optional Standby trigger is declined", () => {
    const state = withOwnGraveyardCard(drawPhaseStateWithPriority([SINISTER_SERPENT_ID], []), SINISTER_SERPENT_ID);
    const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" });
    const declined = reduceDuel(standby.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      choiceIds: ["no"],
    });

    expect(declined.errors).toEqual([]);
    expect(declined.state.chain).toEqual([]);
    expect(declined.state.players.P1.graveyard[0]).toMatchObject({ cardId: SINISTER_SERPENT_ID });
  });

  it("leaves D.D. Warrior Lady battle results intact when its optional trigger is declined", () => {
    const state = battleStateWithDDWarriorLadyAttackingBlueEyes(
      stateWithPriority([DD_WARRIOR_LADY_ID], [BLUE_EYES_ID]),
    );
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const battle = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });
    const declined = reduceDuel(battle.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      choiceIds: ["no"],
    });

    expect(declined.errors).toEqual([]);
    expect(declined.state.chain).toEqual([]);
    expect(declined.state.players.P1.graveyard[0]).toMatchObject({ instanceId: attacker.instanceId });
    expect(declined.state.players.P1.banished).toEqual([]);
    expect(declined.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: defender.instanceId });
    expect(declined.state.players.P2.banished).toEqual([]);
  });

  it("resolves Injection Fairy Lily's battle normally when its optional ATK boost is declined", () => {
    const state = battleStateWithInjectionFairyLilyAttackingBlueEyes(
      stateWithPriority([INJECTION_FAIRY_LILY_ID], [BLUE_EYES_ID]),
    );
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const battle = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });
    const declined = reduceDuel(battle.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      choiceIds: ["no"],
    });

    expect(declined.errors).toEqual([]);
    expect(declined.state.players.P1.lp).toBe(5400);
    expect(declined.state.players.P1.monsterZones[0]).toBeNull();
    expect(declined.state.players.P1.graveyard[0]).toMatchObject({ instanceId: attacker.instanceId });
    expect(declined.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: defender.instanceId });
    expect(declined.state.pendingAttack).toBeNull();
  });

  it("does not trigger Reflect Bounder when it attacks or is attacked in Defense Position", () => {
    const attackState = battleStateWithReflectBounderAttackingBlueEyes(
      stateWithPriority([REFLECT_BOUNDER_ID], [BLUE_EYES_ID]),
    );
    const attackingReflect = attackState.players.P1.monsterZones[0]!;
    const attackDefender = attackState.players.P2.monsterZones[0]!;
    const reflectAttack = reduceDuel(attackState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attackingReflect.instanceId,
      defenderInstanceId: attackDefender.instanceId,
    });
    const defenseState = battleStateWithBlueEyesAttackingDefenseReflectBounder(
      stateWithPriority([BLUE_EYES_ID], [REFLECT_BOUNDER_ID]),
    );
    const blueEyes = defenseState.players.P1.monsterZones[0]!;
    const defenseReflect = defenseState.players.P2.monsterZones[0]!;
    const defenseBattle = reduceDuel(defenseState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: blueEyes.instanceId,
      defenderInstanceId: defenseReflect.instanceId,
    });

    expect(reflectAttack.errors).toEqual([]);
    expect(reflectAttack.prompts).toEqual([]);
    expect(reflectAttack.state.chain).toEqual([]);
    expect(reflectAttack.state.players.P1.lp).toBe(6700);
    expect(reflectAttack.state.players.P1.graveyard[0]).toMatchObject({ instanceId: attackingReflect.instanceId });
    expect(defenseBattle.errors).toEqual([]);
    expect(defenseBattle.prompts).toEqual([]);
    expect(defenseBattle.state.chain).toEqual([]);
    expect(defenseBattle.state.players.P1.lp).toBe(8000);
    expect(defenseBattle.state.players.P2.graveyard[0]).toMatchObject({ instanceId: defenseReflect.instanceId });
  });

  it("requires Ring of Destruction to target a face-up monster", () => {
    const state = withRingAndFaceDownTarget(
      stateWithPriority([RING_OF_DESTRUCTION_ID], [BREAKER_THE_MAGICAL_WARRIOR_ID]),
    );
    const ring = state.players.P1.spellTrapZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: ring.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });

    expect(activation.errors[0]?.message).toBe("Target must be faceUp.");
    expect(activation.state.players.P1.spellTrapZones[0]).toMatchObject({ instanceId: ring.instanceId });
    expect(activation.state.players.P2.monsterZones[0]).toMatchObject({
      cardId: BREAKER_THE_MAGICAL_WARRIOR_ID,
      face: "faceDown",
    });
  });

  it("does not allow Call of the Haunted without an open Monster Zone", () => {
    const state = withFullMonsterZonesAndCallTarget(stateWithPriority([CALL_OF_THE_HAUNTED_ID, BATTLE_OX_ID], []));
    const call = state.players.P1.spellTrapZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: call.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });

    expect(activation.errors[0]?.message).toBe("That effect cannot be activated right now.");
    expect(activation.state.players.P1.spellTrapZones[0]).toMatchObject({ instanceId: call.instanceId });
    expect(activation.state.players.P1.graveyard[0]).toMatchObject({ cardId: BATTLE_OX_ID });
  });

  it("does not allow Premature Burial from hand without an open Spell/Trap Zone", () => {
    const state = withFullSpellTrapZonesAndPrematureTarget(
      stateWithPriority([PREMATURE_BURIAL_ID, BATTLE_OX_ID], []),
    );
    const premature = requireHandCard(state, "P1", PREMATURE_BURIAL_ID);
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: premature.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });

    expect(activation.errors[0]?.message).toBe("That effect cannot be activated right now.");
    expect(activation.state.players.P1.hand.some((card) => card.instanceId === premature.instanceId)).toBe(true);
    expect(activation.state.players.P1.graveyard[0]).toMatchObject({ cardId: BATTLE_OX_ID });
  });

  it("does not allow Snatch Steal without an open Monster Zone for the stolen monster", () => {
    const state = withFullMonsterZonesAndSnatchTarget(stateWithPriority([SNATCH_STEAL_ID], [BLUE_EYES_ID]));
    const snatch = requireHandCard(state, "P1", SNATCH_STEAL_ID);
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: snatch.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });

    expect(activation.errors[0]?.message).toBe("That effect cannot be activated right now.");
    expect(activation.state.players.P1.hand.some((card) => card.instanceId === snatch.instanceId)).toBe(true);
    expect(activation.state.players.P2.monsterZones[0]).toMatchObject({ cardId: BLUE_EYES_ID });
  });
});

function stateWithPriority(p1PriorityIds: readonly string[], p2PriorityIds: readonly string[]): DuelState {
  return advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(p1PriorityIds),
      P2: deckWithPriority(p2PriorityIds),
    },
    seed: "custom-timing-tests",
    shuffleDecks: false,
  }).state);
}

function drawPhaseStateWithPriority(p1PriorityIds: readonly string[], p2PriorityIds: readonly string[]): DuelState {
  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(p1PriorityIds),
      P2: deckWithPriority(p2PriorityIds),
    },
    seed: "custom-timing-draw-phase-tests",
    shuffleDecks: false,
  }).state;
}

function withTargetSpellTrap(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        spellTrapZones: [
          zoneCard("p2-target-spell", POT_OF_GREED_ID, "P2", {
            face: "faceDown",
            position: null,
            visibility: "hidden",
          }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withTribeOnly(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-tribe", TRIBE_INFECTING_VIRUS_ID, "P1"), null, null, null, null],
      },
    },
  };
}

function withFaceDownTribe(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [
          zoneCard("p1-tribe", TRIBE_INFECTING_VIRUS_ID, "P1", {
            face: "faceDown",
            position: "defense",
            visibility: "hidden",
          }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withRingAndFaceDownTarget(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        spellTrapZones: [
          zoneCard("p1-ring", RING_OF_DESTRUCTION_ID, "P1", {
            face: "faceDown",
            position: null,
            visibility: "hidden",
            setTurn: 0,
          }),
          null,
          null,
          null,
          null,
        ],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [
          zoneCard("p2-face-down-breaker", BREAKER_THE_MAGICAL_WARRIOR_ID, "P2", {
            face: "faceDown",
            position: "defense",
            visibility: "hidden",
          }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withFullMonsterZonesAndCallTarget(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: state.players.P1.hand.filter(
          (card) => card.cardId !== CALL_OF_THE_HAUNTED_ID && card.cardId !== BATTLE_OX_ID,
        ),
        monsterZones: [
          zoneCard("p1-occupied-monster-0", BLUE_EYES_ID, "P1"),
          zoneCard("p1-occupied-monster-1", BATTLE_OX_ID, "P1"),
          zoneCard("p1-occupied-monster-2", BLUE_EYES_ID, "P1"),
          zoneCard("p1-occupied-monster-3", BATTLE_OX_ID, "P1"),
          zoneCard("p1-occupied-monster-4", BLUE_EYES_ID, "P1"),
        ],
        spellTrapZones: [
          zoneCard("p1-call-of-the-haunted", CALL_OF_THE_HAUNTED_ID, "P1", {
            face: "faceDown",
            position: null,
            visibility: "hidden",
            setTurn: 0,
          }),
          null,
          null,
          null,
          null,
        ],
        graveyard: [zoneCard("p1-battle-ox-graveyard", BATTLE_OX_ID, "P1", { position: null })],
      },
    },
  };
}

function withFullSpellTrapZonesAndPrematureTarget(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: state.players.P1.hand.filter((card) => card.cardId !== BATTLE_OX_ID),
        spellTrapZones: [
          zoneCard("p1-occupied-spell-trap-0", POT_OF_GREED_ID, "P1", { position: null }),
          zoneCard("p1-occupied-spell-trap-1", POT_OF_GREED_ID, "P1", { position: null }),
          zoneCard("p1-occupied-spell-trap-2", POT_OF_GREED_ID, "P1", { position: null }),
          zoneCard("p1-occupied-spell-trap-3", POT_OF_GREED_ID, "P1", { position: null }),
          zoneCard("p1-occupied-spell-trap-4", POT_OF_GREED_ID, "P1", { position: null }),
        ],
        graveyard: [zoneCard("p1-battle-ox-graveyard", BATTLE_OX_ID, "P1", { position: null })],
      },
    },
  };
}

function withFullMonsterZonesAndSnatchTarget(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [
          zoneCard("p1-occupied-snatch-monster-0", BLUE_EYES_ID, "P1"),
          zoneCard("p1-occupied-snatch-monster-1", BATTLE_OX_ID, "P1"),
          zoneCard("p1-occupied-snatch-monster-2", BLUE_EYES_ID, "P1"),
          zoneCard("p1-occupied-snatch-monster-3", BATTLE_OX_ID, "P1"),
          zoneCard("p1-occupied-snatch-monster-4", BLUE_EYES_ID, "P1"),
        ],
      },
      P2: {
        ...state.players.P2,
        hand: state.players.P2.hand.filter((card) => card.cardId !== BLUE_EYES_ID),
        monsterZones: [zoneCard("p2-snatch-target", BLUE_EYES_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function withOwnGraveyardCard(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: state.players.P1.hand.filter((card) => card.cardId !== cardId),
        graveyard: [zoneCard(`P1-${cardId}-graveyard`, cardId, "P1", { position: null })],
      },
    },
  };
}

function withOpponentGraveyardCard(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        hand: state.players.P2.hand.filter((card) => card.cardId !== cardId),
        graveyard: [zoneCard(`P2-${cardId}-graveyard`, cardId, "P2", { position: null })],
      },
    },
  };
}

function battleStateWithDDWarriorLadyAttackingBlueEyes(state: DuelState): DuelState {
  const base = advanceToBattlePhase(state);

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [zoneCard("p1-dd-warrior-lady", DD_WARRIOR_LADY_ID, "P1"), null, null, null, null],
      },
      P2: {
        ...base.players.P2,
        monsterZones: [zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function battleStateWithInjectionFairyLilyAttackingBlueEyes(state: DuelState): DuelState {
  const base = advanceToBattlePhase(state);

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [zoneCard("p1-injection-fairy-lily", INJECTION_FAIRY_LILY_ID, "P1"), null, null, null, null],
      },
      P2: {
        ...base.players.P2,
        monsterZones: [zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function battleStateWithReflectBounderAttackingBlueEyes(state: DuelState): DuelState {
  const base = advanceToBattlePhase(state);

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [zoneCard("p1-reflect-bounder", REFLECT_BOUNDER_ID, "P1"), null, null, null, null],
      },
      P2: {
        ...base.players.P2,
        monsterZones: [zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function battleStateWithBlueEyesAttackingDefenseReflectBounder(state: DuelState): DuelState {
  const base = advanceToBattlePhase(state);

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [zoneCard("p1-blue-eyes", BLUE_EYES_ID, "P1"), null, null, null, null],
      },
      P2: {
        ...base.players.P2,
        monsterZones: [
          zoneCard("p2-defense-reflect-bounder", REFLECT_BOUNDER_ID, "P2", { position: "defense" }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function advanceToM1(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
}

function advanceToBattlePhase(state: DuelState): DuelState {
  const main = advanceToM1(state);

  return reduceDuel(main, { type: "change-phase", playerId: "P1", phase: "BP" }).state;
}

function deckWithPriority(priorityIds: readonly string[]) {
  const excluded = new Set(priorityIds);
  const filler = legalMainDeck(40 + excluded.size).filter((passcode) => !excluded.has(passcode));

  return {
    main: [...priorityIds, ...filler].slice(0, 40),
  };
}

function legalMainDeck(size: number): string[] {
  const passcodes = cards
    .filter(
      (card) =>
        card.legality.goat_world_pool &&
        card.legality.max_copies > 0 &&
        isPlayableCard(card.passcode, cards),
    )
    .map((card) => card.passcode);

  if (passcodes.length < size) {
    throw new Error(`Not enough legal fixture cards for ${size}-card deck.`);
  }

  return passcodes.slice(0, size);
}

function requireHandCard(state: DuelState, playerId: "P1" | "P2", cardId: string) {
  const card = state.players[playerId].hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in ${playerId} hand.`);
  }

  return card;
}

function zoneCard(
  instanceId: string,
  cardId: string,
  owner: "P1" | "P2",
  overrides: Partial<ZoneCard> = {},
): ZoneCard {
  return {
    instanceId,
    cardId,
    owner,
    controller: owner,
    face: "faceUp",
    position: "attack",
    visibility: "public",
    counters: {},
    attachments: [],
    summonedTurn: 0,
    positionChangedTurn: null,
    attackedTurn: null,
    setTurn: null,
    ...overrides,
  };
}
