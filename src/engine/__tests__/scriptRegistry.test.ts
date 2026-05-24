import { describe, expect, it } from "vitest";
import {
  CARD_SCRIPTS,
  ENGINE_CARD_COVERAGE,
  createCardScriptRegistry,
  getCardScript,
  hasCardScript,
} from "../index";
import type { CardScript } from "../index";

const TEST_CARD_ID = "05053103";
const UNKNOWN_CARD_ID = "99999999";
const POT_OF_GREED_ID = "55144522";
const BOOK_OF_MOON_ID = "14087893";
const GRACEFUL_CHARITY_ID = "79571449";
const MIRROR_FORCE_ID = "44095762";
const SAKURETSU_ARMOR_ID = "56120475";
const WABOKU_ID = "12607053";
const DEKOICHI_ID = "87621407";
const MAGICIAN_OF_FAITH_ID = "31560081";
const OLD_VINDICTIVE_MAGICIAN_ID = "45141844";
const EXILED_FORCE_ID = "74131780";
const SANGAN_ID = "26202165";
const MYSTIC_TOMATO_ID = "83011277";
const BREAKER_THE_MAGICAL_WARRIOR_ID = "71413901";
const TRIBE_INFECTING_VIRUS_ID = "33184167";
const SINISTER_SERPENT_ID = "08131171";
const DD_WARRIOR_LADY_ID = "07572887";
const INJECTION_FAIRY_LILY_ID = "79575620";
const REFLECT_BOUNDER_ID = "02851070";
const JINZO_ID = "77585513";
const RING_OF_DESTRUCTION_ID = "83555666";
const CALL_OF_THE_HAUNTED_ID = "97077563";
const PREMATURE_BURIAL_ID = "70828912";
const SNATCH_STEAL_ID = "45986603";

const testScript: CardScript = Object.freeze({
  cardId: TEST_CARD_ID,
  effects: Object.freeze([
    Object.freeze({
      id: "test-ignition-effect",
      kind: "ignition",
      spellSpeed: 1,
      implemented: true,
    }),
  ]),
  canActivate: () => true,
});

describe("card script registry", () => {
  it("registers scripts by passcode cardId", () => {
    const registry = createCardScriptRegistry([testScript]);

    expect(getCardScript(registry, TEST_CARD_ID)).toBe(testScript);
    expect(hasCardScript(registry, TEST_CARD_ID)).toBe(true);
  });

  it("returns no script for unknown cardIds", () => {
    const registry = createCardScriptRegistry([testScript]);

    expect(getCardScript(registry, UNKNOWN_CARD_ID)).toBeUndefined();
    expect(hasCardScript(registry, UNKNOWN_CARD_ID)).toBe(false);
  });

  it("rejects duplicate script registrations for the same cardId", () => {
    expect(() => createCardScriptRegistry([testScript, { ...testScript }])).toThrow(
      `Duplicate card script registration for cardId: ${TEST_CARD_ID}`,
    );
  });

  it("ships only explicitly implemented production card scripts", () => {
    expect(getCardScript(CARD_SCRIPTS, POT_OF_GREED_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, BOOK_OF_MOON_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, MIRROR_FORCE_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, SAKURETSU_ARMOR_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, DEKOICHI_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, MAGICIAN_OF_FAITH_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, OLD_VINDICTIVE_MAGICIAN_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, EXILED_FORCE_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, BREAKER_THE_MAGICAL_WARRIOR_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, TRIBE_INFECTING_VIRUS_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, SINISTER_SERPENT_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, DD_WARRIOR_LADY_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, INJECTION_FAIRY_LILY_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, REFLECT_BOUNDER_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, JINZO_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, RING_OF_DESTRUCTION_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, CALL_OF_THE_HAUNTED_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, PREMATURE_BURIAL_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, SNATCH_STEAL_ID)).toBeDefined();
    expect(getCardScript(CARD_SCRIPTS, GRACEFUL_CHARITY_ID)).toBeUndefined();
    expect(getCardScript(CARD_SCRIPTS, WABOKU_ID)).toBeUndefined();
    expect(getCardScript(CARD_SCRIPTS, SANGAN_ID)).toBeUndefined();
    expect(getCardScript(CARD_SCRIPTS, MYSTIC_TOMATO_ID)).toBeUndefined();
    expect(ENGINE_CARD_COVERAGE[POT_OF_GREED_ID]).toBe("goatTemplate");
    expect(ENGINE_CARD_COVERAGE[BOOK_OF_MOON_ID]).toBe("goatTemplate");
    expect(ENGINE_CARD_COVERAGE[MIRROR_FORCE_ID]).toBe("goatTemplate");
    expect(ENGINE_CARD_COVERAGE[SAKURETSU_ARMOR_ID]).toBe("goatTemplate");
    expect(ENGINE_CARD_COVERAGE[DEKOICHI_ID]).toBe("goatTemplate");
    expect(ENGINE_CARD_COVERAGE[MAGICIAN_OF_FAITH_ID]).toBe("goatTemplate");
    expect(ENGINE_CARD_COVERAGE[OLD_VINDICTIVE_MAGICIAN_ID]).toBe("goatTemplate");
    expect(ENGINE_CARD_COVERAGE[EXILED_FORCE_ID]).toBe("goatTemplate");
    expect(ENGINE_CARD_COVERAGE[BREAKER_THE_MAGICAL_WARRIOR_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[TRIBE_INFECTING_VIRUS_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[SINISTER_SERPENT_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[DD_WARRIOR_LADY_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[INJECTION_FAIRY_LILY_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[REFLECT_BOUNDER_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[JINZO_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[RING_OF_DESTRUCTION_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[CALL_OF_THE_HAUNTED_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[PREMATURE_BURIAL_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[SNATCH_STEAL_ID]).toBe("goatCustom");
    expect(ENGINE_CARD_COVERAGE[GRACEFUL_CHARITY_ID]).toBeUndefined();
    expect(ENGINE_CARD_COVERAGE[WABOKU_ID]).toBeUndefined();
    expect(ENGINE_CARD_COVERAGE[SANGAN_ID]).toBeUndefined();
    expect(ENGINE_CARD_COVERAGE[MYSTIC_TOMATO_ID]).toBeUndefined();
  });
});
