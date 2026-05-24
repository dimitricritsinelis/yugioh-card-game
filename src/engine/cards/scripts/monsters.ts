import type { CardCoverageRegistry } from "../coverage";
import type { CardScript } from "../CardScript";
import { createFlipEffectScript } from "../templates/flipEffect";
import { createMonsterIgnitionScript } from "../templates/statModifier";

export const MAGICIAN_OF_FAITH_ID = "31560081";
export const DEKOICHI_ID = "87621407";
export const OLD_VINDICTIVE_MAGICIAN_ID = "45141844";
export const EXILED_FORCE_ID = "74131780";

const anyMonsterTarget = Object.freeze({
  kind: "card" as const,
  controller: "any" as const,
  zones: Object.freeze(["monsterZone"] as const),
  cardKinds: Object.freeze(["monster"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

const ownGraveyardSpellTarget = Object.freeze({
  kind: "card" as const,
  controller: "own" as const,
  zones: Object.freeze(["graveyard"] as const),
  cardKinds: Object.freeze(["spell"] as const),
  face: "any" as const,
  min: 1,
  max: 1,
});

export const MONSTER_CARD_SCRIPTS: readonly CardScript[] = Object.freeze([
  createFlipEffectScript({
    cardId: DEKOICHI_ID,
    steps: Object.freeze([{ kind: "draw", player: "self", count: 1 }]),
  }),
  createFlipEffectScript({
    cardId: MAGICIAN_OF_FAITH_ID,
    targets: Object.freeze([ownGraveyardSpellTarget]),
    steps: Object.freeze([{ kind: "return-targets-to-hand" }]),
  }),
  createFlipEffectScript({
    cardId: OLD_VINDICTIVE_MAGICIAN_ID,
    targets: Object.freeze([anyMonsterTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
  createMonsterIgnitionScript({
    cardId: EXILED_FORCE_ID,
    costs: Object.freeze([{ kind: "tribute-source" }]),
    targets: Object.freeze([anyMonsterTarget]),
    steps: Object.freeze([{ kind: "destroy-targets" }]),
  }),
]);

export const MONSTER_CARD_COVERAGE: CardCoverageRegistry = Object.freeze({
  [DEKOICHI_ID]: "goatTemplate",
  [MAGICIAN_OF_FAITH_ID]: "goatTemplate",
  [OLD_VINDICTIVE_MAGICIAN_ID]: "goatTemplate",
  [EXILED_FORCE_ID]: "goatTemplate",
});
