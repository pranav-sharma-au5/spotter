import type { ScheduledStop } from '../../../types/trip';

export type StopDetailsVariant = 'sidebar' | 'popup';

export interface StopDetailsProps {
  event: ScheduledStop;
  variant: StopDetailsVariant;
}

export interface StopDetailsEventProps {
  event: ScheduledStop;
}
