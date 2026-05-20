import { Button } from '../ui/Button';
import { PageSection } from '../layout/PageSection';

interface DashboardCtaSectionProps {
  onPlanTrip: () => void;
}

export function DashboardCtaSection({ onPlanTrip }: DashboardCtaSectionProps) {
  return (
    <PageSection spacing="large">
      <div className="flex justify-stretch sm:justify-end">
        <Button variant="primary" className="w-full py-2.5 sm:w-auto" onClick={onPlanTrip}>
          Plan a trip →
        </Button>
      </div>
    </PageSection>
  );
}
