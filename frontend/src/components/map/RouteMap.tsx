/// <reference types="vite/client" />
import { useRef, useEffect, useCallback, useMemo } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
// eslint-disable-next-line import/no-unresolved
import 'maplibre-gl/dist/maplibre-gl.css';

import { useMapBounds } from '../../hooks/useMapBounds';
import { useActiveEvent } from '../../hooks/useActiveEvent';
import { useTripStore } from '../../stores/tripStore';
import { RouteLayer } from './RouteLayer';
import { StopMarker } from './StopMarker';
import { TruckMarker } from './TruckMarker';
import type { ScheduledStop } from '../../types/trip';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const ROUTE_LINE_COLOUR = '#185FA5';

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
    const srcLayer = (layer as { 'source-layer'?: string })['source-layer'] ?? '';
    const id = layer.id;
    const isCity =
      (srcLayer === 'place_label' || srcLayer === 'place') &&
      (id.includes('city') || id.includes('capital') || id.includes('state'));
    if (isCity) {
      map.setLayerZoomRange(id, 3, 24);
    }
  }
}

export function RouteMap({ onMarkerClick }: RouteMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { activeEventId, clearActiveEvent } = useActiveEvent();
  const plan = useTripStore((s) => s.plan);

  const coordinates = plan?.route_geometry ?? [];
  const bounds = useMapBounds(coordinates);

  const allEvents = useMemo(
    () => plan?.days.flatMap((d) => d.events) ?? [],
    [plan],
  );
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
  }, [activeEventId, allEvents]);

  const onMapLoad = useCallback(() => {
    if (!mapRef.current) return;
    if (bounds) {
      mapRef.current.fitBounds(bounds, { padding: 40, duration: 0 });
    }
    boostNativeCityLabels(mapRef.current.getMap());
  }, [bounds]);

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
      mapStyle={MAP_STYLE}
      interactive
      onLoad={onMapLoad}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" showCompass={false} />

      <RouteLayer coordinates={coordinates} lineColour={ROUTE_LINE_COLOUR} />

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
