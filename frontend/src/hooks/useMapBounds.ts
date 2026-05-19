import { useMemo } from 'react';
import type { Coordinate } from '../types/trip';

type BBox = [[number, number], [number, number]];

export function useMapBounds(coordinates: Coordinate[]): BBox | null {
  return useMemo(() => {
    if (coordinates.length === 0) return null;

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const coord of coordinates) {
      if (coord.lng < minLng) minLng = coord.lng;
      if (coord.lng > maxLng) maxLng = coord.lng;
      if (coord.lat < minLat) minLat = coord.lat;
      if (coord.lat > maxLat) maxLat = coord.lat;
    }

    return [[minLng, minLat], [maxLng, maxLat]];
  }, [coordinates]);
}
