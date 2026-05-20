import { StopDetailsPopup } from './StopDetailsPopup';
import { StopDetailsSidebar } from './StopDetailsSidebar';
import type { StopDetailsProps } from './types';

export function StopDetails({ event, variant }: StopDetailsProps) {
  if (variant === 'popup') {
    return <StopDetailsPopup event={event} />;
  }
  return <StopDetailsSidebar event={event} />;
}
