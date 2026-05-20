"""Trip planner service — orchestrates geocoding, routing, HOS calc, and facility enrichment."""
from __future__ import annotations

from trip.core.concurrency import run_parallel
from trip.domain.models import (
    Coordinate,
    RouteCoordinates,
    RoutePlanResult,
    ScheduleResult,
    TripPlan,
    TripRequest,
)
from trip.services.enrichment import enrich_stops
from trip.services.facility import FacilityService
from trip.services.hos_calculator import HOSCalculatorService
from trip.services.maps import GeocodingService, RoutingService
from trip.services.summary import SummaryService
from trip.core.utils import cumulative_miles


class TripPlannerService:
    """
    Orchestrator only — contains zero business logic.

    All domain decisions are delegated to the injected services.
    """

    def __init__(
        self,
        geocoding_service: GeocodingService,
        routing_service: RoutingService,
        facility_service: FacilityService,
        hos_calculator: HOSCalculatorService,
        summary_service: SummaryService,
    ) -> None:
        self.geocoding_service = geocoding_service
        self.routing_service = routing_service
        self.facility_service = facility_service
        self.hos_calculator = hos_calculator
        self.summary_service = summary_service

    def plan(self, request: TripRequest) -> TripPlan:
        route = self.resolve_route(request)
        schedule = self.build_schedule(route, request.cycle_used_hrs)
        return self.enrich_and_summarize(route, schedule, request.cycle_used_hrs)

    def resolve_route(self, request: TripRequest) -> RoutePlanResult:
        locations = [
            ("current", request.current_location),
            ("pickup", request.pickup_location),
            ("dropoff", request.dropoff_location),
        ]
        pairs = run_parallel(
            locations,
            lambda pair: (pair[0], self.geocoding_service.geocode(pair[1])),
            max_workers=3,
        )
        coords = dict(pairs)

        route = self.routing_service.get_route(
            [coords["current"], coords["pickup"], coords["dropoff"]]
        )

        return RoutePlanResult(
            route_geometry=route.geometry,
            total_distance_miles=route.total_distance_miles,
            pickup_distance_miles=route.segments[0].distance_miles,
            coordinates=RouteCoordinates(
                current=coords["current"],
                pickup=coords["pickup"],
                dropoff=coords["dropoff"],
            ),
            pickup_location_label=request.pickup_location,
            dropoff_location_label=request.dropoff_location,
        )

    def build_schedule(
        self,
        route: RoutePlanResult,
        cycle_used_hrs: float,
    ) -> ScheduleResult:
        cum_miles = cumulative_miles(route.route_geometry)
        days = self.hos_calculator.calculate(
            total_distance_miles=route.total_distance_miles,
            pickup_distance_miles=route.pickup_distance_miles,
            cycle_used_hrs=cycle_used_hrs,
            geometry=route.route_geometry,
            cumulative_miles=cum_miles,
        )
        return ScheduleResult(days=days)

    def enrich_and_summarize(
        self,
        route: RoutePlanResult,
        schedule: ScheduleResult,
        cycle_used_hrs: float,
    ) -> TripPlan:
        days = schedule.days
        enrich_stops(
            days=days,
            route=route,
            facility_service=self.facility_service,
            geocoding_service=self.geocoding_service,
        )

        summary = self.summary_service.build(
            days=days,
            total_miles=route.total_distance_miles,
            initial_cycle_hrs=cycle_used_hrs,
            max_cycle_hrs=self.hos_calculator.max_cycle_hrs,
        )

        return TripPlan(
            summary=summary,
            route_geometry=route.route_geometry,
            days=days,
        )
