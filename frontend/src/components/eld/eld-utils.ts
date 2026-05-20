/** Barrel re-exports — preserves existing import paths across the app. */
export { ELD_LAYOUT, hourToX, rowCentreY, remarksMaxLines } from './eldLayout';
export {
  LATE_DUTY_START_HOUR,
  getEldRowForEvent,
  type EldRow,
} from './eldRules';
export { parseDutyStartHour, getEldGridContext } from './eldGridTransform';
export { buildDutyIntervals, type DutyInterval, type DutyIntervalKind } from './eldDutyGraph';
export { buildRemarks, formatLogTime } from './eldRemarks';
export {
  intervalsToSegments,
  intervalsToConnectors,
  sumRowHours,
  type Segment,
  type Connector,
} from './eldSvgAdapter';
export {
  getLogDate,
  calcTotalMiles,
  calcCumulativeTruckMiles,
  driverInitials,
  buildEldHeaderFields,
  type EldHeaderField,
} from './eldLogData';

import type { EventType } from '../../types/trip';
import type { TripDay } from '../../types/trip';
import { getEldRowForEvent } from './eldRules';
import { buildDutyIntervals } from './eldDutyGraph';
import { intervalsToSegments, sumRowHours } from './eldSvgAdapter';
import type { Segment, Connector } from './eldSvgAdapter';

/** @deprecated Use getEldRowForEvent */
export function getRowForEvent(type: EventType): 0 | 1 | 2 | 3 {
  return getEldRowForEvent(type);
}

export function buildSegments(day: TripDay) {
  return intervalsToSegments(buildDutyIntervals(day));
}

export function buildConnectors(segments: Segment[]) {
  const connectors: Connector[] = [];
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const curr = segments[i];
    if (prev.row !== curr.row) {
      connectors.push({ x: curr.x1, y1: prev.y, y2: curr.y });
    }
  }
  return connectors;
}

export function calcRowHours(day: TripDay) {
  return sumRowHours(buildDutyIntervals(day));
}
