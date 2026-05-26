import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard, validateDeck } from "../index";
import { createCardScriptRegistry } from "../cards/registry";
import type { ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";
import type { DeckList } from "../types";

const cards = cardsJson as CardRecord[];
const POT_OF_GREED_ID = "55144522";
const FUSIONIST_ID = "01641882";
const PETIT_ANGEL_ID = "38142739";
const MYSTICAL_SHEEP_2_ID = "83464209";
const BATTLE_OX_ID = "05053103";
const DARKFIRE_DRAGON_ID = "17881964";
const CYBER_SAURUS_ID = "89112729";
const THOUSAND_EYES_IDOL_ID = "27125110";

describe("Fusion Deck and Fusion Summon foundations", () => {
  it("validates Fusion monsters as Extra Deck cards without treating them as Main Deck cards", () => {
    const main = legalMainDeck(40);

    expect(validateDeck({ main, extra: [FUSIONIST_ID] }, cards).errors).toContain(
      "Extra Deck is not supported for playable duels.",
    );
    expect(validateDeck({ main, extra: [FUSIONIST_ID] }, cards, { allowExtraDeck: true })).toEqual({
      valid: true,
      errors: [],
    });
    expect(validateDeck(deckWithPriority([FUSIONIST_ID]), cards, { allowExtraDeck: true }).errors.join(" ")).toContain(
      "Fusionist is a Fusion Monster and must be placed in the Extra Deck.",
    );
    expect(validateDeck({ main, extra: [BATTLE_OX_ID] }, cards, { allowExtraDeck: true }).errors.join(" ")).toContain(
      "Battle Ox is not a Fusion Monster and cannot be placed in the Extra Deck.",
    );
  });

  it("builds the Fusion Deck from DeckList.extra without drawing those cards", () => {
    const state = fusionState([], [POT_OF_GREED_ID], [FUSIONIST_ID]);

    expect(state.players.P1.fusionDeck).toEqual([
      {
        instanceId: `P1-fusion-${FUSIONIST_ID}-1`,
        cardId: FUSIONIST_ID,
        owner: "P1",
        controller: "P1",
      },
    ]);
    expect(state.players.P1.hand.map((card) => card.cardId)).not.toContain(FUSIONIST_ID);
    expect(state.cardDefinitions?.[FUSIONIST_ID]?.classifications).toContain("Fusion");
  });

  it("Fusion Summons using exact named materials from hand and field", () => {
    const state = withMonsterOnField(
      fusionState(
        [fusionSummonScript(POT_OF_GREED_ID)],
        [POT_OF_GREED_ID, PETIT_ANGEL_ID, MYSTICAL_SHEEP_2_ID],
        [FUSIONIST_ID],
      ),
      PETIT_ANGEL_ID,
    );
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const sheep = requireHandCard(state, MYSTICAL_SHEEP_2_ID);
    const angel = state.players.P1.monsterZones[0]!;
    const resolved = activateAndResolve(state, source.instanceId, [
      { playerId: "P1", zone: "monsterZone", index: 0 },
      { playerId: "P1", zone: "hand", index: state.players.P1.hand.findIndex((card) => card.instanceId === sheep.instanceId) },
    ]);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.fusionDeck).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: FUSIONIST_ID,
      face: "faceUp",
      position: "attack",
    });
    expect(resolved.state.players.P1.graveyard).toEqual([
      expect.objectContaining({ instanceId: sheep.instanceId, cardId: MYSTICAL_SHEEP_2_ID }),
      expect.objectContaining({ instanceId: angel.instanceId, cardId: PETIT_ANGEL_ID }),
    ]);
    expect(resolved.events.filter((event) => event.type === "card-moved").map((event) => event.reason)).toEqual([
      "fusion-material",
      "fusion-material",
      "fusion-summon",
    ]);
  });

  it("supports Metamorphosis-style Fusion Deck summons by tributed monster level", () => {
    const state = withMonsterOnField(
      fusionState(
        [metamorphosisStyleScript(POT_OF_GREED_ID)],
        [POT_OF_GREED_ID, BATTLE_OX_ID],
        [DARKFIRE_DRAGON_ID, CYBER_SAURUS_ID],
      ),
      BATTLE_OX_ID,
    );
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const tribute = state.players.P1.monsterZones[0]!;
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "metamorphosis-style",
      costInstanceIds: [tribute.instanceId],
      targetRefs: [{ playerId: "P1", zone: "fusionDeck", index: 0 }],
    });
    const resolved = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ cardId: DARKFIRE_DRAGON_ID });
    expect(resolved.state.players.P1.fusionDeck?.map((card) => card.cardId)).toEqual([CYBER_SAURUS_ID]);
  });

  it("supports Magical Scientist-style level and direct-attack restrictions", () => {
    const state = fusionState(
      [magicalScientistStyleScript(POT_OF_GREED_ID)],
      [POT_OF_GREED_ID],
      [CYBER_SAURUS_ID],
    );
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const activated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: source.instanceId,
      effectId: "scientist-style",
      targetRefs: [{ playerId: "P1", zone: "fusionDeck", index: 0 }],
    });
    const resolved = reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });
    const battlePhase = reduceDuel(
      reduceDuel(resolved.state, { type: "change-phase", playerId: "P1", phase: "BP" }).state,
      {
        type: "attack",
        playerId: "P1",
        attackerInstanceId: resolved.state.players.P1.monsterZones[0]!.instanceId,
      },
    );

    expect(activated.errors).toEqual([]);
    expect(activated.state.players.P1.lp).toBe(7000);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ cardId: CYBER_SAURUS_ID });
    expect(battlePhase.errors[0]?.message).toBe("That Fusion Monster cannot attack directly this turn.");
  });

  it("returns Fusion Monsters to the Fusion Deck through explicit return effects", () => {
    const state = withMonsterOnField(
      fusionState([returnFusionScript(POT_OF_GREED_ID)], [POT_OF_GREED_ID], [FUSIONIST_ID]),
      FUSIONIST_ID,
    );
    const source = requireHandCard(state, POT_OF_GREED_ID);
    const resolved = activateAndResolve(state, source.instanceId, [{ playerId: "P1", zone: "monsterZone", index: 0 }]);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.fusionDeck?.at(-1)).toMatchObject({ cardId: FUSIONIST_ID });
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "card-moved",
      reason: "fusion-return",
      to: { playerId: "P1", zone: "fusionDeck", index: 1 },
    }));
  });
});

function activateAndResolve(state: DuelState, sourceInstanceId: string, targetRefs: readonly ZoneRef[]) {
  const activated = reduceDuel(state, {
    type: "activate-card",
    playerId: "P1",
    instanceId: sourceInstanceId,
    effectId: "activate",
    targetRefs,
  });

  expect(activated.errors).toEqual([]);

  return reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });
}

function fusionSummonScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "activate",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: [materialTargets(2)],
        resolution: {
          steps: [
            {
              kind: "fusion-summon",
              fusionCardId: FUSIONIST_ID,
              materialCardIds: [PETIT_ANGEL_ID, MYSTICAL_SHEEP_2_ID],
            },
          ],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
}

function metamorphosisStyleScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "metamorphosis-style",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        costs: [{ kind: "tribute", count: 1 }],
        targets: [fusionDeckTarget()],
        resolution: {
          steps: [{ kind: "special-summon-fusion-by-tributed-level", position: "attack" }],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
}

function magicalScientistStyleScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "scientist-style",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        costs: [{ kind: "pay-lp", amount: 1000 }],
        targets: [fusionDeckTarget()],
        resolution: {
          steps: [{ kind: "special-summon-targets", position: "attack", maxLevel: 6, preventDirectAttacks: true }],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
}

function returnFusionScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "activate",
        kind: "ignition",
        implemented: true,
        spellSpeed: 1,
        targets: [
          {
            kind: "card",
            controller: "own",
            zones: ["monsterZone"],
            cardKinds: ["monster"],
            face: "any",
            min: 1,
            max: 1,
          },
        ],
        resolution: {
          steps: [{ kind: "return-targets-to-fusion-deck" }],
          sendSourceToGraveyard: false,
        },
      },
    ],
  };
}

function materialTargets(count: number) {
  return {
    kind: "card" as const,
    controller: "own" as const,
    zones: ["hand", "monsterZone"] as const,
    cardKinds: ["monster"] as const,
    face: "any" as const,
    min: count,
    max: count,
  };
}

function fusionDeckTarget() {
  return {
    kind: "card" as const,
    controller: "own" as const,
    zones: ["fusionDeck"] as const,
    cardKinds: ["monster"] as const,
    face: "any" as const,
    min: 1,
    max: 1,
  };
}

function fusionState(scripts: readonly CardScript[], priorityIds: readonly string[], fusionIds: readonly string[]): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: {
        main: deckWithPriority(priorityIds).main,
        extra: [...fusionIds],
      },
      P2: deckWithPriority([]),
    },
    deckValidation: { allowExtraDeck: true },
    seed: `fusion-${priorityIds.join("-")}-${fusionIds.join("-")}`,
    shuffleDecks: false,
  }).state;
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;
  const main = reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;

  return {
    ...main,
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function withMonsterOnField(state: DuelState, cardId: string): DuelState {
  const handCard = state.players.P1.hand.find((card) => card.cardId === cardId);
  const monster = handCard
    ? zoneCard(handCard.instanceId, cardId, "P1")
    : zoneCard(`p1-field-${cardId}`, cardId, "P1");

  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: handCard
          ? state.players.P1.hand.filter((card) => card.instanceId !== handCard.instanceId)
          : state.players.P1.hand,
        monsterZones: [monster, null, null, null, null],
      },
    },
  };
}

function deckWithPriority(priorityIds: readonly string[]): DeckList {
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

function requireHandCard(state: DuelState, cardId: string) {
  const card = state.players.P1.hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in P1 hand.`);
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
    ...overrides,
  };
}
