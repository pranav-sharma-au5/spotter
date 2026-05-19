import { useState } from 'react';
import { FileText, CalendarDays, Route } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { EventItem } from './EventItem';
import { ELDModal } from '../eld/ELDModal';
import { useActiveEvent } from '../../hooks/useActiveEvent';
import { useTripStore } from '../../stores/tripStore';
import { formatHours } from '../../utils/format';
import type { TripDay } from '../../types/trip';

interface DayAccordionProps {
  day: TripDay;
  defaultOpen: boolean;
}

export function DayAccordion({ day, defaultOpen }: DayAccordionProps) {
  const [eldOpen, setEldOpen] = useState(false);
  const { activeEventId, setActiveEvent } = useActiveEvent();
  const request = useTripStore((s) => s.request);

  const totalMiles = Math.round(
    day.events.reduce((sum, e) => sum + e.miles_from_prev, 0),
  );

  return (
    <>
      <Accordion type="single" collapsible defaultValue={defaultOpen ? `day-${day.day_number}` : undefined}>
        <AccordionItem value={`day-${day.day_number}`} className="border-b border-border-subtle">

          {/* ── Day header ─────────────────────────────────────────────── */}
          <AccordionTrigger className="px-3 py-3 hover:no-underline">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 pr-1">
              {/* Day icon badge */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <CalendarDays className="h-4 w-4 text-accent" />
              </div>

              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px] font-bold text-text-primary">
                  Day {day.day_number}
                </span>
                <div className="flex items-center gap-1.5">
                  <Route className="h-3 w-3 shrink-0 text-text-hint" />
                  <span className="text-[11px] text-text-hint">
                    {totalMiles.toLocaleString()} mi
                  </span>
                  <span className="text-[11px] text-text-hint">·</span>
                  <span className="text-[11px] text-text-hint">
                    {formatHours(day.total_driving_hrs)} driving
                  </span>
                </div>
              </div>
            </div>
          </AccordionTrigger>

          {/* ── Events ─────────────────────────────────────────────────── */}
          <AccordionContent className="pb-0">
            <div>
              {day.events.map((event, idx) => (
                <EventItem
                  key={event.id}
                  event={event}
                  isActive={event.id === activeEventId}
                  isLast={idx === day.events.length - 1}
                  onClick={() => setActiveEvent(event.id)}
                />
              ))}
            </div>

            {/* ELD log button */}
            <div className="px-3 pb-3 pt-2">
              <button
                type="button"
                onClick={() => setEldOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-highlight hover:text-text-primary"
              >
                <FileText className="h-3.5 w-3.5" />
                View ELD log — Day {day.day_number}
              </button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {request && (
        <ELDModal
          open={eldOpen}
          onClose={() => setEldOpen(false)}
          day={day}
          request={request}
          dayIndex={day.day_number - 1}
        />
      )}
    </>
  );
}
