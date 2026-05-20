import { AlertCircle } from 'lucide-react';
import { AlertBanner } from '../ui/AlertBanner';
import { Button } from '../ui/Button';
import { TripFooter } from './TripFooter';
import type { TripSummaryViewState } from '../../hooks/useTripSummaryViewState';
import type { TripSummaryData } from '../../hooks/useTripSummaryData';

interface TripSummaryActionsProps {
  viewState: TripSummaryViewState;
  enrichError: string | null;
  isPending: boolean;
  summaryData: TripSummaryData | null;
  totalDays: number;
  restartRequired: boolean;
  onRetryEnrich: () => void;
  onViewPlan: () => void;
  onChangeInputs: () => void;
}

export function TripSummaryActions({
  viewState,
  enrichError,
  isPending,
  summaryData,
  totalDays,
  restartRequired,
  onRetryEnrich,
  onViewPlan,
  onChangeInputs,
}: TripSummaryActionsProps) {
  if (viewState.showEnrichError && enrichError) {
    return (
      <div className="shrink-0 border-t border-border-subtle bg-bg-base px-4 py-3 md:px-6">
        <AlertBanner icon={<AlertCircle />}>{enrichError}</AlertBanner>
        <Button
          variant="ghost"
          className="mt-2 w-full"
          disabled={isPending}
          onClick={onRetryEnrich}
        >
          Retry loading stop details
        </Button>
      </div>
    );
  }

  if (viewState.showEnrichingHint) {
    return (
      <div className="shrink-0 border-t border-border-subtle bg-bg-base px-4 py-2 md:px-6">
        <p className="text-center text-xs text-text-muted">
          Locating rest stops along your route...
        </p>
      </div>
    );
  }

  if (viewState.showFooter && summaryData) {
    return (
      <TripFooter
        summaryData={summaryData}
        totalDays={totalDays}
        restartRequired={restartRequired}
        onViewPlan={onViewPlan}
        onChangeInputs={onChangeInputs}
      />
    );
  }

  if (viewState.showPartialCta) {
    return (
      <div className="shrink-0 border-t border-border-subtle bg-bg-base px-4 py-4 md:px-6">
        <Button variant="primary" className="w-full py-3" onClick={onViewPlan}>
          View route plan →
        </Button>
      </div>
    );
  }

  return null;
}
