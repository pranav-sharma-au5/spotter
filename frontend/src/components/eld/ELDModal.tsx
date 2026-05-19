import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
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
      <DialogContent className="max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            Day
            {' '}
            {day.day_number}
            {' '}
            — Daily Log
          </DialogTitle>
        </DialogHeader>

        <div id="eld-log-sheet" className="px-6 py-2">
          <ELDLogSheet day={day} from={from} to={to} dayIndex={dayIndex} />
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-border-medium px-4 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
