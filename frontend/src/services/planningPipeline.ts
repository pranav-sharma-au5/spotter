import { planEnrich, planRoute, planSchedule } from './api';
import type { EnrichedPlanResult, RoutePlanResult, ScheduleResult, TripRequest } from '../types/trip';

export async function runRouteStep(req: TripRequest): Promise<RoutePlanResult> {
  return planRoute(req);
}

export async function runScheduleStep(
  route: RoutePlanResult,
  cycleUsedHrs: number,
): Promise<ScheduleResult> {
  return planSchedule(route, cycleUsedHrs);
}

export async function runEnrichStep(
  route: RoutePlanResult,
  schedule: ScheduleResult,
  cycleUsedHrs: number,
): Promise<EnrichedPlanResult> {
  return planEnrich(route, schedule, cycleUsedHrs);
}
