import { Moon } from 'lucide-react';
import { Eyebrow } from '../ui/Eyebrow';
import { formatMiles } from '../../utils/format';
import type { TripSummary, TripRequest, RestStopStep } from '../../types/trip';

// ── Private sub-components ────────────────────────────────────────────────────

function RestStopList({ steps }: { steps: RestStopStep[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="mt-3 space-y-1">
      {steps.map((step) => (
        <div key={step.night} className="flex items-baseline gap-2">
          <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-text-muted">
            <Moon className="h-2.5 w-2.5" />
            Night {step.night}
          </span>
          <span className="text-[11px] font-medium text-text-primary">{step.location}</span>
          {step.city && (
            <span className="text-[10px] text-text-secondary">{step.city}</span>
          )}
        </div>
      ))}
    </div>
  );
}

interface BigStatProps {
  value: string | number;
  label: string;
  bordered?: boolean;
}

function BigStat({ value, label, bordered }: BigStatProps) {
  return (
    <div className={bordered ? 'border-l border-border-subtle pl-4 text-right md:pl-6' : 'pr-4 text-right md:pr-6'}>
      <p className="text-2xl font-bold tabular-nums text-text-primary md:text-3xl">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-text-muted">{label}</p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface JobCardProps {
  summary: TripSummary;
  request: TripRequest;
}

export function JobCard({ summary, request }: JobCardProps) {
  return (
    <div className="flex shrink-0 items-stretch border-b border-border-medium bg-bg-surface shadow-sm">
      <div className="w-[3px] shrink-0 bg-accent" />

      <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:flex-row md:items-start md:justify-between md:gap-8 md:px-6 md:py-5">
        <div className="min-w-0 flex-1">
          <Eyebrow color="accent">YOUR TRIP</Eyebrow>
          <p className="mt-1.5 text-xl font-semibold leading-snug text-text-primary">
            {summary.message}
          </p>
          <p className="mt-1.5 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{request.current_location}</span>
            <span className="mx-1.5 text-text-hint">→</span>
            <span className="font-medium text-text-primary">{request.dropoff_location}</span>
            <span className="mx-2 text-text-hint">·</span>
            via {request.pickup_location}
          </p>
          <RestStopList steps={summary.rest_stop_steps} />
        </div>

        <div className="flex shrink-0 items-center self-start">
          <BigStat value={summary.total_days} label="days" />
          <BigStat value={formatMiles(summary.total_miles)} label="miles" bordered />
        </div>
      </div>
    </div>
  );
}
