import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { planEnrich, planRoute, planSchedule } from '../services/api';
import { useTripStore } from '../stores/tripStore';
import type { TripRequest } from '../types/trip';

interface ApiErrorBody {
  error?: string;
  detail?: string | Record<string, unknown>;
}

function mapPlanningError(err: unknown): string {
  if (!(err instanceof AxiosError)) {
    return 'Something went wrong. Please try again.';
  }
  const data = err.response?.data as ApiErrorBody | undefined;
  if (!err.response) {
    if (err.code === 'ECONNABORTED') {
      return 'The request timed out. Long trips can take a minute — please try again.';
    }
    return 'Could not connect to the server. Check your network and try again.';
  }
  switch (data?.error) {
    case 'location_not_found':
      return "We couldn't find that location. Try being more specific, e.g. 'Dallas, TX'.";
    case 'route_not_found':
      return "Couldn't find a route between those locations.";
    case 'insufficient_hours':
      return 'Not enough hours this week for this trip. Plan a shorter trip or take a 34-hr restart.';
    default:
      return typeof data?.detail === 'string' ? data.detail : 'Something went wrong. Please try again.';
  }
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
      const route = await planRoute(req);
      setRouteResult(route);
      setPartialPlan(route.route_geometry);
      navigate('/summary');

      setPlanStep('scheduling');
      const schedule = await planSchedule(route, req.cycle_used_hrs);
      setPartialPlan(route.route_geometry, schedule.days);

      setPlanStep('enriching');
      const enriched = await planEnrich(route, schedule, req.cycle_used_hrs);
      mergeEnrichedPlan(enriched, route.route_geometry);
    } catch (err) {
      const message = mapPlanningError(err);
      const { plan: currentPlan } = useTripStore.getState();
      if (currentPlan && currentPlan.days.length > 0) {
        setEnrichError(message);
        setPlanStep('done');
      } else {
        setErrorMessage(message);
        setPlanStep('error');
        navigate('/plan');
      }
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
      const enriched = await planEnrich(
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
