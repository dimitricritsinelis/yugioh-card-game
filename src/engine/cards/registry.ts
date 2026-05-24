import type { CardCoverageRegistry } from "./coverage";
import type { CardScript } from "./CardScript";
import { CARD_SCRIPT_LIST } from "./scripts";
import { CUSTOM_STAPLE_CARD_COVERAGE } from "./scripts/custom/staples";
import { MONSTER_CARD_COVERAGE } from "./scripts/monsters";
import { SPELL_CARD_COVERAGE } from "./scripts/spells";
import { TRAP_CARD_COVERAGE } from "./scripts/traps";

export type CardScriptRegistry = Readonly<Record<string, CardScript>>;

export function createCardScriptRegistry(scripts: readonly CardScript[]): CardScriptRegistry {
  const registry: Record<string, CardScript> = {};

  for (const script of scripts) {
    if (registry[script.cardId]) {
      throw new Error(`Duplicate card script registration for cardId: ${script.cardId}`);
    }

    registry[script.cardId] = script;
  }

  return Object.freeze(registry);
}

export function getCardScript(
  registry: CardScriptRegistry,
  cardId: string,
): CardScript | undefined {
  return registry[cardId];
}

export function hasCardScript(registry: CardScriptRegistry, cardId: string): boolean {
  return getCardScript(registry, cardId) !== undefined;
}

export const CARD_SCRIPTS = createCardScriptRegistry(CARD_SCRIPT_LIST);

// Effect cards must be added here only after they have scripts/templates and tests.
export const ENGINE_CARD_COVERAGE: CardCoverageRegistry = Object.freeze({
  ...SPELL_CARD_COVERAGE,
  ...TRAP_CARD_COVERAGE,
  ...MONSTER_CARD_COVERAGE,
  ...CUSTOM_STAPLE_CARD_COVERAGE,
});
