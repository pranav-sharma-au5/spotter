import { calcTotalMiles } from '../eld/eld-utils';
import type { TripDay, VerificationRouteMeta } from '../../types/trip';

const LLM_RUBRIC = `
## LLM scoring rubric

Score each dimension 1–5 or pass/fail:

1. Distance — ORS miles vs expected (~±10%)
2. Duration — day count reasonable (~605 mi/driving-day)
3. HOS structure — breaks ~440 mi, 10h rests, fuel ~950 mi, pickup once, dropoff last
4. Geographic plausibility — rest/fuel along corridor
5. ELD consistency — duty lines match events per day
6. Overall — trust for a real driver?

Record in backend/verification_exports/SCORES.md
`;

export function milesWithinTolerance(actual: number, expected: number, pct = 0.1): boolean {
  const delta = expected * pct;
  return actual >= expected - delta && actual <= expected + delta;
}

export function daysWithinRange(
  days: number,
  minDays: number,
  maxDays: number,
): boolean {
  return days >= minDays && days <= maxDays;
}

export function buildLlmReviewText(
  route: VerificationRouteMeta,
  orsMiles: number | null,
  totalDays: number | null,
  days: TripDay[],
): string {
  const timeline: string[] = [];
  for (const day of days) {
    const driveMi = calcTotalMiles(day);
    timeline.push(
      `Day ${day.day_number}: drive ${day.total_driving_hrs.toFixed(1)}h (${Math.round(driveMi)} mi), on-duty ${day.total_on_duty_hrs.toFixed(1)}h`,
    );
    for (const e of day.events) {
      if (e.type === 'drive') continue;
      timeline.push(
        `  - ${e.type}: ${e.label} (${e.duration_hrs}h, +${Math.round(e.miles_from_prev)} mi) @ ${e.location}`,
      );
    }
  }

  return `# Verification: ${route.name}

Current: ${route.current_location}
Pickup: ${route.pickup_location}
Dropoff: ${route.dropoff_location}

Expected miles: ~${route.expected_miles}
ORS miles: ${orsMiles ?? '—'}
Expected days: ${route.expected_min_days}–${route.expected_max_days}
Actual days: ${totalDays ?? '—'}

## Timeline
${timeline.join('\n')}
${LLM_RUBRIC}`;
}
