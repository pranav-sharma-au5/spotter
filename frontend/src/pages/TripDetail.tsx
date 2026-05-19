import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List } from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { EventSidebar } from '../components/sidebar/EventSidebar';
import { RouteMap, type RouteMapHandle } from '../components/map/RouteMap';
import { ItineraryDrawer } from '../components/ui/ItineraryDrawer';
import { useTripStore } from '../stores/tripStore';
import { useActiveEvent } from '../hooks/useActiveEvent';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { ScheduledStop } from '../types/trip';

export function TripDetail() {
  const navigate = useNavigate();
  const plan = useTripStore((s) => s.plan);
  const { setActiveEvent } = useActiveEvent();
  const mapRef = useRef<RouteMapHandle>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isCompactLayout = useMediaQuery('(max-width: 1023px)');

  const resizeMap = useCallback(() => {
    requestAnimationFrame(() => mapRef.current?.resize());
  }, []);

  useEffect(() => {
    if (!plan) {
      navigate('/');
    }
  }, [plan, navigate]);

  useEffect(() => {
    resizeMap();
  }, [drawerOpen, resizeMap]);

  useEffect(() => {
    window.addEventListener('resize', resizeMap);
    return () => window.removeEventListener('resize', resizeMap);
  }, [resizeMap]);

  const handleMarkerClick = (event: ScheduledStop) => {
    setActiveEvent(event.id);
    if (isCompactLayout) {
      setDrawerOpen(true);
    }
  };

  if (!plan) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-bg-base">
      <Topbar backTo="/summary" backLabel="Summary" />

      <div className="relative flex min-h-0 flex-1">
        <EventSidebar variant="inline" />

        <div className="relative min-h-0 min-w-0 flex-1">
          <RouteMap ref={mapRef} mode="detail" onMarkerClick={handleMarkerClick} />

          {isCompactLayout && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="absolute bottom-4 right-4 z-10 flex h-11 min-w-[44px] items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary shadow-lg transition-colors hover:bg-bg-elevated"
            >
              <List className="h-4 w-4 shrink-0" />
              Route plan
            </button>
          )}
        </div>
      </div>

      <ItineraryDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <EventSidebar variant="drawer" showHeader={false} />
      </ItineraryDrawer>
    </div>
  );
}
