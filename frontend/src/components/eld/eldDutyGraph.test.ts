import { describe, it, expect, beforeEach } from 'vitest';
import { buildDutyIntervals } from './eldDutyGraph';
import { buildRemarks } from './eldRemarks';
import { getEldGridContext } from './eldGridTransform';
import { getEldRowForEvent, shouldShiftGrid } from './eldRules';
import { sumRowHours } from './eldSvgAdapter';
import { makeDay, makeEvent, resetEventCounter } from './eld.test.helpers';

beforeEach(() => {
  resetEventCounter();
});

describe('getEldRowForEvent', () => {
  it('maps break to off-duty row 0', () => {
    expect(getEldRowForEvent('break')).toBe(0);
  });

  it('maps drive to row 2', () => {
    expect(getEldRowForEvent('drive')).toBe(2);
  });
});

describe('buildDutyIntervals', () => {
  it('day 1 with 08:00 duty start has initial off-duty gap and covers 24h', () => {
    const day = makeDay({
      dayNumber: 1,
      dutyStart: '08:00',
      events: [
        makeEvent('pickup', 0, 1),
        makeEvent('drive', 1, 4),
      ],
    });
    const intervals = buildDutyIntervals(day);
    const initial = intervals.find((i) => i.kind === 'initial_gap');
    expect(initial?.row).toBe(0);
    expect(initial?.startHour).toBe(0);
    expect(initial?.endHour).toBe(8);

    const rowHours = sumRowHours(intervals);
    const total = rowHours[0] + rowHours[1] + rowHours[2] + rowHours[3];
    expect(total).toBeCloseTo(24, 1);
  });

  it('day 2+ uses sleeper row for initial gap', () => {
    const day = makeDay({
      dayNumber: 2,
      dutyStart: '08:00',
      events: [makeEvent('drive', 0, 2)],
    });
    const intervals = buildDutyIntervals(day);
    const initial = intervals.find((i) => i.kind === 'initial_gap');
    expect(initial?.row).toBe(1);
  });

  it('duty start at 10:00 triggers grid shift', () => {
    expect(shouldShiftGrid(10)).toBe(true);
    expect(shouldShiftGrid(9.99)).toBe(false);
  });

  it('late duty start (22:30) shifts grid and skips initial gap', () => {
    const day = makeDay({
      dutyStart: '22:30',
      events: [makeEvent('drive', 2, 4)],
    });
    const ctx = getEldGridContext(day);
    expect(shouldShiftGrid(ctx.dutyStartHour)).toBe(true);
    expect(ctx.gridOffset).toBe(-24);

    const intervals = buildDutyIntervals(day);
    expect(intervals.find((i) => i.kind === 'initial_gap')).toBeUndefined();
    const drive = intervals.find((i) => i.kind === 'event' && i.row === 2);
    expect(drive).toBeDefined();
    expect(drive!.startHour).toBeGreaterThanOrEqual(0);
  });

  it('day 2 late duty avoids sleeper line from midnight to prior-day clock time', () => {
    const day = makeDay({
      dayNumber: 2,
      dutyStart: '22:30',
      events: [makeEvent('drive', 0, 2)],
    });
    const intervals = buildDutyIntervals(day);
    const initial = intervals.find((i) => i.kind === 'initial_gap');
    expect(initial).toBeUndefined();
    const longSleeper = intervals.find(
      (i) => i.row === 1 && i.endHour - i.startHour > 12,
    );
    expect(longSleeper).toBeUndefined();
  });

  it('break event draws on row 0', () => {
    const day = makeDay({
      dutyStart: '08:00',
      events: [
        makeEvent('drive', 0, 3),
        makeEvent('break', 3, 0.5),
        makeEvent('drive', 3.5, 2),
      ],
    });
    const intervals = buildDutyIntervals(day);
    const breakInterval = intervals.find((i) => i.kind === 'event' && i.row === 0 && i.endHour - i.startHour === 0.5);
    expect(breakInterval).toBeDefined();
  });
});

describe('buildRemarks', () => {
  it('adds opening off-duty remark on day 1 when duty starts after midnight', () => {
    const day = makeDay({
      dayNumber: 1,
      dutyStart: '08:00',
      events: [makeEvent('drive', 0, 2)],
    });
    const remarks = buildRemarks(day);
    expect(remarks[0]).toMatch(/^00:00 — Off duty/);
  });

  it('adds sleeper continued and on-duty remarks on day 2+ morning start', () => {
    const day = makeDay({
      dayNumber: 2,
      dutyStart: '08:00',
      events: [makeEvent('drive', 0, 2)],
    });
    const remarks = buildRemarks(day);
    expect(remarks[0]).toMatch(/00:00 — Sleeper berth \(continued\)/);
    expect(remarks[1]).toMatch(/08:00 — On duty/);
  });

  it('adds on-duty remark at duty start after 10h rest when grid is shifted', () => {
    const day = makeDay({
      dayNumber: 2,
      dutyStart: '22:30',
      events: [makeEvent('drive', 0, 2)],
    });
    const remarks = buildRemarks(day);
    expect(remarks.some((r) => r.startsWith('00:00 —'))).toBe(false);
    expect(remarks.some((r) => r.match(/^22:30 — On duty/))).toBe(true);
  });

  it('includes Off-duty break text for break events', () => {
    const day = makeDay({
      dutyStart: '08:00',
      events: [makeEvent('break', 4, 0.5, { location: 'Rest Area' })],
    });
    const remarks = buildRemarks(day);
    expect(remarks.some((r) => r.includes('Off-duty break'))).toBe(true);
  });

  it('adds remark when 10-hour sleeper berth rest starts', () => {
    const day = makeDay({
      dutyStart: '08:00',
      events: [
        makeEvent('drive', 0, 11),
        makeEvent('rest', 11, 10, { label: 'Overnight Rest', location: 'Mile 605, AK' }),
      ],
    });
    const remarks = buildRemarks(day);
    const restRemark = remarks.find((r) => r.includes('10-hour sleeper berth'));
    expect(restRemark).toBeDefined();
    expect(restRemark).toMatch(/19:00.*10-hour sleeper berth/);
  });

  it('day 4 pattern: rest start then driving after 10h rest ends', () => {
    const day = makeDay({
      dayNumber: 4,
      dutyStart: '01:30',
      events: [
        makeEvent('drive', 0, 1.55),
        makeEvent('fuel', 1.55, 0.5),
        makeEvent('drive', 2.05, 6.92),
        makeEvent('fuel', 8.97, 0.5, { location: "Casey's General Store" }),
        makeEvent('rest', 12, 10, { location: 'Rest Area' }),
      ],
    });
    const remarks = buildRemarks(day);
    expect(remarks.some((r) => r.match(/13:30.*10-hour sleeper berth/))).toBe(true);
    expect(remarks.some((r) => r.match(/23:30 En route — Driving/))).toBe(true);

    const intervals = buildDutyIntervals(day);
    const postRestDrive = intervals.find((i) => i.kind === 'post_rest_drive');
    expect(postRestDrive?.row).toBe(2);
    expect(postRestDrive?.startHour).toBeCloseTo(23.5, 1);
    expect(postRestDrive?.endHour).toBe(24);
  });
});

describe('graph and remarks alignment', () => {
  it('one remark per visible event interval', () => {
    const day = makeDay({
      dutyStart: '08:00',
      events: [
        makeEvent('pickup', 0, 1),
        makeEvent('drive', 1, 3),
        makeEvent('break', 4, 0.5),
      ],
    });
    const eventIntervals = buildDutyIntervals(day).filter((i) => i.kind === 'event');
    const remarks = buildRemarks(day);
    const eventRemarks = remarks.filter(
      (r) => !r.startsWith('00:00 —') && !r.endsWith('— On duty'),
    );
    expect(eventRemarks.length).toBe(eventIntervals.length);
  });
});
