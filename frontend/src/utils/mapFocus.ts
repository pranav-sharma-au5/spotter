import type { MapRef } from 'react-map-gl/maplibre';
import { EVENT_CONFIG } from '../config/eventConfig';
import type { ScheduledStop } from '../types/trip';
import { findEventIndex, getDriveEndpoints } from './tripEvents';

/** Viewport inset when focusing a stop — extra top room for bottom-anchored popups. */
export const STOP_FOCUS_PADDING = { top: 160, bottom: 48, left: 56, right: 56 };
export const DRIVE_SEGMENT_PADDING = { top: 140, bottom: 64, left: 56, right: 56 };

function focusDriveSegment(
  map: MapRef,
  endpoints: ScheduledStop[],
): void {
  if (endpoints.length === 2) {
    const lats = endpoints.map((e) => e.lat);
    const lngs = endpoints.map((e) => e.lng);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: DRIVE_SEGMENT_PADDING, duration: 800, maxZoom: 10 },
    );
    return;
  }
  if (endpoints.length === 1) {
    map.flyTo({
      center: [endpoints[0].lng, endpoints[0].lat],
      zoom: 8,
      duration: 800,
      padding: STOP_FOCUS_PADDING,
    });
  }
}

function focusStop(map: MapRef, event: ScheduledStop): void {
  map.flyTo({
    center: [event.lng, event.lat],
    zoom: 12,
    duration: 800,
    padding: STOP_FOCUS_PADDING,
  });
}

export function focusMapOnEvent(
  map: MapRef,
  event: ScheduledStop,
  allEvents: ScheduledStop[],
): void {
  if (EVENT_CONFIG[event.type].variant === 'drive') {
    const idx = findEventIndex(allEvents, event.id);
    if (idx === -1) return;
    focusDriveSegment(map, getDriveEndpoints(allEvents, idx));
    return;
  }
  focusStop(map, event);
}
