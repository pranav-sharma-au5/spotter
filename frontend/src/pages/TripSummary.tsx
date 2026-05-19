import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Moon } from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { RouteMap, MapLegend } from '../components/map/RouteMap';
import { useTripStore } from '../stores/tripStore';
import { useActiveEvent } from '../hooks/useActiveEvent';
import { formatHours, formatMiles, addHoursToTime } from '../utils/format';

export function TripSummary() {
  const navigate = useNavigate();
  const plan = useTripStore((s) => s.plan);
  const request = useTripStore((s) => s.request);
  const { setActiveEvent } = useActiveEvent();

  if (!plan || !request) {
    navigate('/');
    return null;
  }

  const { summary, days } = plan;
  const lastDay = days[days.length - 1];
  const estimatedArrival = addHoursToTime(lastDay.duty_start_time, lastDay.total_on_duty_hrs);
  const totalDrivingHrs = days.reduce((sum, d) => sum + d.total_driving_hrs, 0);
  const fuelStopCount = days.flatMap((d) => d.events).filter((e) => e.type === 'fuel').length;
  const restartDay = days.find((d) => d.events.some((e) => e.type === 'restart'))?.day_number;

  return (
    <div className="flex h-screen flex-col bg-bg-base">
      <Topbar backTo="/plan" backLabel="Edit trip" />

      {/*
       * ── Job card ──────────────────────────────────────────────────────────
       * This is the first thing the driver reads. Large message text tells
       * them the job at a glance; key numbers (days / miles) let them size up
       * the haul immediately. Only then does the eye travel to the map below.
       */}
      <div className="flex shrink-0 items-stretch border-b border-border-medium bg-bg-surface shadow-sm">
        {/* Left accent bar — signals importance */}
        <div className="w-[3px] shrink-0 bg-accent" />

        <div className="flex flex-1 items-start justify-between gap-8 px-6 py-5">
          {/* Message + route */}
          <div className="flex-1">
            <p className="text-[10px] font-semibold tracking-widest text-accent">
              YOUR TRIP
            </p>
            <p className="mt-1.5 text-xl font-semibold leading-snug text-text-primary">
              {summary.message}
            </p>
            <p className="mt-1.5 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {request.current_location}
              </span>
              <span className="mx-1.5 text-text-hint">→</span>
              <span className="font-medium text-text-primary">
                {request.dropoff_location}
              </span>
              <span className="mx-2 text-text-hint">·</span>
              via
              {' '}
              {request.pickup_location}
            </p>

            {/* Overnight rest stops — one row per night */}
            {summary.rest_stop_steps.length > 0 && (
              <div className="mt-3 space-y-1">
                {summary.rest_stop_steps.map((step) => (
                  <div key={step.night} className="flex items-baseline gap-2">
                    <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-text-muted">
                      <Moon className="h-2.5 w-2.5" />
                      Night
                      {' '}
                      {step.night}
                    </span>
                    <span className="text-[11px] font-medium text-text-primary">
                      {step.location}
                    </span>
                    {step.city && (
                      <span className="text-[10px] text-text-secondary">
                        {step.city}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key numbers — scannable at a glance */}
          <div className="flex shrink-0 items-center gap-0">
            <div className="pr-6 text-right">
              <p className="text-3xl font-bold tabular-nums text-text-primary">
                {summary.total_days}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-text-muted">days</p>
            </div>
            <div className="border-l border-border-subtle pl-6 text-right">
              <p className="text-3xl font-bold tabular-nums text-text-primary">
                {formatMiles(summary.total_miles)}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-text-muted">miles</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Map + compact detail strip ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Map fills all available space */}
        <div className="relative flex-1 overflow-hidden">
          <RouteMap mode="summary" onMarkerClick={(e) => setActiveEvent(e.id)} />
          <MapLegend />
        </div>

        {/* Compact stats + CTAs beneath the map */}
        <div className="shrink-0 border-t border-border-subtle bg-bg-base px-6 py-4">
          {/* Stats row */}
          <div className="flex items-start gap-0 divide-x divide-border-subtle">
            {[
              { label: 'DRIVING', value: `${formatHours(totalDrivingHrs)} hrs` },
              { label: 'FUEL STOPS', value: String(fuelStopCount) },
              { label: 'EST. ARRIVAL', value: `Day ${summary.total_days}, ~${estimatedArrival}` },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 first:pl-0 last:pr-0">
                <p className="text-[9px] font-semibold tracking-widest text-text-muted">
                  {label}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-text-primary">{value}</p>
              </div>
            ))}
          </div>

          {/* 34-hr restart warning */}
          {summary.restart_required && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="text-xs text-red-400">
                34-hr restart required
                {restartDay ? ` — cycle resets on day ${restartDay}` : ''}
                .
              </p>
            </div>
          )}

          {/* CTAs */}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/detail')}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
            >
              View route plan →
            </button>
            <button
              type="button"
              onClick={() => navigate('/plan')}
              className="rounded-xl border border-border-subtle px-5 py-3 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              Change inputs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
