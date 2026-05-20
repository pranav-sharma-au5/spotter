import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mapPlanningError } from '../services/api';
import { runEnrichStep, runRouteStep, runScheduleStep } from '../services/planningPipeline';
import { useTripStore } from '../stores/tripStore';
import type { TripRequest } from '../types/trip';

function handlePlanningFailure(
  message: string,
  navigate: ReturnType<typeof useNavigate>,
  setEnrichError: (msg: string | null) => void,
  setErrorMessage: (msg: string | null) => void,
  setPlanStep: (step: 'done' | 'error') => void,
): void {
  const { plan: currentPlan } = useTripStore.getState();
  if (currentPlan && currentPlan.days.length > 0) {
    setEnrichError(message);
    setPlanStep('done');
    return;
  }
  setErrorMessage(message);
  setPlanStep('error');
  navigate('/plan');
}

export function useTripPlanProgressive() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const navigate = useNavigate();

  const setRequest = useTripStore((s) => s.setRequest);
  const setRouteResult = useTripStore((s) => s.setRouteResult);
  const setPartialPlan = useTripStore((s) => s.setPartialPlan);
  const mergeEnrichedPlan = useTripStore((s) => s.mergeEnrichedPlan);
  const setPlanStep = useTripStore((s) => s.setPlanStep);
  const setEnrichError = useTripStore((s) => s.setEnrichError);
  const resetPlanning = useTripStore((s) => s.resetPlanning);
  const planStep = useTripStore((s) => s.planStep);
  const routeResult = useTripStore((s) => s.routeResult);
  const request = useTripStore((s) => s.request);
  const plan = useTripStore((s) => s.plan);
  const enrichError = useTripStore((s) => s.enrichError);

  const submitTrip = useCallback(async (req: TripRequest) => {
    setIsPending(true);
    setErrorMessage(null);
    setEnrichError(null);
    resetPlanning();
    setRequest(req);
    setPlanStep('routing');

    try {
      const route = await runRouteStep(req);
      setRouteResult(route);
      setPartialPlan(route.route_geometry);
      navigate('/summary');

      setPlanStep('scheduling');
      const schedule = await runScheduleStep(route, req.cycle_used_hrs);
      setPartialPlan(route.route_geometry, schedule.days);

      setPlanStep('enriching');
      const enriched = await runEnrichStep(route, schedule, req.cycle_used_hrs);
      mergeEnrichedPlan(enriched, route.route_geometry);
    } catch (err) {
      handlePlanningFailure(
        mapPlanningError(err),
        navigate,
        setEnrichError,
        setErrorMessage,
        setPlanStep,
      );
    } finally {
      setIsPending(false);
    }
  }, [
    mergeEnrichedPlan,
    navigate,
    resetPlanning,
    setEnrichError,
    setPartialPlan,
    setPlanStep,
    setRequest,
    setRouteResult,
  ]);

  const retryEnrich = useCallback(async () => {
    if (!routeResult || !request || !plan?.days.length) return;

    setEnrichError(null);
    setPlanStep('enriching');
    setIsPending(true);

    try {
      const enriched = await runEnrichStep(
        routeResult,
        { days: plan.days },
        request.cycle_used_hrs,
      );
      mergeEnrichedPlan(enriched, routeResult.route_geometry);
    } catch (err) {
      setEnrichError(mapPlanningError(err));
      setPlanStep('done');
    } finally {
      setIsPending(false);
    }
  }, [mergeEnrichedPlan, plan, request, routeResult, setEnrichError, setPlanStep]);

  return {
    submitTrip,
    retryEnrich,
    isPending,
    errorMessage,
    planStep,
    enrichError,
    clearError: () => setErrorMessage(null),
  };
}
