import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import { getCardCoverage, isPlayableCard } from "../cards/coverage";
import { createCardScriptRegistry } from "../cards/registry";
import {
  BREAKER_THE_MAGICAL_WARRIOR_ID,
  CALL_OF_THE_HAUNTED_ID,
  DD_WARRIOR_LADY_ID,
  INJECTION_FAIRY_LILY_ID,
  JINZO_ID,
  PREMATURE_BURIAL_ID,
  REFLECT_BOUNDER_ID,
  RING_OF_DESTRUCTION_ID,
  SINISTER_SERPENT_ID,
  SNATCH_STEAL_ID,
  TRIBE_INFECTING_VIRUS_ID,
  tribeEffectId,
} from "../cards/scripts/custom/staples";
import { createContinuousTrapScript } from "../cards/templates/continuousTrap";
import type { ZoneCard } from "../core/cardRefs";
import type { DuelState } from "../core/state";
import { validateDeck } from "../deckValidation";
import { reduceDuel, createDuel } from "../reducer";
import { deriveBattleStats } from "../effects/continuous";
import { getMonsterBattleStats } from "../rules/battle";

const cards = cardsJson as CardRecord[];
const POT_OF_GREED_ID = "55144522";
const SAKURETSU_ARMOR_ID = "56120475";
const GRAVITY_BIND_ID = "85742772";
const METAMORPHOSIS_ID = "46411259";
const THOUSAND_EYES_RESTRICT_ID = "63519819";
const BATTLE_OX_ID = "05053103";
const AQUA_MADOOR_ID = "85639257";
const BLUE_EYES_ID = "89631139";

describe("custom staple card scripts", () => {
  it("places Breaker's Spell Counter on Normal Summon and applies its ATK bonus after the trigger resolves", () => {
    const state = stateWithPriority([BREAKER_THE_MAGICAL_WARRIOR_ID], []);
    const breaker = requireHandCard(state, "P1", BREAKER_THE_MAGICAL_WARRIOR_ID);
    const summoned = reduceDuel(state, {
      type: "normal-summon",
      playerId: "P1",
      instanceId: breaker.instanceId,
      zoneIndex: 0,
    });
    const summonedBreaker = summoned.state.players.P1.monsterZones[0]!;
    const resolved = reduceDuel(summoned.state, { type: "resolve-chain", playerId: "P1" });
    const resolvedBreaker = resolved.state.players.P1.monsterZones[0]!;

    expect(summoned.errors).toEqual([]);
    expect(summoned.state.chain[0]).toMatchObject({
      cardId: BREAKER_THE_MAGICAL_WARRIOR_ID,
      effectId: "place-spell-counter",
    });
    expect(summonedBreaker.counters.spell).toBeUndefined();
    expect(derivedAtk(summoned.state, "P1", 0)).toBe(1600);
    expect(resolved.errors).toEqual([]);
    expect(resolvedBreaker.counters.spell).toBe(1);
    expect(derivedAtk(resolved.state, "P1", 0)).toBe(1900);
  });

  it("removes Breaker's Spell Counter as cost to destroy a targeted Spell or Trap", () => {
    const state = withBreakerAndTargetSpellTrap(stateWithPriority([BREAKER_THE_MAGICAL_WARRIOR_ID], [POT_OF_GREED_ID]));
    const breaker = state.players.P1.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: breaker.instanceId,
      effectId: "remove-spell-counter-destroy",
      targetRefs: [{ playerId: "P2", zone: "spellTrapZone", index: 0 }],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(activation.errors).toEqual([]);
    expect(activation.events.some((event) => event.type === "cost-paid" && event.costKind === "other")).toBe(true);
    expect(activation.state.players.P1.monsterZones[0]?.counters.spell).toBeUndefined();
    expect(derivedAtk(activation.state, "P1", 0)).toBe(1600);
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.spellTrapZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ instanceId: "p2-target-spell" });
  });

  it("discards a card for Tribe-Infecting Virus to destroy all face-up monsters of the declared Type", () => {
    const state = withTribeAndSpellcasterMonsters(
      stateWithPriority(
        [TRIBE_INFECTING_VIRUS_ID, BATTLE_OX_ID, BREAKER_THE_MAGICAL_WARRIOR_ID],
        [AQUA_MADOOR_ID, BREAKER_THE_MAGICAL_WARRIOR_ID, BLUE_EYES_ID],
      ),
    );
    const tribe = state.players.P1.monsterZones[0]!;
    const discard = requireHandCard(state, "P1", BATTLE_OX_ID);
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: tribe.instanceId,
      effectId: tribeEffectId("Spellcaster"),
      costInstanceIds: [discard.instanceId],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(activation.errors).toEqual([]);
    expect(activation.events.some((event) => event.type === "cost-paid" && event.costKind === "discard")).toBe(true);
    expect(activation.state.players.P1.graveyard[0]).toMatchObject({ instanceId: discard.instanceId });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: tribe.instanceId });
    expect(resolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.monsterZones[1]).toMatchObject({
      cardId: BREAKER_THE_MAGICAL_WARRIOR_ID,
      face: "faceDown",
    });
    expect(resolved.state.players.P2.monsterZones[2]).toMatchObject({ cardId: BLUE_EYES_ID });
  });

  it("lets Tribe-Infecting Virus destroy itself when Aqua is declared", () => {
    const state = withTribeOnly(stateWithPriority([TRIBE_INFECTING_VIRUS_ID, BATTLE_OX_ID], []));
    const tribe = state.players.P1.monsterZones[0]!;
    const discard = requireHandCard(state, "P1", BATTLE_OX_ID);
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: tribe.instanceId,
      effectId: tribeEffectId("Aqua"),
      costInstanceIds: [discard.instanceId],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === tribe.instanceId)).toBe(true);
  });

  it("returns Sinister Serpent from Graveyard to hand during its controller's Standby Phase", () => {
    const state = withOwnGraveyardCard(drawPhaseStateWithPriority([SINISTER_SERPENT_ID], []), SINISTER_SERPENT_ID);
    const standby = reduceDuel(state, { type: "change-phase", playerId: "P1", phase: "SP" });
    const accepted = reduceDuel(standby.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      choiceIds: ["yes"],
    });
    const resolved = reduceDuel(accepted.state, { type: "resolve-chain", playerId: "P1" });

    expect(standby.errors).toEqual([]);
    expect(standby.prompts[0]).toMatchObject({
      kind: "yes-no",
      playerId: "P1",
      metadata: {
        cardId: SINISTER_SERPENT_ID,
        effectId: "standby-return",
      },
    });
    expect(accepted.state.chain[0]).toMatchObject({
      cardId: SINISTER_SERPENT_ID,
      effectId: "standby-return",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard.some((card) => card.cardId === SINISTER_SERPENT_ID)).toBe(false);
    expect(resolved.state.players.P1.hand.at(-1)).toMatchObject({
      instanceId: "P1-08131171-graveyard",
      cardId: SINISTER_SERPENT_ID,
    });
  });

  it("optionally banishes D.D. Warrior Lady and the monster it battled", () => {
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
    const accepted = reduceDuel(battle.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      choiceIds: ["yes"],
    });
    const resolved = reduceDuel(accepted.state, { type: "resolve-chain", playerId: "P1" });

    expect(battle.errors).toEqual([]);
    expect(battle.prompts[0]).toMatchObject({
      kind: "yes-no",
      playerId: "P1",
      metadata: {
        cardId: DD_WARRIOR_LADY_ID,
        effectId: "banish-battled-monsters",
        triggerEventType: "battle-completed",
      },
    });
    expect(battle.state.players.P1.graveyard[0]).toMatchObject({ instanceId: attacker.instanceId });
    expect(battle.state.players.P2.monsterZones[0]).toMatchObject({ instanceId: defender.instanceId });
    expect(accepted.state.chain[0]).toMatchObject({
      cardId: DD_WARRIOR_LADY_ID,
      effectId: "banish-battled-monsters",
      triggerEvent: {
        type: "battle-completed",
        attackerInstanceId: attacker.instanceId,
        defenderInstanceId: defender.instanceId,
      },
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === attacker.instanceId)).toBe(false);
    expect(resolved.state.players.P1.banished[0]).toMatchObject({ instanceId: attacker.instanceId });
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.banished[0]).toMatchObject({ instanceId: defender.instanceId });
  });

  it("pays 2000 LP for Injection Fairy Lily to gain ATK for the pending battle only", () => {
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
    const accepted = reduceDuel(battle.state, {
      type: "answer-prompt",
      playerId: "P1",
      promptId: "prompt-1",
      choiceIds: ["yes"],
    });
    const resolved = reduceDuel(accepted.state, { type: "resolve-chain", playerId: "P1" });

    expect(battle.errors).toEqual([]);
    expect(battle.prompts[0]).toMatchObject({
      kind: "yes-no",
      playerId: "P1",
      metadata: {
        cardId: INJECTION_FAIRY_LILY_ID,
        effectId: "damage-calculation-atk-boost",
      },
    });
    expect(battle.state.pendingAttack).toMatchObject({
      attackerInstanceId: attacker.instanceId,
      defenderInstanceId: defender.instanceId,
    });
    expect(accepted.errors).toEqual([]);
    expect(accepted.events.some((event) => event.type === "cost-paid" && event.costKind === "life-points")).toBe(true);
    expect(accepted.state.players.P1.lp).toBe(6000);
    expect(accepted.state.chain[0]).toMatchObject({
      cardId: INJECTION_FAIRY_LILY_ID,
      effectId: "damage-calculation-atk-boost",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.monsterZones[0]).toMatchObject({ instanceId: attacker.instanceId });
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ instanceId: defender.instanceId });
    expect(resolved.state.players.P2.lp).toBe(7600);
  });

  it("inflicts the attacking monster's battle ATK when attack-position Reflect Bounder is attacked", () => {
    const state = battleStateWithBlueEyesAttackingReflectBounder(
      stateWithPriority([BLUE_EYES_ID], [REFLECT_BOUNDER_ID]),
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

    expect(battle.errors).toEqual([]);
    expect(battle.state.players.P2.lp).toBe(6700);
    expect(battle.state.players.P2.graveyard[0]).toMatchObject({ instanceId: defender.instanceId });
    expect(battle.state.chain[0]).toMatchObject({
      cardId: REFLECT_BOUNDER_ID,
      effectId: "attacker-atk-damage-destroy-source",
      triggerEvent: {
        attackerBattleAtk: 3000,
        defenderBattlePosition: "attack",
      },
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(5000);
    expect(resolved.events).toContainEqual(expect.objectContaining({
      type: "lp-changed",
      playerId: "P1",
      previous: 8000,
      next: 5000,
    }));
    expect(resolved.state.players.P2.graveyard.filter((card) => card.instanceId === defender.instanceId)).toHaveLength(1);
  });

  it("prevents Trap activations and trigger Trap effects while Jinzo is face-up", () => {
    const activationState = withJinzoAndOwnSetTrap(stateWithPriority([JINZO_ID, SAKURETSU_ARMOR_ID], []));
    const trap = activationState.players.P1.spellTrapZones[0]!;
    const activation = reduceDuel(activationState, {
      type: "activate-card",
      playerId: "P1",
      instanceId: trap.instanceId,
    });
    const battleState = battleStateWithJinzoAttackingIntoSakuretsu(
      stateWithPriority([JINZO_ID], [SAKURETSU_ARMOR_ID]),
    );
    const attacker = battleState.players.P1.monsterZones[0]!;
    const attack = reduceDuel(battleState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: attacker.instanceId,
    });

    expect(activation.errors[0]?.message).toBe("Trap Cards cannot be activated while Jinzo is face-up.");
    expect(activation.state.players.P1.spellTrapZones[0]).toMatchObject({ instanceId: trap.instanceId });
    expect(attack.errors).toEqual([]);
    expect(attack.state.chain).toEqual([]);
    expect(attack.state.players.P2.lp).toBe(5600);
    expect(attack.state.players.P2.spellTrapZones[0]).toMatchObject({
      cardId: SAKURETSU_ARMOR_ID,
      face: "faceDown",
    });
  });

  it("negates face-up Continuous Trap effects while Jinzo is face-up", () => {
    const lockedState = battleStateWithGravityBind({ includeJinzo: false });
    const lockedAttacker = lockedState.players.P1.monsterZones[0]!;
    const lockedAttack = reduceDuel(lockedState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: lockedAttacker.instanceId,
    });
    const jinzoState = battleStateWithGravityBind({ includeJinzo: true });
    const jinzoAttacker = jinzoState.players.P1.monsterZones[0]!;
    const jinzoAttack = reduceDuel(jinzoState, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: jinzoAttacker.instanceId,
    });

    expect(lockedAttack.errors[0]?.message).toBe("Gravity Bind-style attack restriction.");
    expect(jinzoAttack.errors).toEqual([]);
    expect(jinzoAttack.state.players.P2.lp).toBe(6300);
  });

  it("destroys Ring of Destruction's face-up monster target and damages both players by its current ATK", () => {
    const state = withRingAndTargetBreaker(
      stateWithPriority([RING_OF_DESTRUCTION_ID], [BREAKER_THE_MAGICAL_WARRIOR_ID]),
    );
    const ring = state.players.P1.spellTrapZones[0]!;
    const target = state.players.P2.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: ring.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });

    expect(activation.errors).toEqual([]);
    expect(activation.state.chain[0]).toMatchObject({
      cardId: RING_OF_DESTRUCTION_ID,
      effectId: "destroy-monster-damage-both",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(resolved.state.players.P2.graveyard[0]).toMatchObject({ instanceId: target.instanceId });
    expect(resolved.state.players.P1.graveyard[0]).toMatchObject({ instanceId: ring.instanceId });
    expect(resolved.state.players.P1.lp).toBe(6100);
    expect(resolved.state.players.P2.lp).toBe(6100);
    expect(resolved.events.filter((event) => event.type === "lp-changed")).toHaveLength(2);
  });

  it("finishes as a draw when Ring of Destruction reduces both players to 0 LP", () => {
    const state = withBothPlayersLp(
      withRingAndTargetBreaker(stateWithPriority([RING_OF_DESTRUCTION_ID], [BREAKER_THE_MAGICAL_WARRIOR_ID])),
      1900,
    );
    const ring = state.players.P1.spellTrapZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: ring.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });
    const blocked = reduceDuel(resolved.state, { type: "change-phase", playerId: "P1", phase: "BP" });

    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.lp).toBe(0);
    expect(resolved.state.players.P2.lp).toBe(0);
    expect(resolved.state.players.P1.lost).toBe(true);
    expect(resolved.state.players.P2.lost).toBe(true);
    expect(resolved.state.winner).toBeNull();
    expect(resolved.events.filter((event) => event.type === "player-lost")).toHaveLength(2);
    expect(resolved.events.at(-1)).toMatchObject({
      type: "duel-finished",
      winner: null,
      reason: "draw",
    });
    expect(blocked.errors[0]?.message).toBe("The duel is already over.");
  });

  it("revives Call of the Haunted's Graveyard monster target and keeps the Continuous Trap linked on field", () => {
    const state = withSetCallAndOwnGraveyardMonster(
      stateWithPriority([CALL_OF_THE_HAUNTED_ID, BLUE_EYES_ID], []),
      BLUE_EYES_ID,
    );
    const call = state.players.P1.spellTrapZones[0]!;
    const target = state.players.P1.graveyard[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: call.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });
    const revived = resolved.state.players.P1.monsterZones[0]!;
    const resolvedCall = resolved.state.players.P1.spellTrapZones[0]!;

    expect(activation.errors).toEqual([]);
    expect(activation.state.chain[0]).toMatchObject({
      cardId: CALL_OF_THE_HAUNTED_ID,
      effectId: "revive-graveyard-monster",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === target.instanceId)).toBe(false);
    expect(revived).toMatchObject({
      instanceId: target.instanceId,
      cardId: BLUE_EYES_ID,
      face: "faceUp",
      position: "attack",
    });
    expect(revived.attachments).toContain(call.instanceId);
    expect(resolvedCall).toMatchObject({
      instanceId: call.instanceId,
      face: "faceUp",
      visibility: "public",
    });
    expect(resolvedCall.attachments).toContain(target.instanceId);
    expect(resolved.events.some((event) => event.type === "summon-successful" && event.summonKind === "special")).toBe(true);
  });

  it("destroys Call of the Haunted's revived monster when Call leaves the field", () => {
    const state = withBreakerSetCallAndOwnGraveyardMonster(
      stateWithPriority([CALL_OF_THE_HAUNTED_ID, BLUE_EYES_ID, BREAKER_THE_MAGICAL_WARRIOR_ID], []),
      BLUE_EYES_ID,
    );
    const call = state.players.P1.spellTrapZones[0]!;
    const breaker = state.players.P1.monsterZones[0]!;
    const callActivation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: call.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const callResolved = reduceDuel(callActivation.state, { type: "resolve-chain", playerId: "P1" });
    const revived = callResolved.state.players.P1.monsterZones[1]!;
    const breakerActivation = reduceDuel(callResolved.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: breaker.instanceId,
      effectId: "remove-spell-counter-destroy",
      targetRefs: [{ playerId: "P1", zone: "spellTrapZone", index: 0 }],
    });
    const breakerResolved = reduceDuel(breakerActivation.state, { type: "resolve-chain", playerId: "P1" });

    expect(breakerResolved.errors).toEqual([]);
    expect(breakerResolved.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(breakerResolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(breakerResolved.state.players.P1.graveyard.some((card) => card.instanceId === call.instanceId)).toBe(true);
    expect(breakerResolved.state.players.P1.graveyard.some((card) => card.instanceId === revived.instanceId)).toBe(true);
  });

  it("destroys Call of the Haunted when its revived monster is destroyed by battle", () => {
    const state = battleStateWithCallRevivingBattleOxIntoBlueEyes(
      stateWithPriority([CALL_OF_THE_HAUNTED_ID, BATTLE_OX_ID], [BLUE_EYES_ID]),
    );
    const call = state.players.P1.spellTrapZones[0]!;
    const callActivation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: call.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const callResolved = reduceDuel(callActivation.state, { type: "resolve-chain", playerId: "P1" });
    const revived = callResolved.state.players.P1.monsterZones[0]!;
    const defender = callResolved.state.players.P2.monsterZones[0]!;
    const battle = reduceDuel(callResolved.state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: revived.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(battle.errors).toEqual([]);
    expect(battle.state.players.P1.lp).toBe(6700);
    expect(battle.state.players.P1.monsterZones[0]).toBeNull();
    expect(battle.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(battle.state.players.P1.graveyard.some((card) => card.instanceId === revived.instanceId)).toBe(true);
    expect(battle.state.players.P1.graveyard.some((card) => card.instanceId === call.instanceId)).toBe(true);
  });

  it("pays 800 LP for Premature Burial, revives a Graveyard monster, and keeps the Equip Spell linked on field", () => {
    const state = withPrematureAndOwnGraveyardMonster(
      stateWithPriority([PREMATURE_BURIAL_ID, BLUE_EYES_ID], []),
      BLUE_EYES_ID,
    );
    const premature = requireHandCard(state, "P1", PREMATURE_BURIAL_ID);
    const target = state.players.P1.graveyard[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: premature.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });
    const revived = resolved.state.players.P1.monsterZones[0]!;
    const resolvedPremature = resolved.state.players.P1.spellTrapZones[0]!;

    expect(activation.errors).toEqual([]);
    expect(activation.state.players.P1.lp).toBe(7200);
    expect(activation.events.some((event) => event.type === "cost-paid" && event.costKind === "life-points" && event.amount === 800)).toBe(true);
    expect(activation.state.chain[0]).toMatchObject({
      cardId: PREMATURE_BURIAL_ID,
      effectId: "pay-lp-revive-graveyard-monster",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P1.hand.some((card) => card.instanceId === premature.instanceId)).toBe(false);
    expect(resolved.state.players.P1.graveyard.some((card) => card.instanceId === target.instanceId)).toBe(false);
    expect(revived).toMatchObject({
      instanceId: target.instanceId,
      cardId: BLUE_EYES_ID,
      face: "faceUp",
      position: "attack",
    });
    expect(revived.attachments).toContain(premature.instanceId);
    expect(resolvedPremature).toMatchObject({
      instanceId: premature.instanceId,
      face: "faceUp",
      visibility: "public",
    });
    expect(resolvedPremature.attachments).toContain(target.instanceId);
  });

  it("destroys Premature Burial's revived monster when Premature Burial is destroyed", () => {
    const state = withBreakerPrematureAndOwnGraveyardMonster(
      stateWithPriority([PREMATURE_BURIAL_ID, BLUE_EYES_ID, BREAKER_THE_MAGICAL_WARRIOR_ID], []),
      BLUE_EYES_ID,
    );
    const premature = requireHandCard(state, "P1", PREMATURE_BURIAL_ID);
    const breaker = state.players.P1.monsterZones[0]!;
    const prematureActivation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: premature.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const prematureResolved = reduceDuel(prematureActivation.state, { type: "resolve-chain", playerId: "P1" });
    const revived = prematureResolved.state.players.P1.monsterZones[1]!;
    const breakerActivation = reduceDuel(prematureResolved.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: breaker.instanceId,
      effectId: "remove-spell-counter-destroy",
      targetRefs: [{ playerId: "P1", zone: "spellTrapZone", index: 0 }],
    });
    const breakerResolved = reduceDuel(breakerActivation.state, { type: "resolve-chain", playerId: "P1" });

    expect(breakerResolved.errors).toEqual([]);
    expect(breakerResolved.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(breakerResolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(breakerResolved.state.players.P1.graveyard.some((card) => card.instanceId === premature.instanceId)).toBe(true);
    expect(breakerResolved.state.players.P1.graveyard.some((card) => card.instanceId === revived.instanceId)).toBe(true);
  });

  it("destroys Premature Burial when its revived monster is destroyed by battle", () => {
    const state = withPrematureRevivingBattleOxIntoBlueEyes(
      stateWithPriority([PREMATURE_BURIAL_ID, BATTLE_OX_ID], [BLUE_EYES_ID]),
    );
    const premature = requireHandCard(state, "P1", PREMATURE_BURIAL_ID);
    const prematureActivation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: premature.instanceId,
      targetRefs: [{ playerId: "P1", zone: "graveyard", index: 0 }],
    });
    const prematureResolved = reduceDuel(prematureActivation.state, { type: "resolve-chain", playerId: "P1" });
    const battleReady = reduceDuel(prematureResolved.state, { type: "change-phase", playerId: "P1", phase: "BP" });
    const revived = battleReady.state.players.P1.monsterZones[0]!;
    const defender = battleReady.state.players.P2.monsterZones[0]!;
    const battle = reduceDuel(battleReady.state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: revived.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(battle.errors).toEqual([]);
    expect(battle.state.players.P1.lp).toBe(5900);
    expect(battle.state.players.P1.monsterZones[0]).toBeNull();
    expect(battle.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(battle.state.players.P1.graveyard.some((card) => card.instanceId === revived.instanceId)).toBe(true);
    expect(battle.state.players.P1.graveyard.some((card) => card.instanceId === premature.instanceId)).toBe(true);
  });

  it("equips Snatch Steal to an opponent's face-up monster and takes control of it", () => {
    const state = withOpponentMonsterTarget(stateWithPriority([SNATCH_STEAL_ID], [BLUE_EYES_ID]), BLUE_EYES_ID);
    const snatch = requireHandCard(state, "P1", SNATCH_STEAL_ID);
    const target = state.players.P2.monsterZones[0]!;
    const activation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: snatch.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const resolved = reduceDuel(activation.state, { type: "resolve-chain", playerId: "P1" });
    const stolen = resolved.state.players.P1.monsterZones[0]!;
    const resolvedSnatch = resolved.state.players.P1.spellTrapZones[0]!;

    expect(activation.errors).toEqual([]);
    expect(activation.state.chain[0]).toMatchObject({
      cardId: SNATCH_STEAL_ID,
      effectId: "take-control-equipped-monster",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.monsterZones[0]).toBeNull();
    expect(stolen).toMatchObject({
      instanceId: target.instanceId,
      cardId: BLUE_EYES_ID,
      owner: "P2",
      controller: "P1",
      face: "faceUp",
      position: "attack",
    });
    expect(stolen.attachments).toContain(snatch.instanceId);
    expect(resolvedSnatch).toMatchObject({
      instanceId: snatch.instanceId,
      face: "faceUp",
      visibility: "public",
    });
    expect(resolvedSnatch.attachments).toContain(target.instanceId);
  });

  it("returns Snatch Steal's equipped monster to its owner when Snatch Steal is destroyed", () => {
    const state = withBreakerAndOpponentMonsterTarget(
      stateWithPriority([SNATCH_STEAL_ID, BREAKER_THE_MAGICAL_WARRIOR_ID], [BLUE_EYES_ID]),
      BLUE_EYES_ID,
    );
    const snatch = requireHandCard(state, "P1", SNATCH_STEAL_ID);
    const target = state.players.P2.monsterZones[0]!;
    const breaker = state.players.P1.monsterZones[0]!;
    const snatchActivation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: snatch.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const snatchResolved = reduceDuel(snatchActivation.state, { type: "resolve-chain", playerId: "P1" });
    const breakerActivation = reduceDuel(snatchResolved.state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: breaker.instanceId,
      effectId: "remove-spell-counter-destroy",
      targetRefs: [{ playerId: "P1", zone: "spellTrapZone", index: 0 }],
    });
    const breakerResolved = reduceDuel(breakerActivation.state, { type: "resolve-chain", playerId: "P1" });
    const returned = breakerResolved.state.players.P2.monsterZones[0]!;

    expect(breakerResolved.errors).toEqual([]);
    expect(breakerResolved.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(breakerResolved.state.players.P1.monsterZones[1]).toBeNull();
    expect(returned).toMatchObject({
      instanceId: target.instanceId,
      owner: "P2",
      controller: "P2",
    });
    expect(returned.attachments).not.toContain(snatch.instanceId);
    expect(breakerResolved.state.players.P1.graveyard.some((card) => card.instanceId === snatch.instanceId)).toBe(true);
  });

  it("destroys Snatch Steal when its equipped monster is destroyed by battle", () => {
    const state = withOpponentBattleOxAndBlueEyes(stateWithPriority([SNATCH_STEAL_ID], [BATTLE_OX_ID, BLUE_EYES_ID]));
    const snatch = requireHandCard(state, "P1", SNATCH_STEAL_ID);
    const snatchActivation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: snatch.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const snatchResolved = reduceDuel(snatchActivation.state, { type: "resolve-chain", playerId: "P1" });
    const battleReady = reduceDuel(snatchResolved.state, { type: "change-phase", playerId: "P1", phase: "BP" });
    const stolen = battleReady.state.players.P1.monsterZones[0]!;
    const defender = battleReady.state.players.P2.monsterZones[1]!;
    const battle = reduceDuel(battleReady.state, {
      type: "attack",
      playerId: "P1",
      attackerInstanceId: stolen.instanceId,
      defenderInstanceId: defender.instanceId,
    });

    expect(battle.errors).toEqual([]);
    expect(battle.state.players.P1.lp).toBe(6700);
    expect(battle.state.players.P1.monsterZones[0]).toBeNull();
    expect(battle.state.players.P1.spellTrapZones[0]).toBeNull();
    expect(battle.state.players.P2.graveyard.some((card) => card.instanceId === stolen.instanceId)).toBe(true);
    expect(battle.state.players.P1.graveyard.some((card) => card.instanceId === snatch.instanceId)).toBe(true);
  });

  it("gives Snatch Steal's controller's opponent 1000 LP during that opponent's Standby Phase", () => {
    const state = withOpponentMonsterTarget(stateWithPriority([SNATCH_STEAL_ID], [BLUE_EYES_ID]), BLUE_EYES_ID);
    const snatch = requireHandCard(state, "P1", SNATCH_STEAL_ID);
    const snatchActivation = reduceDuel(state, {
      type: "activate-card",
      playerId: "P1",
      instanceId: snatch.instanceId,
      targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
    });
    const snatchResolved = reduceDuel(snatchActivation.state, { type: "resolve-chain", playerId: "P1" });
    const battle = reduceDuel(snatchResolved.state, { type: "change-phase", playerId: "P1", phase: "BP" });
    const main2 = reduceDuel(battle.state, { type: "change-phase", playerId: "P1", phase: "M2" });
    const end = reduceDuel(main2.state, { type: "change-phase", playerId: "P1", phase: "EP" });
    const p2Draw = reduceDuel(end.state, { type: "end-turn", playerId: "P1" });
    const p2Standby = reduceDuel(p2Draw.state, { type: "change-phase", playerId: "P2", phase: "SP" });
    const resolved = reduceDuel(p2Standby.state, { type: "resolve-chain", playerId: "P2" });

    expect(p2Standby.errors).toEqual([]);
    expect(p2Standby.state.chain[0]).toMatchObject({
      cardId: SNATCH_STEAL_ID,
      effectId: "opponent-standby-gain-lp",
    });
    expect(resolved.errors).toEqual([]);
    expect(resolved.state.players.P2.lp).toBe(9000);
    expect(resolved.events.some((event) => event.type === "lp-changed" && event.playerId === "P2" && event.delta === 1000)).toBe(true);
  });

  it("keeps unimplemented custom staples blocked from playable decks", () => {
    const result = validateDeck(deckWithPriority([METAMORPHOSIS_ID]), cards);

    expect(getCardCoverage(cardById(BREAKER_THE_MAGICAL_WARRIOR_ID)).status).toBe("goatCustom");
    expect(getCardCoverage(cardById(TRIBE_INFECTING_VIRUS_ID)).status).toBe("goatCustom");
    expect(getCardCoverage(cardById(SINISTER_SERPENT_ID)).status).toBe("goatCustom");
    expect(getCardCoverage(cardById(DD_WARRIOR_LADY_ID)).status).toBe("goatCustom");
    expect(getCardCoverage(cardById(INJECTION_FAIRY_LILY_ID)).status).toBe("goatCustom");
    expect(getCardCoverage(cardById(REFLECT_BOUNDER_ID)).status).toBe("goatCustom");
    expect(getCardCoverage(cardById(JINZO_ID)).status).toBe("goatCustom");
    expect(getCardCoverage(cardById(RING_OF_DESTRUCTION_ID)).status).toBe("goatCustom");
    expect(getCardCoverage(cardById(CALL_OF_THE_HAUNTED_ID)).status).toBe("goatCustom");
    expect(getCardCoverage(cardById(PREMATURE_BURIAL_ID)).status).toBe("goatCustom");
    expect(getCardCoverage(cardById(SNATCH_STEAL_ID)).status).toBe("goatCustom");
    expect(isPlayableCard(BREAKER_THE_MAGICAL_WARRIOR_ID, cards)).toBe(true);
    expect(isPlayableCard(TRIBE_INFECTING_VIRUS_ID, cards)).toBe(true);
    expect(isPlayableCard(SINISTER_SERPENT_ID, cards)).toBe(true);
    expect(isPlayableCard(DD_WARRIOR_LADY_ID, cards)).toBe(true);
    expect(isPlayableCard(INJECTION_FAIRY_LILY_ID, cards)).toBe(true);
    expect(isPlayableCard(REFLECT_BOUNDER_ID, cards)).toBe(true);
    expect(isPlayableCard(JINZO_ID, cards)).toBe(true);
    expect(isPlayableCard(RING_OF_DESTRUCTION_ID, cards)).toBe(true);
    expect(isPlayableCard(CALL_OF_THE_HAUNTED_ID, cards)).toBe(true);
    expect(isPlayableCard(PREMATURE_BURIAL_ID, cards)).toBe(true);
    expect(isPlayableCard(SNATCH_STEAL_ID, cards)).toBe(true);
    for (const cardId of [
      METAMORPHOSIS_ID,
      THOUSAND_EYES_RESTRICT_ID,
    ]) {
      expect(isPlayableCard(cardId, cards)).toBe(false);
    }
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Metamorphosis is not supported in playable decks.");
  });
});

function stateWithPriority(p1PriorityIds: readonly string[], p2PriorityIds: readonly string[]): DuelState {
  return advanceToM1(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(p1PriorityIds),
      P2: deckWithPriority(p2PriorityIds),
    },
    seed: "custom-staples-tests",
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
    seed: "custom-staples-draw-phase-tests",
    shuffleDecks: false,
  }).state;
}

function withBreakerAndTargetSpellTrap(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [
          zoneCard("p1-breaker", BREAKER_THE_MAGICAL_WARRIOR_ID, "P1", { counters: { spell: 1 } }),
          null,
          null,
          null,
          null,
        ],
      },
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

function withTribeAndSpellcasterMonsters(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [
          zoneCard("p1-tribe", TRIBE_INFECTING_VIRUS_ID, "P1"),
          zoneCard("p1-breaker", BREAKER_THE_MAGICAL_WARRIOR_ID, "P1"),
          null,
          null,
          null,
        ],
      },
      P2: {
        ...state.players.P2,
        monsterZones: [
          zoneCard("p2-aqua-madoor", AQUA_MADOOR_ID, "P2", { position: "defense" }),
          zoneCard("p2-face-down-breaker", BREAKER_THE_MAGICAL_WARRIOR_ID, "P2", {
            face: "faceDown",
            position: "defense",
            visibility: "hidden",
          }),
          zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"),
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

function battleStateWithBlueEyesAttackingReflectBounder(state: DuelState): DuelState {
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
        monsterZones: [zoneCard("p2-reflect-bounder", REFLECT_BOUNDER_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function withJinzoAndOwnSetTrap(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        monsterZones: [zoneCard("p1-jinzo", JINZO_ID, "P1"), null, null, null, null],
        spellTrapZones: [
          zoneCard("p1-sakuretsu", SAKURETSU_ARMOR_ID, "P1", {
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

function battleStateWithJinzoAttackingIntoSakuretsu(state: DuelState): DuelState {
  const base = advanceToBattlePhase(state);

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [zoneCard("p1-jinzo", JINZO_ID, "P1"), null, null, null, null],
      },
      P2: {
        ...base.players.P2,
        spellTrapZones: [
          zoneCard("p2-sakuretsu", SAKURETSU_ARMOR_ID, "P2", {
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

function battleStateWithGravityBind(options: { readonly includeJinzo: boolean }): DuelState {
  const base = advanceToBattlePhase(createDuel({
    cards,
    decks: {
      P1: deckWithPriority(options.includeJinzo ? [BATTLE_OX_ID, JINZO_ID] : [BATTLE_OX_ID]),
      P2: deckWithPriority([GRAVITY_BIND_ID]),
    },
    seed: "custom-staples-gravity-bind-tests",
    shuffleDecks: false,
    allowUnsupportedCards: true,
  }).state);

  return {
    ...base,
    cardScripts: createCardScriptRegistry([
      createContinuousTrapScript({
        cardId: GRAVITY_BIND_ID,
        continuous: {
          attackRestrictions: [
            {
              target: { controller: "any", face: "faceUp" },
              reason: "Gravity Bind-style attack restriction.",
            },
          ],
        },
      }),
    ]),
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [
          zoneCard("p1-battle-ox", BATTLE_OX_ID, "P1"),
          options.includeJinzo ? zoneCard("p1-jinzo", JINZO_ID, "P1") : null,
          null,
          null,
          null,
        ],
      },
      P2: {
        ...base.players.P2,
        spellTrapZones: [
          zoneCard("p2-gravity-bind", GRAVITY_BIND_ID, "P2", { position: null }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withRingAndTargetBreaker(state: DuelState): DuelState {
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
          zoneCard("p2-breaker", BREAKER_THE_MAGICAL_WARRIOR_ID, "P2", { counters: { spell: 1 } }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withBothPlayersLp(state: DuelState, lp: number): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        lp,
      },
      P2: {
        ...state.players.P2,
        lp,
      },
    },
  };
}

function withSetCallAndOwnGraveyardMonster(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P1: {
        ...state.players.P1,
        hand: state.players.P1.hand.filter((card) => card.cardId !== cardId && card.cardId !== CALL_OF_THE_HAUNTED_ID),
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
        graveyard: [zoneCard(`P1-${cardId}-graveyard`, cardId, "P1", { position: null })],
      },
    },
  };
}

function withBreakerSetCallAndOwnGraveyardMonster(state: DuelState, cardId: string): DuelState {
  const base = withSetCallAndOwnGraveyardMonster(state, cardId);

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [
          zoneCard("p1-breaker", BREAKER_THE_MAGICAL_WARRIOR_ID, "P1", { counters: { spell: 1 } }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function battleStateWithCallRevivingBattleOxIntoBlueEyes(state: DuelState): DuelState {
  const base = withSetCallAndOwnGraveyardMonster(advanceToBattlePhase(state), BATTLE_OX_ID);

  return {
    ...base,
    players: {
      ...base.players,
      P2: {
        ...base.players.P2,
        monsterZones: [zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function withPrematureAndOwnGraveyardMonster(state: DuelState, cardId: string): DuelState {
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

function withBreakerPrematureAndOwnGraveyardMonster(state: DuelState, cardId: string): DuelState {
  const base = withPrematureAndOwnGraveyardMonster(state, cardId);

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        monsterZones: [
          zoneCard("p1-breaker", BREAKER_THE_MAGICAL_WARRIOR_ID, "P1", { counters: { spell: 1 } }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withPrematureRevivingBattleOxIntoBlueEyes(state: DuelState): DuelState {
  const base = withPrematureAndOwnGraveyardMonster(state, BATTLE_OX_ID);

  return {
    ...base,
    players: {
      ...base.players,
      P2: {
        ...base.players.P2,
        monsterZones: [zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"), null, null, null, null],
      },
    },
  };
}

function withOpponentMonsterTarget(state: DuelState, cardId: string): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        hand: state.players.P2.hand.filter((card) => card.cardId !== cardId),
        monsterZones: [zoneCard(`p2-${cardId}-target`, cardId, "P2"), null, null, null, null],
      },
    },
  };
}

function withBreakerAndOpponentMonsterTarget(state: DuelState, cardId: string): DuelState {
  const base = withOpponentMonsterTarget(state, cardId);

  return {
    ...base,
    players: {
      ...base.players,
      P1: {
        ...base.players.P1,
        hand: base.players.P1.hand.filter((card) => card.cardId !== BREAKER_THE_MAGICAL_WARRIOR_ID),
        monsterZones: [
          zoneCard("p1-breaker", BREAKER_THE_MAGICAL_WARRIOR_ID, "P1", { counters: { spell: 1 } }),
          null,
          null,
          null,
          null,
        ],
      },
    },
  };
}

function withOpponentBattleOxAndBlueEyes(state: DuelState): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      P2: {
        ...state.players.P2,
        hand: state.players.P2.hand.filter((card) => card.cardId !== BATTLE_OX_ID && card.cardId !== BLUE_EYES_ID),
        monsterZones: [
          zoneCard("p2-battle-ox", BATTLE_OX_ID, "P2"),
          zoneCard("p2-blue-eyes", BLUE_EYES_ID, "P2"),
          null,
          null,
          null,
        ],
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

function derivedAtk(state: DuelState, playerId: "P1" | "P2", zoneIndex: number): number {
  const card = state.players[playerId].monsterZones[zoneIndex];

  if (!card) {
    throw new Error(`Expected ${playerId} monster at zone ${zoneIndex}.`);
  }

  const base = getMonsterBattleStats(state.cardDefinitions?.[card.cardId]);

  if (!base) {
    throw new Error(`Expected numeric stats for ${card.cardId}.`);
  }

  return deriveBattleStats(state, { playerId, card, base }).atk;
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
