import { formatHours } from '../../../utils/format';
import { EventBadges } from './EventBadges';
import { StopMetaRows } from './StopMetaRows';
import type { StopDetailsEventProps } from './types';

export function StopDetailsPopup({ event }: StopDetailsEventProps) {
  return (
    <>
      {event.stop_info && (
        <div className="mt-[5px] flex flex-col gap-0.5 border-t border-border-subtle pt-[5px]">
          <StopMetaRows event={event} variant="popup" />
        </div>
      )}
      <p className="mt-1 text-[10px] text-text-muted">
        {formatHours(event.duration_hrs)} stop
      </p>
      <EventBadges event={event} variant="popup" />
    </>
  );
}
