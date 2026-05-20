from pydantic import BaseModel, Field

from trip.domain.enums import ConstraintType, EventType, FacilityType


class TripRequest(BaseModel):
    current_location: str
    pickup_location: str
    dropoff_location: str
    cycle_used_hrs: float = Field(ge=0, le=70)


class Coordinate(BaseModel):
    lat: float
    lng: float


class Facility(BaseModel):
    id: str
    name: str
    type: FacilityType
    lat: float
    lng: float
    miles_from_start: float
    stop_info: "StopInfo | None" = None


class StopInfo(BaseModel):
    """Extra facility detail returned by ORS POI — all fields are optional."""
    category: str = ""        # e.g. "Fuel Station", "Truck Stop"
    phone: str = ""
    website: str = ""
    opening_hours: str = ""
    city: str = ""            # reverse-geocoded, e.g. "Richfield, UT"


class ScheduledStop(BaseModel):
    id: str
    type: EventType
    label: str
    location: str
    lat: float
    lng: float
    miles_from_start: float
    start_hour: float
    duration_hrs: float
    miles_from_prev: float
    satisfies: list[ConstraintType] = Field(default_factory=list)
    early_stop: bool = False
    early_stop_reason: str = ""
    stop_info: StopInfo | None = None


class TripDay(BaseModel):
    day_number: int
    duty_start_time: str
    total_driving_hrs: float
    total_on_duty_hrs: float
    total_off_duty_hrs: float
    total_sleeper_berth_hrs: float = 0.0
    events: list[ScheduledStop]


class RestStopStep(BaseModel):
    """One overnight rest entry for the structured summary display."""
    night: int
    day: int
    location: str             # facility name
    city: str                 # reverse-geocoded "City, ST"
    miles_from_start: float
    duration_hrs: float


class TripSummary(BaseModel):
    total_days: int
    total_miles: float
    cycle_hours_used_after_trip: float
    cycle_hours_remaining: float
    rest_stop_steps: list[RestStopStep] = Field(default_factory=list)
    restart_required: bool
    message: str


class TripPlan(BaseModel):
    summary: TripSummary
    route_geometry: list[Coordinate]
    days: list[TripDay]


class RouteCoordinates(BaseModel):
    current: Coordinate
    pickup: Coordinate
    dropoff: Coordinate


class RoutePlanResult(BaseModel):
    route_geometry: list[Coordinate]
    total_distance_miles: float
    pickup_distance_miles: float
    coordinates: RouteCoordinates


class ScheduleResult(BaseModel):
    days: list[TripDay]


class ScheduleRequest(BaseModel):
    route_geometry: list[Coordinate]
    total_distance_miles: float
    pickup_distance_miles: float
    cycle_used_hrs: float = Field(ge=0, le=70)


class EnrichRequest(BaseModel):
    route_geometry: list[Coordinate]
    total_distance_miles: float
    cycle_used_hrs: float = Field(ge=0, le=70)
    days: list[TripDay]


class EnrichedPlanResult(BaseModel):
    summary: TripSummary
    days: list[TripDay]
