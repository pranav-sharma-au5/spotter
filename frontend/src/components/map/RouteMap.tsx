/// <reference types="vite/client" />
import { useRef, useEffect, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
// eslint-disable-next-line import/no-unresolved
import 'maplibre-gl/dist/maplibre-gl.css';

import { useTheme } from '../../hooks/useTheme';
import { useMapBounds } from '../../hooks/useMapBounds';
import { useActiveEvent } from '../../hooks/useActiveEvent';
import { useTripStore } from '../../stores/tripStore';
import { RouteLayer } from './RouteLayer';
import { StopMarker } from './StopMarker';
import { TruckMarker } from './TruckMarker';
import { EVENT_CONFIG } from '../../config/eventConfig';
import type { ScheduledStop } from '../../types/trip';

const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

interface RouteMapProps {
  mode: 'summary' | 'detail';
  onMarkerClick?: (event: ScheduledStop) => void;
}

/**
 * Lowers the minimum zoom for any city/place symbol layers already present
 * in the Carto base-map style so they're visible at the low zoom level that
 * a full-route fit-bounds produces (typically z4–z7 for US hauls).
 * We don't add any custom labels — we just unlock what the tile style already
 * has at zoom levels it normally hides them.
 */
function boostNativeCityLabels(map: MapRef['getMap'] extends () => infer R ? R : never) {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    if (layer.type !== 'symbol') continue;
    // Carto Positron / Dark Matter use OpenMapTiles source-layer "place_label"
    // and layer IDs that contain "place" and "city" / "town".
    // Target only city-level layers; leave town/village/suburb alone to avoid clutter.
    const srcLayer = (layer as { 'source-layer'?: string })['source-layer'] ?? '';
    const id = layer.id;
    const isCity =
      (srcLayer === 'place_label' || srcLayer === 'place') &&
      (id.includes('city') || id.includes('capital') || id.includes('state'));
    if (isCity) {
      // Show from z3 instead of the style's default (usually z6–z8).
      map.setLayerZoomRange(id, 3, 24);
    }
  }
}

export function RouteMap({ mode, onMarkerClick }: RouteMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { theme } = useTheme();
  const { activeEventId, clearActiveEvent } = useActiveEvent();
  const plan = useTripStore((s) => s.plan);

  // Derived early so it's available in onMapLoad closure.
  const isDetail = mode === 'detail';

  const mapStyle = theme === 'dark' ? DARK_STYLE : LIGHT_STYLE;
  const lineColour = theme === 'dark' ? '#378ADD' : '#185FA5';

  const coordinates = plan?.route_geometry ?? [];
  const bounds = useMapBounds(coordinates);

  const allEvents = plan?.days.flatMap((d) => d.events) ?? [];
  const nonDriveEvents = allEvents.filter((e) => e.type !== 'drive');

  useEffect(() => {
    if (!activeEventId || !mapRef.current) return;
    const idx = allEvents.findIndex((e) => e.id === activeEventId);
    if (idx === -1) return;
    const event = allEvents[idx];

    if (event.type === 'drive') {
      // For a drive leg, fit the map to show the segment between the
      // nearest preceding and following stop events so the driver can
      // see the road they'll actually travel.
      const prevStop = allEvents.slice(0, idx).reverse().find((e) => e.type !== 'drive');
      const nextStop = allEvents.slice(idx + 1).find((e) => e.type !== 'drive');
      const endpoints = [prevStop, nextStop].filter(Boolean) as typeof allEvents;
      if (endpoints.length === 2) {
        const lats = endpoints.map((e) => e.lat);
        const lngs = endpoints.map((e) => e.lng);
        mapRef.current.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 80, duration: 800, maxZoom: 10 },
        );
      } else if (endpoints.length === 1) {
        mapRef.current.flyTo({ center: [endpoints[0].lng, endpoints[0].lat], zoom: 8, duration: 800 });
      }
    } else {
      mapRef.current.flyTo({
        center: [event.lng, event.lat],
        zoom: 12,
        duration: 800,
      });
    }
  }, [activeEventId]);

  const onMapLoad = useCallback(() => {
    if (!mapRef.current) return;
    if (bounds) {
      mapRef.current.fitBounds(bounds, { padding: 40, duration: 0 });
    }
    // Reveal city labels from the tile style at lower zoom levels in both modes.
    boostNativeCityLabels(mapRef.current.getMap());
  }, [bounds, isDetail]);

  if (!plan) {
    return <div className="flex-1 bg-bg-elevated" />;
  }

  // When a drive event is active, find its surrounding stop events so we can
  // open their popups and let the driver see where the leg starts and ends.
  const activeDriveEndpointIds = new Set<string>();
  const activeEvent = allEvents.find((e) => e.id === activeEventId);
  if (activeEvent?.type === 'drive') {
    const idx = allEvents.indexOf(activeEvent);
    const prev = allEvents.slice(0, idx).reverse().find((e) => e.type !== 'drive');
    const next = allEvents.slice(idx + 1).find((e) => e.type !== 'drive');
    if (prev) activeDriveEndpointIds.add(prev.id);
    if (next) activeDriveEndpointIds.add(next.id);
  }

  return (
    <Map
      ref={mapRef}
      mapStyle={mapStyle}
      interactive
      onLoad={onMapLoad}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Zoom +/− always visible; compass hidden to keep UI minimal */}
      <NavigationControl position="top-right" showCompass={false} />

      <RouteLayer coordinates={coordinates} lineColour={lineColour} />

      {/* Driver's starting position — always rendered on top of the route line */}
      {coordinates.length > 0 && (
        <TruckMarker lat={coordinates[0].lat} lng={coordinates[0].lng} />
      )}

      {nonDriveEvents.map((event) => (
        <StopMarker
          key={event.id}
          event={event}
          isActive={event.id === activeEventId || activeDriveEndpointIds.has(event.id)}
          onClick={onMarkerClick}
          onClose={clearActiveEvent}
        />
      ))}
    </Map>
  );
}

export function MapLegend() {
  const plan = useTripStore((s) => s.plan);
  if (!plan) return null;

  const allEvents = plan.days.flatMap((d) => d.events);
  const presentTypes = [...new Set(allEvents.map((e) => e.type))].filter(
    (t) => t !== 'drive' && EVENT_CONFIG[t].showInLegend,
  );

  return (
    <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 rounded-xl border border-border-subtle bg-bg-surface/90 px-3 py-2 backdrop-blur-sm">
      {presentTypes.map((type) => {
        const cfg = EVENT_CONFIG[type];
        return (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: cfg.colour }}
            />
            <span className="text-[10px] text-text-secondary">{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}
