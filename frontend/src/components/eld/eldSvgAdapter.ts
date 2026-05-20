import type { EldRow } from './eldRules';
import { hourToX, rowCentreY } from './eldLayout';
import type { DutyInterval } from './eldDutyGraph';

export interface Segment {
  row: EldRow;
  x1: number;
  x2: number;
  y: number;
}

export interface Connector {
  x: number;
  y1: number;
  y2: number;
}

export function intervalsToSegments(intervals: DutyInterval[]): Segment[] {
  return intervals.map((interval) => ({
    row: interval.row,
    x1: hourToX(interval.startHour),
    x2: hourToX(interval.endHour),
    y: rowCentreY(interval.row),
  }));
}

export function intervalsToConnectors(intervals: DutyInterval[]): Connector[] {
  const connectors: Connector[] = [];
  for (let i = 1; i < intervals.length; i++) {
    const prev = intervals[i - 1];
    const curr = intervals[i];
    if (prev.row !== curr.row) {
      connectors.push({
        x: hourToX(curr.startHour),
        y1: rowCentreY(prev.row),
        y2: rowCentreY(curr.row),
      });
    }
  }
  return connectors;
}

export function sumRowHours(intervals: DutyInterval[]): Record<EldRow, number> {
  const totals: Record<EldRow, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const interval of intervals) {
    totals[interval.row] += interval.endHour - interval.startHour;
  }
  return totals;
}
