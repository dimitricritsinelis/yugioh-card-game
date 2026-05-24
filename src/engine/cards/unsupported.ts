import type { CardScript } from "./CardScript";
import type { CardDefinition } from "../data/cardCatalog";
import { createCardScriptRegistry, getCardScript } from "./registry";
import { createCardScriptsForCatalog } from "./scripts";

export const EFFECT_NOT_IMPLEMENTED = "EFFECT_NOT_IMPLEMENTED";

export function getCardScriptForDefinitions(
  cardId: string,
  cardDefinitions: Readonly<Record<string, CardDefinition>> | undefined,
  cardScripts: Readonly<Record<string, CardScript>> | undefined = undefined,
): CardScript | undefined {
  const registeredScript = cardScripts ? getCardScript(cardScripts, cardId) : undefined;

  if (registeredScript) {
    return registeredScript;
  }

  const scripts = createCardScriptsForCatalog(Object.values(cardDefinitions ?? {}));
  const registry = createCardScriptRegistry(scripts);

  return getCardScript(registry, cardId);
}
