import type { TripDay } from '../../types/trip';
import type { EldRow } from './eldRules';
import { getEldRowForEvent, OFF_DUTY_ROW, DRIVING_ROW } from './eldRules';
import {
  getEldGridContext,
  eventGridRange,
  shouldStopProcessingEvents,
} from './eldGridTransform';

export type DutyIntervalKind = 'initial_gap' | 'gap' | 'event' | 'post_rest_drive';

export interface DutyInterval {
  kind: DutyIntervalKind;
  row: EldRow;
  startHour: number;
  endHour: number;
}

function pushGap(
  intervals: DutyInterval[],
  kind: 'initial_gap' | 'gap',
  row: EldRow,
  startHour: number,
  endHour: number,
): void {
  if (endHour <= startHour) return;
  intervals.push({ kind, row, startHour, endHour });
}

/** Build hour-based duty intervals for the 24h grid (G1–G4). */
export function buildDutyIntervals(day: TripDay): DutyInterval[] {
  const ctx = getEldGridContext(day);
  const intervals: DutyInterval[] = [];

  if (ctx.gridDutyStart > 0) {
    pushGap(intervals, 'initial_gap', ctx.initialGapRow, 0, ctx.gridDutyStart);
  }

  let currentHour = Math.max(0, ctx.gridDutyStart);

  for (const event of day.events) {
    const range = eventGridRange(ctx, event);
    const absStart = ctx.dutyStartHour + event.start_hour;
    const gridStart = absStart + ctx.gridOffset;

    if (shouldStopProcessingEvents(gridStart)) break;
    if (!range) continue;

    const { clippedStart, clippedEnd } = range;

    if (clippedStart > currentHour) {
      pushGap(intervals, 'gap', OFF_DUTY_ROW, currentHour, clippedStart);
    }

    intervals.push({
      kind: 'event',
      row: getEldRowForEvent(event.type),
      startHour: clippedStart,
      endHour: clippedEnd,
    });

    currentHour = clippedEnd;
  }

  const lastEvent = day.events[day.events.length - 1];

  if (currentHour < 24 && lastEvent?.type === 'rest') {
    // G4b: after 10h rest ends, driver resumes driving until end of log day
    intervals.push({
      kind: 'post_rest_drive',
      row: DRIVING_ROW,
      startHour: currentHour,
      endHour: 24,
    });
  } else if (currentHour < 24) {
    pushGap(intervals, 'gap', OFF_DUTY_ROW, currentHour, 24);
  }

  return intervals;
}
