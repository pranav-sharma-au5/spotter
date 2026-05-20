import { EVENT_CONFIG } from '../../config/eventConfig';
import { EventDurationMiles, StopDetails } from '../shared/stop-details';
import type { ScheduledStop } from '../../types/trip';

interface EventItemProps {
  event: ScheduledStop;
  isActive: boolean;
  isLast: boolean;
  onClick: () => void;
}

const TIMELINE_COL_WIDTH = 44;

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

function EventRowButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-stretch text-left transition-colors',
        isActive ? 'bg-bg-highlight' : 'hover:bg-bg-elevated',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function DriveEventItem({ event, isActive, isLast, onClick }: EventItemProps) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;

  return (
    <EventRowButton isActive={isActive} onClick={onClick}>
      <TimelineColumn colour={config.colour} isActive={isActive} isLast={isLast} variant="compact">
        <Icon className="h-3 w-3" style={{ color: config.colour }} />
      </TimelineColumn>
      <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-4">
        <p className="text-xs font-medium text-text-secondary">{config.label}</p>
        <EventDurationMiles event={event} />
      </div>
    </EventRowButton>
  );
}

function StopEventItem({ event, isActive, isLast, onClick }: EventItemProps) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;

  return (
    <EventRowButton isActive={isActive} onClick={onClick}>
      <TimelineColumn colour={config.colour} isActive={isActive} isLast={isLast} variant="full">
        <Icon className="h-4 w-4" style={{ color: isActive ? '#fff' : config.colour }} />
      </TimelineColumn>
      <div className="min-w-0 flex-1 pb-3 pr-4 pt-3">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-text-primary">{config.label}</p>
          {isActive && (
            <span
              className="shrink-0 rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: config.colour }}
            >
              active
            </span>
          )}
        </div>
        <StopDetails event={event} variant="sidebar" />
      </div>
    </EventRowButton>
  );
}

export function EventItem(props: EventItemProps) {
  const { variant } = EVENT_CONFIG[props.event.type];
  return variant === 'drive'
    ? <DriveEventItem {...props} />
    : <StopEventItem {...props} />;
}
