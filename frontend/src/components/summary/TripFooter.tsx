import { AlertTriangle } from 'lucide-react';
import { AlertBanner } from '../ui/AlertBanner';
import { Button } from '../ui/Button';
import { formatHours } from '../../utils/format';
import type { TripSummaryData } from '../../hooks/useTripSummaryData';

// ── Private sub-components ────────────────────────────────────────────────────

interface StatItemProps {
  label: string;
  value: string;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="px-5 first:pl-0 last:pr-0">
      <p className="text-[9px] font-semibold tracking-widest text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

interface TripStatStripProps {
  drivingHrs: number;
  fuelStops: number;
  totalDays: number;
  estimatedArrival: string;
}

function TripStatStrip({ drivingHrs, fuelStops, totalDays, estimatedArrival }: TripStatStripProps) {
  const stats = [
    { label: 'DRIVING', value: `${formatHours(drivingHrs)} hrs` },
    { label: 'FUEL STOPS', value: String(fuelStops) },
    { label: 'EST. ARRIVAL', value: `Day ${totalDays}, ~${estimatedArrival}` },
  ];

  return (
    <div className="flex items-start divide-x divide-border-subtle">
      {stats.map((stat) => (
        <StatItem key={stat.label} label={stat.label} value={stat.value} />
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TripFooterProps {
  summaryData: TripSummaryData;
  totalDays: number;
  restartRequired: boolean;
  onViewPlan: () => void;
  onChangeInputs: () => void;
}

export function TripFooter({
  summaryData,
  totalDays,
  restartRequired,
  onViewPlan,
  onChangeInputs,
}: TripFooterProps) {
  const { totalDrivingHrs, fuelStopCount, estimatedArrival, restartDay } = summaryData;

  return (
    <div className="shrink-0 border-t border-border-subtle bg-bg-base px-6 py-4">
      <TripStatStrip
        drivingHrs={totalDrivingHrs}
        fuelStops={fuelStopCount}
        totalDays={totalDays}
        estimatedArrival={estimatedArrival}
      />

      {restartRequired && (
        <AlertBanner icon={<AlertTriangle />} className="mt-3">
          34-hr restart required
          {restartDay ? ` — cycle resets on day ${restartDay}` : ''}.
        </AlertBanner>
      )}

      <div className="mt-4 flex gap-3">
        <Button variant="primary" className="flex-1 py-3" onClick={onViewPlan}>
          View route plan →
        </Button>
        <Button variant="ghost" onClick={onChangeInputs}>
          Change inputs
        </Button>
      </div>
    </div>
  );
}
