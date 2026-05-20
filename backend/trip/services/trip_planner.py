"""Trip planner service — orchestrates geocoding, routing, HOS calc, and facility enrichment."""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from trip.domain.enums import EventType
from trip.domain.models import (
    Coordinate,
    RouteCoordinates,
    RoutePlanResult,
    ScheduleResult,
    StopInfo,
    TripPlan,
    TripRequest,
)
from trip.utils import coord_at_mile, cumulative_miles as compute_cumulative_miles

from trip.exceptions import FacilityDataError
from trip.services.facility import FacilityService
from trip.services.geocoding import GeocodingService
from trip.services.hos_calculator import HOSCalculatorService
from trip.services.routing import RoutingService
from trip.services.summary import SummaryService

_log = logging.getLogger(__name__)

# Buffer (miles) behind each HOS deadline to search for a suitable facility.
# DRIVE / PICKUP / DROPOFF events are not enriched.
_STOP_BUFFER_MILES: dict[EventType, float] = {
    EventType.FUEL:    100.0,
    EventType.REST:     55.0,
    EventType.RESTART:  55.0,
    EventType.BREAK:    45.0,
}

_NEEDS_CITY = {EventType.REST, EventType.RESTART}

# Maximum concurrent ORS POI calls — avoids hammering the rate limit.
_MAX_ENRICHMENT_WORKERS = 5


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
        """Produce a full HOS-compliant trip plan (monolithic entry point)."""
        route = self.resolve_route(request)
        schedule = self.build_schedule(route, request.cycle_used_hrs)
        return self.enrich_and_summarize(route, schedule, request.cycle_used_hrs)

    def resolve_route(self, request: TripRequest) -> RoutePlanResult:
        """
        Geocode three addresses (parallel) and fetch the driving route.

        Raises:
            GeocodingError: if any address cannot be resolved.
            RouteNotFoundError: if no driving route exists.
        """
        locations = [
            ("current", request.current_location),
            ("pickup", request.pickup_location),
            ("dropoff", request.dropoff_location),
        ]
        coords: dict[str, Coordinate] = {}
        with ThreadPoolExecutor(max_workers=3) as pool:
            future_to_name = {
                pool.submit(self.geocoding_service.geocode, loc): name
                for name, loc in locations
            }
            for future in as_completed(future_to_name):
                name = future_to_name[future]
                coords[name] = future.result()

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
        """
        Run HOS simulation — pure Python, no external calls.

        Raises:
            InsufficientCycleHoursError: if cycle hours are exhausted.
        """
        cum_miles = compute_cumulative_miles(route.route_geometry)
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
        """Enrich stops with POI data, reverse-geocode rests, and build summary."""
        days = schedule.days
        cum_miles = compute_cumulative_miles(route.route_geometry)

        enrichable = []
        for day in days:
            for event in day.events:
                buffer = _STOP_BUFFER_MILES.get(event.type)
                if buffer is None:
                    continue
                deadline_mile = event.miles_from_start
                start_mile = max(0.0, deadline_mile - buffer)
                segment = self._geometry_segment(
                    route.route_geometry, cum_miles, start_mile, deadline_mile
                )
                enrichable.append((event, segment))

        enriched = 0
        if enrichable:
            self.facility_service.clear_poi_errors()
            workers = min(len(enrichable), _MAX_ENRICHMENT_WORKERS)
            with ThreadPoolExecutor(max_workers=workers) as pool:
                future_to_event = {
                    pool.submit(
                        self.facility_service.find_best_facility_in_segment,
                        seg,
                        event.type,
                    ): event
                    for event, seg in enrichable
                }
                for future in as_completed(future_to_event):
                    event = future_to_event[future]
                    facility = future.result()
                    if facility:
                        event.location = facility.name
                        event.lat = facility.lat
                        event.lng = facility.lng
                        event.stop_info = facility.stop_info
                        enriched += 1

        _log.info("Enriched %d stops with facility data", enriched)

        for day in days:
            for event in day.events:
                if event.type == EventType.PICKUP and route.pickup_location_label:
                    event.location = route.pickup_location_label
                elif event.type == EventType.DROPOFF and route.dropoff_location_label:
                    event.location = route.dropoff_location_label

        if enrichable and enriched == 0:
            summary = self.facility_service.poi_error_summary()
            if not isinstance(summary, str):
                summary = ""
            summary = summary.strip()
            if summary:
                _log.warning(
                    "Facility enrichment failed for all %d stops: %s",
                    len(enrichable),
                    summary,
                )
                raise FacilityDataError(
                    f"Could not load truck-stop data ({summary}). "
                    "ORS POI quota may be exhausted — try again later or upgrade your API plan."
                )

        # Reverse-geocode rests and any stop still showing a category placeholder ("Fuel").
        city_events = [
            event
            for day in days
            for event in day.events
            if event.type in _NEEDS_CITY
            or FacilityService.is_machine_display_name(event.location)
            or FacilityService.is_generic_brand_name(event.location)
        ]
        if city_events:
            with ThreadPoolExecutor(max_workers=min(len(city_events), 5)) as pool:
                future_to_event = {
                    pool.submit(
                        self.geocoding_service.reverse_geocode, event.lat, event.lng
                    ): event
                    for event in city_events
                }
                for future in as_completed(future_to_event):
                    event = future_to_event[future]
                    city = future.result()
                    if city:
                        if event.stop_info is None:
                            event.stop_info = StopInfo()
                        event.stop_info.city = city
                        if FacilityService.is_machine_display_name(event.location):
                            event.location = FacilityService.location_with_city(
                                event.location, city, event.type
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

    @staticmethod
    def _geometry_segment(
        geometry: list[Coordinate],
        cum_miles: list[float],
        start_mile: float,
        end_mile: float,
    ) -> list[Coordinate]:
        """
        Extract the route geometry points between *start_mile* and *end_mile*,
        inserting interpolated endpoints so the segment is exact.
        """
        points: list[Coordinate] = []
        for i, cum in enumerate(cum_miles):
            if cum < start_mile:
                continue
            if cum > end_mile:
                break
            points.append(geometry[i])

        if not points or cum_miles[0] < start_mile:
            lat, lng = coord_at_mile(geometry, cum_miles, start_mile)
            points.insert(0, Coordinate(lat=lat, lng=lng))

        lat, lng = coord_at_mile(geometry, cum_miles, end_mile)
        end_coord = Coordinate(lat=lat, lng=lng)
        if not points or (points[-1].lat != end_coord.lat or points[-1].lng != end_coord.lng):
            points.append(end_coord)

        return points
