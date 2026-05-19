import { useState } from 'react';
import { reverseGeocode } from '../services/geocoding';
import type { LocationSuggestion } from '../types/trip';

export type GPSState = 'idle' | 'loading' | 'resolved';

interface UseReverseGeocodeArgs {
  onResolved: (suggestion: LocationSuggestion) => void;
  /** Called when the GPS resolves to a location outside the supported service area */
  onError?: (message: string) => void;
}

interface UseReverseGeocodeResult {
  gpsState: GPSState;
  resolve: () => void;
}

const SUPPORTED_COUNTRY_CODES = new Set(['US', 'CA']);

/**
 * Wraps `navigator.geolocation.getCurrentPosition` and calls the
 * `reverseGeocode` service. Validates that the resolved location falls within
 * the supported service area (US/CA) and reports an error via `onError` if not.
 */
export function useReverseGeocode({
  onResolved,
  onError,
}: UseReverseGeocodeArgs): UseReverseGeocodeResult {
  const [gpsState, setGpsState] = useState<GPSState>('idle');

  const resolve = () => {
    if (!navigator.geolocation) return;
    setGpsState('loading');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const suggestion = await reverseGeocode(latitude, longitude);

        if (suggestion.countryCode && !SUPPORTED_COUNTRY_CODES.has(suggestion.countryCode)) {
          onError?.('GPS location is outside the US/Canada service area.');
          setGpsState('idle');
          return;
        }

        onResolved(suggestion);
        setGpsState('resolved');
      },
      () => {
        setGpsState('idle');
      },
    );
  };

  return { gpsState, resolve };
}
