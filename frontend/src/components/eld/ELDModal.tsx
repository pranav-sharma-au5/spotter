import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { cn } from '../../lib/utils';
import { ELDLogSheet } from './ELDLogSheet';
import type { TripDay } from '../../types/trip';

export interface ELDModalProps {
  open: boolean;
  onClose: () => void;
  day: TripDay;
  /** Route origin — displayed in the log sheet "From" field */
  from: string;
  /** Route destination — displayed in the log sheet "To" field */
  to: string;
  dayIndex: number;
}

export function ELDModal({ open, onClose, day, from, to, dayIndex }: ELDModalProps) {
  const handlePrint = () => {
    const el = document.getElementById('eld-log-sheet');
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>ELD Day ${day.day_number}</title></head>
        <body style="margin:0;padding:0">${el.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          'max-w-[700px]',
          // Portrait phones: rotate dialog so the wide log uses viewport height as width
          'max-md:flex max-md:h-[calc(100vw-1rem)] max-md:w-[calc(100dvh-1rem)] max-md:max-w-none',
          'max-md:rotate-90 max-md:flex-col max-md:overflow-hidden',
          'max-md:[&>button]:hidden',
        )}
      >
        <DialogHeader className="max-md:shrink-0 max-md:px-4 max-md:py-3">
          <DialogTitle>
            Day
            {' '}
            {day.day_number}
            {' '}
            — Daily Log
          </DialogTitle>
        </DialogHeader>

        <div id="eld-log-sheet" className="min-h-0 flex-1 overflow-auto px-4 py-2 md:px-6">
          <ELDLogSheet day={day} from={from} to={to} dayIndex={dayIndex} />
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
