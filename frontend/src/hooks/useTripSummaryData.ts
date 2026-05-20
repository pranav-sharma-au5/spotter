import { useTripStore } from '../stores/tripStore';
import { addHoursToTime } from '../utils/format';

export interface TripSummaryData {
  totalDrivingHrs: number;
  fuelStopCount: number;
  estimatedArrival: string;
  restartDay: number | undefined;
}

/**
 * Derives the four display values needed by the TripSummary page from the
 * current plan in the store. Returns `null` when the plan is not yet loaded.
 */
export function useTripSummaryData(): TripSummaryData | null {
  const plan = useTripStore((s) => s.plan);
  if (!plan || plan.days.length === 0) return null;

  const { days } = plan;
  const lastDay = days[days.length - 1];

  return {
    totalDrivingHrs: days.reduce((sum, d) => sum + d.total_driving_hrs, 0),
    fuelStopCount: days.flatMap((d) => d.events).filter((e) => e.type === 'fuel').length,
    estimatedArrival: addHoursToTime(lastDay.duty_start_time, lastDay.total_on_duty_hrs),
    restartDay: days.find((d) => d.events.some((e) => e.type === 'restart'))?.day_number,
  };
}
