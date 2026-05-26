import type { Phase } from "../../types";
import type { MonsterDefinition, CardDefinition } from "../data/cardCatalog";
import type { PlayerState } from "../core/state";

export type MonsterPlayKind = "normal-summon" | "set-monster";

export interface MonsterPlayValidation {
  readonly valid: boolean;
  readonly reason?: string;
  readonly requiredTributes: number;
}

export function isMainPhase(phase: Phase): boolean {
  return phase === "M1" || phase === "M2";
}

export function validateMonsterPlay(
  player: PlayerState,
  card: CardDefinition | undefined,
  zoneIndex: number,
  tributeInstanceIds: readonly string[] = [],
): MonsterPlayValidation {
  const playable = validateNormalSummonableCard(card);

  if (playable) {
    return { valid: false, reason: playable, requiredTributes: 0 };
  }

  const requiredTributes = requiredTributeCount(card as MonsterDefinition);

  if (player.normalSummonUsed) {
    return {
      valid: false,
      reason: "A Normal Summon or Set has already been used this turn.",
      requiredTributes,
    };
  }

  const tributeValidation = validateTributes(player, zoneIndex, tributeInstanceIds, requiredTributes);

  if (tributeValidation) {
    return {
      valid: false,
      reason: tributeValidation,
      requiredTributes,
    };
  }

  return { valid: true, requiredTributes };
}

export function validateFlipSummonCard(card: CardDefinition | undefined): string | null {
  if (!card) {
    return "Card definition is missing for that monster.";
  }

  if (card.kind !== "monster") {
    return "Only monsters can be Flip Summoned.";
  }

  if (card.classifications.includes("Fusion")) {
    return "Fusion Monsters cannot be summoned because Extra Deck summons are outside playable scope.";
  }

  return null;
}

export function requiredTributeCount(card: MonsterDefinition): number {
  const level = card.monster.level ?? 0;

  if (level >= 7) {
    return 2;
  }

  if (level >= 5) {
    return 1;
  }

  return 0;
}

function validateNormalSummonableCard(card: CardDefinition | undefined): string | null {
  if (!card) {
    return "Card definition is missing for that monster.";
  }

  if (card.kind !== "monster") {
    return "Only monsters can be Normal Summoned or Set.";
  }

  if (card.classifications.includes("Fusion")) {
    return "Fusion Monsters cannot be summoned because Extra Deck summons are outside playable scope.";
  }

  if (card.classifications.includes("Ritual")) {
    return "Ritual Monsters cannot be Normal Summoned or Set.";
  }

  return null;
}

function validateTributes(
  player: PlayerState,
  zoneIndex: number,
  tributeInstanceIds: readonly string[],
  requiredTributes: number,
): string | null {
  if (!Number.isInteger(zoneIndex) || zoneIndex < 0 || zoneIndex >= player.monsterZones.length) {
    return `Monster Zone ${zoneIndex} is outside zone bounds.`;
  }

  if (tributeInstanceIds.length !== requiredTributes) {
    return `This monster requires exactly ${requiredTributes} Tribute${requiredTributes === 1 ? "" : "s"}.`;
  }

  const uniqueTributes = new Set(tributeInstanceIds);

  if (uniqueTributes.size !== tributeInstanceIds.length) {
    return "The same monster cannot be Tributed more than once.";
  }

  for (const tributeId of uniqueTributes) {
    const tribute = player.monsterZones.find((zone) => zone?.instanceId === tributeId);

    if (!tribute) {
      return "Tributes must be monsters you control.";
    }

    if (tribute.token?.cannotBeTributedForTributeSummon) {
      return "That Token cannot be Tributed for a Tribute Summon.";
    }
  }

  const targetZone = player.monsterZones[zoneIndex];

  if (targetZone && !uniqueTributes.has(targetZone.instanceId)) {
    return "That Monster Zone is occupied. Tribute that monster or choose an empty zone.";
  }

  return null;
}
