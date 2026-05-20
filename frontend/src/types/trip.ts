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
  rest_stop_steps: RestStopStep[];
  restart_required: boolean;
  message: string;
}

export interface TripPlan {
  summary?: TripSummary;
  route_geometry: Coordinate[];
  days: TripDay[];
}

export interface RouteCoordinates {
  current: Coordinate;
  pickup: Coordinate;
  dropoff: Coordinate;
}

export interface RoutePlanResult {
  route_geometry: Coordinate[];
  total_distance_miles: number;
  pickup_distance_miles: number;
  coordinates: RouteCoordinates;
}

export interface ScheduleResult {
  days: TripDay[];
}

export interface EnrichedPlanResult {
  summary: TripSummary;
  days: TripDay[];
}

export type PlanStep = 'idle' | 'routing' | 'scheduling' | 'enriching' | 'done' | 'error';

export interface TripRequest {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  cycle_used_hrs: number;
}

export interface VerificationRouteSummary {
  slug: string;
  name: string;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  expected_miles: number;
  expected_min_days: number;
  expected_max_days: number;
  status: 'ok' | 'failed' | 'pending' | 'not_seeded';
  ors_miles: number | null;
  total_days: number | null;
  computed_at: string | null;
  error_message: string;
}

export interface VerificationRouteMeta {
  slug: string;
  name: string;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  expected_miles: number;
  expected_min_days: number;
  expected_max_days: number;
  cycle_used_hrs: number;
  notes: string;
}

export interface VerificationRouteDetail {
  route: VerificationRouteMeta;
  status: 'ok' | 'failed' | 'pending' | 'not_seeded';
  request: TripRequest | null;
  plan: TripPlan | null;
  route_result: RoutePlanResult | null;
  ors_miles: number | null;
  computed_at: string | null;
  error_message: string;
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
  /** ISO-2 country code — 'US' | 'CA'. Used to validate service area. */
  countryCode?: string;
}
