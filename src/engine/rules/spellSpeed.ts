import type { SpellSpeed } from "../cards/CardScript";
import type { ChainLink } from "./chain";

export function validateSpellSpeedForChain(
  currentChain: readonly ChainLink[],
  spellSpeed: SpellSpeed,
): string | null {
  const currentLink = currentChain[currentChain.length - 1];

  if (!currentLink) {
    return null;
  }

  if (spellSpeed === 1) {
    return "Spell Speed 1 effects cannot be chained manually.";
  }

  if (spellSpeed < currentLink.spellSpeed) {
    return `Spell Speed ${spellSpeed} cannot chain to Spell Speed ${currentLink.spellSpeed}.`;
  }

  return null;
}
