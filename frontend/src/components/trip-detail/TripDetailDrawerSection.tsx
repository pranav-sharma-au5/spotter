import { EventSidebar } from '../sidebar/EventSidebar';
import { ItineraryDrawer } from '../ui/ItineraryDrawer';

interface TripDetailDrawerSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripDetailDrawerSection({ open, onOpenChange }: TripDetailDrawerSectionProps) {
  return (
    <ItineraryDrawer open={open} onOpenChange={onOpenChange}>
      <EventSidebar variant="drawer" showHeader={false} />
    </ItineraryDrawer>
  );
}
