import { Marker } from 'react-map-gl/maplibre';
import { Truck } from 'lucide-react';

interface TruckMarkerProps {
  lat: number;
  lng: number;
}

/**
 * Renders a pulsing truck icon at the driver's starting position.
 * Visually distinct from the circular stop markers so the driver
 * can instantly find "you are here" on the map.
 */
export function TruckMarker({ lat, lng }: TruckMarkerProps) {
  return (
    <Marker longitude={lng} latitude={lat} anchor="bottom">
      <div className="relative flex flex-col items-center">
        {/*
         * Pulsing halo — animate-ping expands a faded copy of the badge
         * outward in a continuous loop, giving the classic "live position" feel.
         */}
        <span
          className="absolute inset-0 animate-ping rounded-lg bg-accent opacity-25"
          aria-hidden="true"
        />

        {/* Truck badge */}
        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border-2 border-accent bg-bg-surface shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
          <Truck className="h-[18px] w-[18px] text-accent" aria-label="Your location" />
        </div>

        {/* Pointer tip */}
        <div className="h-1.5 w-0.5 bg-accent opacity-60" />
      </div>
    </Marker>
  );
}
