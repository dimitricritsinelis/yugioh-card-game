import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { getCardCoverage, isPlayableCard } from "../cards/coverage";
import type { CardScript } from "../cards/CardScript";
import {
  BOOK_OF_MOON_ID,
  FAIRY_METEOR_CRUSH_ID,
  SPIRITUALISM_ID,
  YELLOW_LUSTER_SHIELD_ID,
} from "../cards/scripts/spells";
import {
  ABSOLUTE_END_ID,
  A_FEINT_PLAN_ID,
  A_HERO_EMERGES_ID,
  ARMOR_BREAK_ID,
  CASTLE_WALLS_ID,
  CEMETARY_BOMB_ID,
  COMPULSORY_EVACUATION_DEVICE_ID,
  DD_DYNAMITE_ID,
  DESERT_SUNLIGHT_ID,
  DRAINING_SHIELD_ID,
  ENCHANTED_JAVELIN_ID,
  DRAGONS_RAGE_ID,
  FORCED_CEASEFIRE_ID,
  GIFT_OF_THE_MYSTICAL_ELF_ID,
  GRAVITY_BIND_ID,
  JAR_OF_GREED_ID,
  JUST_DESSERTS_ID,
  MAGIC_JAMMER_ID,
  METEORAIN_ID,
  MIRROR_FORCE_ID,
  NEEDLE_CEILING_ID,
  NEGATE_ATTACK_ID,
  PHOENIX_WING_WIND_BLAST_ID,
  RAIGEKI_BREAK_ID,
  REINFORCEMENTS_ID,
  RIRYOKU_FIELD_ID,
  ROYAL_SURRENDER_ID,
  SAKURETSU_ARMOR_ID,
  SEVEN_TOOLS_OF_THE_BANDIT_ID,
  SNAKE_FANG_ID,
  SOLAR_RAY_ID,
  SPELL_STOPPING_STATUTE_ID,
  THREATENING_ROAR_ID,
  TORRENTIAL_TRIBUTE_ID,
  TRAP_JAMMER_ID,
  WINDSTORM_OF_ETAQUA_ID,
  ZERO_GRAVITY_ID,
} from "../cards/scripts/traps";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { validateDeck } from "../deckValidation";
import { deriveBattleStats } from "../effects/continuous";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const WABOKU_ID = "12607053";
const BATTLE_OX_ID = "05053103";
const BLUE_EYES_ID = "89631139";
const POT_OF_GREED_ID = "55144522";

const NORMAL_TRAP_TEMP_STAT_CASES = [
  {
    taskId: "C-0211",
    sourceIndex: 210,
    trapId: CASTLE_WALLS_ID,
    name: "Castle Walls",
    text: "Increase the DEF of 1 face-up monster on the field by 500 points until the end of this turn.",
    stat: "def",
    amount: 500,
  },
  {
    taskId: "C-1205",
    sourceIndex: 1204,
    trapId: REINFORCEMENTS_ID,
    name: "Reinforcements",
    text: "Increase the ATK of 1 face-up monster on the field by 500 points until the end of this turn.",
    stat: "atk",
    amount: 500,
  },
  {
    taskId: "C-1345",
    sourceIndex: 1344,
    trapId: SNAKE_FANG_ID,
    name: "Snake Fang",
    text: "Decrease 1 selected monster's DEF by 500 during the turn this card is activated.",
    stat: "def",
    amount: -500,
  },
] as const;

const NORMAL_TRAP_COUNT_BURN_CASES = [
  {
    taskId: "C-0219",
    sourceIndex: 218,
    trapId: CEMETARY_BOMB_ID,
    name: "Cemetary Bomb",
    text: "Inflict 100 points of damage to your opponent's Life Points for each card in their GY.",
    amountPer: 100,
    expectedCount: 2,
    setup: "opponent-graveyard",
  },
  {
    taskId: "C-0302",
    sourceIndex: 301,
    trapId: DD_DYNAMITE_ID,
    name: "D.D. Dynamite",
    text: "Inflict 300 damage to your opponent for each of their removed from play cards.",
    amountPer: 300,
    expectedCount: 2,
    setup: "opponent-banished",
  },
  {
    taskId: "C-0788",
    sourceIndex: 787,
    trapId: JUST_DESSERTS_ID,
    name: "Just Desserts",
    text: "Inflict 500 points of damage to your opponent's Life Points for each monster on your opponent's side of the field.",
    amountPer: 500,
    expectedCount: 2,
    setup: "opponent-monsters",
  },
  {
    taskId: "C-1349",
    sourceIndex: 1348,
    trapId: SOLAR_RAY_ID,
    name: "Solar Ray",
    text: "Inflict 600 points of damage to your opponent's Life Points for each face-up LIGHT monster on your side of the field.",
    amountPer: 600,
    expectedCount: 1,
    setup: "own-light-monsters",
  },
] as const;

const GIFT_OF_THE_MYSTICAL_ELF_CASE = {
  taskId: "C-0602",
  sourceIndex: 601,
  trapId: GIFT_OF_THE_MYSTICAL_ELF_ID,
  name: "Gift of The Mystical Elf",
  text: "Increase your Life Points by 300 points for each monster on the field.",
  expectedCount: 3,
} as const;

describe("supported Trap card scripts", () => {
  it("keeps Phoenix Wing Wind Blast and Threatening Roar aligned with the canonical source records", () => {
    const expectedRecords = [
      {
        sourceIndex: 428,
        cardId: DRAGONS_RAGE_ID,
        name: "Dragon's Rage",
        text: "When a Dragon-Type monster on your side of the field attacks with an ATK that is higher than the DEF of a Defense Position monster, inflict the difference as battle damage to your opponent's Life Points.",
        coverage: "goatTemplate",
        classifications: ["Continuous"],
        icon: "Continuous",
      },
      {
        sourceIndex: 431,
        cardId: DRAINING_SHIELD_ID,
        name: "Draining Shield",
        text: "When an opponent's monster declares an attack: Target the attacking monster; negate that attack, and if you do, gain Life Points equal to that target's ATK.",
        coverage: "goatTemplate",
        classifications: ["Normal"],
        icon: "Normal",
      },
      {
        sourceIndex: 480,
        cardId: ENCHANTED_JAVELIN_ID,
        name: "Enchanted Javelin",
        text: "Increase your Life Points by the ATK of 1 attacking monster.",
        coverage: "goatTemplate",
        classifications: ["Normal"],
        icon: "Normal",
      },
      {
        sourceIndex: 545,
        cardId: FORCED_CEASEFIRE_ID,
        name: "Forced Ceasefire",
        text: "Discard 1 card from your hand. No Trap Cards can be activated until the End Phase of this turn.",
        coverage: "goatCustom",
        classifications: ["Normal"],
        icon: "Normal",
      },
      {
        sourceIndex: 966,
        cardId: METEORAIN_ID,
        name: "Meteorain",
        text: "During this turn, when your monsters attack with an ATK that is higher than the DEF of your opponent's Defense Position monster, inflict the difference as Battle Damage to your opponent's Life Points.",
        coverage: "goatCustom",
        classifications: ["Normal"],
        icon: "Normal",
      },
      {
        sourceIndex: 1047,
        cardId: NEEDLE_CEILING_ID,
        name: "Needle Ceiling",
        text: "Activate only when there are 4 or more monsters on the field. Destroy all face-up monsters.",
        coverage: "goatTemplate",
        classifications: ["Normal"],
        icon: "Normal",
      },
      {
        sourceIndex: 1134,
        cardId: PHOENIX_WING_WIND_BLAST_ID,
        name: "Phoenix Wing Wind Blast",
        text: "Discard 1 card to target 1 card your opponent controls; return that target to the top of the Deck.",
        coverage: "goatTemplate",
        classifications: ["Normal"],
        icon: "Normal",
      },
      {
        sourceIndex: 1533,
        cardId: THREATENING_ROAR_ID,
        name: "Threatening Roar",
        text: "Your opponent cannot declare an attack this turn.",
        coverage: "goatCustom",
        classifications: ["Normal"],
        icon: "Normal",
      },
    ] as const;

    for (const expected of expectedRecords) {
      const card = cards[expected.sourceIndex];

      expect(card).toMatchObject({
        id: expected.cardId,
        passcode: expected.cardId,
        name: expected.name,
        category: "Trap",
        classifications: expected.classifications,
        text: expected.text,
        spell_trap: { icon: expected.icon },
        legality: {
          goat_world_pool: true,
          restriction: "Unlimited",
          max_copies: 3,
        },
      });
      expect(cardById(expected.cardId)).toBe(card);
      expect(getCardCoverage(card).status).toBe(expected.coverage ?? "goatCustom");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("verifies Normal Trap temporary stat modifier source records and coverage statuses", () => {
    for (const expected of NORMAL_TRAP_TEMP_STAT_CASES) {
      const trap = cardById(expected.trapId);

      expect(cards.findIndex((card) => card.passcode === expected.trapId), expected.taskId).toBe(expected.sourceIndex);
      expect(trap).toMatchObject({
        passcode: expected.trapId,
        id: expected.trapId,
        name: expected.name,
        category: "Trap",
        classifications: ["Normal"],
        text: expected.text,
        spell_trap: { icon: "Normal" },
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(trap).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.trapId, cards)).toBe(true);
    }
  });

  it.each(NORMAL_TRAP_TEMP_STAT_CASES)("supports $name applying an until-End-Phase stat modifier", (testCase) => {
    const base = advanceToM1(stateWithPriority([BATTLE_OX_ID], [testCase.trapId]));
    const state = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [zoneCard("p1-temp-stat-target", BATTLE_OX_ID, "P1"), null, null, null, null],
        },
        P2: {
          ...base.players.P2,
          spellTrapZones: [
            zoneCard("p2-temp-stat-trap", testCase.trapId, "P2", {
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
      },
    };
    const passed = reduceDuel(state, { type: "pass-priority", playerId: "P1" });
    const trap = passed.state.players.P2.spellTrapZones[0]!;
    const activated = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: trap.instanceId,
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const opponentPassed = reduceDuel(activated.state, { type: "pass-priority", playerId: "P2" });
    const turnPassed = reduceDuel(opponentPassed.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPassed.state, { type: "resolve-chain", playerId: "P1" });
    const target = resolved.state.players.P1.monsterZones[0]!;
    const baseStats = monsterBaseStats(BATTLE_OX_ID);
    const modified = deriveBattleStats(resolved.state, { playerId: "P1", card: target, base: baseStats });

    expect(activated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: testCase.trapId });
    expect(modified).toEqual({
      atk: baseStats.atk + (testCase.stat === "atk" ? testCase.amount : 0),
      def: baseStats.def + (testCase.stat === "def" ? testCase.amount : 0),
    });
  });

  it("verifies Normal Trap count-scaled burn source records and coverage statuses", () => {
    for (const expected of [...NORMAL_TRAP_COUNT_BURN_CASES, GIFT_OF_THE_MYSTICAL_ELF_CASE]) {
      const trap = cardById(expected.trapId);

      expect(cards.findIndex((card) => card.passcode === expected.trapId), expected.taskId).toBe(expected.sourceIndex);
      expect(trap).toMatchObject({
        passcode: expected.trapId,
        id: expected.trapId,
        name: expected.name,
        category: "Trap",
        classifications: ["Normal"],
        text: expected.text,
        spell_trap: { icon: "Normal" },
        legality: { goat_world_pool: true, restriction: "Unlimited", max_copies: 3 },
      });
      expect(getCardCoverage(trap).status).toBe("goatTemplate");
      expect(isPlayableCard(expected.trapId, cards)).toBe(true);
    }
  });

  it.each(NORMAL_TRAP_COUNT_BURN_CASES)("supports $name damaging by the scripted count source", (testCase) => {
    const base = advanceToM1(stateWithPriority([BATTLE_OX_ID, BLUE_EYES_ID], [testCase.trapId, BLUE_EYES_ID]));
    const state = withCountBurnFixture(withOpponentTrap(base, testCase.trapId), testCase.setup);
    const passed = reduceDuel(state, { type: "pass-priority", playerId: "P1" });
    const trap = passed.state.players.P2.spellTrapZones[0]!;
    const activated = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: trap.instanceId,
    });
    const opponentPassed = reduceDuel(activated.state, { type: "pass-priority", playerId: "P2" });
    const turnPassed = reduceDuel(opponentPassed.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPassed.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(8000 - testCase.expectedCount * testCase.amountPer);
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: testCase.trapId });
  });

  it("supports Needle Ceiling destroying all face-up monsters when 4 or more monsters are on the field", () => {
    const base = advanceToM1(stateWithPriority([BATTLE_OX_ID, BLUE_EYES_ID], [NEEDLE_CEILING_ID, BLUE_EYES_ID]));
    const state = {
      ...withOpponentTrap(base, NEEDLE_CEILING_ID),
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [
            zoneCard("p1-needle-face-up-a", BATTLE_OX_ID, "P1"),
            zoneCard("p1-needle-face-down", BLUE_EYES_ID, "P1", { face: "faceDown", position: "defense", visibility: "hidden" }),
            null,
            null,
            null,
          ],
        },
        P2: {
          ...withOpponentTrap(base, NEEDLE_CEILING_ID).players.P2,
          monsterZones: [
            zoneCard("p2-needle-face-up-a", BLUE_EYES_ID, "P2"),
            zoneCard("p2-needle-face-up-b", BATTLE_OX_ID, "P2"),
            null,
            null,
            null,
          ],
        },
      },
    };
    const passed = reduceDuel(state, { type: "pass-priority", playerId: "P1" });
    const trap = passed.state.players.P2.spellTrapZones[0]!;
    const activated = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: trap.instanceId,
    });
    const opponentPassed = reduceDuel(activated.state, { type: "pass-priority", playerId: "P2" });
    const turnPassed = reduceDuel(opponentPassed.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPassed.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(NEEDLE_CEILING_ID)).status).toBe("goatTemplate");
    expect(activated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.monsterZones[1]).toMatchObject({ instanceId: "p1-needle-face-down", face: "faceDown" });
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P2.graveyard).toContainEqual(expect.objectContaining({ cardId: NEEDLE_CEILING_ID }));
  });

  it("rejects Needle Ceiling while fewer than 4 monsters are on the field", () => {
    const base = advanceToM1(stateWithPriority([BATTLE_OX_ID], [NEEDLE_CEILING_ID, BLUE_EYES_ID]));
    const state = {
      ...withOpponentTrap(base, NEEDLE_CEILING_ID),
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [zoneCard("p1-needle-only", BATTLE_OX_ID, "P1"), null, null, null, null],
        },
        P2: withOpponentTrap(base, NEEDLE_CEILING_ID).players.P2,
      },
    };
    const passed = reduceDuel(state, { type: "pass-priority", playerId: "P1" });
    const trap = passed.state.players.P2.spellTrapZones[0]!;
    const activated = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: trap.instanceId,
    });

    expect(activated.errors[0]?.message).toBe("That effect cannot be activated right now.");
    expect(activated.state.chain).toHaveLength(0);
  });

  it("supports Gift of The Mystical Elf gaining LP by all monsters on the field", () => {
    const base = advanceToM1(stateWithPriority([BATTLE_OX_ID, BLUE_EYES_ID], [GIFT_OF_THE_MYSTICAL_ELF_ID, BLUE_EYES_ID]));
    const state = {
      ...withOpponentTrap(base, GIFT_OF_THE_MYSTICAL_ELF_ID),
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [
            zoneCard("p1-gift-monster-a", BATTLE_OX_ID, "P1"),
            zoneCard("p1-gift-monster-b", BLUE_EYES_ID, "P1"),
            null,
            null,
            null,
          ],
        },
        P2: {
          ...withOpponentTrap(base, GIFT_OF_THE_MYSTICAL_ELF_ID).players.P2,
          monsterZones: [zoneCard("p2-gift-monster", BLUE_EYES_ID, "P2"), null, null, null, null],
        },
      },
    };
    const passed = reduceDuel(state, { type: "pass-priority", playerId: "P1" });
    const trap = passed.state.players.P2.spellTrapZones[0]!;
    const activated = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: trap.instanceId,
    });
    const opponentPassed = reduceDuel(activated.state, { type: "pass-priority", playerId: "P2" });
    const turnPassed = reduceDuel(opponentPassed.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPassed.state, { type: "resolve-chain", playerId: "P1" });

    expect(activated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(8000 + GIFT_OF_THE_MYSTICAL_ELF_CASE.expectedCount * 300);
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: GIFT_OF_THE_MYSTICAL_ELF_ID });
  });

  it("keeps activation-negating Counter Traps aligned with the canonical source records", () => {
    const expectedRecords = [
      {
        sourceIndex: 77,
        cardId: ARMOR_BREAK_ID,
        name: "Armor Break",
        text: "Negate the activation of an Equip Spell card and destroy it.",
      },
      {
        sourceIndex: 892,
        cardId: MAGIC_JAMMER_ID,
        name: "Magic Jammer",
        text: "When a Spell Card is activated: Discard 1 card; negate the activation, and if you do, destroy it.",
      },
      {
        sourceIndex: 1251,
        cardId: ROYAL_SURRENDER_ID,
        name: "Royal Surrender",
        text: "You can only activate this card when your opponent activates a Continuous Trap Card. Negate the activation and the effect of the card and destroy it.",
      },
      {
        sourceIndex: 1225,
        cardId: RIRYOKU_FIELD_ID,
        name: "Riryoku Field",
        text: "Negate the activation of a Spell Card that targets 1 monster on the field and destroy the Spell Card.",
      },
      {
        sourceIndex: 1296,
        cardId: SEVEN_TOOLS_OF_THE_BANDIT_ID,
        name: "Seven Tools of the Bandit",
        text: "When a Trap Card is activated: Pay 1000 Life Points; negate the activation, and destroy it.",
      },
      {
        sourceIndex: 1383,
        cardId: SPELL_STOPPING_STATUTE_ID,
        name: "Spell-Stopping Statute",
        text: "You can only activate this card when your opponent activates a Continuous Spell Card. Negate the activation and the effect of the card and destroy it.",
      },
      {
        sourceIndex: 1569,
        cardId: TRAP_JAMMER_ID,
        name: "Trap Jammer",
        text: "When your opponent activates a Trap Card during the Battle Phase: Negate the activation, and if you do, destroy it.",
      },
    ] as const;

    for (const expected of expectedRecords) {
      const card = cards[expected.sourceIndex];

      expect(card).toMatchObject({
        id: expected.cardId,
        passcode: expected.cardId,
        name: expected.name,
        category: "Trap",
        classifications: ["Counter"],
        text: expected.text,
        spell_trap: { icon: "Counter" },
        legality: {
          goat_world_pool: true,
          restriction: "Unlimited",
          max_copies: 3,
        },
      });
      expect(cardById(expected.cardId)).toBe(card);
      expect(getCardCoverage(card).status).toBe("goatCustom");
      expect(isPlayableCard(expected.cardId, cards)).toBe(true);
    }
  });

  it("supports Mirror Force responding to an opponent attack", () => {
    const state = battleStateWithOpponentTrap(MIRROR_FORCE_ID, BATTLE_OX_ID);
    const attack = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(MIRROR_FORCE_ID)).status).toBe("goatTemplate");
    expect(attack.state.chain[0]).toMatchObject({ playerId: "P2", cardId: MIRROR_FORCE_ID });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ instanceId: "p1-attacker" });
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: MIRROR_FORCE_ID });
  });

  it("supports Sakuretsu Armor destroying the attacking monster", () => {
    const state = battleStateWithOpponentTrap(SAKURETSU_ARMOR_ID, BLUE_EYES_ID);
    const attack = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(attack.state.players.P2.lp).toBe(8000);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.lp).toBe(8000);
  });

  it("supports Draining Shield negating an attack and gaining LP equal to the attacker ATK", () => {
    const state = battleStateWithOpponentTrap(DRAINING_SHIELD_ID, BLUE_EYES_ID);
    const attack = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(DRAINING_SHIELD_ID)).status).toBe("goatTemplate");
    expect(attack.state.chain[0]).toMatchObject({ playerId: "P2", cardId: DRAINING_SHIELD_ID });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.pendingAttack).toBeNull();
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: "p1-attacker" });
    expect(resolved.state.players.P2.lp).toBe(11000);
  });

  it("supports Enchanted Javelin gaining LP equal to an attacking monster's ATK", () => {
    const base = battleStateWithOpponentTrap(ENCHANTED_JAVELIN_ID, BATTLE_OX_ID, 0, [BLUE_EYES_ID]);
    const state: DuelState = {
      ...base,
      players: {
        ...base.players,
        P2: {
          ...base.players.P2,
          monsterZones: [zoneCard("p2-defender", BLUE_EYES_ID, "P2"), null, null, null, null],
        },
      },
    };
    const attack = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(ENCHANTED_JAVELIN_ID)).status).toBe("goatTemplate");
    expect(attack.state.chain[0]).toMatchObject({ playerId: "P2", cardId: ENCHANTED_JAVELIN_ID });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.pendingAttack).toBeNull();
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: "p2-defender" });
    expect(resolved.state.players.P2.lp).toBe(9700);
  });

  it("supports Torrential Tribute responding to a successful summon", () => {
    const base = advanceToM1(stateWithPriority([BATTLE_OX_ID], [TORRENTIAL_TRIBUTE_ID]));
    const trapState = withOpponentTrap(base, TORRENTIAL_TRIBUTE_ID);
    const monster = requireHandCard(trapState, "P1", BATTLE_OX_ID);
    const summon = reduceDuel(trapState, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: monster.instanceId,
      zoneIndex: 0,
    });
    const resolved = reduceDuel(summon.state, { type: "resolve-chain", playerId: "P1" });

    expect(summon.state.chain[0]).toMatchObject({ playerId: "P2", cardId: TORRENTIAL_TRIBUTE_ID });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ instanceId: monster.instanceId });
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: TORRENTIAL_TRIBUTE_ID });
  });

  it("enforces the Trap set-turn timing lock for supported Traps", () => {
    const state = battleStateWithOpponentTrap(MIRROR_FORCE_ID, BATTLE_OX_ID, 1);
    const result = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });

    expect(result.errors).toEqual([]);
    expect(result.state.chain).toEqual([]);
    expect(result.state.players.P2.lp).toBe(6300);
  });

  it("supports Jar of Greed activated from a face-down Set position to draw one card", () => {
    const base = advanceToM1(stateWithPriority([], [JAR_OF_GREED_ID]));
    const trapState = withOpponentTrap(base, JAR_OF_GREED_ID);
    const passed = reduceDuel(trapState, { type: "pass-priority", playerId: "P1" });
    const trap = passed.state.players.P2.spellTrapZones[0]!;
    const activate = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: trap.instanceId,
    });
    const opponentPassed = reduceDuel(activate.state, { type: "pass-priority", playerId: "P2" });
    const turnPassed = reduceDuel(opponentPassed.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPassed.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(JAR_OF_GREED_ID)).status).toBe("goatTemplate");
    expect(activate.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(1);
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: JAR_OF_GREED_ID });
  });

  it("supports Compulsory Evacuation Device returning a target monster to the hand from a face-down Set position", () => {
    const base = advanceToBattlePhase(stateWithPriority([BATTLE_OX_ID], [COMPULSORY_EVACUATION_DEVICE_ID]));
    const withMonsterAndTrap: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [zoneCard("p1-attacker", BATTLE_OX_ID, "P1"), null, null, null, null],
        },
        P2: {
          ...base.players.P2,
          spellTrapZones: [
            zoneCard("p2-trap", COMPULSORY_EVACUATION_DEVICE_ID, "P2", {
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
      },
    };
    const passed = reduceDuel(withMonsterAndTrap, { type: "pass-priority", playerId: "P1" });
    const trap = passed.state.players.P2.spellTrapZones[0]!;
    const activate = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: trap.instanceId,
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const opponentPassed = reduceDuel(activate.state, { type: "pass-priority", playerId: "P2" });
    const turnPassed = reduceDuel(opponentPassed.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPassed.state, { type: "resolve-chain", playerId: "P1" });

    expect(activate.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.hand.some((card) => card.instanceId === "p1-attacker")).toBe(true);
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: COMPULSORY_EVACUATION_DEVICE_ID });
  });

  it("supports Gravity Bind blocking attack declarations from Level 4 or higher monsters on either side of the field", () => {
    const ARMORED_ZOMBIE_ID = "20277860";
    const base = advanceToBattlePhase(stateWithPriority([BLUE_EYES_ID, ARMORED_ZOMBIE_ID], [GRAVITY_BIND_ID]));
    const stateWithMonsters: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [
            zoneCard("p1-low", ARMORED_ZOMBIE_ID, "P1"),
            zoneCard("p1-high", BLUE_EYES_ID, "P1"),
            null,
            null,
            null,
          ],
        },
        P2: {
          ...base.players.P2,
          spellTrapZones: [
            zoneCard("p2-gravity", GRAVITY_BIND_ID, "P2", {
              face: "faceUp",
              position: null,
              visibility: "public",
            }),
            null,
            null,
            null,
            null,
          ],
        },
      },
    };
    const blockedAttack = reduceDuel(stateWithMonsters, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-high",
    });
    const allowedAttack = reduceDuel(stateWithMonsters, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-low",
    });

    expect(blockedAttack.errors[0]).toMatchObject({
      code: "illegal-action",
      message: "Level 4 or higher monsters cannot attack while Gravity Bind is face-up.",
    });
    expect(allowedAttack.errors).toEqual([]);
  });

  it("supports Dragon's Rage granting piercing battle damage to the controller's Dragon monsters", () => {
    const base = advanceToBattlePhase(stateWithPriority([DRAGONS_RAGE_ID, BLUE_EYES_ID], [BATTLE_OX_ID]));
    const stateWithTrapAndMonsters: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [zoneCard("p1-dragon", BLUE_EYES_ID, "P1"), null, null, null, null],
          spellTrapZones: [
            zoneCard("p1-rage", DRAGONS_RAGE_ID, "P1", { face: "faceUp", position: null, visibility: "public" }),
            null,
            null,
            null,
            null,
          ],
        },
        P2: {
          ...base.players.P2,
          monsterZones: [zoneCard("p2-defender", BATTLE_OX_ID, "P2", { position: "defense" }), null, null, null, null],
        },
      },
    };
    const battle = reduceDuel(stateWithTrapAndMonsters, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-dragon",
      defenderInstanceId: "p2-defender",
    });

    expect(getCardCoverage(cardById(DRAGONS_RAGE_ID)).status).toBe("goatTemplate");
    expect(battle.errors).toEqual([]);
    expect(battle.events).toContainEqual(expect.objectContaining({
      type: "battle-damage",
      playerId: "P2",
      amount: 2000,
    }));
    expect(battle.state.players.P2.lp).toBe(6000);
  });

  it("supports Meteorain granting piercing battle damage to the controller's monsters for the turn", () => {
    const base = advanceToM1(stateWithPriority([METEORAIN_ID, BATTLE_OX_ID], [BATTLE_OX_ID]));
    const stateWithTrapAndMonsters: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [zoneCard("p1-attacker", BATTLE_OX_ID, "P1"), null, null, null, null],
          spellTrapZones: [
            zoneCard("p1-meteorain", METEORAIN_ID, "P1", {
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
          ...base.players.P2,
          monsterZones: [zoneCard("p2-defender", BATTLE_OX_ID, "P2", { position: "defense" }), null, null, null, null],
        },
      },
    };
    const activate = reduceDuel(stateWithTrapAndMonsters, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-meteorain",
    });
    const resolved = reduceDuel(activate.state, { type: "resolve-chain", playerId: "P1" });
    const battlePhase = reduceDuel(resolved.state, { type: "change-phase", playerId: "P1", phase: "BP" });
    const battle = reduceDuel(battlePhase.state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });
    const main2 = reduceDuel(battle.state, { type: "change-phase", playerId: "P1", phase: "M2" });
    const endPhase = reduceDuel(main2.state, { type: "change-phase", playerId: "P1", phase: "EP" });

    expect(getCardCoverage(cardById(METEORAIN_ID)).status).toBe("goatCustom");
    expect(activate.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(battle.events).toContainEqual(expect.objectContaining({
      type: "battle-damage",
      playerId: "P2",
      amount: 700,
    }));
    expect(battle.state.players.P2.lp).toBe(7300);
    expect(endPhase.state.lingeringEffects).toEqual([]);
  });

  it("supports A Feint Plan preventing attacks on face-down monsters until the End Phase", () => {
    const base = advanceToBattlePhase(stateWithPriority([BATTLE_OX_ID], [A_FEINT_PLAN_ID, BLUE_EYES_ID, BATTLE_OX_ID]));
    const stateWithTrapAndTargets: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [zoneCard("p1-attacker", BATTLE_OX_ID, "P1"), null, null, null, null],
        },
        P2: {
          ...base.players.P2,
          monsterZones: [
            zoneCard("p2-set", BLUE_EYES_ID, "P2", { face: "faceDown", position: "defense", visibility: "hidden" }),
            zoneCard("p2-face-up", BLUE_EYES_ID, "P2", { face: "faceUp", position: "attack", visibility: "public" }),
            null,
            null,
            null,
          ],
          spellTrapZones: [
            zoneCard("p2-feint", A_FEINT_PLAN_ID, "P2", {
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
      },
    };
    const priorityPassed = reduceDuel(stateWithTrapAndTargets, { type: "pass-priority", playerId: "P1" });
    const trap = priorityPassed.state.players.P2.spellTrapZones[0]!;
    const activate = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: trap.instanceId,
    });
    const opponentPassed = reduceDuel(activate.state, { type: "pass-priority", playerId: "P2" });
    const turnPassed = reduceDuel(opponentPassed.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPassed.state, { type: "resolve-chain", playerId: "P1" });
    const blockedAttack = reduceDuel(resolved.state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-set",
    });
    const allowedAttack = reduceDuel(resolved.state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-face-up",
    });
    const battle = reduceDuel(resolved.state, { type: "change-phase", playerId: "P1", phase: "BP" });
    const main2 = reduceDuel(battle.state, { type: "change-phase", playerId: "P1", phase: "M2" });
    const endPhase = reduceDuel(main2.state, { type: "change-phase", playerId: "P1", phase: "EP" });

    expect(getCardCoverage(cardById(A_FEINT_PLAN_ID)).status).toBe("goatCustom");
    expect(activate.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.lingeringEffects).toHaveLength(1);
    expect(blockedAttack.errors[0]).toMatchObject({
      code: "illegal-action",
      message: "A Feint Plan prevents attacks on face-down monsters this turn.",
    });
    expect(allowedAttack.errors).toEqual([]);
    expect(endPhase.state.lingeringEffects).toEqual([]);
  });

  it("supports A Hero Emerges Special Summoning the random monster selected from the controller's hand", () => {
    const base = battleStateWithOpponentTrap(A_HERO_EMERGES_ID, BATTLE_OX_ID, 0, [BATTLE_OX_ID, BLUE_EYES_ID]);
    const handMonster = requireHandCard(base, "P2", BATTLE_OX_ID);
    const stateWithKnownHand: DuelState = {
      ...base,
      players: {
        ...base.players,
        P2: {
          ...base.players.P2,
          hand: [handMonster],
          monsterZones: [zoneCard("p2-defender", BLUE_EYES_ID, "P2"), null, null, null, null],
        },
      },
    };
    const attack = reduceDuel(stateWithKnownHand, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(getCardCoverage(cardById(A_HERO_EMERGES_ID)).status).toBe("goatTemplate");
    expect(attack.state.chain[0]).toMatchObject({ playerId: "P2", cardId: A_HERO_EMERGES_ID });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.hand).toEqual([]);
    expect(resolved.state.players.P2.monsterZones.some((card) => card?.instanceId === handMonster.instanceId)).toBe(true);
    expect(resolved.events.some((event) => event.type === "summon-successful" && event.instanceId === handMonster.instanceId)).toBe(true);
    expect(resolved.state.players.P2.graveyard.some((card) => card.cardId === A_HERO_EMERGES_ID)).toBe(true);
  });

  it("supports A Hero Emerges sending the random non-monster selected from hand to the Graveyard", () => {
    const base = battleStateWithOpponentTrap(A_HERO_EMERGES_ID, BATTLE_OX_ID, 0, [POT_OF_GREED_ID, BLUE_EYES_ID]);
    const handSpell = requireHandCard(base, "P2", POT_OF_GREED_ID);
    const stateWithKnownHand: DuelState = {
      ...base,
      players: {
        ...base.players,
        P2: {
          ...base.players.P2,
          hand: [handSpell],
          monsterZones: [zoneCard("p2-defender", BLUE_EYES_ID, "P2"), null, null, null, null],
        },
      },
    };
    const attack = reduceDuel(stateWithKnownHand, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
      defenderInstanceId: "p2-defender",
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.events.some((event) => event.type === "summon-successful" && event.instanceId === handSpell.instanceId)).toBe(false);
    expect(resolved.state.players.P2.hand).toEqual([]);
    expect(resolved.state.players.P2.graveyard.some((card) => card.instanceId === handSpell.instanceId)).toBe(true);
    expect(resolved.state.players.P2.graveyard.some((card) => card.cardId === A_HERO_EMERGES_ID)).toBe(true);
  });

  it("supports Absolute End making opponent attacks direct until the End Phase", () => {
    const base = battleStateWithOpponentTrap(ABSOLUTE_END_ID, BATTLE_OX_ID);
    const stateWithDefender: DuelState = {
      ...base,
      players: {
        ...base.players,
        P2: {
          ...base.players.P2,
          monsterZones: [zoneCard("p2-defender", BLUE_EYES_ID, "P2"), null, null, null, null],
        },
      },
    };
    const priorityPassed = reduceDuel(stateWithDefender, { type: "pass-priority", playerId: "P1" });
    const activate = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
    });
    const opponentPassed = reduceDuel(activate.state, { type: "pass-priority", playerId: "P2" });
    const turnPassed = reduceDuel(opponentPassed.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPassed.state, { type: "resolve-chain", playerId: "P1" });
    const directAttack = reduceDuel(resolved.state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });
    const battle = reduceDuel(resolved.state, { type: "change-phase", playerId: "P1", phase: "BP" });
    const main2 = reduceDuel(battle.state, { type: "change-phase", playerId: "P1", phase: "M2" });
    const endPhase = reduceDuel(main2.state, { type: "change-phase", playerId: "P1", phase: "EP" });

    expect(getCardCoverage(cardById(ABSOLUTE_END_ID)).status).toBe("goatCustom");
    expect(activate.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.lingeringEffects).toHaveLength(1);
    expect(directAttack.errors).toEqual([]);
    expect(directAttack.state.players.P2.lp).toBe(6300);
    expect(directAttack.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: "p2-defender" });
    expect(endPhase.state.lingeringEffects).toEqual([]);
  });

  it("rejects Absolute End during the controller's own turn", () => {
    const base = advanceToM1(stateWithPriority([], [ABSOLUTE_END_ID]));
    const stateWithOwnTrap: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          spellTrapZones: [
            zoneCard("p1-trap", ABSOLUTE_END_ID, "P1", {
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
      },
    };
    const result = reduceDuel(stateWithOwnTrap, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-trap",
    });

    expect(result.errors[0]?.message).toBe("That effect cannot be activated right now.");
  });

  it("supports Negate Attack responding to an opponent attack declaration to negate the attack", () => {
    const state = battleStateWithOpponentTrap(NEGATE_ATTACK_ID, BLUE_EYES_ID);
    const attack = reduceDuel(state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });
    const resolved = reduceDuel(attack.state, { type: "resolve-chain", playerId: "P1" });

    expect(attack.state.chain[0]).toMatchObject({ playerId: "P2", cardId: NEGATE_ATTACK_ID });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: "p1-attacker" });
    expect(resolved.state.players.P2.lp).toBe(8000);
    expect(resolved.state.pendingAttack).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ cardId: NEGATE_ATTACK_ID });
  });

  it("supports Desert Sunlight changing every face-up monster the controller controls to face-up Defense Position", () => {
    const base = advanceToM1(stateWithPriority([], [DESERT_SUNLIGHT_ID]));
    const trapState: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [zoneCard("p1-monster", BLUE_EYES_ID, "P1", { face: "faceUp", position: "attack" }), null, null, null, null],
        },
        P2: {
          ...base.players.P2,
          monsterZones: [zoneCard("p2-monster", BLUE_EYES_ID, "P2", { face: "faceUp", position: "attack" }), null, null, null, null],
          spellTrapZones: [zoneCard("p2-trap", DESERT_SUNLIGHT_ID, "P2", { face: "faceDown", position: null, visibility: "hidden", setTurn: 0 }), null, null, null, null],
        },
      },
    };
    const passed = reduceDuel(trapState, { type: "pass-priority", playerId: "P1" });
    const activate = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
    });
    const oppPass = reduceDuel(activate.state, { type: "pass-priority", playerId: "P2" });
    const turnPass = reduceDuel(oppPass.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPass.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({ position: "defense", face: "faceUp" });
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ position: "attack" });
  });

  it("supports Windstorm of Etaqua flipping every face-up monster the opponent controls to the other battle position", () => {
    const base = advanceToM1(stateWithPriority([], [WINDSTORM_OF_ETAQUA_ID]));
    const trapState: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [zoneCard("p1-monster", BLUE_EYES_ID, "P1", { face: "faceUp", position: "attack" }), null, null, null, null],
        },
        P2: {
          ...base.players.P2,
          spellTrapZones: [zoneCard("p2-trap", WINDSTORM_OF_ETAQUA_ID, "P2", { face: "faceDown", position: null, visibility: "hidden", setTurn: 0 }), null, null, null, null],
        },
      },
    };
    const passed = reduceDuel(trapState, { type: "pass-priority", playerId: "P1" });
    const activate = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
    });
    const oppPass = reduceDuel(activate.state, { type: "pass-priority", playerId: "P2" });
    const turnPass = reduceDuel(oppPass.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPass.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ position: "defense" });
  });

  it("supports Zero Gravity flipping every face-up monster on the field to the other battle position", () => {
    const base = advanceToM1(stateWithPriority([], [ZERO_GRAVITY_ID]));
    const trapState: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [zoneCard("p1-monster", BLUE_EYES_ID, "P1", { face: "faceUp", position: "attack" }), null, null, null, null],
        },
        P2: {
          ...base.players.P2,
          monsterZones: [zoneCard("p2-monster", BATTLE_OX_ID, "P2", { face: "faceUp", position: "defense" }), null, null, null, null],
          spellTrapZones: [zoneCard("p2-trap", ZERO_GRAVITY_ID, "P2", { face: "faceDown", position: null, visibility: "hidden", setTurn: 0 }), null, null, null, null],
        },
      },
    };
    const passed = reduceDuel(trapState, { type: "pass-priority", playerId: "P1" });
    const activate = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
    });
    const oppPass = reduceDuel(activate.state, { type: "pass-priority", playerId: "P2" });
    const turnPass = reduceDuel(oppPass.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPass.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ position: "defense" });
    expect(resolved.state.players.P2.monsterZones[0]).toMatchObject({ position: "attack" });
  });

  it("supports Raigeki Break paying a discard cost to destroy a targeted card anywhere on the field", () => {
    const base = advanceToM1(stateWithPriority([], [RAIGEKI_BREAK_ID]));
    const trapState: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          monsterZones: [zoneCard("p1-monster", BLUE_EYES_ID, "P1", { face: "faceUp", position: "attack" }), null, null, null, null],
        },
        P2: {
          ...base.players.P2,
          spellTrapZones: [zoneCard("p2-trap", RAIGEKI_BREAK_ID, "P2", { face: "faceDown", position: null, visibility: "hidden", setTurn: 0 }), null, null, null, null],
        },
      },
    };
    const passed = reduceDuel(trapState, { type: "pass-priority", playerId: "P1" });
    const discardCandidate = passed.state.players.P2.hand[0];
    const activate = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
      costInstanceIds: [discardCandidate.instanceId],
    });
    const oppPass = reduceDuel(activate.state, { type: "pass-priority", playerId: "P2" });
    const turnPass = reduceDuel(oppPass.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPass.state, { type: "resolve-chain", playerId: "P1" });

    expect(activate.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard.some((card) => card.instanceId === discardCandidate.instanceId)).toBe(true);
  });

  it("supports Phoenix Wing Wind Blast discarding a card to return an opponent-controlled card to the top of its owner's Deck", () => {
    const base = advanceToM1(stateWithPriority([], [PHOENIX_WING_WIND_BLAST_ID, BLUE_EYES_ID]));
    const trapState: DuelState = {
      ...base,
      players: {
        ...base.players,
        P1: {
          ...base.players.P1,
          spellTrapZones: [
            zoneCard("p1-target", POT_OF_GREED_ID, "P1", { face: "faceDown", position: null, visibility: "hidden" }),
            null,
            null,
            null,
            null,
          ],
        },
        P2: {
          ...base.players.P2,
          spellTrapZones: [
            zoneCard("p2-trap", PHOENIX_WING_WIND_BLAST_ID, "P2", {
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
      },
    };
    const passed = reduceDuel(trapState, { type: "pass-priority", playerId: "P1" });
    const discardCandidate = requireHandCard(passed.state, "P2", BLUE_EYES_ID);
    const activate = reduceDuel(passed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      targetRefs: [{ playerId: "P1", zone: "spellTrapZone", index: 0 }],
      costInstanceIds: [discardCandidate.instanceId],
    });
    const oppPass = reduceDuel(activate.state, { type: "pass-priority", playerId: "P2" });
    const turnPass = reduceDuel(oppPass.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPass.state, { type: "resolve-chain", playerId: "P1" });

    expect(activate.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P1.mainDeck[0]).toMatchObject({ instanceId: "p1-target", cardId: POT_OF_GREED_ID });
    expect(resolved.state.players.P2.graveyard.some((card) => card.instanceId === discardCandidate.instanceId)).toBe(true);
    expect(resolved.state.players.P2.graveyard.some((card) => card.cardId === PHOENIX_WING_WIND_BLAST_ID)).toBe(true);
  });

  it("supports Threatening Roar preventing the opponent from declaring attacks until the End Phase", () => {
    const state = battleStateWithOpponentTrap(THREATENING_ROAR_ID, BATTLE_OX_ID);
    const priorityPassed = reduceDuel(state, { type: "pass-priority", playerId: "P1" });
    const activate = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
    });
    const opponentPassed = reduceDuel(activate.state, { type: "pass-priority", playerId: "P2" });
    const turnPassed = reduceDuel(opponentPassed.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPassed.state, { type: "resolve-chain", playerId: "P1" });
    const blockedAttack = reduceDuel(resolved.state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: "p1-attacker",
    });
    const main2 = reduceDuel(resolved.state, { type: "change-phase", playerId: "P1", phase: "M2" });
    const endPhase = reduceDuel(main2.state, { type: "change-phase", playerId: "P1", phase: "EP" });

    expect(activate.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.lingeringEffects).toHaveLength(1);
    expect(blockedAttack.errors[0]).toMatchObject({
      code: "illegal-action",
      message: "Threatening Roar prevents your opponent from declaring attacks this turn.",
    });
    expect(blockedAttack.state.players.P2.lp).toBe(8000);
    expect(endPhase.state.lingeringEffects).toEqual([]);
  });

  it("supports Magic Jammer discarding a card to negate and destroy a Spell activation", () => {
    const base = advanceToM1(stateWithPriority([POT_OF_GREED_ID], [MAGIC_JAMMER_ID, BLUE_EYES_ID]));
    const spell = requireHandCard(base, "P1", POT_OF_GREED_ID);
    const discard = requireHandCard(base, "P2", BLUE_EYES_ID);
    const state = withOpponentTrap(base, MAGIC_JAMMER_ID);
    const spellActivated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: spell.instanceId,
    });
    const priorityPassed = reduceDuel(spellActivated.state, { type: "pass-priority", playerId: "P1" });
    const jammerActivated = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      effectId: "negate-activation",
      costInstanceIds: [discard.instanceId],
    });
    const responseClosed = reduceDuel(jammerActivated.state, { type: "pass-priority", playerId: "P2" });
    const resolved = reduceDuel(responseClosed.state, { type: "resolve-chain", playerId: "P1" });

    expect(spellActivated.errors).toEqual([]);
    expect(jammerActivated.errors).toEqual([]);
    expect(jammerActivated.state.chain.map((link) => [link.cardId, link.effectId, link.spellSpeed])).toEqual([
      [POT_OF_GREED_ID, "activate", 1],
      [MAGIC_JAMMER_ID, "negate-activation", 3],
    ]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "effect-resolved-without-effect",
      cardId: POT_OF_GREED_ID,
      reason: "Chain link was negated.",
    }));
    expect(resolved.state.players.P1.hand.some((card) => card.cardId === POT_OF_GREED_ID)).toBe(false);
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: POT_OF_GREED_ID }));
    expect(resolved.state.players.P2.graveyard).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cardId: BLUE_EYES_ID, instanceId: discard.instanceId }),
        expect.objectContaining({ cardId: MAGIC_JAMMER_ID, instanceId: "p2-trap" }),
      ]),
    );
  });

  it("does not let Magic Jammer negate Spiritualism's activation or effect", () => {
    const base = advanceToM1(stateWithPriority([SPIRITUALISM_ID], [MAGIC_JAMMER_ID, BLUE_EYES_ID, MIRROR_FORCE_ID]));
    const spell = requireHandCard(base, "P1", SPIRITUALISM_ID);
    const discard = requireHandCard(base, "P2", BLUE_EYES_ID);
    const trapState = withOpponentTrap(base, MAGIC_JAMMER_ID);
    const state: DuelState = {
      ...trapState,
      players: {
        ...trapState.players,
        P2: {
          ...trapState.players.P2,
          spellTrapZones: [
            trapState.players.P2.spellTrapZones[0],
            zoneCard("p2-spiritualism-target", MIRROR_FORCE_ID, "P2", { position: null }),
            null,
            null,
            null,
          ],
        },
      },
    };
    const spellActivated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: spell.instanceId,
      targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 1 }],
    });
    const priorityPassed = reduceDuel(spellActivated.state, { type: "pass-priority", playerId: "P1" });
    const jammerActivated = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      effectId: "negate-activation",
      costInstanceIds: [discard.instanceId],
    });
    const responseClosed = reduceDuel(jammerActivated.state, { type: "pass-priority", playerId: "P2" });
    const resolved = reduceDuel(responseClosed.state, { type: "resolve-chain", playerId: "P1" });

    expect(spellActivated.errors).toEqual([]);
    expect(jammerActivated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).not.toContainEqual(expect.objectContaining({
      type: "effect-resolved-without-effect",
      cardId: SPIRITUALISM_ID,
    }));
    expect(resolved.state.players.P2.spellTrapZones[1]).toBeNull();
    expect(resolved.state.players.P2.hand).toContainEqual(expect.objectContaining({
      instanceId: "p2-spiritualism-target",
      cardId: MIRROR_FORCE_ID,
    }));
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: SPIRITUALISM_ID }));
    expect(resolved.state.players.P2.graveyard).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: BLUE_EYES_ID, instanceId: discard.instanceId }),
      expect.objectContaining({ cardId: MAGIC_JAMMER_ID, instanceId: "p2-trap" }),
    ]));
  });

  it("supports Seven Tools of the Bandit paying 1000 LP to negate and destroy a Trap activation", () => {
    const base = advanceToM1(stateWithPriority([JAR_OF_GREED_ID], [SEVEN_TOOLS_OF_THE_BANDIT_ID]));
    const state = withPlayerTrap(withOpponentTrap(base, SEVEN_TOOLS_OF_THE_BANDIT_ID), "P1", JAR_OF_GREED_ID);
    const jarActivated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-trap",
    });
    const priorityPassed = reduceDuel(jarActivated.state, { type: "pass-priority", playerId: "P1" });
    const sevenToolsActivated = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      effectId: "negate-activation",
    });
    const responseClosed = reduceDuel(sevenToolsActivated.state, { type: "pass-priority", playerId: "P2" });
    const resolved = reduceDuel(responseClosed.state, { type: "resolve-chain", playerId: "P1" });

    expect(jarActivated.errors).toEqual([]);
    expect(sevenToolsActivated.errors).toEqual([]);
    expect(sevenToolsActivated.state.players.P2.lp).toBe(7000);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "effect-resolved-without-effect",
      cardId: JAR_OF_GREED_ID,
      reason: "Chain link was negated.",
    }));
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(0);
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: JAR_OF_GREED_ID }));
    expect(resolved.state.players.P2.graveyard).toContainEqual(expect.objectContaining({ cardId: SEVEN_TOOLS_OF_THE_BANDIT_ID }));
  });

  it("supports Trap Jammer negating only an opponent Trap activation during the Battle Phase", () => {
    const mainBase = advanceToM1(stateWithPriority([JAR_OF_GREED_ID], [TRAP_JAMMER_ID]));
    const mainState = withPlayerTrap(withOpponentTrap(mainBase, TRAP_JAMMER_ID), "P1", JAR_OF_GREED_ID);
    const mainJarActivated = reduceDuel(mainState, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-trap",
    });
    const mainPriorityPassed = reduceDuel(mainJarActivated.state, { type: "pass-priority", playerId: "P1" });
    const prematureJammer = reduceDuel(mainPriorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      effectId: "negate-activation",
    });

    const battleBase = advanceToBattlePhase(stateWithPriority([JAR_OF_GREED_ID], [TRAP_JAMMER_ID]));
    const battleState = withPlayerTrap(withOpponentTrap(battleBase, TRAP_JAMMER_ID), "P1", JAR_OF_GREED_ID);
    const battleJarActivated = reduceDuel(battleState, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-trap",
    });
    const battlePriorityPassed = reduceDuel(battleJarActivated.state, { type: "pass-priority", playerId: "P1" });
    const jammerActivated = reduceDuel(battlePriorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      effectId: "negate-activation",
    });
    const responseClosed = reduceDuel(jammerActivated.state, { type: "pass-priority", playerId: "P2" });
    const resolved = reduceDuel(responseClosed.state, { type: "resolve-chain", playerId: "P1" });

    expect(mainJarActivated.errors).toEqual([]);
    expect(prematureJammer.errors[0]).toMatchObject({
      code: "illegal-action",
      message: "That effect cannot be activated right now.",
    });
    expect(battleJarActivated.errors).toEqual([]);
    expect(jammerActivated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "effect-resolved-without-effect",
      cardId: JAR_OF_GREED_ID,
      reason: "Chain link was negated.",
    }));
    expect(resolved.events.filter((event) => event.type === "card-drawn")).toHaveLength(0);
    expect(resolved.state.players.P2.graveyard).toContainEqual(expect.objectContaining({ cardId: TRAP_JAMMER_ID }));
  });

  it("supports Armor Break negating and destroying an Equip Spell activation", () => {
    const base = advanceToM1(stateWithPriority([FAIRY_METEOR_CRUSH_ID, BATTLE_OX_ID], [ARMOR_BREAK_ID]));
    const equipped = requireHandCard(base, "P1", FAIRY_METEOR_CRUSH_ID);
    const state = withMonster(withOpponentTrap(base, ARMOR_BREAK_ID), "P1", BATTLE_OX_ID);
    const equipActivated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: equipped.instanceId,
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const priorityPassed = reduceDuel(equipActivated.state, { type: "pass-priority", playerId: "P1" });
    const armorBreakActivated = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      effectId: "negate-activation",
    });
    const responseClosed = reduceDuel(armorBreakActivated.state, { type: "pass-priority", playerId: "P2" });
    const resolved = reduceDuel(responseClosed.state, { type: "resolve-chain", playerId: "P1" });

    expect(equipActivated.errors).toEqual([]);
    expect(armorBreakActivated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "effect-resolved-without-effect",
      cardId: FAIRY_METEOR_CRUSH_ID,
      reason: "Chain link was negated.",
    }));
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: FAIRY_METEOR_CRUSH_ID }));
    expect(resolved.state.players.P2.graveyard).toContainEqual(expect.objectContaining({ cardId: ARMOR_BREAK_ID }));
  });

  it("supports Royal Surrender negating an opponent Continuous Trap activation", () => {
    const base = advanceToM1(stateWithPriority([GRAVITY_BIND_ID], [ROYAL_SURRENDER_ID]));
    const state = withCardScript(
      withPlayerTrap(withOpponentTrap(base, ROYAL_SURRENDER_ID), "P1", GRAVITY_BIND_ID),
      continuousTrapActivationScript(GRAVITY_BIND_ID),
    );
    const trapActivated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-trap",
      effectId: "activate",
    });
    const priorityPassed = reduceDuel(trapActivated.state, { type: "pass-priority", playerId: "P1" });
    const surrenderActivated = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      effectId: "negate-activation",
    });
    const responseClosed = reduceDuel(surrenderActivated.state, { type: "pass-priority", playerId: "P2" });
    const resolved = reduceDuel(responseClosed.state, { type: "resolve-chain", playerId: "P1" });

    expect(trapActivated.errors).toEqual([]);
    expect(surrenderActivated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "effect-resolved-without-effect",
      cardId: GRAVITY_BIND_ID,
      reason: "Chain link was negated.",
    }));
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: GRAVITY_BIND_ID }));
    expect(resolved.state.players.P2.graveyard).toContainEqual(expect.objectContaining({ cardId: ROYAL_SURRENDER_ID }));
  });

  it("supports Spell-Stopping Statute negating an opponent Continuous Spell activation", () => {
    const base = advanceToM1(stateWithPriority([YELLOW_LUSTER_SHIELD_ID], [SPELL_STOPPING_STATUTE_ID]));
    const spell = requireHandCard(base, "P1", YELLOW_LUSTER_SHIELD_ID);
    const state = withOpponentTrap(base, SPELL_STOPPING_STATUTE_ID);
    const spellActivated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: spell.instanceId,
    });
    const priorityPassed = reduceDuel(spellActivated.state, { type: "pass-priority", playerId: "P1" });
    const statuteActivated = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      effectId: "negate-activation",
    });
    const responseClosed = reduceDuel(statuteActivated.state, { type: "pass-priority", playerId: "P2" });
    const resolved = reduceDuel(responseClosed.state, { type: "resolve-chain", playerId: "P1" });

    expect(spellActivated.errors).toEqual([]);
    expect(statuteActivated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "effect-resolved-without-effect",
      cardId: YELLOW_LUSTER_SHIELD_ID,
      reason: "Chain link was negated.",
    }));
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: YELLOW_LUSTER_SHIELD_ID }));
    expect(resolved.state.players.P2.graveyard).toContainEqual(expect.objectContaining({ cardId: SPELL_STOPPING_STATUTE_ID }));
  });

  it("supports Riryoku Field negating a Spell activation that targets exactly 1 monster", () => {
    const base = advanceToM1(stateWithPriority([BOOK_OF_MOON_ID, BATTLE_OX_ID], [RIRYOKU_FIELD_ID]));
    const spell = requireHandCard(base, "P1", BOOK_OF_MOON_ID);
    const state = withMonster(withOpponentTrap(base, RIRYOKU_FIELD_ID), "P1", BATTLE_OX_ID);
    const spellActivated = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: spell.instanceId,
      targetRefs: [{ playerId: "P1", zone: "monsterZone", index: 0 }],
    });
    const priorityPassed = reduceDuel(spellActivated.state, { type: "pass-priority", playerId: "P1" });
    const riryokuActivated = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      effectId: "negate-activation",
    });
    const responseClosed = reduceDuel(riryokuActivated.state, { type: "pass-priority", playerId: "P2" });
    const resolved = reduceDuel(responseClosed.state, { type: "resolve-chain", playerId: "P1" });

    expect(spellActivated.errors).toEqual([]);
    expect(riryokuActivated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "effect-resolved-without-effect",
      cardId: BOOK_OF_MOON_ID,
      reason: "Chain link was negated.",
    }));
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ cardId: BATTLE_OX_ID, face: "faceUp" });
    expect(resolved.state.players.P1.graveyard).toContainEqual(expect.objectContaining({ cardId: BOOK_OF_MOON_ID }));
    expect(resolved.state.players.P2.graveyard).toContainEqual(expect.objectContaining({ cardId: RIRYOKU_FIELD_ID }));
  });

  it("supports Forced Ceasefire discarding a card to prevent Trap activations until the End Phase", () => {
    const base = advanceToM1(stateWithPriority([JAR_OF_GREED_ID], [FORCED_CEASEFIRE_ID, BLUE_EYES_ID]));
    const discard = requireHandCard(base, "P2", BLUE_EYES_ID);
    const state = withPlayerTrap(withOpponentTrap(base, FORCED_CEASEFIRE_ID), "P1", JAR_OF_GREED_ID);
    const priorityPassed = reduceDuel(state, { type: "pass-priority", playerId: "P1" });
    const activated = reduceDuel(priorityPassed.state, {
      type: "activate-card",
      playerId: "P2",
      instanceId: "p2-trap",
      effectId: "prevent-trap-activations",
      costInstanceIds: [discard.instanceId],
    });
    const opponentPassed = reduceDuel(activated.state, { type: "pass-priority", playerId: "P2" });
    const turnPassed = reduceDuel(opponentPassed.state, { type: "pass-priority", playerId: "P1" });
    const resolved = reduceDuel(turnPassed.state, { type: "resolve-chain", playerId: "P1" });
    const blocked = reduceDuel(resolved.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: "p1-trap",
    });
    const battle = reduceDuel(resolved.state, { type: "change-phase", playerId: "P1", phase: "BP" });
    const main2 = reduceDuel(battle.state, { type: "change-phase", playerId: "P1", phase: "M2" });
    const endPhase = reduceDuel(main2.state, { type: "change-phase", playerId: "P1", phase: "EP" });

    expect(activated.errors).toEqual([]);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.graveyard).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cardId: BLUE_EYES_ID, instanceId: discard.instanceId }),
        expect.objectContaining({ cardId: FORCED_CEASEFIRE_ID, instanceId: "p2-trap" }),
      ]),
    );
    expect(resolved.state.lingeringEffects).toHaveLength(1);
    expect(blocked.errors[0]).toMatchObject({
      code: "illegal-action",
      message: "Forced Ceasefire prevents Trap Cards from being activated until the End Phase.",
    });
    expect(battle.errors).toEqual([]);
    expect(main2.errors).toEqual([]);
    expect(endPhase.errors).toEqual([]);
    expect(endPhase.state.lingeringEffects).toEqual([]);
  });

  it("keeps unsupported Trap cards blocked from playable decks", () => {
    const waboku = cardById(WABOKU_ID);
    const result = validateDeck(deckWithPriority([WABOKU_ID]), [...cards]);

    expect(getCardCoverage(waboku).status).toBe("goatUnsupported");
    expect(isPlayableCard(WABOKU_ID, cards)).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Waboku is not supported in playable decks.");
  });
});

function battleStateWithOpponentTrap(
  trapId: string,
  attackerId: string,
  setTurn = 0,
  p2PriorityIds: readonly string[] = [],
): DuelState {
  const base = advanceToBattlePhase(stateWithPriority([attackerId], [trapId, ...p2PriorityIds]));

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
        spellTrapZones: [
          zoneCard("p2-trap", trapId, "P2", {
            face: "faceDown",
            position: null,
            visibility: "hidden",
            setTurn,
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

function withOpponentTrap(state: DuelState, trapId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        spellTrapZones: [
          zoneCard("p2-trap", trapId, "P2", {
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
    },
  };
}

function withPlayerTrap(state: DuelState, playerId: "P1" | "P2", trapId: string): DuelState {
  const instanceId = playerId === "P1" ? "p1-trap" : "p2-trap";

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        spellTrapZones: [
          zoneCard(instanceId, trapId, playerId, {
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
    },
  };
}

function withMonster(state: DuelState, playerId: "P1" | "P2", monsterId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        monsterZones: [zoneCard(`${playerId.toLowerCase()}-monster`, monsterId, playerId), null, null, null, null],
      },
    },
  };
}

function withCountBurnFixture(
  state: DuelState,
  setup: typeof NORMAL_TRAP_COUNT_BURN_CASES[number]["setup"],
): DuelState {
  switch (setup) {
    case "opponent-graveyard":
      return {
        ...state,
        players: {
          ...state.players,
          P1: {
            ...state.players.P1,
            graveyard: [
              zoneCard("p1-grave-battle-ox", BATTLE_OX_ID, "P1", { position: null }),
              zoneCard("p1-grave-blue-eyes", BLUE_EYES_ID, "P1", { position: null }),
            ],
          },
        },
      };
    case "opponent-banished":
      return {
        ...state,
        players: {
          ...state.players,
          P1: {
            ...state.players.P1,
            banished: [
              zoneCard("p1-banished-battle-ox", BATTLE_OX_ID, "P1", { position: null }),
              zoneCard("p1-banished-blue-eyes", BLUE_EYES_ID, "P1", { position: null }),
            ],
          },
        },
      };
    case "opponent-monsters":
      return {
        ...state,
        players: {
          ...state.players,
          P1: {
            ...state.players.P1,
            monsterZones: [
              zoneCard("p1-burn-monster-a", BATTLE_OX_ID, "P1"),
              zoneCard("p1-burn-monster-b", BLUE_EYES_ID, "P1"),
              null,
              null,
              null,
            ],
          },
        },
      };
    case "own-light-monsters":
      return {
        ...state,
        players: {
          ...state.players,
          P2: {
            ...state.players.P2,
            monsterZones: [zoneCard("p2-light-monster", BLUE_EYES_ID, "P2"), null, null, null, null],
          },
        },
      };
  }
}

function withCardScript(state: DuelState, script: CardScript): DuelState {
  return {
    ...state,
    cardScripts: {
      ...(state.cardScripts ?? {}),
      [script.cardId]: script,
    },
  };
}

function continuousTrapActivationScript(cardId: string): CardScript {
  return {
    cardId,
    effects: [
      {
        id: "activate",
        kind: "quick",
        implemented: true,
        spellSpeed: 2,
        resolution: {
          steps: [],
          sendSourceToGraveyard: true,
        },
      },
    ],
  };
}

function stateWithPriority(p1PriorityIds: readonly string[], p2PriorityIds: readonly string[]): DuelState {
  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(p1PriorityIds),
      P2: deckWithPriority(p2PriorityIds),
    },
    seed: "trap-card-tests",
    shuffleDecks: false,
  }).state;
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

function cardById(cardId: string): CardRecord {
  const card = cards.find((candidate) => candidate.passcode === cardId);

  if (!card) {
    throw new Error(`Missing fixture cardId: ${cardId}`);
  }

  return card;
}

function monsterBaseStats(cardId: string): { readonly atk: number; readonly def: number } {
  const monster = cardById(cardId).monster;

  if (!monster || typeof monster.atk !== "number" || typeof monster.def !== "number") {
    throw new Error(`Expected monster stats for cardId: ${cardId}`);
  }

  return {
    atk: monster.atk,
    def: monster.def,
  };
}
