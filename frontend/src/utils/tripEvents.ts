import { EVENT_CONFIG } from '../config/eventConfig';
import type { ScheduledStop, TripPlan } from '../types/trip';

export function getAllEvents(plan: TripPlan | null): ScheduledStop[] {
  return plan?.days.flatMap((d) => d.events) ?? [];
}

export function getNonDriveEvents(events: ScheduledStop[]): ScheduledStop[] {
  return events.filter((e) => EVENT_CONFIG[e.type].showOnMap);
}

export function findEventIndex(events: ScheduledStop[], eventId: string): number {
  return events.findIndex((e) => e.id === eventId);
}

export function getDriveEndpoints(
  events: ScheduledStop[],
  driveIndex: number,
): ScheduledStop[] {
  const prevStop = events
    .slice(0, driveIndex)
    .reverse()
    .find((e) => EVENT_CONFIG[e.type].variant === 'stop');
  const nextStop = events
    .slice(driveIndex + 1)
    .find((e) => EVENT_CONFIG[e.type].variant === 'stop');
  return [prevStop, nextStop].filter(Boolean) as ScheduledStop[];
}

export function getActiveDriveHighlightIds(
  events: ScheduledStop[],
  activeEventId: string | null,
): Set<string> {
  const ids = new Set<string>();
  if (!activeEventId) return ids;

  const activeEvent = events.find((e) => e.id === activeEventId);
  if (!activeEvent || EVENT_CONFIG[activeEvent.type].variant !== 'drive') return ids;

  const idx = events.indexOf(activeEvent);
  for (const endpoint of getDriveEndpoints(events, idx)) {
    ids.add(endpoint.id);
  }
  return ids;
}

export function countEventsByType(
  events: ScheduledStop[],
  type: ScheduledStop['type'],
): number {
  return events.filter((e) => e.type === type).length;
}
