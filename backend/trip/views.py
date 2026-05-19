"""DRF views for the trip planning API."""
import logging

from django.conf import settings
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from trip.domain.models import TripRequest
from trip.exceptions import (
    FacilityDataError,
    GeocodingError,
    InsufficientCycleHoursError,
    RouteNotFoundError,
)
from trip.serializers import TripRequestSerializer
from trip.services.facility import FacilityService
from trip.services.geocoding import GeocodingService
from trip.services.hos_calculator import HOSCalculatorService
from trip.services.map_client import OpenRouteServiceClient
from trip.services.routing import RoutingService
from trip.services.summary import SummaryService
from trip.services.trip_planner import TripPlannerService

_log = logging.getLogger(__name__)


def _build_planner() -> TripPlannerService:
    """Wire up the service graph from Django settings."""
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


# Single shared instance — avoids rebuilding the httpx connection pool per request.
_planner: TripPlannerService = _build_planner()


class TripPlanView(APIView):
    """POST /api/v1/trip/plan/ — generate an HOS-compliant trip plan."""

    def post(self, request: Request) -> Response:
        serializer = TripRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "invalid_request", "detail": serializer.errors},
                status=400,
            )

        trip_request = TripRequest(**serializer.validated_data)

        try:
            plan = _planner.plan(trip_request)
        except GeocodingError as exc:
            return Response(
                {"error": "location_not_found", "detail": str(exc)},
                status=400,
            )
        except RouteNotFoundError as exc:
            return Response(
                {"error": "route_not_found", "detail": str(exc)},
                status=400,
            )
        except InsufficientCycleHoursError as exc:
            return Response(
                {"error": "insufficient_hours", "detail": str(exc)},
                status=422,
            )
        except FacilityDataError as exc:
            return Response(
                {"error": "facility_data_unavailable", "detail": str(exc)},
                status=503,
            )
        except Exception:  # noqa: BLE001
            _log.exception("Unhandled error in TripPlanView for request data: %s", request.data)
            return Response(
                {"error": "internal_error", "detail": "An unexpected error occurred."},
                status=500,
            )

        return Response(plan.model_dump(), status=200)
