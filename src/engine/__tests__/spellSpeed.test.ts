import { describe, expect, it } from "vitest";
import type { SpellSpeed } from "../cards/CardScript";
import type { ChainLink } from "../rules/chain";
import { validateSpellSpeedForChain } from "../rules/spellSpeed";

describe("spell speed chaining rules", () => {
  it("allows any Spell Speed to start a chain", () => {
    expect(validateSpellSpeedForChain([], 1)).toBeNull();
    expect(validateSpellSpeedForChain([], 2)).toBeNull();
    expect(validateSpellSpeedForChain([], 3)).toBeNull();
  });

  it("blocks Spell Speed 1 from being chained manually", () => {
    expect(validateSpellSpeedForChain([link("chain-1", 1)], 1)).toBe(
      "Spell Speed 1 effects cannot be chained manually.",
    );
  });

  it("allows Spell Speed 2 to chain to Spell Speed 1 or 2, but not 3", () => {
    expect(validateSpellSpeedForChain([link("chain-1", 1)], 2)).toBeNull();
    expect(validateSpellSpeedForChain([link("chain-1", 2)], 2)).toBeNull();
    expect(validateSpellSpeedForChain([link("chain-1", 3)], 2)).toBe(
      "Spell Speed 2 cannot chain to Spell Speed 3.",
    );
  });

  it("allows Spell Speed 3 to chain to Spell Speed 1, 2, or 3", () => {
    expect(validateSpellSpeedForChain([link("chain-1", 1)], 3)).toBeNull();
    expect(validateSpellSpeedForChain([link("chain-1", 2)], 3)).toBeNull();
    expect(validateSpellSpeedForChain([link("chain-1", 3)], 3)).toBeNull();
  });
});

function link(id: string, spellSpeed: SpellSpeed): ChainLink {
  return {
    id,
    playerId: "P1",
    sourceInstanceId: `${id}-source`,
    cardId: "05053103",
    effectId: `${id}-effect`,
    spellSpeed,
  };
}
