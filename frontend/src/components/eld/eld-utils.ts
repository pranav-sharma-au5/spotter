import type { EventType, ScheduledStop, TripDay } from '../../types/trip';
import { EVENT_CONFIG } from '../../config/eventConfig';

/** Shared SVG layout — keep grid row centres in sync with ROW_Y_TOPS */
export const ELD_LAYOUT = {
  VIEW_WIDTH: 680,
  VIEW_HEIGHT: 488,
  /** Grid aligned with header fields (labelX=10); row labels sit just left of grid */
  GRID_X_START: 58,
  GRID_X_END: 618,
  /** ~28px below last header row (From/To at y=112) */
  GRID_SUBTITLE_Y: 140,
  ROW_Y_TOPS: [160, 188, 216, 244] as const,
  ROW_HEIGHT: 22,
  HOUR_LABEL_Y: 152,
  GRID_LINE_TOP: 154,
  REMARKS_TITLE_Y: 308,
  REMARKS_BOX_Y: 312,
  REMARKS_BOX_H: 64,
  TOTALS_LINE_Y: 384,
  TOTALS_TEXT_Y: 396,
  TOTALS_SUB_Y: 408,
  FOOTER_LINE_Y: 424,
  FOOTER_TEXT_Y: 436,
  SIGNATURE_LINE_Y: 447,
  SIGNATURE_LABEL_Y: 455,
} as const;

const GRID_X_START = ELD_LAYOUT.GRID_X_START;
const GRID_X_END = ELD_LAYOUT.GRID_X_END;
const GRID_WIDTH = GRID_X_END - GRID_X_START;

const ROW_Y_CENTRES: Record<0 | 1 | 2 | 3, number> = {
  0: ELD_LAYOUT.ROW_Y_TOPS[0] + ELD_LAYOUT.ROW_HEIGHT / 2,
  1: ELD_LAYOUT.ROW_Y_TOPS[1] + ELD_LAYOUT.ROW_HEIGHT / 2,
  2: ELD_LAYOUT.ROW_Y_TOPS[2] + ELD_LAYOUT.ROW_HEIGHT / 2,
  3: ELD_LAYOUT.ROW_Y_TOPS[3] + ELD_LAYOUT.ROW_HEIGHT / 2,
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

/** Cumulative driving miles from trip start through the given day (inclusive). */
export function calcCumulativeTruckMiles(days: TripDay[], throughDayIndex: number): number {
  return days
    .slice(0, throughDayIndex + 1)
    .reduce((sum, d) => sum + calcTotalMiles(d), 0);
}

export function driverInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatLogTime(absoluteHour: number): string {
  const h = Math.floor(absoluteHour) % 24;
  const m = Math.round((absoluteHour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function dutyStartHour(day: TripDay): number {
  const [hStr, mStr] = day.duty_start_time.split(':');
  return parseInt(hStr, 10) + parseInt(mStr, 10) / 60;
}

const REMARK_ACTIVITY: Partial<Record<EventType, string>> = {
  drive: 'Driving',
  break: 'Off-duty break',
  fuel: 'Fueling',
  rest: 'Sleeper berth',
  pickup: 'Loading freight',
  dropoff: 'Unloading freight',
  on_duty: 'On-duty (not driving)',
  restart: '34-hour restart',
};

function remarkForEvent(event: ScheduledStop): string {
  return REMARK_ACTIVITY[event.type] ?? event.label;
}

function cityState(event: ScheduledStop): string {
  return event.stop_info?.city || event.location;
}

/** FMCSA-style remarks: time, city/state, and activity for each duty-status change. */
export function buildRemarks(day: TripDay): string[] {
  const start = dutyStartHour(day);
  const remarks: string[] = [];

  if (start > 0) {
    const status = day.day_number > 1 ? 'Sleeper berth (continued)' : 'Off duty';
    remarks.push(`${formatLogTime(0)} — ${status}`);
  }

  for (const event of day.events) {
    const absStart = start + event.start_hour;
    const time = formatLogTime(absStart);
    const place = cityState(event);
    const activity = remarkForEvent(event);
    remarks.push(`${time} ${place} — ${activity}`);
  }

  return remarks;
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
