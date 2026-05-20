import { DurationMilesRow } from './DurationMilesRow';
import { EventBadges } from './EventBadges';
import { StopLocationRow } from './StopLocationRow';
import { StopMetaRows } from './StopMetaRows';
import type { StopDetailsEventProps } from './types';

export function StopDetailsSidebar({ event }: StopDetailsEventProps) {
  return (
    <>
      <StopLocationRow event={event} />
      <DurationMilesRow event={event} layout="row" milesLabel="fromPrev" />
      <StopMetaRows event={event} variant="sidebar" />
      <EventBadges event={event} variant="sidebar" />
    </>
  );
}
