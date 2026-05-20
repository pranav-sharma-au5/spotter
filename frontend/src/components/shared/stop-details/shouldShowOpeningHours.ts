import { EVENT_CONFIG } from '../../../config/eventConfig';
import type { ScheduledStop } from '../../../types/trip';

export function shouldShowOpeningHours(event: ScheduledStop): boolean {
  if (!event.stop_info?.opening_hours) return false;
  return EVENT_CONFIG[event.type].showOpeningHours;
}
