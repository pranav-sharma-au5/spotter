import { create } from 'zustand';
import type {
  EnrichedPlanResult,
  PlanStep,
  RoutePlanResult,
  TripDay,
  TripPlan,
  TripRequest,
  TripSummary,
} from '../types/trip';

interface TripStore {
  request: TripRequest | null;
  plan: TripPlan | null;
  routeResult: RoutePlanResult | null;
  planStep: PlanStep;
  enrichError: string | null;
  activeEventId: string | null;
  setRequest: (req: TripRequest) => void;
  setPlan: (plan: TripPlan) => void;
  setRouteResult: (route: RoutePlanResult) => void;
  setPlanStep: (step: PlanStep) => void;
  setEnrichError: (message: string | null) => void;
  setPartialPlan: (routeGeometry: TripPlan['route_geometry'], days?: TripDay[]) => void;
  mergeEnrichedPlan: (enriched: EnrichedPlanResult, routeGeometry: TripPlan['route_geometry']) => void;
  setActiveEvent: (id: string | null) => void;
  resetPlanning: () => void;
  reset: () => void;
}

export const useTripStore = create<TripStore>((set) => ({
  request: null,
  plan: null,
  routeResult: null,
  planStep: 'idle',
  enrichError: null,
  activeEventId: null,
  setRequest: (req) => set({ request: req }),
  setPlan: (plan) => set({ plan }),
  setRouteResult: (route) => set({ routeResult: route }),
  setPlanStep: (step) => set({ planStep: step }),
  setEnrichError: (message) => set({ enrichError: message }),
  setPartialPlan: (routeGeometry, days = []) => set({
    plan: { route_geometry: routeGeometry, days },
  }),
  mergeEnrichedPlan: (enriched, routeGeometry) => set({
    plan: {
      route_geometry: routeGeometry,
      days: enriched.days,
      summary: enriched.summary,
    },
    enrichError: null,
    planStep: 'done',
  }),
  setActiveEvent: (id) => set({ activeEventId: id }),
  resetPlanning: () => set({
    plan: null,
    routeResult: null,
    planStep: 'idle',
    enrichError: null,
    activeEventId: null,
  }),
  reset: () => set({
    request: null,
    plan: null,
    routeResult: null,
    planStep: 'idle',
    enrichError: null,
    activeEventId: null,
  }),
}));

export function isPlanComplete(plan: TripPlan | null): plan is TripPlan & { summary: TripSummary } {
  return plan != null && plan.summary != null;
}
