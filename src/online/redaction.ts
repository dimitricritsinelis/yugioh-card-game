import type { DuelEvent, PlayerId } from "../engine";
import type { PublicMoveRealtimePayload } from "./types";

const SET_EVENT_TYPES = new Set(["monster-set", "monster-tribute-set", "spell-trap-set"]);
const HIDDEN_ID_KEYS = new Set([
  "instanceId",
  "sourceInstanceId",
  "attackerInstanceId",
  "defenderInstanceId",
  "cardId",
  "attackerCardId",
  "defenderCardId",
]);

// Event types that are pure phase/flow bookkeeping or redundant with the
// outcome events that follow them — kept out of the player-facing log so it
// reads as a short list of meaningful actions.
const LOG_NOISE_EVENT_TYPES = new Set([
  "phase-changed",
  "standby-passed",
  "battle-completed",
  "summon-declared",
  "passive-board-filler-empty",
  "illegal-action",
  "card-activation-empty",
  "effect-not-implemented",
]);

export interface FormattedLogEntry {
  readonly actor: PlayerId | null;
  readonly text: string;
}

/**
 * Turns a raw duel event into a compact, color-codeable log line, or `null`
 * if the event is bookkeeping noise that should be dropped from the log.
 * The actor is surfaced separately so the UI can render a P1/P2 chip instead
 * of repeating it in prose.
 */
export function formatActionLogEntry(
  event: DuelEvent,
  viewerId: PlayerId | null,
): FormattedLogEntry | null {
  if (LOG_NOISE_EVENT_TYPES.has(event.type) || event.type.endsWith("-empty")) {
    return null;
  }

  const message = redactActionLogMessage(event, viewerId);
  const actor = actorFromEvent(event);
  const text = actor ? stripLeadingActor(message, actor) : message;

  if (!text.trim()) {
    return null;
  }

  return { actor, text };
}

function stripLeadingActor(message: string, actor: PlayerId): string {
  if (message.startsWith(`${actor} `)) {
    const rest = message.slice(actor.length + 1);
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return message;
}

export function redactActionLogMessage(event: DuelEvent, viewerId: PlayerId | null): string {
  const actor = actorFromEvent(event);

  if (SET_EVENT_TYPES.has(event.type) && actor && actor !== viewerId) {
    return `${actor} Set a card.`;
  }

  if (event.type === "card-drawn" && actor && actor !== viewerId) {
    return `${actor} drew a card.`;
  }

  return event.message;
}

export function redactEventsForViewer(
  events: readonly DuelEvent[],
  viewerId: PlayerId | null,
): DuelEvent[] {
  return events.map((event) => ({
    id: event.id,
    type: event.type,
    message: redactActionLogMessage(event, viewerId),
  }));
}

export function redactEventsForPublic(events: readonly DuelEvent[]): DuelEvent[] {
  return redactEventsForViewer(events, null).map(stripPrivateEventFields);
}

export function summarizePublicEvents(events: readonly DuelEvent[]): string {
  const firstReadable = redactEventsForPublic(events).find((event) => event.message.trim().length > 0);
  return firstReadable?.message ?? "Game state updated.";
}

export function toPublicMovePayload(input: {
  readonly realtimeTopic: string;
  readonly version: number;
  readonly actorRole: PlayerId | null;
  readonly publicSummary: string;
  readonly createdAt: string;
}): PublicMoveRealtimePayload {
  return {
    realtimeTopic: input.realtimeTopic,
    version: input.version,
    actorRole: input.actorRole,
    publicSummary: input.publicSummary,
    createdAt: input.createdAt,
  };
}

function stripPrivateEventFields(event: DuelEvent): DuelEvent {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(event)) {
    if (HIDDEN_ID_KEYS.has(key)) {
      continue;
    }

    if (key.endsWith("InstanceIds") || key.endsWith("CardIds")) {
      continue;
    }

    safe[key] = value;
  }

  return safe as unknown as DuelEvent;
}

function actorFromEvent(event: DuelEvent): PlayerId | null {
  const withPlayer = event as DuelEvent & { playerId?: PlayerId };

  if (withPlayer.playerId === "P1" || withPlayer.playerId === "P2") {
    return withPlayer.playerId;
  }

  const match = /^P[12]\b/.exec(event.message);
  return match?.[0] === "P1" || match?.[0] === "P2" ? match[0] : null;
}
