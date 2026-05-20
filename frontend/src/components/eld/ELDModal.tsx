import { useEffect, useRef } from 'react';
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

const DEBUG_LOG = (
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) => {
  // #region agent log
  fetch('http://127.0.0.1:7447/ingest/c66f8c24-10ca-4015-a3ce-a49ad430e81a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f31262' },
    body: JSON.stringify({
      sessionId: 'f31262',
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
};

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
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const logLayout = (trigger: string) => {
      const scrollEl = scrollRef.current ?? document.getElementById('eld-log-sheet');
      const contentEl = contentRef.current;
      const svgEl = scrollEl?.querySelector('svg');
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const nestedDialogs = document.querySelectorAll('[data-radix-dialog-content]').length;
      const bodyOverflow = getComputedStyle(document.body).overflow;

      DEBUG_LOG(
        'ELDModal.tsx:layout',
        `ELD modal layout (${trigger})`,
        {
          trigger,
          isMobile,
          viewport: { w: window.innerWidth, h: window.innerHeight },
          nestedDialogs,
          bodyOverflow,
          content: contentEl
            ? {
                clientH: contentEl.clientHeight,
                scrollH: contentEl.scrollHeight,
                overflow: getComputedStyle(contentEl).overflow,
                transform: getComputedStyle(contentEl).transform,
              }
            : null,
          scrollContainer: scrollEl
            ? {
                clientH: scrollEl.clientHeight,
                scrollH: scrollEl.scrollHeight,
                scrollTop: scrollEl.scrollTop,
                canScroll: scrollEl.scrollHeight > scrollEl.clientHeight,
                overflow: getComputedStyle(scrollEl).overflow,
                overflowY: getComputedStyle(scrollEl).overflowY,
                touchAction: getComputedStyle(scrollEl).touchAction,
              }
            : null,
          svg: svgEl
            ? {
                clientH: svgEl.clientHeight,
                scrollH: svgEl.scrollHeight,
                boundingH: svgEl.getBoundingClientRect().height,
              }
            : null,
        },
        'A',
      );
    };

    const rafId = requestAnimationFrame(() => {
      logLayout('open');
      setTimeout(() => logLayout('open+100ms'), 100);
    });

    const scrollEl = scrollRef.current ?? document.getElementById('eld-log-sheet');
    const onScroll = () => {
      if (!scrollEl) return;
      DEBUG_LOG(
        'ELDModal.tsx:scroll',
        'ELD scroll event fired',
        { scrollTop: scrollEl.scrollTop, scrollH: scrollEl.scrollHeight, clientH: scrollEl.clientHeight },
        'B',
      );
    };
    const onTouchMove = (e: TouchEvent) => {
      DEBUG_LOG(
        'ELDModal.tsx:touchmove',
        'Touch move on scroll container',
        {
          touchCount: e.touches.length,
          defaultPrevented: e.defaultPrevented,
          scrollTop: scrollEl?.scrollTop ?? null,
        },
        'B',
      );
    };
    const onTouchStart = () => {
      DEBUG_LOG(
        'ELDModal.tsx:touchstart',
        'Touch start on scroll container',
        {
          bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
          bodyOverflow: getComputedStyle(document.body).overflow,
          nestedDialogs: document.querySelectorAll('[data-radix-dialog-content]').length,
        },
        'C',
      );
    };

    scrollEl?.addEventListener('scroll', onScroll, { passive: true });
    scrollEl?.addEventListener('touchmove', onTouchMove, { passive: true });
    scrollEl?.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      scrollEl?.removeEventListener('scroll', onScroll);
      scrollEl?.removeEventListener('touchmove', onTouchMove);
      scrollEl?.removeEventListener('touchstart', onTouchStart);
    };
  }, [open]);

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
        ref={contentRef}
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

        <div
          id="eld-log-sheet"
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-auto px-4 py-2 md:px-6"
        >
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
