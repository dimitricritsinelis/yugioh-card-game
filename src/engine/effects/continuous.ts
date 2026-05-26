import { getCardScriptForDefinitions } from "../cards/unsupported";
import type { ZoneCard, ZoneRef } from "../core/cardRefs";
import { findCardByInstanceId } from "../core/zones";
import type { DuelState } from "../core/state";
import type { BattleStats } from "../rules/battle";
import type { CardKind } from "../data/cardCatalog";
import type { PlayerId } from "../types";

export type EffectTargetController = "own" | "opponent" | "any";
export type BattleStat = "atk" | "def";

export interface EffectTargetFilter {
  readonly source?: "self";
  readonly attachedToSource?: boolean;
  readonly sourceEffectIds?: readonly string[];
  readonly attackingFaceDownDefenseMonster?: boolean;
  readonly controller?: EffectTargetController;
  readonly instanceIds?: readonly string[];
  readonly cardIds?: readonly string[];
  readonly face?: "faceUp" | "faceDown" | "any";
  readonly counters?: readonly CounterRequirement[];
  readonly monsterType?: string;
  readonly attribute?: string;
  readonly levelMin?: number;
  readonly levelMax?: number;
}

export interface CounterRequirement {
  readonly counterType: string;
  readonly min?: number;
  readonly max?: number;
}

export interface StatModifierSpec {
  readonly stat: BattleStat;
  readonly amount?: number;
  readonly setTo?: number;
  readonly target: EffectTargetFilter;
}

export interface AttackRestrictionSpec {
  readonly target: EffectTargetFilter;
  readonly defender?: EffectTargetFilter;
  readonly reason?: string;
}

export interface DirectAttackSpec {
  readonly target: EffectTargetFilter;
}

export interface DirectAttackRestrictionSpec {
  readonly target: EffectTargetFilter;
  readonly reason?: string;
}

export interface PiercingDamageSpec {
  readonly target: EffectTargetFilter;
}

export interface ActivationRestrictionSpec {
  readonly cardKinds?: readonly CardKind[];
  readonly controller?: EffectTargetController;
  readonly phases?: readonly DuelState["phase"][];
  readonly reason?: string;
}

export interface EffectNegationSpec {
  readonly cardKinds?: readonly CardKind[];
  readonly controller?: EffectTargetController;
}

export interface ContinuousEffectDefinition {
  readonly statModifiers?: readonly StatModifierSpec[];
  readonly attackRestrictions?: readonly AttackRestrictionSpec[];
  readonly directAttackRestrictions?: readonly DirectAttackRestrictionSpec[];
  readonly directAttack?: readonly DirectAttackSpec[];
  readonly piercingDamage?: readonly PiercingDamageSpec[];
  readonly activationRestrictions?: readonly ActivationRestrictionSpec[];
  readonly effectNegations?: readonly EffectNegationSpec[];
}

export interface ContinuousEffectSource {
  readonly playerId: PlayerId;
  readonly sourceInstanceId: string;
  readonly sourceCardId: string;
  readonly sourceZone: ZoneRef["zone"] | "lingering";
  readonly effectId: string;
  readonly definition: ContinuousEffectDefinition;
}

export interface MonsterStatInput {
  readonly playerId: PlayerId;
  readonly card: ZoneCard;
  readonly base: BattleStats;
}

export function deriveBattleStats(state: DuelState, input: MonsterStatInput): BattleStats {
  const modifiers = collectContinuousSources(state).flatMap((source) =>
    (source.definition.statModifiers ?? []).map((modifier) => ({
      sourceInstanceId: source.sourceInstanceId,
      sourcePlayerId: source.playerId,
      modifier,
    })),
  );
  const modified = modifiers.reduce(
    (stats, modifier) => {
      if (!matchesTarget(state, input, modifier.sourcePlayerId, modifier.modifier.target, modifier.sourceInstanceId)) {
        return stats;
      }

      const current = modifier.modifier.stat === "atk" ? stats.atk : stats.def;
      const value = modifier.modifier.setTo ?? current + (modifier.modifier.amount ?? 0);

      return {
        atk: modifier.modifier.stat === "atk" ? value : stats.atk,
        def: modifier.modifier.stat === "def" ? value : stats.def,
      };
    },
    input.base,
  );

  return {
    atk: Math.max(0, modified.atk),
    def: Math.max(0, modified.def),
  };
}

export function validateContinuousAttackRestrictions(
  state: DuelState,
  playerId: PlayerId,
  attacker: ZoneCard,
  defender?: { readonly playerId: PlayerId; readonly card: ZoneCard } | null,
): string | null {
  const input = { playerId, card: attacker, base: { atk: 0, def: 0 } };

  for (const source of collectContinuousSources(state)) {
    for (const restriction of source.definition.attackRestrictions ?? []) {
      const defenderInput = defender
        ? { playerId: defender.playerId, card: defender.card, base: { atk: 0, def: 0 } }
        : null;
      const defenderMatches = !restriction.defender || (
        defenderInput !== null &&
        matchesTarget(state, defenderInput, source.playerId, restriction.defender, source.sourceInstanceId)
      );

      if (defenderMatches && matchesTarget(state, input, source.playerId, restriction.target, source.sourceInstanceId)) {
        return restriction.reason ?? "That monster cannot attack because of an active effect.";
      }
    }
  }

  return null;
}

export function canAttackDirectly(state: DuelState, input: Omit<MonsterStatInput, "base">): boolean {
  const matcher = { ...input, base: { atk: 0, def: 0 } };

  return collectContinuousSources(state).some((source) =>
    (source.definition.directAttack ?? []).some((effect) =>
      matchesTarget(state, matcher, source.playerId, effect.target, source.sourceInstanceId),
    ),
  );
}

export function validateDirectAttackRestrictions(
  state: DuelState,
  playerId: PlayerId,
  attacker: ZoneCard,
): string | null {
  const input = { playerId, card: attacker, base: { atk: 0, def: 0 } };

  for (const source of collectContinuousSources(state)) {
    for (const restriction of source.definition.directAttackRestrictions ?? []) {
      if (matchesTarget(state, input, source.playerId, restriction.target, source.sourceInstanceId)) {
        return restriction.reason ?? "That monster cannot attack directly because of an active effect.";
      }
    }
  }

  return null;
}

export function hasPiercingDamage(state: DuelState, input: Omit<MonsterStatInput, "base">): boolean {
  const matcher = { ...input, base: { atk: 0, def: 0 } };

  return collectContinuousSources(state).some((source) =>
    (source.definition.piercingDamage ?? []).some((effect) =>
      matchesTarget(state, matcher, source.playerId, effect.target, source.sourceInstanceId),
    ),
  );
}

export function validateContinuousActivationRestrictions(
  state: DuelState,
  playerId: PlayerId,
  cardKind: CardKind,
): string | null {
  for (const source of collectContinuousSources(state)) {
    for (const restriction of source.definition.activationRestrictions ?? []) {
      if (restriction.phases && !restriction.phases.includes(state.phase)) {
        continue;
      }

      if (matchesCardEffectFilter(source.playerId, playerId, cardKind, restriction)) {
        return restriction.reason ?? "That card cannot be activated because of an active effect.";
      }
    }
  }

  return null;
}

export function collectContinuousSources(state: DuelState): readonly ContinuousEffectSource[] {
  const sources = collectRawContinuousSources(state);

  return Object.freeze(sources.filter((source) => !isContinuousSourceNegated(state, sources, source)));
}

function collectRawContinuousSources(state: DuelState): readonly ContinuousEffectSource[] {
  const sources: ContinuousEffectSource[] = [];

  for (const source of collectFieldSources(state)) {
    const script = getCardScriptForDefinitions(source.card.cardId, state.cardDefinitions, state.cardScripts);

    for (const effect of script?.effects ?? []) {
      if (effect.kind === "continuous" && effect.implemented && effect.continuous) {
        sources.push({
          playerId: source.ref.playerId,
          sourceInstanceId: source.card.instanceId,
          sourceCardId: source.card.cardId,
          sourceZone: source.ref.zone,
          effectId: effect.id,
          definition: effect.continuous,
        });
      }
    }
  }

  for (const lingering of state.lingeringEffects ?? []) {
    sources.push({
      playerId: lingering.playerId,
      sourceInstanceId: lingering.sourceInstanceId,
      sourceCardId: lingering.sourceCardId,
      sourceZone: "lingering",
      effectId: lingering.effectId,
      definition: lingering.definition,
    });
  }

  return Object.freeze(sources);
}

function isContinuousSourceNegated(
  state: DuelState,
  sources: readonly ContinuousEffectSource[],
  source: ContinuousEffectSource,
): boolean {
  if (source.sourceZone === "lingering") {
    return false;
  }

  const sourceKind = state.cardDefinitions?.[source.sourceCardId]?.kind;

  if (!sourceKind) {
    return false;
  }

  return sources.some((negationSource) =>
    negationSource.sourceInstanceId !== source.sourceInstanceId &&
    (negationSource.definition.effectNegations ?? []).some((negation) =>
      matchesCardEffectFilter(negationSource.playerId, source.playerId, sourceKind, negation),
    ),
  );
}

function matchesCardEffectFilter(
  sourcePlayerId: PlayerId,
  targetPlayerId: PlayerId,
  cardKind: CardKind,
  filter: ActivationRestrictionSpec | EffectNegationSpec,
): boolean {
  if (filter.cardKinds && !filter.cardKinds.includes(cardKind)) {
    return false;
  }

  if (filter.controller && filter.controller !== "any") {
    const own = targetPlayerId === sourcePlayerId;

    if (filter.controller === "own" && !own) {
      return false;
    }

    if (filter.controller === "opponent" && own) {
      return false;
    }
  }

  return true;
}

function matchesTarget(
  state: DuelState,
  input: MonsterStatInput,
  sourcePlayerId: PlayerId,
  target: EffectTargetFilter,
  sourceInstanceId?: string,
): boolean {
  if (target.source === "self" && input.card.instanceId !== sourceInstanceId) {
    return false;
  }

  if (target.attackingFaceDownDefenseMonster && !matchesPendingAttackAgainstFaceDownDefense(state, input, sourceInstanceId)) {
    return false;
  }

  if (target.attachedToSource && (!sourceInstanceId || !input.card.attachments.includes(sourceInstanceId))) {
    return false;
  }

  if (target.sourceEffectIds !== undefined) {
    if (!sourceInstanceId) {
      return false;
    }

    const source = findCardByInstanceId(state, sourceInstanceId);

    if (!source || !("face" in source.card)) {
      return false;
    }

    const markers = source.card.effectMarkers ?? [];

    if (!target.sourceEffectIds.some((effectId) => markers.includes(effectId))) {
      return false;
    }
  }

  if (target.controller && target.controller !== "any") {
    const own = input.playerId === sourcePlayerId;

    if (target.controller === "own" && !own) {
      return false;
    }

    if (target.controller === "opponent" && own) {
      return false;
    }
  }

  if (target.instanceIds && !target.instanceIds.includes(input.card.instanceId)) {
    return false;
  }

  if (target.cardIds && !target.cardIds.includes(input.card.cardId)) {
    return false;
  }

  if (target.face && target.face !== "any" && input.card.face !== target.face) {
    return false;
  }

  for (const counter of target.counters ?? []) {
    const value = input.card.counters[counter.counterType] ?? 0;

    if (counter.min !== undefined && value < counter.min) {
      return false;
    }

    if (counter.max !== undefined && value > counter.max) {
      return false;
    }
  }

  if (target.monsterType !== undefined || target.attribute !== undefined || target.levelMin !== undefined || target.levelMax !== undefined) {
    const definition = state.cardDefinitions?.[input.card.cardId];

    if (!definition || definition.kind !== "monster") {
      return false;
    }

    if (target.monsterType !== undefined && definition.monster.type !== target.monsterType) {
      return false;
    }

    if (target.attribute !== undefined && definition.monster.attribute !== target.attribute) {
      return false;
    }

    if (target.levelMin !== undefined && (definition.monster.level ?? 0) < target.levelMin) {
      return false;
    }

    if (target.levelMax !== undefined && (definition.monster.level ?? 0) > target.levelMax) {
      return false;
    }
  }

  return true;
}

function matchesPendingAttackAgainstFaceDownDefense(
  state: DuelState,
  input: MonsterStatInput,
  sourceInstanceId: string | undefined,
): boolean {
  const pending = state.pendingAttack;

  const effectSourceMatchesInput = sourceInstanceId !== undefined &&
    (input.card.instanceId === sourceInstanceId || input.card.attachments.includes(sourceInstanceId));

  if (!pending || !effectSourceMatchesInput || pending.attackerInstanceId !== input.card.instanceId) {
    return false;
  }

  const defender = pending.defenderInstanceId ? findCardByInstanceId(state, pending.defenderInstanceId) : null;

  return (
    defender?.ref.zone === "monsterZone" &&
    "face" in defender.card &&
    defender.card.face === "faceDown" &&
    defender.card.position === "defense"
  );
}

function collectFieldSources(state: DuelState): readonly { readonly ref: ZoneRef; readonly card: ZoneCard }[] {
  const sources: { readonly ref: ZoneRef; readonly card: ZoneCard }[] = [];

  for (const playerId of ["P1", "P2"] as const) {
    state.players[playerId].monsterZones.forEach((card, index) => {
      if (card?.face === "faceUp") {
        sources.push({ ref: { playerId, zone: "monsterZone", index }, card });
      }
    });

    state.players[playerId].spellTrapZones.forEach((card, index) => {
      if (card?.face === "faceUp") {
        sources.push({ ref: { playerId, zone: "spellTrapZone", index }, card });
      }
    });

    const fieldCard = state.players[playerId].fieldZone;

    if (fieldCard?.face === "faceUp") {
      sources.push({ ref: { playerId, zone: "fieldZone" }, card: fieldCard });
    }
  }

  return sources;
}

export function isSourceOnField(state: DuelState, sourceInstanceId: string): boolean {
  const located = findCardByInstanceId(state, sourceInstanceId);

  return (
    located?.ref.zone === "monsterZone" ||
    located?.ref.zone === "spellTrapZone" ||
    located?.ref.zone === "fieldZone"
  );
}
