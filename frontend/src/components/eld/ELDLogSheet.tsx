import { buildSegments, buildConnectors, hourToX } from './eld-utils';
import type { TripDay, TripRequest } from '../../types/trip';

interface ELDLogSheetProps {
  day: TripDay;
  request: TripRequest;
  dayIndex: number;
}

const GRID_X_START = 80;
const GRID_X_END = 640;
const GRID_WIDTH = GRID_X_END - GRID_X_START;
const HOUR_LABELS = ['Mid', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'Noon', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const ROW_LABELS = ['Off Duty', 'Sleeper\nBerth', 'Driving', 'On Duty\n(Not Driving)'];
const ROW_Y_TOPS = [120, 148, 176, 204];
const ROW_HEIGHT = 22;
const LINE_COLOUR = '#1a3a5a';

function getLogDate(dayIndex: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function calcTotalMiles(day: TripDay): number {
  return day.events.reduce((sum, e) => sum + (e.type === 'drive' ? e.miles_from_prev : 0), 0);
}

function calcRowHours(day: TripDay): Record<0 | 1 | 2 | 3, number> {
  const segments = buildSegments(day);
  const totals: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const seg of segments) {
    const hrs = ((seg.x2 - seg.x1) / GRID_WIDTH) * 24;
    totals[seg.row] += hrs;
  }
  return totals;
}

export function ELDLogSheet({ day, request, dayIndex }: ELDLogSheetProps) {
  const segments = buildSegments(day);
  const connectors = buildConnectors(segments);
  const logDate = getLogDate(dayIndex);
  const totalMiles = calcTotalMiles(day);
  const rowHours = calcRowHours(day);

  const remarkEvents = day.events.filter((e) => e.type !== 'drive');

  const font = 'Arial, Helvetica, sans-serif';
  const textStyle = { fontFamily: font, fill: '#1a2a3a' };

  return (
    <svg
      viewBox="0 0 680 420"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', background: '#ffffff', display: 'block' }}
    >
      {/* ── HEADER ── */}
      <rect x={0} y={0} width={680} height={420} fill="#ffffff" />

      <text x={340} y={14} textAnchor="middle" style={{ ...textStyle, fontSize: 9, fontWeight: 700 }}>
        DRIVER&apos;S DAILY LOG (ONE CALENDAR DAY — 24 HOURS)
      </text>
      <line x1={10} y1={18} x2={670} y2={18} stroke="#aaa" strokeWidth={0.5} />

      {/* Header fields */}
      {[
        ['Date:', logDate, 10, 30],
        ['Carrier:', '[Carrier Name]', 10, 44],
        ['Total miles today:', String(Math.round(totalMiles)), 10, 58],
        ['Vehicle No.:', 'CMV-001', 370, 30],
        ['Driver:', 'John Doe', 370, 44],
        ['Co-Driver:', '—', 370, 58],
        ['From:', request.current_location, 10, 72],
        ['To:', request.dropoff_location, 370, 72],
      ].map(([label, value, x, y]) => (
        <g key={`${label}-${x}-${y}`}>
          <text x={Number(x)} y={Number(y)} style={{ ...textStyle, fontSize: 7.5, fontWeight: 600 }}>{label}</text>
          <text x={Number(x) + 60} y={Number(y)} style={{ ...textStyle, fontSize: 7.5 }}>{value}</text>
          <line x1={Number(x) + 60} y1={Number(y) + 1} x2={Number(x) + 180} y2={Number(y) + 1} stroke="#ccc" strokeWidth={0.5} />
        </g>
      ))}

      {/* ── GRID ── */}
      {/* Row backgrounds */}
      {ROW_Y_TOPS.map((y, idx) => (
        <rect key={`row-bg-${idx}`} x={GRID_X_START} y={y} width={GRID_WIDTH} height={ROW_HEIGHT} fill={idx % 2 === 0 ? '#f8fafc' : '#f0f4f8'} />
      ))}

      {/* Row outlines */}
      {ROW_Y_TOPS.map((y, idx) => (
        <rect key={`row-outline-${idx}`} x={GRID_X_START} y={y} width={GRID_WIDTH} height={ROW_HEIGHT} fill="none" stroke="#b0bec5" strokeWidth={0.5} />
      ))}

      {/* Hour tick marks */}
      {Array.from({ length: 25 }, (_, h) => {
        const x = hourToX(h);
        return (
          <g key={`tick-${h}`}>
            <line x1={x} y1={108} x2={x} y2={ROW_Y_TOPS[3] + ROW_HEIGHT} stroke="#90a4ae" strokeWidth={h % 12 === 0 ? 1 : 0.5} />
          </g>
        );
      })}

      {/* 15-min minor ticks */}
      {Array.from({ length: 24 * 4 + 1 }, (_, i) => {
        if (i % 4 === 0) return null;
        const h = i / 4;
        const x = hourToX(h);
        return (
          <line key={`minor-${i}`} x1={x} y1={108} x2={x} y2={114} stroke="#b0bec5" strokeWidth={0.3} />
        );
      })}

      {/* Hour labels */}
      {HOUR_LABELS.map((lbl, h) => (
        <text
          key={`hlbl-${h}`}
          x={hourToX(h)}
          y={106}
          textAnchor="middle"
          style={{ ...textStyle, fontSize: 6.5 }}
        >
          {lbl}
        </text>
      ))}

      {/* Row labels */}
      {ROW_LABELS.map((lbl, idx) => {
        const y = ROW_Y_TOPS[idx] + ROW_HEIGHT / 2;
        const lines = lbl.split('\n');
        return (
          <text key={`rlbl-${idx}`} x={GRID_X_START - 4} y={y} textAnchor="end" style={{ ...textStyle, fontSize: 6.5 }}>
            {lines.map((line, li) => (
              <tspan key={li} x={GRID_X_START - 4} dy={li === 0 ? 0 : 8}>{line}</tspan>
            ))}
          </text>
        );
      })}

      {/* Duty status lines */}
      {segments.map((seg, i) => (
        <line
          key={`seg-${i}`}
          x1={seg.x1}
          y1={seg.y}
          x2={seg.x2}
          y2={seg.y}
          stroke={LINE_COLOUR}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}

      {/* Vertical connectors */}
      {connectors.map((c, i) => (
        <line
          key={`conn-${i}`}
          x1={c.x}
          y1={c.y1}
          x2={c.x}
          y2={c.y2}
          stroke={LINE_COLOUR}
          strokeWidth={2}
        />
      ))}

      {/* Row hour totals */}
      {([0, 1, 2, 3] as const).map((row) => (
        <text
          key={`total-row-${row}`}
          x={GRID_X_END + 20}
          y={ROW_Y_TOPS[row] + ROW_HEIGHT / 2 + 2}
          textAnchor="end"
          style={{ ...textStyle, fontSize: 7 }}
        >
          {rowHours[row].toFixed(2)}
        </text>
      ))}

      {/* ── REMARKS ── */}
      <text x={10} y={272} style={{ ...textStyle, fontSize: 7.5, fontWeight: 700 }}>REMARKS</text>
      <rect x={10} y={276} width={660} height={56} fill="none" stroke="#b0bec5" strokeWidth={0.5} />
      {remarkEvents.slice(0, 6).map((e, i) => (
        <text key={e.id} x={14} y={286 + i * 9} style={{ ...textStyle, fontSize: 7 }}>
          {e.location}
          {' '}
          —
          {' '}
          {e.label}
        </text>
      ))}

      {/* ── TOTALS ROW ── */}
      <line x1={10} y1={338} x2={670} y2={338} stroke="#b0bec5" strokeWidth={0.5} />
      <text x={10} y={350} style={{ ...textStyle, fontSize: 7.5, fontWeight: 700 }}>
        ON DUTY:
        {' '}
        {(rowHours[2] + rowHours[3]).toFixed(2)}
        {'   '}
        DRIVING:
        {' '}
        {rowHours[2].toFixed(2)}
        {'   '}
        SLEEPER BERTH:
        {' '}
        {rowHours[1].toFixed(2)}
        {'   '}
        OFF DUTY:
        {' '}
        {rowHours[0].toFixed(2)}
      </text>

      {/* ── FOOTER ── */}
      <line x1={10} y1={362} x2={670} y2={362} stroke="#b0bec5" strokeWidth={0.5} />
      <text x={10} y={374} style={{ ...textStyle, fontSize: 7 }}>
        I certify that these entries are true and correct.
      </text>
      <line x1={200} y1={385} x2={500} y2={385} stroke="#555" strokeWidth={0.5} />
      <text x={350} y={393} textAnchor="middle" style={{ ...textStyle, fontSize: 6.5, fill: '#777' }}>
        Driver Signature
      </text>
    </svg>
  );
}
