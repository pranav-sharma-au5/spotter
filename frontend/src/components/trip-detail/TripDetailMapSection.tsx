import { List } from 'lucide-react';
import { RouteMap, type RouteMapHandle } from '../map/RouteMap';
import type { ScheduledStop } from '../../types/trip';

interface TripDetailMapSectionProps {
  mapRef: React.RefObject<RouteMapHandle | null>;
  onMarkerClick: (event: ScheduledStop) => void;
  showFab: boolean;
  onOpenDrawer: () => void;
}

export function TripDetailMapSection({
  mapRef,
  onMarkerClick,
  showFab,
  onOpenDrawer,
}: TripDetailMapSectionProps) {
  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      <RouteMap ref={mapRef} onMarkerClick={onMarkerClick} />

      {showFab && (
        <button
          type="button"
          onClick={onOpenDrawer}
          className="absolute bottom-4 right-4 z-10 flex h-11 min-w-[44px] items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary shadow-lg transition-colors hover:bg-bg-elevated"
        >
          <List className="h-4 w-4 shrink-0" />
          Route plan
        </button>
      )}
    </div>
  );
}
