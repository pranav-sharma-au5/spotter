import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { cn } from '../../lib/utils';
import { ELDLogSheet } from './ELDLogSheet';
import { openEldPrintWindow } from './eldPrint';
import type { TripDay } from '../../types/trip';

const ELD_MODAL_CONTENT_CLASS = cn(
  'max-w-[700px]',
  'max-md:flex max-md:h-[calc(100vw-1rem)] max-md:w-[calc(100dvh-1rem)] max-md:max-w-none',
  'max-md:rotate-90 max-md:flex-col max-md:overflow-hidden',
  'max-md:[&>button]:hidden',
);

export interface ELDModalProps {
  open: boolean;
  onClose: () => void;
  day: TripDay;
  from: string;
  to: string;
  dayIndex: number;
  allDays?: TripDay[];
}

export function ELDModal({ open, onClose, day, from, to, dayIndex, allDays }: ELDModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    openEldPrintWindow('eld-log-sheet', `ELD Day ${day.day_number}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={ELD_MODAL_CONTENT_CLASS}>
        <DialogHeader className="max-md:shrink-0 max-md:px-4 max-md:py-3">
          <DialogTitle>
            Day {day.day_number} — Daily Log
          </DialogTitle>
        </DialogHeader>

        <div
          id="eld-log-sheet"
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-auto px-4 py-2 md:px-6"
        >
          <ELDLogSheet day={day} from={from} to={to} dayIndex={dayIndex} allDays={allDays} />
        </div>

        <DialogFooter className="max-md:shrink-0 max-md:gap-2 max-md:px-4 max-md:py-3">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-border-medium px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary md:px-4"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-dark md:px-4"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
