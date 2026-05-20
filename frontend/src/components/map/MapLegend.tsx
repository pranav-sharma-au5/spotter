import { EVENT_CONFIG } from '../../config/eventConfig';
import { useTripStore } from '../../stores/tripStore';
import { getAllEvents } from '../../utils/tripEvents';
import type { EventType } from '../../types/trip';

interface MapLegendProps {
  /** Restrict legend to only the event types that actually appear on this map.
   *  When omitted, the legend reads present types from the store automatically.
   */
  presentTypes?: EventType[];
}

export function MapLegend({ presentTypes }: MapLegendProps) {
  const plan = useTripStore((s) => s.plan);

  const types: EventType[] = presentTypes ?? (
    plan
      ? [...new Set(getAllEvents(plan).map((e) => e.type))].filter(
          (t) => EVENT_CONFIG[t].showInLegend,
        )
      : []
  );

  if (types.length === 0) return null;

  return (
    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5 rounded-xl border border-border-subtle bg-bg-surface/90 px-2 py-1.5 backdrop-blur-sm md:bottom-4 md:left-4 md:right-auto md:gap-2 md:px-3 md:py-2">
      {types.map((type) => {
        const cfg = EVENT_CONFIG[type];
        return (
          <div key={type} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.colour }} />
            <span className="text-[9px] text-text-secondary md:text-[10px]">{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}
