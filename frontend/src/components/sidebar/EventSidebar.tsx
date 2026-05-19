import { useTripStore } from '../../stores/tripStore';
import { DayAccordion } from './DayAccordion';

export function EventSidebar() {
  const plan = useTripStore((s) => s.plan);

  if (!plan) return null;

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-border-subtle bg-bg-surface">
      <div className="sticky top-0 border-b border-border-subtle bg-bg-surface px-4 py-3">
        <p className="text-sm font-semibold text-text-primary">Route plan</p>
      </div>
      <div className="overflow-y-auto">
        {plan.days.map((day, idx) => (
          <DayAccordion
            key={day.day_number}
            day={day}
            defaultOpen={idx === 0}
          />
        ))}
      </div>
    </aside>
  );
}
