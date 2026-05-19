import { MapPin, Clock } from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { formatHours } from '../../utils/format';
import type { ScheduledStop } from '../../types/trip';

interface EventItemProps {
  event: ScheduledStop;
  isActive: boolean;
  isLast: boolean;
  onClick: () => void;
}

// Width of the left timeline column (px). Icon badge is centred inside it.
const TL = 44;

export function EventItem({ event, isActive, isLast, onClick }: EventItemProps) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;
  const isDrive = event.type === 'drive';

  /* ── Drive — compact single-line leg row ────────────────────────────── */
  if (isDrive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          'flex w-full items-stretch text-left transition-colors',
          isActive ? 'bg-bg-highlight' : 'hover:bg-bg-elevated',
        ].join(' ')}
      >
        {/* Timeline column */}
        <div className="flex shrink-0 flex-col items-center" style={{ width: TL }}>
          <div className="w-px flex-1 bg-border-subtle" />
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: `${config.colour}15` }}
          >
            <Icon className="h-3 w-3" style={{ color: config.colour }} />
          </div>
          {!isLast && <div className="w-px flex-1 bg-border-subtle" />}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-4">
          <p className="text-xs font-medium text-text-muted">{config.label}</p>
          {event.duration_hrs > 0 && (
            <>
              <span className="text-[10px] text-text-hint">·</span>
              <p className="text-[11px] text-text-hint">{formatHours(event.duration_hrs)}</p>
            </>
          )}
          {event.miles_from_prev > 0 && (
            <>
              <span className="text-[10px] text-text-hint">·</span>
              <p className="text-[11px] text-text-hint">{event.miles_from_prev.toLocaleString()} mi</p>
            </>
          )}
        </div>
      </button>
    );
  }

  /* ── Stop — icon badge + detail block ──────────────────────────────── */
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-stretch text-left transition-colors',
        isActive ? 'bg-bg-highlight' : 'hover:bg-bg-elevated',
      ].join(' ')}
    >
      {/* Timeline column — icon vertically aligned with first text line */}
      <div className="flex shrink-0 flex-col items-center" style={{ width: TL }}>
        {/* spacer matches content top padding so icon top ≈ label top */}
        <div style={{ height: 14 }} className="w-px bg-border-subtle" />
        {/* Icon badge */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all"
          style={{
            backgroundColor: isActive ? config.colour : `${config.colour}15`,
            border: isActive ? 'none' : `1.5px solid ${config.colour}45`,
          }}
        >
          <Icon
            className="h-4 w-4"
            style={{ color: isActive ? '#fff' : config.colour }}
          />
        </div>
        {/* connector to next item */}
        {!isLast && <div className="mt-1 w-px flex-1 bg-border-subtle" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-3 pr-4 pt-3">
        {/* Label + active badge */}
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-text-primary">
            {config.label}
          </p>
          {isActive && (
            <span
              className="shrink-0 rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: config.colour }}
            >
              active
            </span>
          )}
        </div>

        {/* Location */}
        {event.location && (
          <div className="mt-1 flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0 text-text-hint" />
            <p className="truncate text-xs text-text-muted">{event.location}</p>
          </div>
        )}

        {/* Duration + miles */}
        <div className="mt-1 flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-text-hint" />
          <p className="text-[11px] text-text-hint">{formatHours(event.duration_hrs)}</p>
          {event.miles_from_prev > 0 && (
            <>
              <span className="text-[11px] text-text-hint">·</span>
              <p className="text-[11px] text-text-hint">
                {event.miles_from_prev.toLocaleString()} mi from prev
              </p>
            </>
          )}
        </div>

        {/* Stop info */}
        {event.stop_info?.opening_hours && (
          <p className="mt-1 truncate text-[10px] text-text-hint">
            🕐 {event.stop_info.opening_hours}
          </p>
        )}
        {event.stop_info?.phone && (
          <p className="mt-0.5 truncate text-[10px] text-text-hint">
            📞 {event.stop_info.phone}
          </p>
        )}

        {/* Badges */}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {event.satisfies.length > 1 && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold text-white"
              style={{ backgroundColor: '#639922' }}
            >
              combined stop
            </span>
          )}
          {event.early_stop && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold text-white"
              style={{ backgroundColor: '#EF9F27' }}
            >
              early stop
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
