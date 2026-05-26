import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript, EffectResolutionStep } from "../cards/CardScript";
import { getCardCoverage } from "../cards/coverage";
import { CARD_SCRIPTS, createCardScriptRegistry, getCardScript } from "../cards/registry";
import {
  BLACK_ILLUSION_RITUAL_ID,
  BLACK_LUSTER_RITUAL_ID,
  BLACK_LUSTER_SOLDIER_ID,
  COMMENCEMENT_DANCE_ID,
  CONTRACT_WITH_THE_ABYSS_ID,
  CONTRACT_WITH_THE_DARK_MASTER_ID,
  CURSE_OF_THE_MASKED_BEAST_ID,
  DARK_MASTER_ZORC_ID,
  DOKURORIDER_ID,
  DORIADOS_BLESSING_ID,
  EARTH_CHANT_ID,
  ELEMENTAL_MISTRESS_DORIADO_ID,
  FINAL_RITUAL_OF_THE_ANCIENTS_ID,
  HAMBURGER_RECIPE_ID,
  HUNGRY_BURGER_ID,
  INCANDESCENT_ORDEAL_ID,
  LEGENDARY_FLAME_LORD_ID,
  NOVOXS_PRAYER_ID,
  PALADIN_OF_WHITE_DRAGON_ID,
  PERFORMANCE_OF_SWORD_ID,
  RELINQUISHED_ID,
  RESHEF_THE_DARK_BEING_ID,
  REVIVAL_OF_DOKURORIDER_ID,
  SHINATOS_ARK_ID,
  SHINATO_KING_OF_A_HIGHER_PLANE_ID,
  SKULL_GUARDIAN_ID,
  THE_MASKED_BEAST_ID,
  TURTLE_OATH_ID,
  CRAB_TURTLE_ID,
  WHITE_DRAGON_RITUAL_ID,
} from "../cards/scripts/spells";
import { isPlayableCard } from "../index";
import type { ZoneCard, ZoneRef } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";
import type { DeckList } from "../types";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";
const THOUSAND_EYES_IDOL_ID = "27125110";
const BLUE_EYES_ID = "89631139";

const RITUAL_SPELL_BATCH = [
  {
    taskId: "C-0147",
    sourceIndex: 146,
    passcode: BLACK_ILLUSION_RITUAL_ID,
    name: "Black Illusion Ritual",
    text: 'This card is used to Ritual Summon "Relinquished". You must also Tribute monsters from the field or your hand whose total Levels equal 1 or more.',
  },
  {
    taskId: "C-0148",
    sourceIndex: 147,
    passcode: BLACK_LUSTER_RITUAL_ID,
    name: "Black Luster Ritual",
    text: 'This card is used to Ritual Summon "Black Luster Soldier". You must also Tribute monsters from the field or your hand whose total Levels equal 8 or more.',
  },
  {
    taskId: "C-0257",
    sourceIndex: 256,
    passcode: COMMENCEMENT_DANCE_ID,
    name: "Commencement Dance",
    text: 'This card is used to Ritual Summoned "Performance of Sword". You must also offer monsters whose total Level Stars equal 6 or more from the Field or your hand as a Tribute.',
  },
  {
    taskId: "C-0262",
    sourceIndex: 261,
    passcode: CONTRACT_WITH_THE_ABYSS_ID,
    name: "Contract with the Abyss",
    text: "This card is used to Ritual Summon any DARK Ritual Monster. You must also Tribute monsters from the field or your hand whose total Levels equal the Level of the Ritual Monster you are Ritual Summoning.",
  },
  {
    taskId: "C-0263",
    sourceIndex: 262,
    passcode: CONTRACT_WITH_THE_DARK_MASTER_ID,
    name: "Contract with the Dark Master",
    text: 'This card is used to Ritual Summon "Dark Master - Zorc". You must also Tribute monsters whose total Levels equal 8 or more from the field or your hand.',
  },
  {
    taskId: "C-0286",
    sourceIndex: 285,
    passcode: CURSE_OF_THE_MASKED_BEAST_ID,
    name: "Curse of the Masked Beast",
    text: 'This card is used to Ritual Summon "The Masked Beast". You must also Tribute monsters whose total Level Stars equal 8 or more from the field or your hand.',
  },
  {
    taskId: "C-0416",
    sourceIndex: 415,
    passcode: DORIADOS_BLESSING_ID,
    name: "Doriado's Blessing",
    text: 'This card is used to Ritual Summon "Elemental Mistress Doriado". You must also Tribute monsters whose total Levels equal 3 or more from the field or your hand.',
  },
  {
    taskId: "C-0445",
    sourceIndex: 444,
    passcode: EARTH_CHANT_ID,
    name: "Earth Chant",
    text: "This card is used to Ritual Summon any EARTH Ritual Monster. You must also Tribute monsters from the field or your hand whose total Level equal the Level of the Ritual Monster you are attempting to Ritual Summon.",
  },
  {
    taskId: "C-0523",
    sourceIndex: 522,
    passcode: FINAL_RITUAL_OF_THE_ANCIENTS_ID,
    name: "Final Ritual of the Ancients",
    text: 'This card is used to Ritual Summon "Reshef the Dark Being". You must also Tribute monsters whose total Levels equal 8 or more from the field or your hand.',
  },
  {
    taskId: "C-0685",
    sourceIndex: 684,
    passcode: HAMBURGER_RECIPE_ID,
    name: "Hamburger Recipe",
    text: 'This card is used to Ritual Summoned "Hungry Burger". You must also offer monsters whose total Level Stars equal 6 or more from the Field or your hand as a Tribute.',
  },
  {
    taskId: "C-0747",
    sourceIndex: 746,
    passcode: INCANDESCENT_ORDEAL_ID,
    name: "Incandescent Ordeal",
    text: 'This card is used to Ritual Summon "Legendary Flame Lord". You must also Tribute monsters whose total Levels equal 7 or more from the field or your hand.',
  },
  {
    taskId: "C-1075",
    sourceIndex: 1074,
    passcode: NOVOXS_PRAYER_ID,
    name: "Novox's Prayer",
    text: 'This card is used to Ritual Summon "Skull Guardian". You must also offer monsters whose total Level Stars equal 7 or more as a Tribute from the field or your hand.',
  },
  {
    taskId: "C-1220",
    sourceIndex: 1219,
    passcode: REVIVAL_OF_DOKURORIDER_ID,
    name: "Revival of Dokurorider",
    text: 'This card is used to Ritual Summon "Dokurorider". You must also offer monsters whose total Level Stars equal 6 or more as a Tribute from the field or your hand.',
  },
  {
    taskId: "C-1309",
    sourceIndex: 1308,
    passcode: SHINATOS_ARK_ID,
    name: "Shinato's Ark",
    text: 'This card is used to Ritual Summon "Shinato, King of a Higher Plane". You must also Tribute monsters whose total Levels equal 8 or more from the field or your hand.',
  },
  {
    taskId: "C-1586",
    sourceIndex: 1585,
    passcode: TURTLE_OATH_ID,
    name: "Turtle Oath",
    text: 'This card is used to Ritual Summoned "Crab Turtle". You must also offer monsters whose total Level Stars equal 8 or more from the Field or your hand as a Tribute.',
  },
  {
    taskId: "C-1656",
    sourceIndex: 1655,
    passcode: WHITE_DRAGON_RITUAL_ID,
    name: "White Dragon Ritual",
    text: 'This card is used to Ritual Summon "Paladin of White Dragon". You must also Tribute monsters whose total Levels equal 4 or more from the field or your hand.',
  },
] as const;

const RITUAL_MONSTER_BATCH = [
  {
    taskId: "C-0149",
    sourceIndex: 148,
    passcode: BLACK_LUSTER_SOLDIER_ID,
    name: "Black Luster Soldier",
    text: 'This monster can only be Ritual Summoned with the Ritual Spell Card, "Black Luster Ritual".',
    monster: { level: 8, attribute: "EARTH", type: "Warrior", atk: 3000, def: 2500 },
  },
  {
    taskId: "C-0269",
    sourceIndex: 268,
    passcode: CRAB_TURTLE_ID,
    name: "Crab Turtle",
    text: 'This monster can only be Ritual Summoned with the Ritual Magic Card, "Turtle Oath". You must also offer monsters whose total Level Stars equal 8 or more as a Tribute form your Field or your hand.',
    monster: { level: 8, attribute: "WATER", type: "Aqua", atk: 2550, def: 2500 },
  },
  {
    taskId: "C-0410",
    sourceIndex: 409,
    passcode: DOKURORIDER_ID,
    name: "Dokurorider",
    text: 'This monster can only be Ritual Summoned with the Ritual Magic Card, "Revival of Dokurorider". You must also offer monsters whose total Level Stars equal 6 or more as a Tribute from the field or your hand.',
    monster: { level: 6, attribute: "DARK", type: "Zombie", atk: 1900, def: 1850 },
  },
  {
    taskId: "C-0736",
    sourceIndex: 735,
    passcode: HUNGRY_BURGER_ID,
    name: "Hungry Burger",
    text: 'This monster can only be Ritual Summoned with the Ritual Magic Card, "Hamburger Recipe". You must also offer monsters whose total Level Stars equal 6 or more as a Tribute form your Field or your hand.',
    monster: { level: 6, attribute: "DARK", type: "Warrior", atk: 2000, def: 1850 },
  },
  {
    taskId: "C-1127",
    sourceIndex: 1126,
    passcode: PERFORMANCE_OF_SWORD_ID,
    name: "Performance of Sword",
    text: 'This monster can only be Ritual Summoned with the Ritual Magic Card, "Commencement Dance". You must also offer monsters whose total Level Stars equal 6 or more as a Tribute form your Field or your hand.',
    monster: { level: 6, attribute: "EARTH", type: "Warrior", atk: 1950, def: 1850 },
  },
  {
    taskId: "C-1328",
    sourceIndex: 1327,
    passcode: SKULL_GUARDIAN_ID,
    name: "Skull Guardian",
    text: 'This monster can only be Ritual Summoned with the Ritual Magic Card, "Novox\'s Prayer". You must also offer monsters whose total Level Stars equal 7 or more as a Tribute from the field or your hand.',
    monster: { level: 7, attribute: "LIGHT", type: "Warrior", atk: 2050, def: 2500 },
  },
  {
    taskId: "C-1504",
    sourceIndex: 1503,
    passcode: THE_MASKED_BEAST_ID,
    name: "The Masked Beast",
    text: 'This monster can only be Ritual Summoned with the Ritual Spell Card, "Curse of the Masked Beast". You must also offer monsters whose total Level Stars equal 8 or more as a Tribute from the field or your hand.',
    monster: { level: 8, attribute: "DARK", type: "Fiend", atk: 3200, def: 1800 },
  },
] as const;

const FIXED_RITUAL_CASES = [
  { spellId: BLACK_ILLUSION_RITUAL_ID, monsterId: RELINQUISHED_ID },
  { spellId: BLACK_LUSTER_RITUAL_ID, monsterId: BLACK_LUSTER_SOLDIER_ID },
  { spellId: COMMENCEMENT_DANCE_ID, monsterId: PERFORMANCE_OF_SWORD_ID },
  { spellId: CONTRACT_WITH_THE_DARK_MASTER_ID, monsterId: DARK_MASTER_ZORC_ID },
  { spellId: CURSE_OF_THE_MASKED_BEAST_ID, monsterId: THE_MASKED_BEAST_ID },
  { spellId: DORIADOS_BLESSING_ID, monsterId: ELEMENTAL_MISTRESS_DORIADO_ID },
  { spellId: FINAL_RITUAL_OF_THE_ANCIENTS_ID, monsterId: RESHEF_THE_DARK_BEING_ID },
  { spellId: HAMBURGER_RECIPE_ID, monsterId: HUNGRY_BURGER_ID },
  { spellId: INCANDESCENT_ORDEAL_ID, monsterId: LEGENDARY_FLAME_LORD_ID },
  { spellId: NOVOXS_PRAYER_ID, monsterId: SKULL_GUARDIAN_ID },
  { spellId: REVIVAL_OF_DOKURORIDER_ID, monsterId: DOKURORIDER_ID },
  { spellId: SHINATOS_ARK_ID, monsterId: SHINATO_KING_OF_A_HIGHER_PLANE_ID },
  { spellId: TURTLE_OATH_ID, monsterId: CRAB_TURTLE_ID },
  { spellId: WHITE_DRAGON_RITUAL_ID, monsterId: PALADIN_OF_WHITE_DRAGON_ID },
] as const;

describe("Ritual Summon foundations", () => {
  it("verifies representative Ritual Spell and Ritual Monster source records", () => {
    const spell = cardRecord(BLACK_LUSTER_RITUAL_ID);
    const monster = cardRecord(BLACK_LUSTER_SOLDIER_ID);

    expect(cards.findIndex((card) => card.passcode === BLACK_LUSTER_RITUAL_ID)).toBe(147);
    expect(spell).toMatchObject({
      passcode: BLACK_LUSTER_RITUAL_ID,
      name: "Black Luster Ritual",
      category: "Spell",
      classifications: ["Ritual"],
      text: 'This card is used to Ritual Summon "Black Luster Soldier". You must also Tribute monsters from the field or your hand whose total Levels equal 8 or more.',
      legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
    });
    expect(monster).toMatchObject({
      passcode: BLACK_LUSTER_SOLDIER_ID,
      name: "Black Luster Soldier",
      category: "Monster",
      classifications: ["Ritual"],
      monster: { level: 8, attribute: "EARTH", type: "Warrior" },
      text: 'This monster can only be Ritual Summoned with the Ritual Spell Card, "Black Luster Ritual".',
      legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
    });
  });

  it("verifies production Ritual Spell batch source records and coverage statuses", () => {
    for (const expected of RITUAL_SPELL_BATCH) {
      const spell = cardRecord(expected.passcode);

      expect(cards.findIndex((card) => card.passcode === expected.passcode), expected.taskId).toBe(expected.sourceIndex);
      expect(spell).toMatchObject({
        passcode: expected.passcode,
        id: expected.passcode,
        name: expected.name,
        category: "Spell",
        classifications: ["Ritual"],
        text: expected.text,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(spell).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.passcode, cards)).toBe(true);
    }
  });

  it("verifies non-effect Ritual Monster batch source records, scripts, and coverage statuses", () => {
    for (const expected of RITUAL_MONSTER_BATCH) {
      const monster = cardRecord(expected.passcode);

      expect(cards.findIndex((card) => card.passcode === expected.passcode), expected.taskId).toBe(expected.sourceIndex);
      expect(monster).toMatchObject({
        passcode: expected.passcode,
        id: expected.passcode,
        name: expected.name,
        category: "Monster",
        classifications: ["Ritual"],
        text: expected.text,
        monster: expected.monster,
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(monster).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.passcode, cards)).toBe(true);
      expect(getCardScript(CARD_SCRIPTS, expected.passcode)).toMatchObject({
        cardId: expected.passcode,
        effects: [],
      });
    }
  });

  it.each(FIXED_RITUAL_CASES)("uses the production fixed Ritual Spell script for $spellId", ({ spellId, monsterId }) => {
    const state = productionRitualState([spellId, monsterId, BLUE_EYES_ID]);
    const ritualSpell = requireHandCard(state, spellId);
    const ritualMonster = requireHandCard(state, monsterId);
    const tribute = requireHandCard(state, BLUE_EYES_ID);
    const resolved = activateAndResolve(state, ritualSpell.instanceId, [
      refForHandCard(state, ritualMonster.instanceId),
      refForHandCard(state, tribute.instanceId),
    ]);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: monsterId,
      face: "faceUp",
      position: "attack",
    });
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === spellId)).toBe(true);
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === tribute.instanceId)).toBe(true);
  });

  it("uses the production Contract with the Abyss script for exact-level DARK Ritual Summons", () => {
    const state = productionRitualState([CONTRACT_WITH_THE_ABYSS_ID, RELINQUISHED_ID, THOUSAND_EYES_IDOL_ID]);
    const ritualSpell = requireHandCard(state, CONTRACT_WITH_THE_ABYSS_ID);
    const ritualMonster = requireHandCard(state, RELINQUISHED_ID);
    const tribute = requireHandCard(state, THOUSAND_EYES_IDOL_ID);
    const resolved = activateAndResolve(state, ritualSpell.instanceId, [
      refForHandCard(state, ritualMonster.instanceId),
      refForHandCard(state, tribute.instanceId),
    ]);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ cardId: RELINQUISHED_ID });
    expect(resolved.events.filter((event) => event.type === "card-moved" && event.reason === "ritual-tribute")).toHaveLength(1);
  });

  it("uses the production Earth Chant script for exact-level EARTH Ritual Summons", () => {
    const state = productionRitualState([EARTH_CHANT_ID, BLACK_LUSTER_SOLDIER_ID, BLUE_EYES_ID]);
    const ritualSpell = requireHandCard(state, EARTH_CHANT_ID);
    const ritualMonster = requireHandCard(state, BLACK_LUSTER_SOLDIER_ID);
    const tribute = requireHandCard(state, BLUE_EYES_ID);
    const resolved = activateAndResolve(state, ritualSpell.instanceId, [
      refForHandCard(state, ritualMonster.instanceId),
      refForHandCard(state, tribute.instanceId),
    ]);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ cardId: BLACK_LUSTER_SOLDIER_ID });
    expect(resolved.events.filter((event) => event.type === "card-moved" && event.reason === "ritual-summon")).toHaveLength(1);
  });

  it("Ritual Summons a linked monster from hand using hand and field Tribute levels", () => {
    const state = withMonsterOnField(
      ritualState(
        [ritualSpellScript(BLACK_LUSTER_RITUAL_ID, {
          kind: "ritual-summon",
          ritualMonsterCardIds: [BLACK_LUSTER_SOLDIER_ID],
          requiredLevel: 8,
        })],
        [BLACK_LUSTER_RITUAL_ID, BLACK_LUSTER_SOLDIER_ID, BATTLE_OX_ID, BATTLE_OX_ID],
      ),
      BATTLE_OX_ID,
    );
    const ritualSpell = requireHandCard(state, BLACK_LUSTER_RITUAL_ID);
    const ritualMonster = requireHandCard(state, BLACK_LUSTER_SOLDIER_ID);
    const handTribute = requireHandCard(state, BATTLE_OX_ID);
    const fieldTribute = state.players.P1.monsterZones[0]!;
    const resolved = activateAndResolve(state, ritualSpell.instanceId, [
      refForHandCard(state, ritualMonster.instanceId),
      refForHandCard(state, handTribute.instanceId),
      { playerId: "P1", zone: "monsterZone", index: 0 },
    ]);

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({
      cardId: BLACK_LUSTER_SOLDIER_ID,
      face: "faceUp",
      position: "attack",
    });
    expect(resolved.state.players.P1.graveyard).toEqual([
      expect.objectContaining({ cardId: BLACK_LUSTER_RITUAL_ID }),
      expect.objectContaining({ instanceId: fieldTribute.instanceId, cardId: BATTLE_OX_ID }),
      expect.objectContaining({ instanceId: handTribute.instanceId, cardId: BATTLE_OX_ID }),
    ]);
    expect(resolved.events.filter((event) => event.type === "card-moved").map((event) => event.reason)).toEqual([
      "ritual-tribute",
      "ritual-tribute",
      "ritual-summon",
      "effect-resolution",
    ]);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "summon-successful",
      cardId: BLACK_LUSTER_SOLDIER_ID,
      summonKind: "special",
    }));
    expect(resolved.state.priority.reason).toBe("chain-resolved");
  });

  it("rejects illegal Ritual Summons before building the chain", () => {
    const state = ritualState(
      [ritualSpellScript(BLACK_LUSTER_RITUAL_ID, {
        kind: "ritual-summon",
        ritualMonsterCardIds: [BLACK_LUSTER_SOLDIER_ID],
        requiredLevel: 8,
      })],
      [BLACK_LUSTER_RITUAL_ID, BLACK_LUSTER_SOLDIER_ID, BATTLE_OX_ID],
    );
    const ritualSpell = requireHandCard(state, BLACK_LUSTER_RITUAL_ID);
    const ritualMonster = requireHandCard(state, BLACK_LUSTER_SOLDIER_ID);
    const tribute = requireHandCard(state, BATTLE_OX_ID);
    const result = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: ritualSpell.instanceId,
      targetRefs: [refForHandCard(state, ritualMonster.instanceId), refForHandCard(state, tribute.instanceId)],
    });

    expect(result.errors[0]?.message).toBe("Ritual Tribute Levels must equal 8 or more.");
    expect(result.state.chain).toHaveLength(0);
  });

  it("enforces exact-level Attribute Ritual Spell requirements", () => {
    const highLevelState = ritualState(
      [ritualSpellScript(CONTRACT_WITH_THE_ABYSS_ID, {
        kind: "ritual-summon",
        ritualMonsterAttribute: "DARK",
        levelRequirement: "exact",
      })],
      [CONTRACT_WITH_THE_ABYSS_ID, RELINQUISHED_ID, BATTLE_OX_ID],
    );
    const highLevelSpell = requireHandCard(highLevelState, CONTRACT_WITH_THE_ABYSS_ID);
    const highLevelResult = reduceDuel(highLevelState, {
      type: "activate-card",
      playerId: "P1",
      instanceId: highLevelSpell.instanceId,
      targetRefs: [
        refForHandCard(highLevelState, requireHandCard(highLevelState, RELINQUISHED_ID).instanceId),
        refForHandCard(highLevelState, requireHandCard(highLevelState, BATTLE_OX_ID).instanceId),
      ],
    });

    expect(highLevelResult.errors[0]?.message).toBe("Ritual Tribute Levels must equal 1.");

    const exactState = ritualState(
      [ritualSpellScript(CONTRACT_WITH_THE_ABYSS_ID, {
        kind: "ritual-summon",
        ritualMonsterAttribute: "DARK",
        levelRequirement: "exact",
      })],
      [CONTRACT_WITH_THE_ABYSS_ID, RELINQUISHED_ID, THOUSAND_EYES_IDOL_ID],
    );
    const exactSpell = requireHandCard(exactState, CONTRACT_WITH_THE_ABYSS_ID);
    const exactResolved = activateAndResolve(exactState, exactSpell.instanceId, [
      refForHandCard(exactState, requireHandCard(exactState, RELINQUISHED_ID).instanceId),
      refForHandCard(exactState, requireHandCard(exactState, THOUSAND_EYES_IDOL_ID).instanceId),
    ]);

    expect(exactResolved.errors).toEqual([]);
    expect(exactResolved.state.players.P1.monsterZones[0]).toMatchObject({ cardId: RELINQUISHED_ID });
  });
});

function ritualSpellScript(cardId: string, step: EffectResolutionStep): CardScript {
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
            zones: ["hand", "monsterZone"],
            cardKinds: ["monster"],
            face: "any",
            min: 2,
            max: 12,
          },
        ],
        resolution: { steps: [step] },
      },
    ],
  };
}

function activateAndResolve(state: DuelState, sourceInstanceId: string, targetRefs: readonly ZoneRef[]) {
  const activated = reduceDuel(state, {
    type: "activate-card",
    playerId: "P1",
    instanceId: sourceInstanceId,
    targetRefs,
  });

  if (activated.errors.length > 0) {
    return activated;
  }

  return reduceDuel(activated.state, { type: "resolve-chain", playerId: "P1" });
}

function ritualState(scripts: readonly CardScript[], priorityIds: readonly string[]): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    allowUnsupportedCards: true,
    seed: `ritual-${priorityIds.join("-")}`,
    shuffleDecks: false,
  }).state;
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;
  const main = reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;

  return {
    ...main,
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function productionRitualState(priorityIds: readonly string[]): DuelState {
  const state = createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    allowUnsupportedCards: true,
    seed: `production-ritual-${priorityIds.join("-")}`,
    shuffleDecks: false,
  }).state;
  const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" }).state;

  return reduceDuel(standby, { type: "change-phase", playerId: "P1", phase: "M1" }).state;
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

function refForHandCard(state: DuelState, instanceId: string): ZoneRef {
  const index = state.players.P1.hand.findIndex((card) => card.instanceId === instanceId);

  if (index < 0) {
    throw new Error(`Expected instance ${instanceId} in P1 hand.`);
  }

  return { playerId: "P1", zone: "hand", index };
}

function cardRecord(passcode: string): CardRecord {
  const card = cards.find((candidate) => candidate.passcode === passcode);

  if (!card) {
    throw new Error(`Expected card ${passcode}.`);
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
