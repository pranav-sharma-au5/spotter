import { useTripStore, isPlanComplete } from '../stores/tripStore';

export interface TripSummaryViewState {
  isComplete: boolean;
  isEnriching: boolean;
  hasSchedule: boolean;
  showEnrichError: boolean;
  showEnrichingHint: boolean;
  showFooter: boolean;
  showPartialCta: boolean;
}

export function useTripSummaryViewState(): TripSummaryViewState | null {
  const plan = useTripStore((s) => s.plan);
  const planStep = useTripStore((s) => s.planStep);
  const enrichError = useTripStore((s) => s.enrichError);

  if (!plan) return null;

  const isComplete = isPlanComplete(plan);
  const isEnriching = planStep === 'enriching';
  const hasSchedule = plan.days.length > 0;

  return {
    isComplete,
    isEnriching,
    hasSchedule,
    showEnrichError: !!enrichError,
    showEnrichingHint: isEnriching && !enrichError,
    showFooter: isComplete,
    showPartialCta: hasSchedule && !isComplete,
  };
}
