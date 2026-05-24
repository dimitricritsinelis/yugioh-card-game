import type { EffectDefinition, EffectPlayerSelector, SpellSpeed } from "../cards/CardScript";
import { getCardScriptForDefinitions } from "../cards/unsupported";
import type { EnginePrompt } from "../result";
import type { DuelState } from "../core/state";
import { collectCardLocations } from "../core/invariants";
import type { MonsterPosition, ZoneRef } from "../core/cardRefs";
import type { TargetSpec } from "../effects/targets";
import { validateContinuousActivationRestrictions } from "../effects/continuous";
import type { BattleCompletedEvent, EngineEvent, EngineEventType } from "../events";
import type { PlayerId } from "../types";

export type TriggerTiming = "after-action" | "chain-resolved";

export interface TriggerDefinition {
  readonly timing: TriggerTiming;
  readonly eventTypes?: readonly EngineEventType[];
  readonly eventPlayer?: EffectPlayerSelector | "any";
  readonly sourceEvent?: "self" | "any";
  readonly summonKinds?: readonly ("normal" | "tribute" | "flip" | "special")[];
  readonly fromZones?: readonly ZoneRef["zone"][];
  readonly toZones?: readonly ZoneRef["zone"][];
  readonly moveReasons?: readonly string[];
  readonly phaseFrom?: readonly string[];
  readonly phaseTo?: readonly string[];
  readonly battleRole?: "attacker" | "defender" | "any";
  readonly battlePositions?: readonly MonsterPosition[];
  readonly optional?: boolean;
}

export interface TriggerCandidate {
  readonly playerId: PlayerId;
  readonly sourceInstanceId: string;
  readonly cardId: string;
  readonly effectId: string;
  readonly spellSpeed: SpellSpeed;
  readonly optional: boolean;
  readonly timing: TriggerTiming;
  readonly triggerEvent?: EngineEvent;
  readonly targetSpecs?: readonly TargetSpec[];
}

export function collectTriggerCandidates(
  state: DuelState,
  events: readonly EngineEvent[],
  timing: TriggerTiming,
): readonly TriggerCandidate[] {
  const candidates: TriggerCandidate[] = [];

  for (const location of collectCardLocations(state)) {
    if (!isTriggerSourceZone(location.ref.zone)) {
      continue;
    }

    if (isTrapLockedBySetTurn(state, location.ref, location.cardId)) {
      continue;
    }

    const cardDefinition = state.cardDefinitions?.[location.cardId];

    if (
      cardDefinition &&
      validateContinuousActivationRestrictions(state, location.ref.playerId, cardDefinition.kind)
    ) {
      continue;
    }

    const script = getCardScriptForDefinitions(location.cardId, state.cardDefinitions, state.cardScripts);

    if (!script) {
      continue;
    }

    for (const effect of script.effects) {
      const triggerEvent = matchingTriggerEvent(effect, events, timing, location.ref.playerId, location.instanceId);

      if (triggerEvent) {
        candidates.push({
          playerId: location.ref.playerId,
          sourceInstanceId: location.instanceId,
          cardId: location.cardId,
          effectId: effect.id,
          spellSpeed: effect.spellSpeed ?? 1,
          optional: effect.trigger?.optional ?? false,
          timing,
          triggerEvent,
          targetSpecs: effect.targets,
        });
      }
    }
  }

  return orderTriggers(candidates, state.activePlayer);
}

function isTriggerSourceZone(zone: ZoneRef["zone"]): boolean {
  return zone === "monsterZone" || zone === "spellTrapZone" || zone === "fieldZone" || zone === "graveyard";
}

export function createOptionalTriggerPrompt(candidate: TriggerCandidate, id: string): EnginePrompt {
  return Object.freeze({
    id,
    playerId: candidate.playerId,
    kind: "yes-no",
    message: `${candidate.playerId} may activate an optional trigger.`,
    min: 1,
    max: 1,
    metadata: triggerPromptMetadata(candidate),
  });
}

export function createTriggerTargetPrompt(candidate: TriggerCandidate, id: string): EnginePrompt {
  const cardSpec = candidate.targetSpecs?.find((spec) => spec.kind === "card");

  return Object.freeze({
    id,
    playerId: candidate.playerId,
    kind: "target",
    message: `${candidate.playerId} must choose target cards.`,
    min: cardSpec?.min ?? 1,
    max: cardSpec?.max ?? 1,
    metadata: triggerPromptMetadata(candidate),
  });
}

export function triggerCandidateFromPrompt(prompt: EnginePrompt): TriggerCandidate | null {
  if ((prompt.kind !== "yes-no" && prompt.kind !== "target") || prompt.metadata?.trigger !== "true") {
    return null;
  }

  const spellSpeed = Number(prompt.metadata.spellSpeed);

  if (spellSpeed !== 1 && spellSpeed !== 2 && spellSpeed !== 3) {
    return null;
  }

  return {
    playerId: prompt.playerId,
    sourceInstanceId: prompt.metadata.sourceInstanceId,
    cardId: prompt.metadata.cardId,
    effectId: prompt.metadata.effectId,
    spellSpeed,
    optional: prompt.kind === "yes-no",
    timing: prompt.metadata.timing === "chain-resolved" ? "chain-resolved" : "after-action",
    triggerEvent: triggerEventFromPromptMetadata(prompt.metadata),
  };
}

function triggerPromptMetadata(candidate: TriggerCandidate): Readonly<Record<string, string>> {
  const metadata: Record<string, string> = {
    trigger: "true",
    sourceInstanceId: candidate.sourceInstanceId,
    cardId: candidate.cardId,
    effectId: candidate.effectId,
    spellSpeed: String(candidate.spellSpeed),
    timing: candidate.timing,
  };

  if (candidate.triggerEvent?.type === "battle-completed") {
    metadata.triggerEventType = candidate.triggerEvent.type;
    metadata.attackerPlayerId = candidate.triggerEvent.attackerPlayerId;
    metadata.defenderPlayerId = candidate.triggerEvent.defenderPlayerId;
    metadata.attackerInstanceId = candidate.triggerEvent.attackerInstanceId;
    metadata.attackerCardId = candidate.triggerEvent.attackerCardId;
    metadata.attackerBattleAtk = String(candidate.triggerEvent.attackerBattleAtk);
    metadata.attackerBattlePosition = candidate.triggerEvent.attackerBattlePosition ?? "";
    metadata.defenderInstanceId = candidate.triggerEvent.defenderInstanceId;
    metadata.defenderCardId = candidate.triggerEvent.defenderCardId;
    metadata.defenderBattlePosition = candidate.triggerEvent.defenderBattlePosition ?? "";
  }

  return metadata;
}

function matchingTriggerEvent(
  effect: EffectDefinition,
  events: readonly EngineEvent[],
  timing: TriggerTiming,
  sourcePlayerId: PlayerId,
  sourceInstanceId: string,
): EngineEvent | null {
  if (effect.kind !== "trigger" || !effect.implemented || !effect.trigger) {
    return null;
  }

  if (effect.trigger.timing !== timing) {
    return null;
  }

  return events.find((event) => matchesTriggerEvent(effect.trigger!, event, sourcePlayerId, sourceInstanceId)) ?? null;
}

function matchesTriggerEvent(
  trigger: TriggerDefinition,
  event: EngineEvent,
  sourcePlayerId: PlayerId,
  sourceInstanceId: string,
): boolean {
  if (trigger.eventTypes && !trigger.eventTypes.includes(event.type)) {
    return false;
  }

  if (trigger.eventPlayer && trigger.eventPlayer !== "any" && !event.playerId) {
    return false;
  }

  if (trigger.eventPlayer === "self" && event.playerId !== sourcePlayerId) {
    return false;
  }

  if (trigger.eventPlayer === "opponent" && event.playerId === sourcePlayerId) {
    return false;
  }

  if (trigger.sourceEvent === "self" && !eventMatchesSource(event, sourceInstanceId)) {
    return false;
  }

  if (trigger.summonKinds && event.type === "summon-successful" && !trigger.summonKinds.includes(event.summonKind)) {
    return false;
  }

  if (trigger.fromZones && event.type === "card-moved" && !trigger.fromZones.includes(event.from.zone)) {
    return false;
  }

  if (trigger.toZones && event.type === "card-moved" && !trigger.toZones.includes(event.to.zone)) {
    return false;
  }

  if (trigger.moveReasons && event.type === "card-moved" && !trigger.moveReasons.includes(String(event.metadata?.reason ?? ""))) {
    return false;
  }

  if (trigger.phaseFrom && event.type === "phase-changed" && !trigger.phaseFrom.includes(event.from)) {
    return false;
  }

  if (trigger.phaseTo && event.type === "phase-changed" && !trigger.phaseTo.includes(event.to)) {
    return false;
  }

  if (event.type === "battle-completed" && !matchesBattleTrigger(trigger, event, sourceInstanceId)) {
    return false;
  }

  return true;
}

function eventMatchesSource(event: EngineEvent, sourceInstanceId: string): boolean {
  if (event.type === "attack-declared") {
    return event.attackerInstanceId === sourceInstanceId || event.defenderInstanceId === sourceInstanceId;
  }

  if (event.type === "battle-completed") {
    return event.attackerInstanceId === sourceInstanceId || event.defenderInstanceId === sourceInstanceId;
  }

  return eventInstanceId(event) === sourceInstanceId;
}

function triggerEventFromPromptMetadata(metadata: Readonly<Record<string, string>>): BattleCompletedEvent | undefined {
  if (metadata.triggerEventType !== "battle-completed") {
    return undefined;
  }

  return {
    id: "prompt-battle-completed",
    type: "battle-completed",
    message: "A monster battle completed.",
    playerId: metadata.attackerPlayerId as PlayerId,
    attackerPlayerId: metadata.attackerPlayerId as PlayerId,
    defenderPlayerId: metadata.defenderPlayerId as PlayerId,
    attackerInstanceId: metadata.attackerInstanceId,
    attackerCardId: metadata.attackerCardId,
    attackerBattleAtk: Number(metadata.attackerBattleAtk ?? 0),
    attackerBattlePosition: monsterPositionFromMetadata(metadata.attackerBattlePosition),
    defenderInstanceId: metadata.defenderInstanceId,
    defenderCardId: metadata.defenderCardId,
    defenderBattlePosition: monsterPositionFromMetadata(metadata.defenderBattlePosition),
  };
}

function matchesBattleTrigger(
  trigger: TriggerDefinition,
  event: BattleCompletedEvent,
  sourceInstanceId: string,
): boolean {
  const role = battleRoleForSource(event, sourceInstanceId);

  if (!role) {
    return false;
  }

  if (trigger.battleRole && trigger.battleRole !== "any" && trigger.battleRole !== role) {
    return false;
  }

  const position = battlePositionForSource(event, sourceInstanceId);

  if (trigger.battlePositions && (!position || !trigger.battlePositions.includes(position))) {
    return false;
  }

  return true;
}

function battleRoleForSource(event: BattleCompletedEvent, sourceInstanceId: string): "attacker" | "defender" | null {
  if (event.attackerInstanceId === sourceInstanceId) {
    return "attacker";
  }

  if (event.defenderInstanceId === sourceInstanceId) {
    return "defender";
  }

  return null;
}

function battlePositionForSource(event: BattleCompletedEvent, sourceInstanceId: string): MonsterPosition | null {
  if (event.attackerInstanceId === sourceInstanceId) {
    return event.attackerBattlePosition;
  }

  if (event.defenderInstanceId === sourceInstanceId) {
    return event.defenderBattlePosition;
  }

  return null;
}

function monsterPositionFromMetadata(value: string | undefined): MonsterPosition | null {
  return value === "attack" || value === "defense" ? value : null;
}

function eventInstanceId(event: EngineEvent): string | undefined {
  switch (event.type) {
    case "card-drawn":
    case "card-moved":
    case "summon-declared":
    case "summon-successful":
    case "monster-set":
    case "spell-trap-set":
    case "position-changed":
    case "card-destroyed":
    case "card-banished":
    case "effect-activated":
      return event.instanceId;
    case "effect-not-implemented":
      return event.instanceId;
    case "battle-completed":
      return event.attackerInstanceId;
    case "chain-resolved":
      return event.sourceInstanceId;
    case "attack-declared":
      return event.attackerInstanceId;
    case "battle-damage":
      return event.sourceInstanceId;
    case "targets-chosen":
      return event.sourceInstanceId;
    case "chain-link-created":
      return event.sourceInstanceId;
    case "duel-started":
    case "turn-started":
    case "phase-changed":
    case "lp-changed":
    case "cost-paid":
    case "prompt-created":
    case "prompt-resolved":
    case "player-lost":
    case "duel-finished":
    case "illegal-action":
      return undefined;
  }
}

function isTrapLockedBySetTurn(state: DuelState, ref: ZoneRef, cardId: string): boolean {
  if (ref.zone !== "spellTrapZone") {
    return false;
  }

  const card = state.players[ref.playerId].spellTrapZones[ref.index];
  const definition = state.cardDefinitions?.[cardId];

  return definition?.kind === "trap" && card?.setTurn === state.turn;
}

function orderTriggers(candidates: readonly TriggerCandidate[], turnPlayer: PlayerId): readonly TriggerCandidate[] {
  return Object.freeze([
    ...candidates.filter((candidate) => candidate.playerId === turnPlayer),
    ...candidates.filter((candidate) => candidate.playerId !== turnPlayer),
  ]);
}
