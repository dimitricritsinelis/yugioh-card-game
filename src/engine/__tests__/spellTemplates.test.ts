import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import { createContinuousSpellScript } from "../cards/templates/continuousSpell";
import { createFieldSpellScript } from "../cards/templates/fieldSpell";
import { createNormalSpellScript } from "../cards/templates/normalSpell";
import { createQuickPlaySpellScript } from "../cards/templates/quickPlaySpell";
import type { ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { deriveBattleStats } from "../effects/continuous";
import type { TargetSpec } from "../effects/targets";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";
const AQUA_MADOOR_ID = "85639257";
const BLUE_EYES_ID = "89631139";
const LA_JINN_ID = "97590747";
const AXE_RAIDER_ID = "48305365";
const DARK_MAGICIAN_ID = "46986414";
const SUMMONED_SKULL_ID = "70781052";
const POT_OF_GREED_ID = "55144522";

const spellTrapTarget: TargetSpec = Object.freeze({
  kind: "card",
  controller: "any",
  zones: Object.freeze(["spellTrapZone", "fieldZone"] as const),
  cardKinds: Object.freeze(["spell", "trap"] as const),
  face: "any",
  min: 1,
  max: 1,
});

const monsterTarget: TargetSpec = Object.freeze({
  kind: "card",
  controller: "any",
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any",
  min: 1,
  max: 1,
});

describe("Spell templates", () => {
  it("draws N cards and sends the activated Normal Spell source to the Graveyard", () => {
    const state = stateWithScripts([
      createNormalSpellScript({
        cardId: BATTLE_OX_ID,
        steps: Object.freeze([{ kind: "draw", player: "self", count: 2 }]),
      }),
    ]);
    const beforeDeckSize = state.players.P1.mainDeck.length;
    const beforeHandSize = state.players.P1.hand.length;
    const resolved = activateAndResolve(state, BATTLE_OX_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(2);
    expect(resolved.state.players.P1.mainDeck).toHaveLength(beforeDeckSize - 2);
    expect(resolved.state.players.P1.hand).toHaveLength(beforeHandSize + 1);
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ cardId: BATTLE_OX_ID });
  });

  it("pays a discard cost before drawing", () => {
    const state = stateWithScripts([
      createNormalSpellScript({
        cardId: BATTLE_OX_ID,
        costs: Object.freeze([{ kind: "discard", count: 1 }]),
        steps: Object.freeze([{ kind: "draw", player: "self", count: 1 }]),
      }),
    ]);
    const discard = requireHandCard(state, "P1", AQUA_MADOOR_ID);
    const resolved = activateAndResolve(state, BATTLE_OX_ID, { costInstanceIds: [discard.instanceId] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.some((event) => event.type === "cost-paid" && event.costKind === "discard")).toBe(true);
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === discard.instanceId)).toBe(true);
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(1);
  });

  it("destroys a targeted Spell or Trap card", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "spellTrapZone", index: 0 };
    const state = withFieldCards(
      stateWithScripts([
        createQuickPlaySpellScript({
          cardId: BATTLE_OX_ID,
          targets: Object.freeze([spellTrapTarget]),
          steps: Object.freeze([{ kind: "destroy-targets" }]),
        }),
      ]),
      {
        P2: {
          spellTrapZones: [zoneCard("p2-spell", POT_OF_GREED_ID, "P2", { position: null }), null, null, null, null],
        },
      },
    );
    const resolved = activateAndResolve(state, BATTLE_OX_ID, { targetRefs: [targetRef] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ instanceId: "p2-spell" });
    expect(resolved.events.some((event) => event.type === "card-destroyed" && event.reason === "effect")).toBe(true);
  });

  it("destroys all Spell and Trap cards on the field", () => {
    const state = withFieldCards(
      stateWithScripts([
        createNormalSpellScript({
          cardId: BATTLE_OX_ID,
          steps: Object.freeze([{ kind: "destroy-all-spells-traps", controller: "all" }]),
        }),
      ]),
      {
        P1: {
          spellTrapZones: [zoneCard("p1-trap", AQUA_MADOOR_ID, "P1", { position: null }), null, null, null, null],
          fieldZone: zoneCard("p1-field", BLUE_EYES_ID, "P1", { position: null }),
        },
        P2: {
          spellTrapZones: [zoneCard("p2-trap", LA_JINN_ID, "P2", { position: null }), null, null, null, null],
          fieldZone: zoneCard("p2-field", AXE_RAIDER_ID, "P2", { position: null }),
        },
      },
    );
    const resolved = activateAndResolve(state, BATTLE_OX_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.spellTrapZones.every((card) => card === null)).toBe(true);
    expect(resolved.state.players.P2.spellTrapZones.every((card) => card === null)).toBe(true);
    expect(resolved.state.players.P1.fieldZone).toBeNull();
    expect(resolved.state.players.P2.fieldZone).toBeNull();
    expect(resolved.events.filter((event) => event.type === "card-destroyed")).toHaveLength(4);
  });

  it("destroys a targeted monster", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "monsterZone", index: 0 };
    const state = withFieldCards(
      stateWithScripts([
        createNormalSpellScript({
          cardId: BATTLE_OX_ID,
          targets: Object.freeze([monsterTarget]),
          steps: Object.freeze([{ kind: "destroy-targets" }]),
        }),
      ]),
      {
        P2: {
          monsterZones: [zoneCard("p2-monster", BLUE_EYES_ID, "P2"), null, null, null, null],
        },
      },
    );
    const resolved = activateAndResolve(state, BATTLE_OX_ID, { targetRefs: [targetRef] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ instanceId: "p2-monster" });
  });

  it("changes a targeted monster battle position", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "monsterZone", index: 0 };
    const state = withFieldCards(
      stateWithScripts([
        createNormalSpellScript({
          cardId: BATTLE_OX_ID,
          targets: Object.freeze([monsterTarget]),
          steps: Object.freeze([{ kind: "change-position", position: "defense" }]),
        }),
      ]),
      {
        P2: {
          monsterZones: [zoneCard("p2-monster", BLUE_EYES_ID, "P2", { position: "attack" }), null, null, null, null],
        },
      },
    );
    const resolved = activateAndResolve(state, BATTLE_OX_ID, { targetRefs: [targetRef] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({ position: "defense" });
    expect(resolved.events.some((event) => event.type === "position-changed" && event.to === "defense")).toBe(true);
  });

  it("flips targeted monsters face-down or face-up", () => {
    const faceDownTarget: TargetSpec = { ...monsterTarget, face: "faceUp" };
    const faceUpTarget: TargetSpec = { ...monsterTarget, face: "faceDown" };
    const state = withFieldCards(
      stateWithScripts([
        createQuickPlaySpellScript({
          cardId: BATTLE_OX_ID,
          targets: Object.freeze([faceDownTarget]),
          steps: Object.freeze([{ kind: "set-face", face: "faceDown", position: "defense" }]),
        }),
        createNormalSpellScript({
          cardId: AQUA_MADOOR_ID,
          targets: Object.freeze([faceUpTarget]),
          steps: Object.freeze([{ kind: "set-face", face: "faceUp" }]),
        }),
      ]),
      {
        P2: {
          monsterZones: [zoneCard("p2-monster", BLUE_EYES_ID, "P2", { face: "faceUp", position: "attack" }), null, null, null, null],
        },
      },
    );
    const faceDown = activateAndResolve(state, BATTLE_OX_ID, {
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    }).state;
    const faceUp = activateAndResolve(faceDown, AQUA_MADOOR_ID, {
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });

    expect(faceDown.players.P2.monsterZones[0]).toMatchObject({
      face: "faceDown",
      position: "defense",
      visibility: "hidden",
    });
    expect(faceUp.errors).toEqual([]);
    expect(faceUp.state.players.P2.monsterZones[0]).toMatchObject({
      face: "faceUp",
      position: "defense",
      visibility: "public",
    });
  });

  it("returns a targeted card to its owner's hand", () => {
    const targetRef: ZoneRef = { playerId: "P2", zone: "monsterZone", index: 0 };
    const state = withFieldCards(
      stateWithScripts([
        createNormalSpellScript({
          cardId: BATTLE_OX_ID,
          targets: Object.freeze([monsterTarget]),
          steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
        }),
      ]),
      {
        P2: {
          monsterZones: [zoneCard("p2-monster", BLUE_EYES_ID, "P2"), null, null, null, null],
        },
      },
    );
    const beforeHandSize = state.players.P2.hand.length;
    const resolved = activateAndResolve(state, BATTLE_OX_ID, { targetRefs: [targetRef] });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.hand).toHaveLength(beforeHandSize + 1);
    expect(resolved.state.players.P2.hand.at(-1)).toMatchObject({ instanceId: "p2-monster" });
  });

  it("applies LP gain and burn damage steps", () => {
    const state = stateWithScripts([
      createNormalSpellScript({
        cardId: BATTLE_OX_ID,
        steps: Object.freeze([
          { kind: "lp-change", player: "self", amount: 500 },
          { kind: "lp-change", player: "opponent", amount: -800 },
        ]),
      }),
    ]);
    const resolved = activateAndResolve(state, BATTLE_OX_ID);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(8500);
    expect(resolved.state.players.P2.lp).toBe(7200);
    expect(resolved.events.filter((event) => event.type === "lp-changed")).toHaveLength(2);
  });

  it("creates Continuous Spell template scripts with an ignition activation that places the source and a continuous effect", () => {
    const script = createContinuousSpellScript({
      cardId: BATTLE_OX_ID,
      continuous: {
        statModifiers: [
          {
            stat: "atk",
            amount: 500,
            target: { controller: "own", face: "faceUp" },
          },
        ],
      },
    });

    expect(script).toMatchObject({
      cardId: BATTLE_OX_ID,
      effects: [
        {
          id: "activate",
          kind: "ignition",
          implemented: true,
          spellSpeed: 1,
          resolution: {
            sendSourceToGraveyard: false,
          },
        },
        {
          id: "continuous",
          kind: "continuous",
          implemented: true,
        },
      ],
    });
  });

  it("creates Field Spell template scripts that place the source in the Field Zone", () => {
    const script = createFieldSpellScript({
      cardId: BATTLE_OX_ID,
      continuous: {
        statModifiers: [
          {
            stat: "atk",
            amount: 300,
            target: { cardIds: [AQUA_MADOOR_ID], face: "faceUp" },
          },
        ],
      },
    });
    const state = withFieldCards(stateWithScripts([script]), {
      P1: {
        monsterZones: [zoneCard("p1-aqua", AQUA_MADOOR_ID, "P1"), null, null, null, null],
      },
      P2: {
        fieldZone: zoneCard("p2-field", POT_OF_GREED_ID, "P2", { position: null }),
      },
    });
    const resolved = activateAndResolve(state, BATTLE_OX_ID);
    const target = resolved.state.players.P1.monsterZones[0]!;

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.fieldZone).toMatchObject({ cardId: BATTLE_OX_ID, face: "faceUp", position: null });
    expect(resolved.state.players.P2.fieldZone).toBeNull();
    expect(resolved.state.players.P2.graveyard.some((card) => card.instanceId === "p2-field")).toBe(true);
    expect(deriveBattleStats(resolved.state, { playerId: "P1", card: target, base: { atk: 1200, def: 2000 } })).toEqual({
      atk: 1500,
      def: 2000,
    });
    expect(script.effects[0]).toMatchObject({
      resolution: {
        steps: [{ kind: "place-source-in-field-zone" }],
        sendSourceToGraveyard: false,
      },
    });
  });
});

function stateWithScripts(scripts: readonly CardScript[]): DuelState {
  const state = advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(uniqueIds([...scripts.map((script) => script.cardId), AQUA_MADOOR_ID])),
      P2: deckWithPriority([]),
    },
    seed: "spell-template-tests",
    shuffleDecks: false,
  }).state);

  return {
    ...state,
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function activateAndResolve(
  state: DuelState,
  cardId: string,
  options: {
    readonly costInstanceIds?: readonly string[];
    readonly targetRefs?: readonly ZoneRef[];
  } = {},
) {
  const source = requireHandCard(state, "P1", cardId);
  const activation = reduceDuel(state, {
    type: "activate-card",
    playerId: "P1",
    instanceId: source.instanceId,
    costInstanceIds: options.costInstanceIds,
    targetRefs: options.targetRefs,
  });

  expect(activation.errors).toEqual([]);

  const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

  return {
    ...resolved,
    events: [...activation.events, ...resolved.events],
  };
}

function withFieldCards(
  state: DuelState,
  patches: Partial<Record<"P1" | "P2", Partial<Pick<DuelState["players"]["P1"], "monsterZones" | "spellTrapZones" | "fieldZone">>>>,
): DuelState {
  return {
    ...state,
    players: {
      P1: {
        ...state.players.P1,
        ...patches.P1,
      },
      P2: {
        ...state.players.P2,
        ...patches.P2,
      },
    },
  };
}

function advanceToM1(state: DuelState): DuelState {
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
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
    ...overrides,
  };
}

function uniqueIds(cardIds: readonly string[]): string[] {
  return [...new Set(cardIds)];
}
