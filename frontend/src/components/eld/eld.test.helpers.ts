import type { EventType, ScheduledStop, TripDay } from '../../types/trip';

let eventCounter = 0;

export function makeEvent(
  type: EventType,
  startHour: number,
  durationHrs: number,
  overrides: Partial<ScheduledStop> = {},
): ScheduledStop {
  eventCounter += 1;
  return {
    id: `evt-${eventCounter}`,
    type,
    label: type,
    location: 'Test City, ST',
    lat: 0,
    lng: 0,
    miles_from_start: 0,
    start_hour: startHour,
    duration_hrs: durationHrs,
    miles_from_prev: 0,
    satisfies: [],
    early_stop: false,
    early_stop_reason: '',
    stop_info: { category: '', phone: '', website: '', opening_hours: '', city: 'Test City, ST' },
    ...overrides,
  };
}

export function makeDay(opts: {
  dayNumber?: number;
  dutyStart?: string;
  events: ScheduledStop[];
}): TripDay {
  return {
    day_number: opts.dayNumber ?? 1,
    duty_start_time: opts.dutyStart ?? '08:00',
    total_driving_hrs: 0,
    total_on_duty_hrs: 0,
    total_off_duty_hrs: 0,
    total_sleeper_berth_hrs: 0,
    events: opts.events,
  };
}

export function resetEventCounter(): void {
  eventCounter = 0;
}
