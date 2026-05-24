import type { CardRecord } from "../../types";
import { ENGINE_CARD_COVERAGE } from "./registry";

export type CardCoverageStatus =
  | "implemented"
  | "vanilla"
  | "unsupported"
  | "blockedNoExtraDeck"
  | "blockedByScope";

export type CardCoverageRegistry = Readonly<Partial<Record<string, CardCoverageStatus>>>;

export interface CardCoverage {
  readonly cardId: string;
  readonly status: CardCoverageStatus;
  readonly source: "registry" | "metadata";
}

const PLAYABLE_STATUSES = new Set<CardCoverageStatus>(["implemented", "vanilla"]);

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
    status: inferCoverageStatus(card),
    source: "metadata",
  };
}

export function isPlayableCoverageStatus(status: CardCoverageStatus): boolean {
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
    case "blockedNoExtraDeck":
      return "blocked because Extra/Fusion Decks are outside playable scope";
    case "blockedByScope":
      return "blocked by the current playable scope";
    case "unsupported":
      return "not supported in playable decks";
    case "implemented":
    case "vanilla":
      return "playable";
  }
}

function inferCoverageStatus(card: CardRecord): CardCoverageStatus {
  if (card.legality.goat_world_pool !== true || card.legality.max_copies <= 0) {
    return "blockedByScope";
  }

  if (card.classifications.includes("Fusion")) {
    return "blockedNoExtraDeck";
  }

  if (isVanillaNormalMonster(card)) {
    return "vanilla";
  }

  return "unsupported";
}

function isVanillaNormalMonster(card: CardRecord): boolean {
  return (
    card.category === "Monster" &&
    card.classifications.includes("Normal") &&
    !card.classifications.includes("Effect") &&
    !card.classifications.includes("Fusion") &&
    !card.classifications.includes("Ritual")
  );
}
