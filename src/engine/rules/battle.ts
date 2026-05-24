import type { Phase } from "../../types";
import type { ZoneCard } from "../core/cardRefs";
import type { MonsterDefinition, CardDefinition } from "../data/cardCatalog";
import { createDamageStepState, type DamageStepState } from "./damageStep";

export interface BattleStats {
  readonly atk: number;
  readonly def: number;
}

export interface BattleValidationInput {
  readonly phase: Phase;
  readonly turn: number;
  readonly attacker: ZoneCard | null;
  readonly defender: ZoneCard | null;
  readonly defenderRequested: boolean;
  readonly opponentControlsMonsters: boolean;
}

export interface BattleOutcome {
  readonly damagePlayerId: "attacker" | "defender" | null;
  readonly damage: number;
  readonly destroyAttacker: boolean;
  readonly destroyDefender: boolean;
}

export function createDamageCalculationStep(
  attacker: ZoneCard,
  defender: ZoneCard | null,
): DamageStepState {
  return createDamageStepState({
    substep: "damage-calculation",
    attackerInstanceId: attacker.instanceId,
    defenderInstanceId: defender?.instanceId,
  });
}

export function validateAttackDeclaration(input: BattleValidationInput): string | null {
  if (input.phase !== "BP") {
    return "Attacks can only be declared during the Battle Phase.";
  }

  if (!input.attacker) {
    return "Selected attacker is not controlled by that player.";
  }

  if (input.attacker.face !== "faceUp" || input.attacker.position !== "attack") {
    return "Only face-up Attack Position monsters can attack.";
  }

  if (input.attacker.attackedTurn === input.turn) {
    return "That monster has already attacked this turn.";
  }

  if (input.defenderRequested && !input.defender) {
    return "Selected defender is not controlled by the opponent.";
  }

  if (!input.defenderRequested && input.opponentControlsMonsters) {
    return "A direct attack is not legal while the opponent controls monsters.";
  }

  return null;
}

export function getMonsterBattleStats(card: CardDefinition | undefined): BattleStats | null {
  if (!card || card.kind !== "monster") {
    return null;
  }

  const atk = normalizeBattleStat(card.monster.atk);
  const def = normalizeBattleStat(card.monster.def);

  if (atk === null || def === null) {
    return null;
  }

  return { atk, def };
}

export function resolveMonsterBattle(
  attacker: BattleStats,
  defender: BattleStats,
  defenderPosition: ZoneCard["position"],
): BattleOutcome {
  const opposingValue = defenderPosition === "defense" ? defender.def : defender.atk;

  if (defenderPosition === "attack") {
    if (attacker.atk > opposingValue) {
      return {
        damagePlayerId: "defender",
        damage: attacker.atk - opposingValue,
        destroyAttacker: false,
        destroyDefender: true,
      };
    }

    if (attacker.atk < opposingValue) {
      return {
        damagePlayerId: "attacker",
        damage: opposingValue - attacker.atk,
        destroyAttacker: true,
        destroyDefender: false,
      };
    }

    return {
      damagePlayerId: null,
      damage: 0,
      destroyAttacker: true,
      destroyDefender: true,
    };
  }

  if (attacker.atk > opposingValue) {
    return {
      damagePlayerId: null,
      damage: 0,
      destroyAttacker: false,
      destroyDefender: true,
    };
  }

  if (attacker.atk < opposingValue) {
    return {
      damagePlayerId: "attacker",
      damage: opposingValue - attacker.atk,
      destroyAttacker: false,
      destroyDefender: false,
    };
  }

  return {
    damagePlayerId: null,
    damage: 0,
    destroyAttacker: false,
    destroyDefender: false,
  };
}

export function isMonsterDefinition(card: CardDefinition | undefined): card is MonsterDefinition {
  return card?.kind === "monster";
}

function normalizeBattleStat(value: MonsterDefinition["monster"]["atk"]): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }

  return null;
}
