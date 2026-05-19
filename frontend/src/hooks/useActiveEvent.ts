import { useTripStore } from '../stores/tripStore';

export function useActiveEvent() {
  const activeEventId = useTripStore((s) => s.activeEventId);
  const setActiveEvent = useTripStore((s) => s.setActiveEvent);

  const clearActiveEvent = () => setActiveEvent(null);

  return { activeEventId, setActiveEvent, clearActiveEvent };
}
