import type { ScheduledStop, TripDay } from '../../types/trip';
import type { EldRow } from './eldRules';
import {
  gridOffsetForDutyStart,
  initialGapRow,
  clipToGrid,
} from './eldRules';

export interface EldGridContext {
  dutyStartHour: number;
  gridOffset: number;
  gridDutyStart: number;
  initialGapRow: EldRow;
}

export function parseDutyStartHour(day: TripDay): number {
  const [hStr, mStr] = day.duty_start_time.split(':');
  return parseInt(hStr, 10) + parseInt(mStr, 10) / 60;
}

export function getEldGridContext(day: TripDay): EldGridContext {
  const dutyStartHour = parseDutyStartHour(day);
  const gridOffset = gridOffsetForDutyStart(dutyStartHour);
  return {
    dutyStartHour,
    gridOffset,
    gridDutyStart: dutyStartHour + gridOffset,
    initialGapRow: initialGapRow(day.day_number),
  };
}

export function eventAbsoluteRange(
  ctx: EldGridContext,
  event: ScheduledStop,
): { absStart: number; absEnd: number } {
  const absStart = ctx.dutyStartHour + event.start_hour;
  return { absStart, absEnd: absStart + event.duration_hrs };
}

export interface EventGridRange {
  absStart: number;
  absEnd: number;
  gridStart: number;
  gridEnd: number;
  clippedStart: number;
  clippedEnd: number;
}

/** Grid range for an event, or null if entirely off the 0–24 window. */
export function eventGridRange(
  ctx: EldGridContext,
  event: ScheduledStop,
): EventGridRange | null {
  const { absStart, absEnd } = eventAbsoluteRange(ctx, event);
  const gridStart = absStart + ctx.gridOffset;
  const gridEnd = absEnd + ctx.gridOffset;
  const clipped = clipToGrid(gridStart, gridEnd);
  if (!clipped) return null;
  return {
    absStart,
    absEnd,
    gridStart,
    gridEnd,
    clippedStart: clipped.start,
    clippedEnd: clipped.end,
  };
}
