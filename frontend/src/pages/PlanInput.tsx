import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { RouteSpine } from '../components/input/RouteSpine';
import { CycleGauge } from '../components/input/CycleGauge';
import { Button } from '../components/ui/Button';
import { AlertBanner } from '../components/ui/AlertBanner';
import { Eyebrow } from '../components/ui/Eyebrow';
import { useTripPlanProgressive } from '../hooks/useTripPlanProgressive';
import { PlanningProgress } from '../components/input/PlanningProgress';
import { useTripStore } from '../stores/tripStore';
import type { RouteField, RouteValues } from '../components/input/RouteSpine';
import type { LocationSuggestion } from '../types/trip';

/** Tracks whether each field has a confirmed suggestion (not just raw text). */
interface SelectionState {
  current: boolean;
  pickup: boolean;
  dropoff: boolean;
}

function RoadIllustration() {
  return (
    <svg
      viewBox="0 0 600 200"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path
        d="M300 200 L180 100 L140 0"
        stroke="var(--text-primary)"
        strokeWidth="80"
        fill="none"
        opacity="0.04"
        strokeLinecap="round"
      />
      <path
        d="M300 200 L420 100 L460 0"
        stroke="var(--text-primary)"
        strokeWidth="80"
        fill="none"
        opacity="0.04"
        strokeLinecap="round"
      />
      <path
        d="M300 200 L300 100 L300 0"
        stroke="var(--bg-surface)"
        strokeWidth="8"
        fill="none"
        opacity="0.06"
        strokeDasharray="20 15"
      />
    </svg>
  );
}

function submitHint(selections: SelectionState): string {
  const missing: string[] = [];
  if (!selections.current) missing.push('current location');
  if (!selections.pickup) missing.push('pickup');
  if (!selections.dropoff) missing.push('dropoff');
  if (missing.length === 3) return 'Fill in all locations to continue';
  return `Select a suggestion for: ${missing.join(', ')}`;
}

export function PlanInput() {
  // Read the previously submitted request from the store so that navigating
  // back via "Edit trip" or "Change inputs" restores the form exactly as the
  // driver left it. useState only consumes the initial value on first mount,
  // so this read happens once per component lifetime (safe with hooks rules).
  const storedRequest = useTripStore((s) => s.request);

  const [route, setRoute] = useState<RouteValues>({
    current: storedRequest?.current_location ?? '',
    pickup:  storedRequest?.pickup_location  ?? '',
    dropoff: storedRequest?.dropoff_location ?? '',
  });

  // If a request exists in the store all three fields were previously
  // validated — mark them selected so the submit button is immediately active.
  const [selections, setSelections] = useState<SelectionState>({
    current: !!storedRequest?.current_location,
    pickup:  !!storedRequest?.pickup_location,
    dropoff: !!storedRequest?.dropoff_location,
  });

  const [cycleHrs, setCycleHrs] = useState(storedRequest?.cycle_used_hrs ?? 0);
  const { submitTrip, isPending, errorMessage, planStep } = useTripPlanProgressive();

  const canSubmit = selections.current && selections.pickup && selections.dropoff;

  /**
   * Called when the user types in any field.
   * Marks that field as un-selected — they must pick a new suggestion
   * from the dropdown before submitting.
   *
   * React 18 batches this state update with any concurrent handleSelect call
   * (which runs synchronously afterward), so the net render is correct.
   */
  const handleChange = (field: RouteField, value: string) => {
    setRoute((prev) => ({ ...prev, [field]: value }));
    setSelections((prev) => ({ ...prev, [field]: false }));
  };

  /**
   * Called when the user picks a suggestion from the dropdown (or GPS resolves).
   * Overrides the handleChange unmark — React 18 batching ensures the final
   * rendered state is selected=true even when both fire in the same tick.
   */
  const handleSelect = (field: RouteField, suggestion: LocationSuggestion) => {
    // Keep route text in sync with the confirmed shortName
    setRoute((prev) => ({ ...prev, [field]: suggestion.shortName }));
    setSelections((prev) => ({ ...prev, [field]: true }));
  };

  const handleSwapPickupDropoff = () => {
    setRoute((prev) => ({
      ...prev,
      pickup: prev.dropoff,
      dropoff: prev.pickup,
    }));
    setSelections((prev) => ({
      ...prev,
      pickup: prev.dropoff,
      dropoff: prev.pickup,
    }));
  };

  const handleSubmit = () => {
    if (!canSubmit || isPending) return;
    submitTrip({
      current_location: route.current,
      pickup_location: route.pickup,
      dropoff_location: route.dropoff,
      cycle_used_hrs: cycleHrs,
    });
  };

  return (
    <div className="flex h-screen flex-col bg-bg-base">
      <Topbar backTo="/" backLabel="Dashboard" />

      <main className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="relative overflow-hidden border-b border-border-subtle bg-bg-surface py-8 md:py-10">
          <RoadIllustration />
          <div className="relative z-10 mx-auto max-w-xl px-4">
            <Eyebrow color="accent" className="mb-1">TRIP PLANNER</Eyebrow>
            <h1 className="text-2xl font-semibold text-text-primary">Where are you headed?</h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              We&apos;ll handle the rest stops, fuel, and HOS logs.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
          {/* Route card — overflow-visible so the dropdown isn't clipped */}
          <div className="overflow-visible rounded-xl border border-border-subtle bg-bg-surface">
            <RouteSpine
              values={route}
              onChange={handleChange}
              onSelect={handleSelect}
              onSwapPickupDropoff={handleSwapPickupDropoff}
            />
          </div>

          {/* Cycle gauge card */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
            <CycleGauge value={cycleHrs} onChange={setCycleHrs} />
          </div>

          {errorMessage && (
            <AlertBanner icon={<AlertCircle />}>{errorMessage}</AlertBanner>
          )}

          {/* Submit */}
          <div className="space-y-2">
            <Button
              variant="primary"
              disabled={!canSubmit || isPending}
              onClick={handleSubmit}
              className="flex h-12 w-full flex-col items-center justify-center py-0"
            >
              {isPending ? (
                <div className="flex flex-col items-center gap-3 py-1">
                  <PlanningProgress planStep={planStep === 'idle' ? 'routing' : planStep} compact />
                </div>
              ) : (
                <>
                  <span>Plan my trip</span>
                  <span className="text-[11px] opacity-65">route map + ELD</span>
                </>
              )}
            </Button>

            {!canSubmit && !isPending && (
              <p className="text-center text-[11px] text-text-muted">
                {submitHint(selections)}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
