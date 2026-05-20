"""DRF views for the trip planning API."""
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from trip.api.errors import handle_planning_errors
from trip.api.parsing import parse_body, parse_trip_request
from trip.api.route_factory import route_plan_from_enrich, route_plan_from_schedule
from trip.core.wiring import build_planner
from trip.domain.models import EnrichedPlanResult, EnrichRequest, ScheduleRequest, ScheduleResult
from trip.services.trip_planner import TripPlannerService

# Single shared instance — avoids rebuilding the httpx connection pool per request.
_planner: TripPlannerService = build_planner()


class TripRouteView(APIView):
    """POST /api/v1/trip/route/ — geocode addresses and fetch driving route."""

    def post(self, request: Request) -> Response:
        trip_request = parse_trip_request(request.data)
        if isinstance(trip_request, Response):
            return trip_request

        result = handle_planning_errors(lambda: _planner.resolve_route(trip_request))
        if isinstance(result, Response):
            return result
        return Response(result.model_dump(), status=200)


class TripScheduleView(APIView):
    """POST /api/v1/trip/schedule/ — run HOS simulation on a resolved route."""

    def post(self, request: Request) -> Response:
        schedule_req = parse_body(ScheduleRequest, request.data)
        if isinstance(schedule_req, Response):
            return schedule_req

        route_result = route_plan_from_schedule(
            schedule_req.route_geometry,
            schedule_req.total_distance_miles,
            schedule_req.pickup_distance_miles,
        )

        result = handle_planning_errors(
            lambda: _planner.build_schedule(route_result, schedule_req.cycle_used_hrs)
        )
        if isinstance(result, Response):
            return result
        return Response(result.model_dump(), status=200)


class TripEnrichView(APIView):
    """POST /api/v1/trip/enrich/ — enrich stops and build trip summary."""

    def post(self, request: Request) -> Response:
        enrich_req = parse_body(EnrichRequest, request.data)
        if isinstance(enrich_req, Response):
            return enrich_req

        route_result = route_plan_from_enrich(
            enrich_req.route_geometry,
            enrich_req.total_distance_miles,
        )
        schedule = ScheduleResult(days=enrich_req.days)

        result = handle_planning_errors(
            lambda: _planner.enrich_and_summarize(
                route_result, schedule, enrich_req.cycle_used_hrs
            )
        )
        if isinstance(result, Response):
            return result

        enriched = EnrichedPlanResult(summary=result.summary, days=result.days)
        return Response(enriched.model_dump(), status=200)
