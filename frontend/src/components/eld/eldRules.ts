/**
 * ELD log rules — single source of truth for predicates and row mapping.
 *
 * Grid shift: when duty starts at 10:00+ on the log day, shift all times by -24h.
 * Without this, day 2+ draws a sleeper line from midnight to ~23:30 (yesterday’s
 * clock time on today’s grid). Shifting places actual work at the left of the grid.
 */
import type { EventType } from '../../types/trip';
import { EVENT_CONFIG } from '../../config/eventConfig';

export type EldRow = 0 | 1 | 2 | 3;

/** Duty starts at or after this hour (on the 24h grid) triggers a -24h shift. */
export const LATE_DUTY_START_HOUR = 10;

export const GRID_SHIFT_HOURS = -24;

export const OFF_DUTY_ROW: EldRow = 0;
export const DRIVING_ROW: EldRow = 2;

export function shouldShiftGrid(dutyStartHour: number): boolean {
  return dutyStartHour >= LATE_DUTY_START_HOUR;
}

export function gridOffsetForDutyStart(dutyStartHour: number): number {
  return shouldShiftGrid(dutyStartHour) ? GRID_SHIFT_HOURS : 0;
}

/** Row for the initial gap before duty begins (G1). */
export function initialGapRow(dayNumber: number): EldRow {
  return dayNumber > 1 ? 1 : 0;
}

/** FMCSA log row for an event segment (G3). */
export function getEldRowForEvent(type: EventType): EldRow {
  if (type === 'break') return 0;
  return EVENT_CONFIG[type].row;
}

export function isEventVisibleOnGrid(gridStart: number, gridEnd: number): boolean {
  return gridEnd > 0 && gridStart < 24;
}

export function shouldStopProcessingEvents(gridStart: number): boolean {
  return gridStart >= 24;
}

export function clipToGrid(gridStart: number, gridEnd: number): { start: number; end: number } | null {
  if (!isEventVisibleOnGrid(gridStart, gridEnd)) return null;
  return {
    start: Math.max(0, gridStart),
    end: Math.min(gridEnd, 24),
  };
}
