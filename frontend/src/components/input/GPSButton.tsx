import { Crosshair, Loader2, CheckCircle } from 'lucide-react';
import { useReverseGeocode } from '../../hooks/useReverseGeocode';
import type { LocationSuggestion } from '../../types/trip';

interface GPSButtonProps {
  onResolved: (suggestion: LocationSuggestion) => void;
  /** Called when GPS resolves outside the supported service area */
  onError?: (message: string) => void;
}

export function GPSButton({ onResolved, onError }: GPSButtonProps) {
  const { gpsState, resolve } = useReverseGeocode({ onResolved, onError });

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
      onClick={resolve}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent bg-bg-highlight px-2.5 py-1.5 text-[11px] text-accent transition-colors hover:bg-accent/10"
    >
      <Crosshair className="h-3 w-3" />
      Use GPS
    </button>
  );
}
