/// <reference types="vite/client" />
import {
  forwardRef,
  useRef,
  useCallback,
  useMemo,
  useImperativeHandle,
} from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
// eslint-disable-next-line import/no-unresolved
import 'maplibre-gl/dist/maplibre-gl.css';

import { useMapBounds } from '../../hooks/useMapBounds';
import { useActiveEvent } from '../../hooks/useActiveEvent';
import { useMapEventFocus } from '../../hooks/useMapEventFocus';
import { useTripStore } from '../../stores/tripStore';
import { getAllEvents, getActiveDriveHighlightIds, getNonDriveEvents } from '../../utils/tripEvents';
import { RouteLayer } from './RouteLayer';
import { StopMarker } from './StopMarker';
import { TruckMarker } from './TruckMarker';
import { boostNativeCityLabels } from './mapStyleUtils';
import type { ScheduledStop } from '../../types/trip';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const ROUTE_LINE_COLOUR = '#185FA5';

export interface RouteMapHandle {
  resize: () => void;
}

interface RouteMapProps {
  onMarkerClick?: (event: ScheduledStop) => void;
}

export const RouteMap = forwardRef<RouteMapHandle, RouteMapProps>(function RouteMap(
  { onMarkerClick },
  ref,
) {
  const mapRef = useRef<MapRef>(null);
  const { activeEventId, clearActiveEvent } = useActiveEvent();
  const plan = useTripStore((s) => s.plan);

  const coordinates = plan?.route_geometry ?? [];
  const bounds = useMapBounds(coordinates);

  const allEvents = useMemo(() => getAllEvents(plan), [plan]);
  const nonDriveEvents = useMemo(() => getNonDriveEvents(allEvents), [allEvents]);
  const activeDriveEndpointIds = useMemo(
    () => getActiveDriveHighlightIds(allEvents, activeEventId),
    [allEvents, activeEventId],
  );

  useImperativeHandle(ref, () => ({
    resize: () => {
      mapRef.current?.getMap()?.resize();
    },
  }));

  useMapEventFocus(mapRef, activeEventId, allEvents);

  const onMapLoad = useCallback(() => {
    if (!mapRef.current) return;
    if (bounds) {
      mapRef.current.fitBounds(bounds, { padding: 40, duration: 0 });
    }
    boostNativeCityLabels(mapRef.current.getMap());
  }, [bounds]);

  if (!plan?.route_geometry.length) {
    return <div className="flex-1 bg-bg-elevated" />;
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
});
