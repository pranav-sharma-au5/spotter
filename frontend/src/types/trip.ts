export type EventType =
  | 'drive' | 'break' | 'fuel' | 'rest'
  | 'pickup' | 'dropoff' | 'on_duty' | 'restart';

export type ConstraintType = 'break' | 'fuel' | 'rest' | 'cycle_limit';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface StopInfo {
  category: string;      // e.g. "Fuel", "Truck Stop"
  phone: string;
  website: string;
  opening_hours: string; // raw OSM value, e.g. "Mo-Su 00:00-24:00" or "24/7"
  city: string;          // reverse-geocoded, e.g. "Richfield, UT"
}

export interface RestStopStep {
  night: number;
  day: number;
  location: string;
  city: string;
  miles_from_start: number;
  duration_hrs: number;
}

export interface ScheduledStop {
  id: string;
  type: EventType;
  label: string;
  location: string;
  lat: number;
  lng: number;
  miles_from_start: number;
  start_hour: number;
  duration_hrs: number;
  miles_from_prev: number;
  satisfies: ConstraintType[];
  early_stop: boolean;
  early_stop_reason: string;
  stop_info: StopInfo | null;
}

export interface TripDay {
  day_number: number;
  duty_start_time: string;
  total_driving_hrs: number;
  total_on_duty_hrs: number;
  total_off_duty_hrs: number;
  total_sleeper_berth_hrs: number;
  events: ScheduledStop[];
}

export interface TripSummary {
  total_days: number;
  total_miles: number;
  cycle_hours_used_after_trip: number;
  cycle_hours_remaining: number;
  rest_stops: Array<{ day: number; location: string; city: string }>;
  rest_stop_steps: RestStopStep[];
  restart_required: boolean;
  message: string;
}

export interface TripPlan {
  summary: TripSummary;
  route_geometry: Coordinate[];
  days: TripDay[];
}

export interface TripRequest {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  cycle_used_hrs: number;
}

export interface LocationSuggestion {
  /** Unique key for React list rendering (Photon osm_id or 'gps-resolved') */
  id: string;
  /** Full label shown in the dropdown */
  displayName: string;
  /** Shorter name used as input value on select — driver-friendly */
  shortName: string;
  lat: number;
  lng: number;
}
