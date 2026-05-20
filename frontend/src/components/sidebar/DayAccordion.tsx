import { useState } from 'react';
import { FileText, CalendarDays } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { EventItem } from './EventItem';
import { ELDModal } from '../eld/ELDModal';
import { Button } from '../ui/Button';
import { useActiveEvent } from '../../hooks/useActiveEvent';
import { formatHours } from '../../utils/format';
import { calcTotalMiles } from '../eld/eld-utils';
import type { TripDay } from '../../types/trip';

interface DayAccordionProps {
  day: TripDay;
  defaultOpen: boolean;
  /** Route origin forwarded to the ELD log sheet */
  from: string;
  /** Route destination forwarded to the ELD log sheet */
  to: string;
  /** Full trip — cumulative truck miles on each day's log */
  allDays: TripDay[];
}

export function DayAccordion({ day, defaultOpen, from, to, allDays }: DayAccordionProps) {
  const [eldOpen, setEldOpen] = useState(false);
  const { activeEventId, setActiveEvent } = useActiveEvent();

  const totalMiles = Math.round(calcTotalMiles(day));

  return (
    <>
      <Accordion type="single" collapsible defaultValue={defaultOpen ? `day-${day.day_number}` : undefined}>
        <AccordionItem value={`day-${day.day_number}`} className="border-b border-border-subtle">

          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-1 text-left">
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-text-primary">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-accent" />
                Day {day.day_number}
              </span>
              <span className="text-[11px] text-text-secondary">
                {totalMiles.toLocaleString()} mi · {formatHours(day.total_driving_hrs)} driving
              </span>
            </div>
          </AccordionTrigger>

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

            <div className="px-3 pb-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setEldOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-bg-elevated px-3 py-2 font-medium hover:bg-bg-highlight"
              >
                <FileText className="h-3.5 w-3.5" />
                View ELD log — Day {day.day_number}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <ELDModal
        open={eldOpen}
        onClose={() => setEldOpen(false)}
        day={day}
        from={from}
        to={to}
        dayIndex={day.day_number - 1}
        allDays={allDays}
      />
    </>
  );
}
