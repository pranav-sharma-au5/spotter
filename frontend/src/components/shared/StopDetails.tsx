import { MapPin, Clock } from 'lucide-react';
import { BADGE_CONFIG } from '../../config/eventConfig';
import { formatHours } from '../../utils/format';
import type { ScheduledStop } from '../../types/trip';

type StopDetailsVariant = 'sidebar' | 'popup';

interface StopDetailsProps {
  event: ScheduledStop;
  variant: StopDetailsVariant;
}

function StopMetaRows({ event, variant }: StopDetailsProps) {
  const isPopup = variant === 'popup';
  const textClass = isPopup ? 'text-[9px] text-text-muted' : 'text-[10px] text-text-secondary';

  if (!event.stop_info) return null;

  return (
    <>
      {event.stop_info.opening_hours && (
        <p className={isPopup ? 'm-0' : 'mt-1 truncate'}>
          <span className={textClass}>🕐 {event.stop_info.opening_hours}</span>
        </p>
      )}
      {event.stop_info.phone && (
        <p className={isPopup ? 'm-0' : 'mt-0.5 truncate'}>
          <span className={textClass}>📞 {event.stop_info.phone}</span>
        </p>
      )}
      {isPopup && event.stop_info.website && (
        <a
          href={event.stop_info.website}
          target="_blank"
          rel="noreferrer"
          className="m-0 text-[9px] text-accent no-underline"
        >
          🔗 Website
        </a>
      )}
    </>
  );
}

export function EventDurationMiles({
  event,
  detailed = false,
}: {
  event: ScheduledStop;
  detailed?: boolean;
}) {
  if (detailed) {
    return (
      <div className="mt-1 flex items-center gap-1.5">
        <Clock className="h-3 w-3 shrink-0 text-text-muted" />
        <p className="text-[11px] text-text-secondary">{formatHours(event.duration_hrs)}</p>
        {event.miles_from_prev > 0 && (
          <>
            <span className="text-[11px] text-text-muted">·</span>
            <p className="text-[11px] text-text-secondary">
              {event.miles_from_prev.toLocaleString()} mi from prev
            </p>
          </>
        )}
      </div>
    );
  }

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
            {event.miles_from_prev.toLocaleString()} mi
          </p>
        </>
      )}
    </>
  );
}

export function EventBadges({ event, variant }: { event: ScheduledStop; variant: StopDetailsVariant }) {
  const isPopup = variant === 'popup';

  return (
    <div className={isPopup ? '' : 'mt-1.5 flex flex-wrap gap-1'}>
      {event.satisfies.length > 1 && (
        <span
          className={
            isPopup
              ? 'mt-1 inline-block rounded px-[5px] py-px text-[9px]'
              : 'rounded-full px-2 py-0.5 text-[9px] font-semibold text-white'
          }
          style={{
            backgroundColor: isPopup
              ? `${BADGE_CONFIG.combined.colour}20`
              : BADGE_CONFIG.combined.colour,
            color: isPopup ? BADGE_CONFIG.combined.colour : undefined,
          }}
        >
          {BADGE_CONFIG.combined.label}
        </span>
      )}
      {event.early_stop && (
        <span
          className={
            isPopup
              ? 'mt-1 inline-block rounded px-[5px] py-px text-[9px]'
              : 'rounded-full px-2 py-0.5 text-[9px] font-semibold text-white'
          }
          style={{
            backgroundColor: isPopup
              ? `${BADGE_CONFIG.early.colour}20`
              : BADGE_CONFIG.early.colour,
            color: isPopup ? BADGE_CONFIG.early.colour : undefined,
          }}
        >
          {BADGE_CONFIG.early.label}
        </span>
      )}
    </div>
  );
}

export function StopLocationRow({ event }: { event: ScheduledStop }) {
  if (!event.location) return null;
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <MapPin className="h-3 w-3 shrink-0 text-text-muted" />
      <p className="truncate text-xs text-text-secondary">{event.location}</p>
    </div>
  );
}

export function StopDetails({ event, variant }: StopDetailsProps) {
  if (variant === 'popup') {
    return (
      <>
        {event.stop_info && (
          <div className="mt-[5px] flex flex-col gap-0.5 border-t border-border-subtle pt-[5px]">
            <StopMetaRows event={event} variant={variant} />
          </div>
        )}
        <p className="mt-1 text-[10px] text-text-muted">
          {formatHours(event.duration_hrs)} stop
        </p>
        <EventBadges event={event} variant={variant} />
      </>
    );
  }

  return (
    <>
      <StopLocationRow event={event} />
      <EventDurationMiles event={event} detailed />
      <StopMetaRows event={event} variant={variant} />
      <EventBadges event={event} variant={variant} />
    </>
  );
}
