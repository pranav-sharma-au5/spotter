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

const TIMELINE_COL_WIDTH = 44;

// ── Shared timeline column ────────────────────────────────────────────────────
//
// `compact` — used for drive legs: thin top/bottom connectors, small dot badge.
// `full`    — used for stops: fixed-height top spacer, large square badge with
//             active-colour fill, `mt-1` gap before bottom connector.

interface TimelineColumnProps {
  colour: string;
  isActive: boolean;
  isLast: boolean;
  variant: 'compact' | 'full';
  children: React.ReactNode;
}

function TimelineColumn({
  colour, isActive, isLast, variant, children,
}: TimelineColumnProps) {
  if (variant === 'compact') {
    return (
      <div className="flex shrink-0 flex-col items-center" style={{ width: TIMELINE_COL_WIDTH }}>
        <div className="w-px flex-1 bg-border-subtle" />
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: `${colour}15` }}
        >
          {children}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border-subtle" />}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-center" style={{ width: TIMELINE_COL_WIDTH }}>
      <div style={{ height: 14 }} className="w-px bg-border-subtle" />
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all"
        style={{
          backgroundColor: isActive ? colour : `${colour}15`,
          border: isActive ? 'none' : `1.5px solid ${colour}45`,
        }}
      >
        {children}
      </div>
      {!isLast && <div className="mt-1 w-px flex-1 bg-border-subtle" />}
    </div>
  );
}

// ── Drive leg — compact single-line row ──────────────────────────────────────

function DriveEventItem({ event, isActive, isLast, onClick }: EventItemProps) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-stretch text-left transition-colors',
        isActive ? 'bg-bg-highlight' : 'hover:bg-bg-elevated',
      ].join(' ')}
    >
      <TimelineColumn colour={config.colour} isActive={isActive} isLast={isLast} variant="compact">
        <Icon className="h-3 w-3" style={{ color: config.colour }} />
      </TimelineColumn>

      <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-4">
        <p className="text-xs font-medium text-text-secondary">{config.label}</p>
        {event.duration_hrs > 0 && (
          <>
            <span className="text-[10px] text-text-muted">·</span>
            <p className="text-[11px] text-text-secondary">{formatHours(event.duration_hrs)}</p>
          </>
        )}
        {event.miles_from_prev > 0 && (
          <>
            <span className="text-[10px] text-text-muted">·</span>
            <p className="text-[11px] text-text-secondary">{event.miles_from_prev.toLocaleString()} mi</p>
          </>
        )}
      </div>
    </button>
  );
}

// ── Stop — icon badge + detail block ─────────────────────────────────────────

function StopEventItem({ event, isActive, isLast, onClick }: EventItemProps) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-stretch text-left transition-colors',
        isActive ? 'bg-bg-highlight' : 'hover:bg-bg-elevated',
      ].join(' ')}
    >
      <TimelineColumn colour={config.colour} isActive={isActive} isLast={isLast} variant="full">
        <Icon className="h-4 w-4" style={{ color: isActive ? '#fff' : config.colour }} />
      </TimelineColumn>

      <div className="min-w-0 flex-1 pb-3 pr-4 pt-3">
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

        {event.location && (
          <div className="mt-1 flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0 text-text-muted" />
            <p className="truncate text-xs text-text-secondary">{event.location}</p>
          </div>
        )}

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

        {event.stop_info?.opening_hours && (
          <p className="mt-1 truncate text-[10px] text-text-secondary">
            🕐 {event.stop_info.opening_hours}
          </p>
        )}
        {event.stop_info?.phone && (
          <p className="mt-0.5 truncate text-[10px] text-text-secondary">
            📞 {event.stop_info.phone}
          </p>
        )}

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

// ── Public router component ───────────────────────────────────────────────────

export function EventItem(props: EventItemProps) {
  return props.event.type === 'drive'
    ? <DriveEventItem {...props} />
    : <StopEventItem {...props} />;
}
