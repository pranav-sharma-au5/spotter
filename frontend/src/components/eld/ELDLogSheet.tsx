import {
  buildSegments,
  buildConnectors,
  hourToX,
  getLogDate,
  calcTotalMiles,
  calcRowHours,
} from './eld-utils';
import type { TripDay } from '../../types/trip';

export interface ELDLogSheetProps {
  day: TripDay;
  /** Route origin shown in the "From" header field */
  from: string;
  /** Route destination shown in the "To" header field */
  to: string;
  dayIndex: number;
  /** Optional driver name — defaults to 'John Doe' */
  driverName?: string;
  /** Optional vehicle number — defaults to 'CMV-001' */
  vehicleNo?: string;
  /** Optional carrier name — defaults to '[Carrier Name]' */
  carrierName?: string;
}

// ── Layout constants ──────────────────────────────────────────────────────────

const GRID_X_START = 80;
const GRID_X_END = 640;
const ROW_Y_TOPS = [120, 148, 176, 204];
const ROW_HEIGHT = 22;
const LINE_COLOUR = '#1a3a5a';
const HOUR_LABELS = [
  'Mid', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
  'Noon', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
];
const ROW_LABELS = ['Off Duty', 'Sleeper\nBerth', 'Driving', 'On Duty\n(Not Driving)'];

const FONT = 'Arial, Helvetica, sans-serif';
const TEXT_STYLE = { fontFamily: FONT, fill: '#1a2a3a' } as const;

// ── SVG sub-components ────────────────────────────────────────────────────────

interface ELDHeaderProps {
  fields: Array<[string, string, number, number]>;
}

function ELDHeader({ fields }: ELDHeaderProps) {
  return (
    <>
      <text x={340} y={14} textAnchor="middle" style={{ ...TEXT_STYLE, fontSize: 9, fontWeight: 700 }}>
        DRIVER&apos;S DAILY LOG (ONE CALENDAR DAY — 24 HOURS)
      </text>
      <line x1={10} y1={18} x2={670} y2={18} stroke="#aaa" strokeWidth={0.5} />
      {fields.map(([label, value, x, y]) => (
        <g key={`${label}-${x}-${y}`}>
          <text x={x} y={y} style={{ ...TEXT_STYLE, fontSize: 7.5, fontWeight: 600 }}>{label}</text>
          <text x={x + 60} y={y} style={{ ...TEXT_STYLE, fontSize: 7.5 }}>{value}</text>
          <line x1={x + 60} y1={y + 1} x2={x + 180} y2={y + 1} stroke="#ccc" strokeWidth={0.5} />
        </g>
      ))}
    </>
  );
}

function ELDGrid() {
  return (
    <>
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
          x1={hourToX(h)} y1={108} x2={hourToX(h)} y2={ROW_Y_TOPS[3] + ROW_HEIGHT}
          stroke="#90a4ae" strokeWidth={h % 12 === 0 ? 1 : 0.5}
        />
      ))}
      {Array.from({ length: 24 * 4 + 1 }, (_, i) => {
        if (i % 4 === 0) return null;
        const h = i / 4;
        return (
          <line
            key={`minor-${i}`}
            x1={hourToX(h)} y1={108} x2={hourToX(h)} y2={114}
            stroke="#b0bec5" strokeWidth={0.3}
          />
        );
      })}
      {HOUR_LABELS.map((lbl, h) => (
        <text key={`hlbl-${h}`} x={hourToX(h)} y={106} textAnchor="middle" style={{ ...TEXT_STYLE, fontSize: 6.5 }}>
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
          x={GRID_X_END + 20}
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
  events: TripDay['events'];
}

function ELDRemarks({ events }: ELDRemarksProps) {
  const remarkEvents = events.filter((e) => e.type !== 'drive');
  return (
    <>
      <text x={10} y={272} style={{ ...TEXT_STYLE, fontSize: 7.5, fontWeight: 700 }}>REMARKS</text>
      <rect x={10} y={276} width={660} height={56} fill="none" stroke="#b0bec5" strokeWidth={0.5} />
      {remarkEvents.slice(0, 6).map((e, i) => (
        <text key={e.id} x={14} y={286 + i * 9} style={{ ...TEXT_STYLE, fontSize: 7 }}>
          {e.location} — {e.label}
        </text>
      ))}
    </>
  );
}

interface ELDTotalsProps {
  rowHours: Record<0 | 1 | 2 | 3, number>;
}

function ELDTotals({ rowHours }: ELDTotalsProps) {
  return (
    <>
      <line x1={10} y1={338} x2={670} y2={338} stroke="#b0bec5" strokeWidth={0.5} />
      <text x={10} y={350} style={{ ...TEXT_STYLE, fontSize: 7.5, fontWeight: 700 }}>
        {`ON DUTY: ${(rowHours[2] + rowHours[3]).toFixed(2)}   DRIVING: ${rowHours[2].toFixed(2)}   SLEEPER BERTH: ${rowHours[1].toFixed(2)}   OFF DUTY: ${rowHours[0].toFixed(2)}`}
      </text>
    </>
  );
}

function ELDFooter() {
  return (
    <>
      <line x1={10} y1={362} x2={670} y2={362} stroke="#b0bec5" strokeWidth={0.5} />
      <text x={10} y={374} style={{ ...TEXT_STYLE, fontSize: 7 }}>
        I certify that these entries are true and correct.
      </text>
      <line x1={200} y1={385} x2={500} y2={385} stroke="#555" strokeWidth={0.5} />
      <text x={350} y={393} textAnchor="middle" style={{ ...TEXT_STYLE, fontSize: 6.5, fill: '#777' }}>
        Driver Signature
      </text>
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function ELDLogSheet({
  day,
  from,
  to,
  dayIndex,
  driverName = 'John Doe',
  vehicleNo = 'CMV-001',
  carrierName = '[Carrier Name]',
}: ELDLogSheetProps) {
  const segments = buildSegments(day);
  const connectors = buildConnectors(segments);
  const logDate = getLogDate(dayIndex);
  const totalMiles = calcTotalMiles(day);
  const rowHours = calcRowHours(day);

  const headerFields: Array<[string, string, number, number]> = [
    ['Date:', logDate, 10, 30],
    ['Carrier:', carrierName, 10, 44],
    ['Total miles today:', String(Math.round(totalMiles)), 10, 58],
    ['Vehicle No.:', vehicleNo, 370, 30],
    ['Driver:', driverName, 370, 44],
    ['Co-Driver:', '—', 370, 58],
    ['From:', from, 10, 72],
    ['To:', to, 370, 72],
  ];

  return (
    <svg
      viewBox="0 0 680 420"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', background: '#ffffff', display: 'block' }}
    >
      <rect x={0} y={0} width={680} height={420} fill="#ffffff" />
      <ELDHeader fields={headerFields} />
      <ELDGrid />
      <ELDDutyLines segments={segments} connectors={connectors} rowHours={rowHours} />
      <ELDRemarks events={day.events} />
      <ELDTotals rowHours={rowHours} />
      <ELDFooter />
    </svg>
  );
}
