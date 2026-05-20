import { daysWithinRange, milesWithinTolerance } from '../components/verification/verificationChecks';
import type { TripDay, VerificationRouteDetail } from '../types/trip';

export interface VerificationCheckResults {
  orsMiles: number | null;
  totalDays: number | null;
  milesOk: boolean | null;
  daysOk: boolean | null;
  dayLimitIssues: TripDay[];
}

export function useVerificationChecks(detail: VerificationRouteDetail): VerificationCheckResults {
  const { route } = detail;
  const summary = detail.plan?.summary;
  const days: TripDay[] = detail.plan?.days ?? [];

  const orsMiles = detail.ors_miles ?? summary?.total_miles ?? null;
  const totalDays = summary?.total_days ?? null;

  const milesOk =
    orsMiles != null ? milesWithinTolerance(orsMiles, route.expected_miles) : null;
  const daysOk =
    totalDays != null
      ? daysWithinRange(totalDays, route.expected_min_days, route.expected_max_days)
      : null;

  const dayLimitIssues = days.filter(
    (d) => d.total_driving_hrs > 11.05 || d.total_on_duty_hrs > 14.05,
  );

  return { orsMiles, totalDays, milesOk, daysOk, dayLimitIssues };
}
