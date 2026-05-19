import { RouteMap } from '../map/RouteMap';
import { MapLegend } from '../map/MapLegend';
import type { ScheduledStop } from '../../types/trip';

interface MapSectionProps {
  onMarkerClick: (event: ScheduledStop) => void;
}

export function MapSection({ onMarkerClick }: MapSectionProps) {
  return (
    <div className="relative flex-1 overflow-hidden">
      <RouteMap mode="summary" onMarkerClick={onMarkerClick} />
      <MapLegend />
    </div>
  );
}
