import { DurationMilesRow } from './DurationMilesRow';
import type { ScheduledStop } from '../../../types/trip';

export function EventDurationMiles({ event }: { event: ScheduledStop }) {
  return <DurationMilesRow event={event} layout="inline" />;
}
