import { POPULAR_ROUTES, toLocationSuggestion, type PopularRoute } from '../../config/popularRoutes';
import type { LocationSuggestion } from '../../types/trip';

interface PopularRouteSuggestionsProps {
  onSelectPickup: (suggestion: LocationSuggestion) => void;
  onSelectDropoff: (suggestion: LocationSuggestion) => void;
}

function handleRouteSelect(
  route: PopularRoute,
  onSelectPickup: (suggestion: LocationSuggestion) => void,
  onSelectDropoff: (suggestion: LocationSuggestion) => void,
) {
  onSelectPickup(toLocationSuggestion(route.pickup, 'pickup'));
  onSelectDropoff(toLocationSuggestion(route.dropoff, 'dropoff'));
}

export function PopularRouteSuggestions({
  onSelectPickup,
  onSelectDropoff,
}: PopularRouteSuggestionsProps) {
  return (
    <div className="border-t border-border-subtle px-4 py-2.5">
      <p className="mb-1.5 text-[10px] text-text-muted">Popular routes</p>
      <div className="flex flex-wrap gap-1.5">
        {POPULAR_ROUTES.map((route) => (
          <button
            key={route.id}
            type="button"
            title={route.title ?? route.label}
            onClick={() => handleRouteSelect(route, onSelectPickup, onSelectDropoff)}
            className={[
              'rounded-md border border-border-subtle',
              'px-2 py-1 text-[10px] leading-snug text-text-muted',
              'transition-colors',
              'hover:border-border-medium hover:bg-bg-elevated hover:text-text-secondary',
            ].join(' ')}
          >
            {route.label}
          </button>
        ))}
      </div>
    </div>
  );
}
