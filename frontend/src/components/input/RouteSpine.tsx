import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { LocationAutocomplete } from './LocationAutocomplete';
import { GPSButton } from './GPSButton';
import { PopularRouteSuggestions } from './PopularRouteSuggestions';
import type { LocationSuggestion } from '../../types/trip';

export type RouteField = 'current' | 'pickup' | 'dropoff';

export interface RouteValues {
  current: string;
  pickup: string;
  dropoff: string;
}

export interface RouteSpineProps {
  values: RouteValues;
  fieldErrors?: Partial<Record<RouteField, string>>;
  onChange: (field: RouteField, value: string) => void;
  onSelect: (field: RouteField, suggestion: LocationSuggestion) => void;
  onSwapPickupDropoff: () => void;
}

export function confirmLocation(
  field: RouteField,
  suggestion: LocationSuggestion,
  onChange: RouteSpineProps['onChange'],
  onSelect: RouteSpineProps['onSelect'],
): void {
  onChange(field, suggestion.shortName);
  onSelect(field, suggestion);
}

interface SpineDotProps {
  dotColour: string;
  dotSize?: number;
  showConnector?: boolean;
  children: React.ReactNode;
}

function SpineDot({ dotColour, dotSize = 10, showConnector = true, children }: SpineDotProps) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        {/* Vertical spine — dot + connector line */}
        <div className="flex flex-col items-center">
          <div
            className="shrink-0 rounded-full border-2 border-bg-surface"
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: dotColour,
              marginTop: 18,
            }}
          />
          {showConnector && (
            <div className="mt-1 w-px flex-1 bg-border-subtle" style={{ minHeight: 20 }} />
          )}
        </div>

        {/* Input area fills remaining width */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function SwapPickupDropoffButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Swap pickup and dropoff"
      className={[
        'absolute right-3 top-1/2 z-10 -translate-y-1/2',
        'rounded-full border border-border-medium bg-bg-surface p-2',
        'text-text-secondary shadow-sm transition-colors',
        'hover:bg-bg-elevated hover:text-text-primary',
      ].join(' ')}
    >
      <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function RouteSpine({
  values,
  fieldErrors = {},
  onChange,
  onSelect,
  onSwapPickupDropoff,
}: RouteSpineProps) {
  // GPS can only resolve the "current location" field.
  // If it resolves to a location outside US/Canada we surface the error here
  // and clear it the moment the user starts typing again.
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleGPSResolved = (suggestion: LocationSuggestion) => {
    setGpsError(null);
    onSelect('current', suggestion);
  };

  const handleGPSError = (message: string) => {
    setGpsError(message);
  };

  const handleCurrentChange = (v: string) => {
    // Clear any lingering GPS error as soon as the driver edits the field
    if (gpsError) setGpsError(null);
    onChange('current', v);
  };

  const showPopularRoutes = !values.pickup && !values.dropoff;

  return (
    <div className="divide-y divide-border-subtle">
      {/* ── Current location ── */}
      <SpineDot dotColour="#ffffff" showConnector>
        <LocationAutocomplete
          label="WHERE YOU'RE PARKED"
          placeholder="Enter your current location"
          value={values.current}
          onChange={handleCurrentChange}
          onSelect={(s) => onSelect('current', s)}
          error={gpsError ?? fieldErrors.current}
          rightSlot={
            <GPSButton
              hasLocation={!!values.current}
              onResolved={handleGPSResolved}
              onError={handleGPSError}
            />
          }
        />
      </SpineDot>

      {/* ── Pickup + Dropoff (swap floats between) ── */}
      <div className="relative divide-y divide-border-subtle">
        <SpineDot dotColour="#D85A30" showConnector>
          <div className="pr-11">
            <LocationAutocomplete
              label="PICKUP LOCATION"
              placeholder="Where are you picking up?"
              value={values.pickup}
              onChange={(v) => onChange('pickup', v)}
              onSelect={(s) => onSelect('pickup', s)}
              error={fieldErrors.pickup}
            />
          </div>
        </SpineDot>

        <SpineDot dotColour="#D4537E" showConnector={false}>
          <div className="pr-11">
            <LocationAutocomplete
              label="DROPOFF LOCATION"
              placeholder="Final destination"
              value={values.dropoff}
              onChange={(v) => onChange('dropoff', v)}
              onSelect={(s) => onSelect('dropoff', s)}
              error={fieldErrors.dropoff}
            />
          </div>
        </SpineDot>

        <SwapPickupDropoffButton onClick={onSwapPickupDropoff} />
      </div>

      {showPopularRoutes && (
        <PopularRouteSuggestions
          onSelectPickup={(s) => confirmLocation('pickup', s, onChange, onSelect)}
          onSelectDropoff={(s) => confirmLocation('dropoff', s, onChange, onSelect)}
        />
      )}
    </div>
  );
}
