import { JobCard } from '../summary/JobCard';
import { PlanningBanner } from '../summary/PlanningBanner';
import type { PlanStep, RoutePlanResult, TripRequest, TripSummary } from '../../types/trip';

interface TripSummaryHeaderSectionProps {
  isComplete: boolean;
  hasSchedule: boolean;
  planStep: PlanStep;
  summary: TripSummary | undefined;
  request: TripRequest;
  routeResult: RoutePlanResult | null;
}

export function TripSummaryHeaderSection({
  isComplete,
  hasSchedule,
  planStep,
  summary,
  request,
  routeResult,
}: TripSummaryHeaderSectionProps) {
  if (isComplete && summary) {
    return <JobCard summary={summary} request={request} />;
  }

  return (
    <PlanningBanner
      request={request}
      routeResult={routeResult}
      planStep={planStep}
      hasSchedule={hasSchedule}
    />
  );
}
