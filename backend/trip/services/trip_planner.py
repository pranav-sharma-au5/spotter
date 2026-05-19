"""Trip planner service — orchestrates geocoding, routing, HOS calc, and facility enrichment."""
import logging

from trip.domain.enums import EventType
from trip.domain.models import TripPlan, TripRequest
from trip.utils import haversine_miles

from trip.services.facility import FacilityService
from trip.services.geocoding import GeocodingService
from trip.services.hos_calculator import HOSCalculatorService
from trip.services.routing import RoutingService
from trip.services.summary import SummaryService

_log = logging.getLogger(__name__)


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
        """
        Produce a full HOS-compliant trip plan for the given TripRequest.

        Flow
        ----
        1. Geocode the three addresses          (3 ORS calls)
        2. Fetch the driving route              (1 ORS call)
        3. Run HOS simulation — pure Python, no external calls
        4. Enrich each stop with a targeted POI point-query
                                                (~N calls, one per meaningful stop)
        5. Build summary

        Raises:
            GeocodingError: if any address cannot be resolved.
            RouteNotFoundError: if no driving route exists.
            InsufficientCycleHoursError: if cycle hours are exhausted.
        """
        # 1. Geocode all three locations
        current_coord = self.geocoding_service.geocode(request.current_location)
        pickup_coord = self.geocoding_service.geocode(request.pickup_location)
        dropoff_coord = self.geocoding_service.geocode(request.dropoff_location)

        # 2. Route: current → pickup → dropoff
        route = self.routing_service.get_route(
            [current_coord, pickup_coord, dropoff_coord]
        )
        pickup_distance_miles = route.segments[0].distance_miles

        # Pre-compute cumulative miles once — shared by HOS sim and enrichment
        cumulative_miles = self._cumulative_miles(route.geometry)

        # 3. HOS simulation (no facility data needed)
        days = self.hos_calculator.calculate(
            total_distance_miles=route.total_distance_miles,
            pickup_distance_miles=pickup_distance_miles,
            cycle_used_hrs=request.cycle_used_hrs,
            geometry=route.geometry,
            cumulative_miles=cumulative_miles,
        )

        # 4. Enrich stops with the best facility in a lookback window.
        #
        #    For each HOS stop we search a segment of the route that runs from
        #    (deadline_mile - buffer) to deadline_mile.  The "best" facility is
        #    the last one before the deadline — maximising drive progress while
        #    guaranteeing the driver reaches it before the constraint expires.
        #
        #    Buffers are sized conservatively:
        #      FUEL    100 mi  — functional safety: never run dry
        #      REST    55 mi   — 1 hr of driving before the 11-hr limit
        #      RESTART 55 mi   — same logic for cycle-reset stops
        #      BREAK   45 mi   — ~50 min before the 8-hr drive limit
        #
        #    DRIVE / PICKUP / DROPOFF are not enriched.
        _STOP_BUFFER_MILES: dict[EventType, float] = {
            EventType.FUEL:    100.0,
            EventType.REST:     55.0,
            EventType.RESTART:  55.0,
            EventType.BREAK:    45.0,
        }
        _NEEDS_CITY = {EventType.REST, EventType.RESTART}
        enriched = 0
        for day in days:
            for event in day.events:
                buffer = _STOP_BUFFER_MILES.get(event.type)
                if buffer is None:
                    continue

                deadline_mile = event.miles_from_start
                start_mile = max(0.0, deadline_mile - buffer)
                segment = self._geometry_segment(
                    route.geometry, cumulative_miles, start_mile, deadline_mile
                )

                facility = self.facility_service.find_best_facility_in_segment(segment)
                if facility:
                    event.location = facility.name
                    event.lat = facility.lat
                    event.lng = facility.lng
                    event.stop_info = facility.stop_info
                    enriched += 1

                # Reverse-geocode overnight rests so the summary can show the city
                if event.type in _NEEDS_CITY:
                    city = self.geocoding_service.reverse_geocode(event.lat, event.lng)
                    if city:
                        if event.stop_info is None:
                            from trip.domain.models import StopInfo
                            event.stop_info = StopInfo()
                        event.stop_info.city = city

        _log.info("Enriched %d stops with facility data", enriched)

        # 5. Build summary
        summary = self.summary_service.build(
            days=days,
            total_miles=route.total_distance_miles,
            initial_cycle_hrs=request.cycle_used_hrs,
            max_cycle_hrs=self.hos_calculator.max_cycle_hrs,
        )

        return TripPlan(
            summary=summary,
            route_geometry=route.geometry,
            days=days,
        )

    @staticmethod
    def _cumulative_miles(geometry: list) -> list[float]:
        miles = [0.0]
        for i in range(1, len(geometry)):
            p, c = geometry[i - 1], geometry[i]
            miles.append(miles[-1] + haversine_miles(p.lat, p.lng, c.lat, c.lng))
        return miles

    @staticmethod
    def _geometry_segment(
        geometry: list,
        cumulative_miles: list[float],
        start_mile: float,
        end_mile: float,
    ) -> list:
        """
        Extract the route geometry points between *start_mile* and *end_mile*,
        inserting interpolated endpoints so the segment is exact.
        """
        from trip.services.hos_calculator import _coord_at_mile
        from trip.domain.models import Coordinate

        points = []
        for i, cum in enumerate(cumulative_miles):
            if cum < start_mile:
                continue
            if cum > end_mile:
                break
            points.append(geometry[i])

        # Prepend interpolated start point
        if not points or cumulative_miles[0] < start_mile:
            lat, lng = _coord_at_mile(geometry, cumulative_miles, start_mile)
            points.insert(0, Coordinate(lat=lat, lng=lng))

        # Append interpolated end point
        lat, lng = _coord_at_mile(geometry, cumulative_miles, end_mile)
        end_coord = Coordinate(lat=lat, lng=lng)
        if not points or (points[-1].lat != end_coord.lat or points[-1].lng != end_coord.lng):
            points.append(end_coord)

        return points
