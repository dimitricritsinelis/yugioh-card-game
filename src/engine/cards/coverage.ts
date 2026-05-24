import type { CardRecord } from "../../types";
import {
  CARD_COVERAGE_MANIFEST,
  CARD_COVERAGE_STATUSES,
  type CardCoverageStatus,
} from "./coverageManifest.generated";
import { ENGINE_CARD_COVERAGE } from "./registry";

export type CardCoverageRegistry = Readonly<Partial<Record<string, CardCoverageStatus>>>;
export type { CardCoverageStatus };

export interface CardCoverage {
  readonly cardId: string;
  readonly status: CardCoverageStatus;
  readonly source: "registry" | "manifest";
}

export { CARD_COVERAGE_MANIFEST, CARD_COVERAGE_STATUSES };

const PLAYABLE_STATUSES = new Set<CardCoverageStatus>(["goatVanilla", "goatTemplate", "goatCustom"]);
const DEFAULT_CARD_COVERAGE_MANIFEST: Readonly<Record<string, CardCoverageStatus>> = CARD_COVERAGE_MANIFEST;

export function getCardCoverage(
  card: CardRecord,
  registry: CardCoverageRegistry = ENGINE_CARD_COVERAGE,
): CardCoverage {
  const registeredStatus = registry[card.passcode];

  if (registeredStatus) {
    return {
      cardId: card.passcode,
      status: registeredStatus,
      source: "registry",
    };
  }

  return {
    cardId: card.passcode,
    status: DEFAULT_CARD_COVERAGE_MANIFEST[card.passcode] ?? "goatUnsupported",
    source: "manifest",
  };
}

export function isPlayableCoverageStatus(
  status: CardCoverageStatus,
): status is Extract<CardCoverageStatus, "goatVanilla" | "goatTemplate" | "goatCustom"> {
  return PLAYABLE_STATUSES.has(status);
}

export function isPlayableCardRecord(
  card: CardRecord,
  registry: CardCoverageRegistry = ENGINE_CARD_COVERAGE,
): boolean {
  return isPlayableCoverageStatus(getCardCoverage(card, registry).status);
}

export function isPlayableCard(
  cardId: string,
  cards: readonly CardRecord[],
  registry: CardCoverageRegistry = ENGINE_CARD_COVERAGE,
): boolean {
  const card = cards.find((candidate) => candidate.passcode === cardId);

  return card ? isPlayableCardRecord(card, registry) : false;
}

export function getCoverageRejectionReason(coverage: CardCoverage): string {
  switch (coverage.status) {
    case "goatDeckBlocked":
      return "blocked because Extra/Fusion Decks are outside playable scope";
    case "goatUnsupported":
      return "not supported in playable decks";
    case "notInGoatPool":
      return "not in the supported GOAT playable pool";
    case "goatForbiddenButScripted":
      return "scripted for development but forbidden in normal playable decks";
    case "goatTemplate":
    case "goatCustom":
    case "goatVanilla":
      return "playable";
  }
}
