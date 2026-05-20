import type { ScheduledStop, TripDay } from '../../types/trip';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { shouldStopProcessingEvents } from './eldRules';
import { getEldGridContext, eventGridRange } from './eldGridTransform';
import type { EldGridContext } from './eldGridTransform';

export function formatLogTime(gridHour: number): string {
  const h = Math.floor(gridHour) % 24;
  const m = Math.round((gridHour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function remarkForEvent(event: ScheduledStop): string {
  if (event.type === 'rest') {
    return EVENT_CONFIG.rest.eldRemark;
  }
  return EVENT_CONFIG[event.type].eldRemark || event.label;
}

function formatEventRemark(
  event: ScheduledStop,
  range: { gridStart: number; absStart: number },
  ctx: { gridOffset: number },
): string {
  const displayHour = Math.max(0, range.gridStart);
  const time = formatLogTime(displayHour);
  const daySuffix = ctx.gridOffset === 0 && range.absStart >= 24 ? ' (+1 day)' : '';
  const place = cityState(event);
  const activity = remarkForEvent(event);
  return `${time}${daySuffix} ${place} — ${activity}`;
}

function cityState(event: ScheduledStop): string {
  return event.stop_info?.city || event.location;
}

/** R1 — midnight status when the grid is not shifted. */
function appendMidnightRemark(day: TripDay, remarks: string[]): void {
  const status = day.day_number > 1 ? 'Sleeper berth (continued)' : 'Off duty';
  remarks.push(`${formatLogTime(0)} — ${status}`);
}

/**
 * R1b — duty period begins after the 10-hour sleeper (day 2+).
 * duty_start_time is when the prior rest ended; without this, only 00:00 sleeper is noted.
 */
function appendDutyStartRemark(day: TripDay, ctx: EldGridContext, remarks: string[]): void {
  if (day.day_number <= 1 || ctx.dutyStartHour <= 0) return;
  remarks.push(`${formatLogTime(ctx.dutyStartHour)} — On duty`);
}

function appendOpeningRemarks(day: TripDay, ctx: EldGridContext, remarks: string[]): void {
  if (ctx.dutyStartHour <= 0) return;

  if (ctx.gridOffset === 0) {
    appendMidnightRemark(day, remarks);
    appendDutyStartRemark(day, ctx, remarks);
    return;
  }

  // Grid shifted: skip misleading 00:00 sleeper span; remark at actual clock time when duty begins
  appendDutyStartRemark(day, ctx, remarks);
}

/**
 * R3 — when a 10-hour rest ends, driving resumes (matches post_rest_drive on the graph).
 */
function appendPostRestDrivingRemark(day: TripDay, ctx: EldGridContext, remarks: string[]): void {
  const last = day.events[day.events.length - 1];
  if (!last || last.type !== 'rest') return;

  const range = eventGridRange(ctx, last);
  if (!range || range.clippedEnd >= 24 - 1 / 60) return;

  const time = formatLogTime(range.clippedEnd);
  const line = `${time} En route — Driving`;
  if (!remarks.some((r) => r.includes('En route — Driving') && r.startsWith(time))) {
    remarks.push(line);
  }
}

/** FMCSA-style remarks (R1–R3). Uses the same grid visibility rules as the duty graph. */
export function buildRemarks(day: TripDay): string[] {
  const ctx = getEldGridContext(day);
  const remarks: string[] = [];

  appendOpeningRemarks(day, ctx, remarks);

  for (const event of day.events) {
    const range = eventGridRange(ctx, event);
    const absStart = ctx.dutyStartHour + event.start_hour;
    const gridStart = absStart + ctx.gridOffset;

    if (shouldStopProcessingEvents(gridStart)) break;
    if (!range) continue;

    remarks.push(formatEventRemark(event, range, ctx));
  }

  appendPostRestDrivingRemark(day, ctx, remarks);

  return remarks;
}
