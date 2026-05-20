import { MapPin } from 'lucide-react';
import type { StopDetailsEventProps } from './types';

export function StopLocationRow({ event }: StopDetailsEventProps) {
  if (!event.location) return null;

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <MapPin className="h-3 w-3 shrink-0 text-text-muted" />
      <p className="truncate text-xs text-text-secondary">{event.location}</p>
    </div>
  );
}
