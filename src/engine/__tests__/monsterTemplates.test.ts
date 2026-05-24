import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import { createFlipEffectScript } from "../cards/templates/flipEffect";
import { createBattleRecruiterScript } from "../cards/templates/recruiter";
import { createSentToGraveyardSearcherScript } from "../cards/templates/searcher";
import { createSpiritReturnScript } from "../cards/templates/spirit";
import {
  createDirectAttackScript,
  createMonsterIgnitionScript,
  createPiercingDamageScript,
} from "../cards/templates/statModifier";
import type { CardInstance, ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const DEKOICHI_ID = "87621407";
const MAGICIAN_OF_FAITH_ID = "31560081";
const OLD_VINDICTIVE_ID = "45141844";
const MYSTIC_TOMATO_ID = "83011277";
const SANGAN_ID = "26202165";
const TSUKUYOMI_ID = "34853266";
const EXILED_FORCE_ID = "74131780";
const DON_ZALOOG_ID = "76922029";
const AIRKNIGHT_ID = "18036057";
const SPIRIT_REAPER_ID = "23205979";
const POT_OF_GREED_ID = "55144522";
const BATTLE_OX_ID = "05053103";
const AQUA_MADOOR_ID = "85639257";
const BLUE_EYES_ID = "89631139";

const anyMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const ownGraveyardSpellTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["graveyard"] as const),
  cardKinds: Object.freeze(["spell"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

describe("Monster templates", () => {
  it("draws from a Flip Effect trigger", () => {
    const state = setOwnFaceDownMonster(stateWithScripts([
      createFlipEffectScript({
        cardId: DEKOICHI_ID,
        steps: [{ kind: "draw", player: "self", count: 1 }],
      }),
    ]), DEKOICHI_ID);
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const resolved = reduceDuel(flipped.state, { type: "resolve-chain", playerId: "P1" });

    expect(flipped.state.chain).toHaveLength(1);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events.some((event) => event.type === "card-drawn")).toBe(true);
  });

  it("destroys a selected monster from a Flip Effect trigger", () => {
    const state = withOpponentMonster(
      setOwnFaceDownMonster(stateWithScripts([
        createFlipEffectScript({
          cardId: OLD_VINDICTIVE_ID,
          targets: [anyMonsterTarget],
          steps: [{ kind: "destroy-targets" }],
        }),
      ]), OLD_VINDICTIVE_ID),
      BLUE_EYES_ID,
    );
    const monster = state.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(state, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(flipped.prompts[0]).toMatchObject({ kind: "target" });
    expect(answered.state.chain).toHaveLength(1);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
  });

  it("returns a selected Spell from Graveyard to hand from a Flip Effect trigger", () => {
    const state = setOwnFaceDownMonster(stateWithScripts([
        createFlipEffectScript({
          cardId: MAGICIAN_OF_FAITH_ID,
          targets: [ownGraveyardSpellTarget],
          steps: [{ kind: "return-targets-to-hand" }],
        }),
      ]), MAGICIAN_OF_FAITH_ID);
    const patched: DuelState = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          graveyard: [zoneCard("p1-pot-grave", POT_OF_GREED_ID, "P1", { position: null })],
        },
      },
    };
    const monster = patched.players.P1.monsterZones[0]!;
    const flipped = reduceDuel(patched, { type: "flip-summon", playerId: "P1", instanceId: monster.instanceId });
    const answered = reduceDuel(flipped.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const resolved = reduceDuel(answered.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard).toEqual([]);
    expect(resolved.state.players.P1.hand.at(-1)).toMatchObject({ instanceId: "p1-pot-grave" });
  });

  it("special summons from Deck when a recruiter is destroyed by battle and sent to Graveyard", () => {
    const state = withRecruitTargetInDeck(
      battleStateWithDefenderScript(createBattleRecruiterScript({
        cardId: MYSTIC_TOMATO_ID,
        recruitCardIds: [BATTLE_OX_ID],
      }), MYSTIC_TOMATO_ID),
      "P2",
      BATTLE_OX_ID,
    );
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const battle = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });
    const resolved = reduceDuel(battle.state, { type: "resolve-chain", playerId: "P1" });

    expect(battle.state.chain[0]).toMatchObject({ cardId: MYSTIC_TOMATO_ID });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({ cardId: BATTLE_OX_ID });
  });

  it("searches Deck to hand when sent from field to Graveyard", () => {
    const state = withRecruitTargetInDeck(
      battleStateWithDefenderScript(createSentToGraveyardSearcherScript({
        cardId: SANGAN_ID,
        searchCardIds: [BATTLE_OX_ID],
      }), SANGAN_ID),
      "P2",
      BATTLE_OX_ID,
    );
    const attacker = state.players.P1.monsterZones[0]!;
    const defender = state.players.P2.monsterZones[0]!;
    const battle = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });
    const resolved = reduceDuel(battle.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.hand.at(-1)).toMatchObject({ cardId: BATTLE_OX_ID });
  });

  it("returns a Spirit monster to hand through its End Phase trigger", () => {
    const state: DuelState = {
      ...stateWithScripts([createSpiritReturnScript({ cardId: TSUKUYOMI_ID })]),
      phase: "EP" as const,
    };
    const patched: DuelState = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          monsterZones: [zoneCard("p1-spirit", TSUKUYOMI_ID, "P1"), null, null, null, null],
        },
      },
    };
    const ended = reduceDuel(patched, { type: "end-turn", playerId: "P1" });
    const resolved = reduceDuel(ended.state, { type: "resolve-chain", playerId: "P2" });

    expect(ended.state.chain[0]).toMatchObject({ cardId: TSUKUYOMI_ID });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.hand.at(-1)).toMatchObject({ instanceId: "p1-spirit" });
  });

  it("supports self-Tribute ignition effects", () => {
    const state = withOpponentMonster(
      withOwnFaceUpMonster(stateWithScripts([
        createMonsterIgnitionScript({
          cardId: EXILED_FORCE_ID,
          costs: [{ kind: "tribute-source" }],
          targets: [anyMonsterTarget],
          steps: [{ kind: "destroy-targets" }],
        }),
      ]), EXILED_FORCE_ID),
      BLUE_EYES_ID,
    );
    const source = state.players.P1.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(activation.events.some((event) => event.type === "cost-paid" && event.costKind === "tribute")).toBe(true);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ instanceId: source.instanceId });
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
  });

  it("supports discard-cost ignition effects", () => {
    const state = withOwnFaceUpMonster(stateWithScripts([
      createMonsterIgnitionScript({
        cardId: DON_ZALOOG_ID,
        costs: [{ kind: "discard", count: 1 }],
        steps: [{ kind: "draw", player: "self", count: 1 }],
      }),
    ]), DON_ZALOOG_ID);
    const source = state.players.P1.monsterZones[0]!;
    const discard = requireHandCard(state, "P1", BATTLE_OX_ID);
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      costInstanceIds: [discard.instanceId],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.some((event) => event.type === "card-drawn")).toBe(true);
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === discard.instanceId)).toBe(true);
  });

  it("applies piercing battle damage from a continuous monster template", () => {
    const state = battleStateWithAttackerScript(createPiercingDamageScript(AIRKNIGHT_ID), AIRKNIGHT_ID, {
      defenderId: BATTLE_OX_ID,
      defenderOverrides: { position: "defense" },
    });
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P2.lp).toBe(7100);
  });

  it("allows direct attacks from a continuous monster template", () => {
    const state = battleStateWithAttackerScript(createDirectAttackScript(SPIRIT_REAPER_ID), SPIRIT_REAPER_ID, {
      defenderId: BATTLE_OX_ID,
    });
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });

    expect(result.errors).toEqual([]);
    expect(result.state.players.P2.lp).toBe(7700);
    expect(result.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: "p2-defender" });
  });
});

function stateWithScripts(scripts: readonly CardScript[]): DuelState {
  const ids = uniqueIds([
    BATTLE_OX_ID,
    AQUA_MADOOR_ID,
    BLUE_EYES_ID,
    POT_OF_GREED_ID,
    ...scripts.map((script) => script.cardId),
  ]);
  const state = advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(ids),
      P2: deckWithPriority(ids),
    },
    seed: "monster-template-tests",
    shuffleDecks: false,
    allowUnsupportedCards: true,
  }).state);

  return {
    ...state,
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function setOwnFaceDownMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-flip", cardId, "P1", { face: "faceDown", position: "defense", visibility: "hidden" }), null, null, null, null],
      },
    },
  };
}

function withOwnFaceUpMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-source", cardId, "P1"), null, null, null, null],
      },
    },
  };
}

function withOpponentMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        monsterZones: [zoneCard("p2-target", cardId, "P2"), null, null, null, null],
      },
    },
  };
}

function battleStateWithDefenderScript(script: CardScript, defenderId: string): DuelState {
  const base = advanceToBattlePhase(stateWithScripts([script]));

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [zoneCard("p1-attacker", BLUE_EYES_ID, "P1"), null, null, null, null],
      },
      P2: {
        ...base.players.P2,
        monsterZones: [zoneCard("p2-defender", defenderId, "P2", { position: "attack" }), null, null, null, null],
      },
    },
  };
}

function battleStateWithAttackerScript(
  script: CardScript,
  attackerId: string,
  options: { readonly defenderId: string; readonly defenderOverrides?: Partial<ZoneCard> },
): DuelState {
  const base = advanceToBattlePhase(stateWithScripts([script]));

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [zoneCard("p1-attacker", attackerId, "P1"), null, null, null, null],
      },
      P2: {
        ...base.players.P2,
        monsterZones: [zoneCard("p2-defender", options.defenderId, "P2", options.defenderOverrides), null, null, null, null],
      },
    },
  };
}

function withRecruitTargetInDeck(state: DuelState, playerId: "P1" | "P2", cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        mainDeck: [cardInstance(`${playerId}-${cardId}-deck-target`, cardId, playerId), ...state.players[playerId].mainDeck],
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

function cardInstance(instanceId: string, cardId: string, owner: "P1" | "P2"): CardInstance {
  return {
    instanceId,
    cardId,
    owner,
    controller: owner,
  };
}

function uniqueIds(cardIds: readonly string[]): string[] {
  return [...new Set(cardIds)];
}
