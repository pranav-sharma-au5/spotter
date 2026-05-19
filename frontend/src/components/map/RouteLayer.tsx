import { Source, Layer } from 'react-map-gl/maplibre';
import type { Coordinate } from '../../types/trip';

interface RouteLayerProps {
  coordinates: Coordinate[];
  lineColour: string;
}

export function RouteLayer({ coordinates, lineColour }: RouteLayerProps) {
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coordinates.map((c) => [c.lng, c.lat]),
        },
        properties: {},
      },
    ],
  };

  return (
    <Source id="route" type="geojson" data={geojson}>
      <Layer
        id="route-glow"
        type="line"
        paint={{
          'line-color': lineColour,
          'line-width': 8,
          'line-opacity': 0.12,
        }}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      />
      <Layer
        id="route-line"
        type="line"
        paint={{
          'line-color': lineColour,
          'line-width': 3,
          'line-opacity': 0.7,
        }}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      />
    </Source>
  );
}
