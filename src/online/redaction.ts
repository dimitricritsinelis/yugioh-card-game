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
