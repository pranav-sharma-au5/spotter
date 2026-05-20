import { Clock } from 'lucide-react';
import { formatHours } from '../../../utils/format';
import type { ScheduledStop } from '../../../types/trip';

type DurationLayout = 'inline' | 'row';
type MilesLabel = 'short' | 'fromPrev';

interface DurationMilesRowProps {
  event: ScheduledStop;
  layout: DurationLayout;
  milesLabel?: MilesLabel;
}

function formatMiles(miles: number, label: MilesLabel): string {
  const formatted = miles.toLocaleString();
  return label === 'fromPrev' ? `${formatted} mi from prev` : `${formatted} mi`;
}

function InlineDurationMiles({ event }: { event: ScheduledStop }) {
  return (
    <>
      {event.duration_hrs > 0 && (
        <>
          <span className="text-[10px] text-text-muted">·</span>
          <p className="text-[11px] text-text-secondary">{formatHours(event.duration_hrs)}</p>
        </>
      )}
      {event.miles_from_prev > 0 && (
        <>
          <span className="text-[10px] text-text-muted">·</span>
          <p className="text-[11px] text-text-secondary">
            {formatMiles(event.miles_from_prev, 'short')}
          </p>
        </>
      )}
    </>
  );
}

function RowDurationMiles({
  event,
  milesLabel,
}: {
  event: ScheduledStop;
  milesLabel: MilesLabel;
}) {
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <Clock className="h-3 w-3 shrink-0 text-text-muted" />
      <p className="text-[11px] text-text-secondary">{formatHours(event.duration_hrs)}</p>
      {event.miles_from_prev > 0 && (
        <>
          <span className="text-[11px] text-text-muted">·</span>
          <p className="text-[11px] text-text-secondary">
            {formatMiles(event.miles_from_prev, milesLabel)}
          </p>
        </>
      )}
    </div>
  );
}

export function DurationMilesRow({
  event,
  layout,
  milesLabel = 'short',
}: DurationMilesRowProps) {
  if (layout === 'inline') {
    return <InlineDurationMiles event={event} />;
  }
  return <RowDurationMiles event={event} milesLabel={milesLabel} />;
}
