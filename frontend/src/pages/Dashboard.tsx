import { useNavigate } from 'react-router-dom';
import { PageShell, PageScrollContent } from '../components/layout';
import { GreetingSection } from '../components/dashboard/GreetingSection';
import { ToolsSection } from '../components/dashboard/ToolsSection';
import { DashboardCtaSection } from '../components/dashboard/DashboardCtaSection';
import { VerificationRouteList } from '../components/verification/VerificationRouteList';

export function Dashboard() {
  const navigate = useNavigate();
  const goToPlan = () => navigate('/plan');

  return (
    <PageShell>
      <PageScrollContent maxWidth="3xl">
        <GreetingSection driverName="John" cycleUsed={0} cycleTotal={70} />
        <ToolsSection onPlanRoute={goToPlan} />
        <VerificationRouteList />
        <DashboardCtaSection onPlanTrip={goToPlan} />
      </PageScrollContent>
    </PageShell>
  );
}
