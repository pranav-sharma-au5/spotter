import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { EventSidebar } from '../components/sidebar/EventSidebar';
import { RouteMap } from '../components/map/RouteMap';
import { useTripStore } from '../stores/tripStore';
import { useActiveEvent } from '../hooks/useActiveEvent';
import type { ScheduledStop } from '../types/trip';

export function TripDetail() {
  const navigate = useNavigate();
  const plan = useTripStore((s) => s.plan);
  const { setActiveEvent } = useActiveEvent();

  if (!plan) {
    navigate('/');
    return null;
  }

  const handleMarkerClick = (event: ScheduledStop) => {
    setActiveEvent(event.id);
  };

  return (
    <div className="flex h-screen flex-col bg-bg-base">
      <Topbar backTo="/summary" backLabel="Summary" />

      <div className="flex min-h-0 flex-1">
        <EventSidebar />
        <div className="flex-1">
          <RouteMap mode="detail" onMarkerClick={handleMarkerClick} />
        </div>
      </div>
    </div>
  );
}
