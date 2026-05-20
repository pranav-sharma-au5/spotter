import { PageShell, PageScrollContent } from '../components/layout';
import { PlanInputHeroSection } from '../components/plan-input/PlanInputHeroSection';
import { RouteFormSection } from '../components/plan-input/RouteFormSection';
import { CycleSection } from '../components/plan-input/CycleSection';
import { PlanSubmitSection } from '../components/plan-input/PlanSubmitSection';
import { useTripPlanProgressive } from '../hooks/useTripPlanProgressive';
import { useRouteForm } from '../hooks/useRouteForm';
import { useTripStore } from '../stores/tripStore';

export function PlanInput() {
  const storedRequest = useTripStore((s) => s.request);
  const {
    route,
    cycleHrs,
    setCycleHrs,
    canSubmit,
    submitHint,
    fieldErrors,
    handleChange,
    handleSelect,
    handleSwap,
    buildPayload,
  } = useRouteForm(storedRequest);
  const { submitTrip, isPending, errorMessage, planStep } = useTripPlanProgressive();

  const handleSubmit = () => {
    if (!canSubmit || isPending) return;
    submitTrip(buildPayload());
  };

  return (
    <PageShell backTo="/" backLabel="Dashboard">
      <div className="flex min-h-0 flex-1 flex-col">
        <PlanInputHeroSection />
        <PageScrollContent maxWidth="xl" innerClassName="space-y-4">
        <RouteFormSection
          route={route}
          fieldErrors={fieldErrors}
          onChange={handleChange}
          onSelect={handleSelect}
          onSwap={handleSwap}
        />
        <CycleSection value={cycleHrs} onChange={setCycleHrs} />
        <PlanSubmitSection
          canSubmit={canSubmit}
          isPending={isPending}
          errorMessage={errorMessage}
          planStep={planStep}
          submitHint={submitHint}
          onSubmit={handleSubmit}
        />
        </PageScrollContent>
      </div>
    </PageShell>
  );
}
