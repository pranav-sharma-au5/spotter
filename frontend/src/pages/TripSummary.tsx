import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { JobCard } from '../components/summary/JobCard';
import { MapSection } from '../components/summary/MapSection';
import { TripFooter } from '../components/summary/TripFooter';
import { useTripStore } from '../stores/tripStore';
import { useActiveEvent } from '../hooks/useActiveEvent';
import { useTripSummaryData } from '../hooks/useTripSummaryData';

export function TripSummary() {
  const navigate = useNavigate();
  const plan = useTripStore((s) => s.plan);
  const request = useTripStore((s) => s.request);
  const { setActiveEvent } = useActiveEvent();
  const summaryData = useTripSummaryData();

  if (!plan || !request || !summaryData) {
    navigate('/');
    return null;
  }

  const { summary } = plan;

  return (
    <div className="flex h-screen flex-col bg-bg-base">
      <Topbar backTo="/plan" backLabel="Edit trip" />
      <JobCard summary={summary} request={request} />
      <MapSection onMarkerClick={(e) => setActiveEvent(e.id)} />
      <TripFooter
        summaryData={summaryData}
        totalDays={summary.total_days}
        restartRequired={summary.restart_required}
        onViewPlan={() => navigate('/detail')}
        onChangeInputs={() => navigate('/plan')}
      />
    </div>
  );
}
