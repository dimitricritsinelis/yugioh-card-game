import type { CardScript } from "../CardScript";
import type { CardDefinition } from "../../data/cardCatalog";
import { createVanillaMonsterScripts } from "../templates/vanillaMonster";
import { CUSTOM_STAPLE_CARD_SCRIPTS } from "./custom/staples";
import { MONSTER_CARD_SCRIPTS } from "./monsters";
import { SPELL_CARD_SCRIPTS } from "./spells";
import { TRAP_CARD_SCRIPTS } from "./traps";

export const CARD_SCRIPT_LIST: readonly CardScript[] = Object.freeze([
  ...SPELL_CARD_SCRIPTS,
  ...TRAP_CARD_SCRIPTS,
  ...MONSTER_CARD_SCRIPTS,
  ...CUSTOM_STAPLE_CARD_SCRIPTS,
]);

export function createCardScriptsForCatalog(cards: readonly CardDefinition[]): readonly CardScript[] {
  return Object.freeze([...createVanillaMonsterScripts(cards), ...CARD_SCRIPT_LIST]);
}
