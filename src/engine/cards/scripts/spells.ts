import type { CardCoverageRegistry } from "../coverage";
import type { CardScript } from "../CardScript";
import { createNormalSpellScript } from "../templates/normalSpell";
import { createQuickPlaySpellScript } from "../templates/quickPlaySpell";

export const POT_OF_GREED_ID = "55144522";
export const HEAVY_STORM_ID = "19613556";
export const MYSTICAL_SPACE_TYPHOON_ID = "05318639";
export const BOOK_OF_MOON_ID = "14087893";
export const UPSTART_GOBLIN_ID = "70368879";

const spellTrapTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["spellTrapZone", "fieldZone"] as const),
  cardKinds: Object.freeze(["spell", "trap"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const faceUpMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "faceUp" as const,
  min: 1,
  max: 1,
});

export const SPELL_CARD_SCRIPTS: readonly CardScript[] = Object.freeze([
  createNormalSpellScript({
    cardId: POT_OF_GREED_ID,
    steps: Object.freeze([{ kind: "draw", player: "self", count: 2 }]),
  }),
  createNormalSpellScript({
    cardId: HEAVY_STORM_ID,
    steps: Object.freeze([{ kind: "destroy-all-spells-traps", controller: "all" }]),
  }),
  createQuickPlaySpellScript({
    cardId: MYSTICAL_SPACE_TYPHOON_ID,
    targets: Object.freeze([spellTrapTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createQuickPlaySpellScript({
    cardId: BOOK_OF_MOON_ID,
    targets: Object.freeze([faceUpMonsterTarget]),
    steps: Object.freeze([{ kind: "set-face", face: "faceDown", position: "defense" }]),
  }),
  createNormalSpellScript({
    cardId: UPSTART_GOBLIN_ID,
    steps: Object.freeze([
      { kind: "draw", player: "self", count: 1 },
      { kind: "lp-change", player: "opponent", amount: 1000 },
    ]),
  }),
]);

export const SPELL_CARD_COVERAGE: CardCoverageRegistry = Object.freeze({
  [POT_OF_GREED_ID]: "implemented",
  [HEAVY_STORM_ID]: "implemented",
  [MYSTICAL_SPACE_TYPHOON_ID]: "implemented",
  [BOOK_OF_MOON_ID]: "implemented",
  [UPSTART_GOBLIN_ID]: "implemented",
});
