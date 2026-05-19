import { EVENT_CONFIG } from '../../config/eventConfig';
import { useTripStore } from '../../stores/tripStore';
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
      ? [...new Set(plan.days.flatMap((d) => d.events).map((e) => e.type))].filter(
          (t) => t !== 'drive' && EVENT_CONFIG[t].showInLegend,
        )
      : []
  );

  if (types.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 rounded-xl border border-border-subtle bg-bg-surface/90 px-3 py-2 backdrop-blur-sm">
      {types.map((type) => {
        const cfg = EVENT_CONFIG[type];
        return (
          <div key={type} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.colour }} />
            <span className="text-[10px] text-text-secondary">{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}
