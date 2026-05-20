import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/layout';
import { MapSection } from '../components/summary/MapSection';
import { TripSummaryActions } from '../components/summary/TripSummaryActions';
import { TripSummaryHeaderSection } from '../components/trip-summary/TripSummaryHeaderSection';
import { useTripStore } from '../stores/tripStore';
import { useActiveEvent } from '../hooks/useActiveEvent';
import { useTripSummaryData } from '../hooks/useTripSummaryData';
import { useTripSummaryViewState } from '../hooks/useTripSummaryViewState';
import { useTripPlanProgressive } from '../hooks/useTripPlanProgressive';

export function TripSummary() {
  const navigate = useNavigate();
  const plan = useTripStore((s) => s.plan);
  const request = useTripStore((s) => s.request);
  const routeResult = useTripStore((s) => s.routeResult);
  const planStep = useTripStore((s) => s.planStep);
  const { setActiveEvent } = useActiveEvent();
  const summaryData = useTripSummaryData();
  const viewState = useTripSummaryViewState();
  const { retryEnrich, enrichError, isPending } = useTripPlanProgressive();

  if (!plan || !request || !viewState) {
    navigate('/');
    return null;
  }

  return (
    <PageShell backTo="/plan" backLabel="Edit trip" layout="stacked">
      <TripSummaryHeaderSection
        isComplete={viewState.isComplete}
        hasSchedule={viewState.hasSchedule}
        planStep={planStep}
        summary={plan.summary}
        request={request}
        routeResult={routeResult}
      />
      <MapSection onMarkerClick={(e) => setActiveEvent(e.id)} />
      <TripSummaryActions
        viewState={viewState}
        enrichError={enrichError}
        isPending={isPending}
        summaryData={summaryData}
        totalDays={plan.summary?.total_days ?? 0}
        restartRequired={plan.summary?.restart_required ?? false}
        onRetryEnrich={() => retryEnrich()}
        onViewPlan={() => navigate('/detail')}
        onChangeInputs={() => navigate('/plan')}
      />
    </PageShell>
  );
}
