import type { CardCoverageRegistry } from "../coverage";
import type { CardScript } from "../CardScript";
import { createNormalTrapScript } from "../templates/normalTrap";

export const MIRROR_FORCE_ID = "44095762";
export const TORRENTIAL_TRIBUTE_ID = "53582587";
export const SAKURETSU_ARMOR_ID = "56120475";

export const TRAP_CARD_SCRIPTS: readonly CardScript[] = Object.freeze([
  createNormalTrapScript({
    cardId: MIRROR_FORCE_ID,
    timing: "after-action",
    eventTypes: Object.freeze(["attack-declared"]),
    eventPlayer: "opponent",
    steps: Object.freeze([{ kind: "destroy-opponent-attack-position-monsters" }]),
  }),
  createNormalTrapScript({
    cardId: TORRENTIAL_TRIBUTE_ID,
    timing: "after-action",
    eventTypes: Object.freeze(["summon-successful"]),
    eventPlayer: "any",
    steps: Object.freeze([{ kind: "destroy-all-monsters", controller: "all" }]),
  }),
  createNormalTrapScript({
    cardId: SAKURETSU_ARMOR_ID,
    timing: "after-action",
    eventTypes: Object.freeze(["attack-declared"]),
    eventPlayer: "opponent",
    steps: Object.freeze([{ kind: "destroy-attack-source" }]),
  }),
]);

export const TRAP_CARD_COVERAGE: CardCoverageRegistry = Object.freeze({
  [MIRROR_FORCE_ID]: "implemented",
  [TORRENTIAL_TRIBUTE_ID]: "implemented",
  [SAKURETSU_ARMOR_ID]: "implemented",
});
