import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/layout';
import { EventSidebar } from '../components/sidebar/EventSidebar';
import { TripDetailMapSection } from '../components/trip-detail/TripDetailMapSection';
import { TripDetailDrawerSection } from '../components/trip-detail/TripDetailDrawerSection';
import type { RouteMapHandle } from '../components/map/RouteMap';
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
    } else if (!plan.days.length) {
      navigate('/summary');
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

  if (!plan?.days.length) {
    return null;
  }

  return (
    <PageShell backTo="/summary" backLabel="Summary" layout="split">
      <EventSidebar variant="inline" />
      <TripDetailMapSection
        mapRef={mapRef}
        onMarkerClick={handleMarkerClick}
        showFab={isCompactLayout}
        onOpenDrawer={() => setDrawerOpen(true)}
      />
      <TripDetailDrawerSection open={drawerOpen} onOpenChange={setDrawerOpen} />
    </PageShell>
  );
}
