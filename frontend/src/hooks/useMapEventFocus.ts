import { useEffect } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { RefObject } from 'react';
import { focusMapOnEvent } from '../utils/mapFocus';
import { findEventIndex } from '../utils/tripEvents';
import type { ScheduledStop } from '../types/trip';

export function useMapEventFocus(
  mapRef: RefObject<MapRef | null>,
  activeEventId: string | null,
  allEvents: ScheduledStop[],
): void {
  useEffect(() => {
    if (!activeEventId || !mapRef.current) return;
    const idx = findEventIndex(allEvents, activeEventId);
    if (idx === -1) return;
    focusMapOnEvent(mapRef.current, allEvents[idx], allEvents);
  }, [activeEventId, allEvents, mapRef]);
}
