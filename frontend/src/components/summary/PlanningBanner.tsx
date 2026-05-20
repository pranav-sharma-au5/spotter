import { PlanningProgress } from '../input/PlanningProgress';
import type { PlanStep, TripRequest } from '../../types/trip';
import type { RoutePlanResult } from '../../types/trip';

interface PlanningBannerProps {
  request: TripRequest;
  routeResult: RoutePlanResult | null;
  planStep: PlanStep;
  hasSchedule: boolean;
}

export function PlanningBanner({
  request,
  routeResult,
  planStep,
  hasSchedule,
}: PlanningBannerProps) {
  return (
    <div className="flex shrink-0 items-stretch border-b border-border-medium bg-bg-surface shadow-sm">
      <div className="w-[3px] shrink-0 bg-accent" />
      <div className="flex-1 px-4 py-4 md:px-6 md:py-5">
        <p className="text-sm font-medium text-text-primary">
          {hasSchedule
            ? 'Almost there — locating rest stops along your route'
            : 'Planning your trip...'}
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {request.current_location}
          {' → '}
          {request.dropoff_location}
          {routeResult ? ` · ${Math.round(routeResult.total_distance_miles)} mi` : ''}
        </p>
        <div className="mt-4">
          <PlanningProgress planStep={planStep} compact />
        </div>
      </div>
    </div>
  );
}
