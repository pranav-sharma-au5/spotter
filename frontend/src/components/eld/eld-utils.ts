import type { EventType, TripDay } from '../../types/trip';
import { EVENT_CONFIG } from '../../config/eventConfig';

const GRID_X_START = 80;
const GRID_X_END = 640;
const GRID_WIDTH = GRID_X_END - GRID_X_START; // 560px

const ROW_Y_CENTRES: Record<0 | 1 | 2 | 3, number> = {
  0: 131,
  1: 159,
  2: 187,
  3: 215,
};

export function getRowForEvent(type: EventType): 0 | 1 | 2 | 3 {
  return EVENT_CONFIG[type].row;
}

export function hourToX(absoluteHour: number): number {
  return GRID_X_START + (absoluteHour / 24) * GRID_WIDTH;
}

export interface Segment {
  row: 0 | 1 | 2 | 3;
  x1: number;
  x2: number;
  y: number;
}

export interface Connector {
  x: number;
  y1: number;
  y2: number;
}

export function buildSegments(day: TripDay): Segment[] {
  const segments: Segment[] = [];
  const [hStr, mStr] = day.duty_start_time.split(':');
  const dutyStartHour = parseInt(hStr, 10) + parseInt(mStr, 10) / 60;

  // Before duty starts: off-duty on day 1 (at home), sleeper berth on subsequent
  // days (rest carried over from the previous log sheet).
  if (dutyStartHour > 0) {
    const row: 0 | 1 | 2 | 3 = day.day_number > 1 ? 1 : 0;
    segments.push({
      row,
      x1: hourToX(0),
      x2: hourToX(dutyStartHour),
      y: ROW_Y_CENTRES[row],
    });
  }

  let currentHour = dutyStartHour;

  for (const event of day.events) {
    const absoluteStart = dutyStartHour + event.start_hour;
    const absoluteEnd = absoluteStart + event.duration_hrs;
    const row = getRowForEvent(event.type);

    // Gap between events: assume off-duty
    if (absoluteStart > currentHour) {
      segments.push({
        row: 0,
        x1: hourToX(currentHour),
        x2: hourToX(absoluteStart),
        y: ROW_Y_CENTRES[0],
      });
    }

    segments.push({
      row,
      x1: hourToX(absoluteStart),
      x2: hourToX(Math.min(absoluteEnd, 24)),
      y: ROW_Y_CENTRES[row],
    });

    currentHour = Math.min(absoluteEnd, 24);
  }

  // Off-duty after last event until midnight
  if (currentHour < 24) {
    segments.push({
      row: 0,
      x1: hourToX(currentHour),
      x2: hourToX(24),
      y: ROW_Y_CENTRES[0],
    });
  }

  return segments;
}

// ── ELDLogSheet data utilities ────────────────────────────────────────────────

export function getLogDate(dayIndex: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export function calcTotalMiles(day: TripDay): number {
  return day.events.reduce((sum, e) => sum + (e.type === 'drive' ? e.miles_from_prev : 0), 0);
}

export function calcRowHours(day: TripDay): Record<0 | 1 | 2 | 3, number> {
  const segments = buildSegments(day);
  const totals: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const seg of segments) {
    const hrs = ((seg.x2 - seg.x1) / GRID_WIDTH) * 24;
    totals[seg.row] += hrs;
  }
  return totals;
}

export function buildConnectors(segments: Segment[]): Connector[] {
  const connectors: Connector[] = [];
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const curr = segments[i];
    if (prev.row !== curr.row) {
      connectors.push({
        x: curr.x1,
        y1: prev.y,
        y2: curr.y,
      });
    }
  }
  return connectors;
}
