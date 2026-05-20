"""Dependency injection for the trip planning service graph."""
from django.conf import settings

from trip.services.facility import FacilityService
from trip.services.hos_calculator import HOSCalculatorService
from trip.services.maps import GeocodingService, OpenRouteServiceClient, RoutingService
from trip.services.summary import SummaryService
from trip.services.trip_planner import TripPlannerService


def build_planner() -> TripPlannerService:
    """Wire up services from Django settings."""
    map_client = OpenRouteServiceClient(
        api_key=settings.MAPS_API_KEY,
        base_url=settings.ORS_BASE_URL,
    )
    return TripPlannerService(
        geocoding_service=GeocodingService(map_client),
        routing_service=RoutingService(map_client),
        facility_service=FacilityService(
            corridor_miles=settings.ROUTE_CORRIDOR_MILES,
            ors_base_url=settings.ORS_BASE_URL,
            ors_api_key=settings.MAPS_API_KEY,
        ),
        hos_calculator=HOSCalculatorService(
            max_drive_hrs=settings.MAX_DRIVE_HRS_PER_DAY,
            max_duty_window_hrs=settings.MAX_DUTY_WINDOW_HRS,
            drive_hrs_before_break=settings.DRIVE_HRS_BEFORE_BREAK,
            required_break_hrs=settings.REQUIRED_BREAK_HRS,
            required_rest_hrs=settings.REQUIRED_REST_HRS,
            max_cycle_hrs=settings.MAX_CYCLE_HRS,
            restart_hrs=settings.RESTART_HRS,
            max_miles_before_fuel=settings.MAX_MILES_BEFORE_FUEL,
            avg_speed_mph=settings.AVERAGE_TRUCK_SPEED_MPH,
            duty_start_time=settings.DUTY_START_TIME,
            stop_duration_hrs=settings.STOP_DURATION_HRS,
            fuel_stop_duration_hrs=settings.FUEL_STOP_DURATION_HRS,
        ),
        summary_service=SummaryService(),
    )
