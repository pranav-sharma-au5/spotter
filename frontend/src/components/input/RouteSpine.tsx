import { useState } from 'react';
import { LocationAutocomplete } from './LocationAutocomplete';
import { GPSButton } from './GPSButton';
import type { LocationSuggestion } from '../../types/trip';

export type RouteField = 'current' | 'pickup' | 'dropoff';

export interface RouteValues {
  current: string;
  pickup: string;
  dropoff: string;
}

export interface RouteSpineProps {
  values: RouteValues;
  onChange: (field: RouteField, value: string) => void;
  onSelect: (field: RouteField, suggestion: LocationSuggestion) => void;
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

export function RouteSpine({ values, onChange, onSelect }: RouteSpineProps) {
  // GPS can only resolve the "current location" field.
  // If it resolves to a location outside US/Canada we surface the error here
  // and clear it the moment the user starts typing again.
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleGPSResolved = (suggestion: LocationSuggestion) => {
    setGpsError(null);
    onChange('current', suggestion.shortName);
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
          error={gpsError ?? undefined}
          rightSlot={
            <GPSButton
              onResolved={handleGPSResolved}
              onError={handleGPSError}
            />
          }
        />
      </SpineDot>

      {/* ── Pickup ── */}
      <SpineDot dotColour="#D85A30" showConnector>
        <LocationAutocomplete
          label="PICKUP LOCATION"
          placeholder="Where are you picking up?"
          value={values.pickup}
          onChange={(v) => onChange('pickup', v)}
          onSelect={(s) => onSelect('pickup', s)}
        />
      </SpineDot>

      {/* ── Dropoff ── */}
      <SpineDot dotColour="#D4537E" showConnector={false}>
        <LocationAutocomplete
          label="DROPOFF LOCATION"
          placeholder="Final destination"
          value={values.dropoff}
          onChange={(v) => onChange('dropoff', v)}
          onSelect={(s) => onSelect('dropoff', s)}
        />
      </SpineDot>
    </div>
  );
}
