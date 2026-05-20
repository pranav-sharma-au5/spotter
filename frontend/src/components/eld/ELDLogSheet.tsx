import {
  buildSegments,
  buildConnectors,
  buildRemarks,
  buildEldHeaderFields,
  hourToX,
  getLogDate,
  calcTotalMiles,
  calcCumulativeTruckMiles,
  calcRowHours,
  driverInitials,
  ELD_LAYOUT,
} from './eld-utils';
import type { EldHeaderField } from './eld-utils';
import type { TripDay } from '../../types/trip';

export interface ELDLogSheetProps {
  day: TripDay;
  /** Route origin — "From" and default home operating center */
  from: string;
  /** Route destination — "To" field */
  to: string;
  dayIndex: number;
  /** All trip days — cumulative truck miles through this day */
  allDays?: TripDay[];
  driverName?: string;
  driverNo?: string;
  vehicleNo?: string;
  trailerNo?: string;
  carrierName?: string;
  coDriver?: string;
  homeOperatingCenter?: string;
  shipper?: string;
  commodity?: string;
  loadId?: string;
}

const {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  GRID_X_START,
  GRID_X_END,
  ROW_Y_TOPS,
  ROW_HEIGHT,
  GRID_SUBTITLE_Y,
  HOUR_LABEL_Y,
  GRID_LINE_TOP,
  REMARKS_TITLE_Y,
  REMARKS_BOX_Y,
  REMARKS_BOX_H,
  TOTALS_LINE_Y,
  TOTALS_TEXT_Y,
  TOTALS_SUB_Y,
  FOOTER_LINE_Y,
  FOOTER_TEXT_Y,
  SIGNATURE_LINE_Y,
  SIGNATURE_LABEL_Y,
} = ELD_LAYOUT;

const LINE_COLOUR = '#1a3a5a';
const HOUR_LABELS = [
  'Mid', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
  'Noon', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
];
const ROW_LABELS = ['Off Duty', 'Sleeper\nBerth', 'Driving', 'On Duty\n(Not Driving)'];

const FONT = 'Arial, Helvetica, sans-serif';
const TEXT_STYLE = { fontFamily: FONT, fill: '#1a2a3a' } as const;

const HEADER_LEFT = { labelX: 10, valueX: 108, lineEnd: 288 };
const HEADER_RIGHT = { labelX: 370, valueX: 468, lineEnd: 648 };

interface ELDHeaderProps {
  fields: EldHeaderField[];
}

function ELDHeader({ fields }: ELDHeaderProps) {
  return (
    <>
      <text x={340} y={14} textAnchor="middle" style={{ ...TEXT_STYLE, fontSize: 9, fontWeight: 700 }}>
        DRIVER&apos;S DAILY LOG (ONE CALENDAR DAY — 24 HOURS)
      </text>
      <line x1={10} y1={18} x2={GRID_X_END + 52} y2={18} stroke="#aaa" strokeWidth={0.5} />
      {fields.map(({ label, value, y, col }) => {
        const { labelX, valueX, lineEnd } = col === 'left' ? HEADER_LEFT : HEADER_RIGHT;
        return (
          <g key={`${label}-${col}-${y}`}>
            <text x={labelX} y={y} style={{ ...TEXT_STYLE, fontSize: 7.5, fontWeight: 600 }}>{label}</text>
            <text x={valueX} y={y} style={{ ...TEXT_STYLE, fontSize: 7.5 }}>{value}</text>
            <line x1={valueX} y1={y + 1} x2={lineEnd} y2={y + 1} stroke="#ccc" strokeWidth={0.5} />
          </g>
        );
      })}
    </>
  );
}

function ELDGrid() {
  const gridBottom = ROW_Y_TOPS[3] + ROW_HEIGHT;
  return (
    <>
      <text x={GRID_X_START} y={GRID_SUBTITLE_Y} textAnchor="start" style={{ ...TEXT_STYLE, fontSize: 6, fill: '#666' }}>
        24-hour period — 15-minute increments
      </text>
      {ROW_Y_TOPS.map((y, idx) => (
        <rect
          key={`row-bg-${idx}`}
          x={GRID_X_START} y={y} width={GRID_X_END - GRID_X_START} height={ROW_HEIGHT}
          fill={idx % 2 === 0 ? '#f8fafc' : '#f0f4f8'}
        />
      ))}
      {ROW_Y_TOPS.map((y, idx) => (
        <rect
          key={`row-outline-${idx}`}
          x={GRID_X_START} y={y} width={GRID_X_END - GRID_X_START} height={ROW_HEIGHT}
          fill="none" stroke="#b0bec5" strokeWidth={0.5}
        />
      ))}
      {Array.from({ length: 25 }, (_, h) => (
        <line
          key={`tick-${h}`}
          x1={hourToX(h)} y1={GRID_LINE_TOP} x2={hourToX(h)} y2={gridBottom}
          stroke="#90a4ae" strokeWidth={h % 12 === 0 ? 1 : 0.5}
        />
      ))}
      {Array.from({ length: 24 * 4 + 1 }, (_, i) => {
        if (i % 4 === 0) return null;
        const h = i / 4;
        return (
          <line
            key={`minor-${i}`}
            x1={hourToX(h)} y1={GRID_LINE_TOP} x2={hourToX(h)} y2={GRID_LINE_TOP + 8}
            stroke="#b0bec5" strokeWidth={0.3}
          />
        );
      })}
      {HOUR_LABELS.map((lbl, h) => (
        <text key={`hlbl-${h}`} x={hourToX(h)} y={HOUR_LABEL_Y} textAnchor="middle" style={{ ...TEXT_STYLE, fontSize: 6.5 }}>
          {lbl}
        </text>
      ))}
      {ROW_LABELS.map((lbl, idx) => {
        const y = ROW_Y_TOPS[idx] + ROW_HEIGHT / 2;
        const lines = lbl.split('\n');
        return (
          <text key={`rlbl-${idx}`} x={GRID_X_START - 4} y={y} textAnchor="end" style={{ ...TEXT_STYLE, fontSize: 6.5 }}>
            {lines.map((line, li) => (
              <tspan key={li} x={GRID_X_START - 4} dy={li === 0 ? 0 : 8}>{line}</tspan>
            ))}
          </text>
        );
      })}
      <text x={GRID_X_END + 24} y={ROW_Y_TOPS[0] - 4} textAnchor="end" style={{ ...TEXT_STYLE, fontSize: 6.5, fontWeight: 600 }}>
        Total
      </text>
    </>
  );
}

interface ELDDutyLinesProps {
  segments: ReturnType<typeof buildSegments>;
  connectors: ReturnType<typeof buildConnectors>;
  rowHours: Record<0 | 1 | 2 | 3, number>;
}

function ELDDutyLines({ segments, connectors, rowHours }: ELDDutyLinesProps) {
  return (
    <>
      {segments.map((seg, i) => (
        <line
          key={`seg-${i}`}
          x1={seg.x1} y1={seg.y} x2={seg.x2} y2={seg.y}
          stroke={LINE_COLOUR} strokeWidth={3} strokeLinecap="round"
        />
      ))}
      {connectors.map((c, i) => (
        <line
          key={`conn-${i}`}
          x1={c.x} y1={c.y1} x2={c.x} y2={c.y2}
          stroke={LINE_COLOUR} strokeWidth={2}
        />
      ))}
      {([0, 1, 2, 3] as const).map((row) => (
        <text
          key={`total-row-${row}`}
          x={GRID_X_END + 24}
          y={ROW_Y_TOPS[row] + ROW_HEIGHT / 2 + 2}
          textAnchor="end"
          style={{ ...TEXT_STYLE, fontSize: 7 }}
        >
          {rowHours[row].toFixed(2)}
        </text>
      ))}
    </>
  );
}

interface ELDRemarksProps {
  remarks: string[];
}

function ELDRemarks({ remarks }: ELDRemarksProps) {
  const maxLines = Math.floor((REMARKS_BOX_H - 8) / 9);
  return (
    <>
      <text x={10} y={REMARKS_TITLE_Y} style={{ ...TEXT_STYLE, fontSize: 7.5, fontWeight: 700 }}>REMARKS</text>
      <text x={72} y={REMARKS_TITLE_Y} style={{ ...TEXT_STYLE, fontSize: 6, fill: '#666' }}>
        (city/state at each duty-status change; inspections, fueling, loading/unloading)
      </text>
      <rect x={10} y={REMARKS_BOX_Y} width={GRID_X_END - 10} height={REMARKS_BOX_H} fill="none" stroke="#b0bec5" strokeWidth={0.5} />
      {remarks.slice(0, maxLines).map((line, i) => (
        <text key={`remark-${i}`} x={14} y={REMARKS_BOX_Y + 10 + i * 9} style={{ ...TEXT_STYLE, fontSize: 7 }}>
          {line}
        </text>
      ))}
    </>
  );
}

interface ELDTotalsProps {
  rowHours: Record<0 | 1 | 2 | 3, number>;
  drivingMiles: number;
  truckMiles: number;
}

function ELDTotals({ rowHours, drivingMiles, truckMiles }: ELDTotalsProps) {
  const onDuty = rowHours[2] + rowHours[3];
  const driving = rowHours[2];
  return (
    <>
      <line x1={10} y1={TOTALS_LINE_Y} x2={GRID_X_END + 52} y2={TOTALS_LINE_Y} stroke="#b0bec5" strokeWidth={0.5} />
      <text x={10} y={TOTALS_TEXT_Y} style={{ ...TEXT_STYLE, fontSize: 7.5, fontWeight: 700 }}>
        {`OFF DUTY: ${rowHours[0].toFixed(2)}   SLEEPER BERTH: ${rowHours[1].toFixed(2)}   DRIVING: ${driving.toFixed(2)}   ON DUTY (NOT DRIVING): ${rowHours[3].toFixed(2)}`}
      </text>
      <text x={10} y={TOTALS_SUB_Y} style={{ ...TEXT_STYLE, fontSize: 7.5 }}>
        {`ON DUTY + DRIVING: ${onDuty.toFixed(2)} hrs   |   Total miles (driving): ${Math.round(drivingMiles)}   |   Total truck miles: ${Math.round(truckMiles)}`}
      </text>
    </>
  );
}

interface ELDFooterProps {
  driverInitials: string;
}

function ELDFooter({ driverInitials: initials }: ELDFooterProps) {
  return (
    <>
      <line x1={10} y1={FOOTER_LINE_Y} x2={GRID_X_END + 52} y2={FOOTER_LINE_Y} stroke="#b0bec5" strokeWidth={0.5} />
      <text x={10} y={FOOTER_TEXT_Y} style={{ ...TEXT_STYLE, fontSize: 7 }}>
        I certify that these entries are true and correct.
      </text>
      <text x={480} y={FOOTER_TEXT_Y} style={{ ...TEXT_STYLE, fontSize: 7 }}>
        {`Initials: ${initials}`}
      </text>
      <line x1={200} y1={SIGNATURE_LINE_Y} x2={500} y2={SIGNATURE_LINE_Y} stroke="#555" strokeWidth={0.5} />
      <text x={350} y={SIGNATURE_LABEL_Y} textAnchor="middle" style={{ ...TEXT_STYLE, fontSize: 6.5, fill: '#777' }}>
        Driver Signature
      </text>
    </>
  );
}

export function ELDLogSheet({
  day,
  from,
  to,
  dayIndex,
  allDays,
  driverName = 'John Doe',
  driverNo = '001',
  vehicleNo = 'CMV-001',
  trailerNo = 'NA',
  carrierName = '[Carrier Name]',
  coDriver = 'NA',
  homeOperatingCenter,
  shipper,
  commodity = 'General Freight',
  loadId,
}: ELDLogSheetProps) {
  const segments = buildSegments(day);
  const connectors = buildConnectors(segments);
  const logDate = getLogDate(dayIndex);
  const drivingMiles = calcTotalMiles(day);
  const daysForOdometer = allDays ?? [day];
  const truckMiles = calcCumulativeTruckMiles(daysForOdometer, dayIndex);
  const rowHours = calcRowHours(day);
  const remarks = buildRemarks(day);
  const initials = driverInitials(driverName);
  const home = homeOperatingCenter ?? from;
  const shipperName = shipper ?? from;
  const load = loadId ?? `LD-${String(day.day_number).padStart(3, '0')}`;

  const headerFields = buildEldHeaderFields({
    logDate,
    driverNo,
    carrierName,
    driverName,
    home,
    initials,
    vehicleNo,
    coDriver,
    trailerNo,
    shipperName,
    commodity,
    load,
    drivingMiles,
    truckMiles,
    from,
    to,
  });

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', background: '#ffffff', display: 'block' }}
    >
      <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#ffffff" />
      <ELDHeader fields={headerFields} />
      <ELDGrid />
      <ELDDutyLines segments={segments} connectors={connectors} rowHours={rowHours} />
      <ELDRemarks remarks={remarks} />
      <ELDTotals rowHours={rowHours} drivingMiles={drivingMiles} truckMiles={truckMiles} />
      <ELDFooter driverInitials={initials} />
    </svg>
  );
}
