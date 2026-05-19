import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useCycleStatus } from '../../hooks/useCycleStatus';

const TICKS = [0, 10, 20, 30, 40, 50, 60, 70];
const TOTAL = 70;

interface CycleGaugeProps {
  value: number;
  onChange: (v: number) => void;
}

export function CycleGauge({ value, onChange }: CycleGaugeProps) {
  const { remaining, severity, colour, hintMessage } = useCycleStatus(value);
  const fillPct = (value / TOTAL) * 100;

  const Icon = severity === 'ok' ? CheckCircle : severity === 'warn' ? AlertTriangle : AlertCircle;

  const hintBg = severity === 'ok'
    ? 'bg-ev-fuel/10 text-ev-fuel border-ev-fuel/20'
    : severity === 'warn'
      ? 'bg-ev-break/10 text-ev-break border-ev-break/20'
      : 'bg-red-500/10 text-red-400 border-red-500/20';

  const remainingColour = severity === 'ok'
    ? 'text-ev-fuel'
    : severity === 'warn'
      ? 'text-ev-break'
      : 'text-red-400';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-text-muted">Hours driven this week</p>
          <p className="mt-0.5 text-xl font-medium text-text-primary">
            {value.toFixed(1)}
            {' '}
            / 70 hrs
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${remainingColour}`}>
            {remaining.toFixed(1)}
            {' '}
            hrs
          </p>
          <p className="text-[10px] text-text-muted">remaining</p>
        </div>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${fillPct}%`, backgroundColor: colour }}
        />
      </div>

      <div className="flex justify-between">
        {TICKS.map((t) => (
          <span key={t} className="text-[10px] text-text-muted">{t}</span>
        ))}
      </div>

      <input
        type="range"
        min={0}
        max={TOTAL}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer accent-accent"
        style={{ accentColor: colour }}
      />

      <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${hintBg}`}>
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p className="text-[11px] leading-relaxed">{hintMessage}</p>
      </div>
    </div>
  );
}
