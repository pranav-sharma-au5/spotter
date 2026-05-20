import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { JobCard } from '../components/summary/JobCard';
import { MapSection } from '../components/summary/MapSection';
import { TripFooter } from '../components/summary/TripFooter';
import { PlanningProgress } from '../components/input/PlanningProgress';
import { AlertBanner } from '../components/ui/AlertBanner';
import { Button } from '../components/ui/Button';
import { useTripStore, isPlanComplete } from '../stores/tripStore';
import { useActiveEvent } from '../hooks/useActiveEvent';
import { useTripSummaryData } from '../hooks/useTripSummaryData';
import { useTripPlanProgressive } from '../hooks/useTripPlanProgressive';

export function TripSummary() {
  const navigate = useNavigate();
  const plan = useTripStore((s) => s.plan);
  const request = useTripStore((s) => s.request);
  const planStep = useTripStore((s) => s.planStep);
  const routeResult = useTripStore((s) => s.routeResult);
  const { setActiveEvent } = useActiveEvent();
  const summaryData = useTripSummaryData();
  const { retryEnrich, enrichError, isPending } = useTripPlanProgressive();

  if (!plan || !request) {
    navigate('/');
    return null;
  }

  const isComplete = isPlanComplete(plan);
  const isEnriching = planStep === 'enriching';
  const hasSchedule = plan.days.length > 0;

  return (
    <div className="flex h-screen flex-col bg-bg-base">
      <Topbar backTo="/plan" backLabel="Edit trip" />

      {isComplete ? (
        <JobCard summary={plan.summary} request={request} />
      ) : (
        <div className="flex shrink-0 items-stretch border-b border-border-medium bg-bg-surface shadow-sm">
          <div className="w-[3px] shrink-0 bg-accent" />
          <div className="flex-1 px-4 py-4 md:px-6 md:py-5">
            <p className="text-sm font-medium text-text-primary">
              {hasSchedule ? 'Almost there — locating rest stops along your route' : 'Planning your trip...'}
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
      )}

      <MapSection onMarkerClick={(e) => setActiveEvent(e.id)} />

      {enrichError && (
        <div className="shrink-0 border-t border-border-subtle bg-bg-base px-4 py-3 md:px-6">
          <AlertBanner icon={<AlertCircle />}>{enrichError}</AlertBanner>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            disabled={isPending}
            onClick={() => retryEnrich()}
          >
            Retry loading stop details
          </Button>
        </div>
      )}

      {isEnriching && !enrichError && (
        <div className="shrink-0 border-t border-border-subtle bg-bg-base px-4 py-2 md:px-6">
          <p className="text-center text-xs text-text-muted">Locating rest stops along your route...</p>
        </div>
      )}

      {summaryData && isComplete && (
        <TripFooter
          summaryData={summaryData}
          totalDays={plan.summary!.total_days}
          restartRequired={plan.summary!.restart_required}
          onViewPlan={() => navigate('/detail')}
          onChangeInputs={() => navigate('/plan')}
        />
      )}

      {hasSchedule && !isComplete && (
        <div className="shrink-0 border-t border-border-subtle bg-bg-base px-4 py-4 md:px-6">
          <Button
            variant="primary"
            className="w-full py-3"
            onClick={() => navigate('/detail')}
          >
            View route plan →
          </Button>
        </div>
      )}
    </div>
  );
}
