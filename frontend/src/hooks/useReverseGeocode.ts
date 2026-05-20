import { useEffect, useState } from 'react';
import { reverseGeocode } from '../services/geocoding';
import {
  isSupportedLocation,
  SERVICE_AREA_ERROR,
} from '../services/geocoding/serviceArea';
import type { LocationSuggestion } from '../types/trip';

export type GPSState = 'idle' | 'loading' | 'resolved';

interface UseReverseGeocodeArgs {
  onResolved: (suggestion: LocationSuggestion) => void;
  /** Called when the GPS resolves to a location outside the supported service area */
  onError?: (message: string) => void;
  /** When false, reset GPS UI back to idle (e.g. field was cleared) */
  hasLocation?: boolean;
}

interface UseReverseGeocodeResult {
  gpsState: GPSState;
  resolve: () => void;
}

/**
 * Wraps `navigator.geolocation.getCurrentPosition` and calls the
 * `reverseGeocode` service. Validates that the resolved location falls within
 * the supported service area (US/CA) and reports an error via `onError` if not.
 */
export function useReverseGeocode({
  onResolved,
  onError,
  hasLocation = false,
}: UseReverseGeocodeArgs): UseReverseGeocodeResult {
  const [gpsState, setGpsState] = useState<GPSState>('idle');

  useEffect(() => {
    if (!hasLocation && gpsState === 'resolved') {
      setGpsState('idle');
    }
  }, [hasLocation, gpsState]);

  const resolve = () => {
    if (!navigator.geolocation) return;
    setGpsState('loading');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const suggestion = await reverseGeocode(latitude, longitude);

        if (!isSupportedLocation(suggestion)) {
          onError?.(SERVICE_AREA_ERROR);
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
