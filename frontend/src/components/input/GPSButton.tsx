import { useState } from 'react';
import { Crosshair, Loader2, CheckCircle } from 'lucide-react';
import type { LocationSuggestion } from '../../types/trip';

interface NominatimAddress {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

function buildShortNameFromAddress(
  address: NominatimAddress | undefined,
  fallback: string,
): string {
  if (!address) return fallback;
  const street = address.road ?? address.suburb ?? address.neighbourhood;
  const place = address.city ?? address.town ?? address.village;
  const region = address.state ?? address.country;
  const first = street ?? place ?? '';
  const second = region ?? '';
  if (!first && !second) return fallback;
  return [first, second].filter(Boolean).join(', ');
}

interface GPSButtonProps {
  onResolved: (suggestion: LocationSuggestion) => void;
}

type GPSState = 'idle' | 'loading' | 'resolved';

export function GPSButton({ onResolved }: GPSButtonProps) {
  const [gpsState, setGpsState] = useState<GPSState>('idle');

  const handleClick = () => {
    if (!navigator.geolocation) return;
    setGpsState('loading');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          );
          const data: NominatimResponse = await res.json();

          const displayName =
            data.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

          const shortName = buildShortNameFromAddress(data.address, displayName);

          const suggestion: LocationSuggestion = {
            id: 'gps-resolved',
            displayName,
            shortName,
            lat: latitude,
            lng: longitude,
          };

          onResolved(suggestion);
          setGpsState('resolved');
        } catch {
          // Fallback: provide raw coordinates as a suggestion so the field
          // is still marked as selected and submit is unblocked.
          onResolved({
            id: 'gps-resolved',
            displayName: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            shortName: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            lat: latitude,
            lng: longitude,
          });
          setGpsState('resolved');
        }
      },
      () => {
        setGpsState('idle');
      },
    );
  };

  if (gpsState === 'loading') {
    return (
      <button
        type="button"
        disabled
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/30 bg-bg-highlight px-2.5 py-1.5 text-[11px] text-text-secondary"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Getting location...
      </button>
    );
  }

  if (gpsState === 'resolved') {
    return (
      <button
        type="button"
        disabled
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/30 bg-bg-highlight px-2.5 py-1.5 text-[11px] text-text-muted"
      >
        <CheckCircle className="h-3 w-3 text-ev-fuel" />
        Located
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent bg-bg-highlight px-2.5 py-1.5 text-[11px] text-accent transition-colors hover:bg-accent/10"
    >
      <Crosshair className="h-3 w-3" />
      Use GPS
    </button>
  );
}
