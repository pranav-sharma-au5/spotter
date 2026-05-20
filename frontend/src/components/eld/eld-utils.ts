/**
 * Public exports for app code outside this folder.
 * ELD internals import submodules directly (see README.md).
 */
export { calcTotalMiles, calcCumulativeTruckMiles, getLogDate, driverInitials, buildEldHeaderFields, type EldHeaderField } from './eldLogData';
export { buildDutyIntervals } from './eldDutyGraph';
export { buildRemarks } from './eldRemarks';
export { intervalsToSegments, intervalsToConnectors, sumRowHours, type Segment, type Connector } from './eldSvgAdapter';
export { ELD_LAYOUT, hourToX, remarksMaxLines } from './eldLayout';
