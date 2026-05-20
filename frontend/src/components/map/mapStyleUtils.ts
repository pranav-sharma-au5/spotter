import type { MapRef } from 'react-map-gl/maplibre';

/**
 * Lowers the minimum zoom for city/place symbol layers in the Carto base-map
 * so labels are visible at the low zoom level produced by full-route fitBounds.
 */
export function boostNativeCityLabels(map: MapRef['getMap'] extends () => infer R ? R : never) {
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
