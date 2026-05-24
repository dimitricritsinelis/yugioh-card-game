import type { InstanceId } from "./core/cardRefs";
import type { EngineEvent, EngineEventType } from "./events";
import { assertReadableEventMessage } from "./events";
import type { PlayerId } from "./types";

export function eventMessages(events: readonly EngineEvent[]): string[] {
  return events.map((event) => {
    assertReadableEventMessage(event);
    return event.message;
  });
}

export function eventsOfType<TType extends EngineEventType>(
  events: readonly EngineEvent[],
  type: TType,
): Extract<EngineEvent, { type: TType }>[] {
  return events.filter((event): event is Extract<EngineEvent, { type: TType }> => event.type === type);
}

export function latestEventOfType<TType extends EngineEventType>(
  events: readonly EngineEvent[],
  type: TType,
): Extract<EngineEvent, { type: TType }> | null {
  return eventsOfType(events, type).at(-1) ?? null;
}

export function hasEventType(events: readonly EngineEvent[], type: EngineEventType): boolean {
  return events.some((event) => event.type === type);
}

export function eventsForPlayer(events: readonly EngineEvent[], playerId: PlayerId): EngineEvent[] {
  return events.filter((event) => "playerId" in event && event.playerId === playerId);
}

export function eventsForCard(events: readonly EngineEvent[], cardId: string): EngineEvent[] {
  return events.filter((event) => eventHasCard(event, cardId));
}

export function eventsForInstance(events: readonly EngineEvent[], instanceId: InstanceId): EngineEvent[] {
  return events.filter((event) => eventHasInstance(event, instanceId));
}

function eventHasInstance(event: EngineEvent, instanceId: InstanceId): boolean {
  return (
    ("instanceId" in event && event.instanceId === instanceId) ||
    ("sourceInstanceId" in event && event.sourceInstanceId === instanceId) ||
    ("attackerInstanceId" in event && event.attackerInstanceId === instanceId) ||
    ("defenderInstanceId" in event && event.defenderInstanceId === instanceId) ||
    ("instanceIds" in event && Boolean(event.instanceIds?.includes(instanceId)))
  );
}

function eventHasCard(event: EngineEvent, cardId: string): boolean {
  return (
    ("cardId" in event && event.cardId === cardId) ||
    ("attackerCardId" in event && event.attackerCardId === cardId) ||
    ("defenderCardId" in event && event.defenderCardId === cardId)
  );
}
