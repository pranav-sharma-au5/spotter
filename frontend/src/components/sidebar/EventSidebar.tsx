import { cn } from '../../lib/utils';
import { useTripStore } from '../../stores/tripStore';
import { DayAccordion } from './DayAccordion';

interface EventSidebarProps {
  variant?: 'inline' | 'drawer';
  className?: string;
  showHeader?: boolean;
}

export function EventSidebar({
  variant = 'inline',
  className,
  showHeader = true,
}: EventSidebarProps) {
  const plan = useTripStore((s) => s.plan);
  const request = useTripStore((s) => s.request);

  if (!plan || !request) return null;

  return (
    <aside
      className={cn(
        'flex flex-col bg-bg-surface',
        variant === 'inline' && 'hidden w-[260px] shrink-0 border-r border-border-subtle lg:flex',
        variant === 'drawer' && 'w-full',
        className,
      )}
    >
      {showHeader && variant === 'inline' && (
        <div className="sticky top-0 border-b border-border-subtle bg-bg-surface px-4 py-3">
          <p className="text-sm font-semibold text-text-primary">Route plan</p>
        </div>
      )}
      <div className="overflow-y-auto">
        {plan.days.map((day, idx) => (
          <DayAccordion
            key={day.day_number}
            day={day}
            defaultOpen={idx === 0}
            from={request.current_location}
            to={request.dropoff_location}
            allDays={plan.days}
          />
        ))}
      </div>
    </aside>
  );
}
