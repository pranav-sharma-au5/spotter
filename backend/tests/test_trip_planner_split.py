"""Tests for split TripPlannerService methods."""
from unittest.mock import MagicMock

from trip.domain.enums import EventType
from trip.domain.models import Coordinate, RouteCoordinates, RoutePlanResult, TripRequest
from trip.services.facility import FacilityService
from trip.services.geocoding import GeocodingService
from trip.services.hos_calculator import HOSCalculatorService
from trip.services.routing import RoutingService
from trip.services.summary import SummaryService
from trip.services.trip_planner import TripPlannerService


def _make_route_result(total_miles: float, pickup_miles: float, geometry: list[Coordinate]):
    from trip.services.map_client import RouteResult, RouteSegment

    seg1 = RouteSegment(
        from_coord=geometry[0],
        to_coord=geometry[len(geometry) // 2],
        distance_miles=pickup_miles,
        duration_hrs=pickup_miles / 55,
    )
    seg2 = RouteSegment(
        from_coord=geometry[len(geometry) // 2],
        to_coord=geometry[-1],
        distance_miles=total_miles - pickup_miles,
        duration_hrs=(total_miles - pickup_miles) / 55,
    )
    return RouteResult(
        segments=[seg1, seg2],
        total_distance_miles=total_miles,
        total_duration_hrs=total_miles / 55,
        geometry=geometry,
    )


def _build_planner(total_miles=400.0, pickup_miles=100.0, geometry=None):
    if geometry is None:
        geometry = [Coordinate(lat=35.0 + i * 0.1, lng=-97.0 - i * 0.1) for i in range(11)]

    mock_geocoding = MagicMock(spec=GeocodingService)
    mock_geocoding.geocode.side_effect = [
        geometry[0],
        geometry[len(geometry) // 2],
        geometry[-1],
    ]
    mock_geocoding.reverse_geocode.return_value = ""

    mock_routing = MagicMock(spec=RoutingService)
    mock_routing.get_route.return_value = _make_route_result(total_miles, pickup_miles, geometry)

    mock_facility = MagicMock(spec=FacilityService)
    mock_facility.find_best_facility_in_segment.return_value = None
    mock_facility.poi_error_summary.return_value = ""

    return TripPlannerService(
        geocoding_service=mock_geocoding,
        routing_service=mock_routing,
        facility_service=mock_facility,
        hos_calculator=HOSCalculatorService(),
        summary_service=SummaryService(),
    )


def test_resolve_route(sample_route_geometry):
    planner = _build_planner(geometry=sample_route_geometry)
    request = TripRequest(
        current_location="Chicago, IL",
        pickup_location="St. Louis, MO",
        dropoff_location="Kansas City, MO",
        cycle_used_hrs=10.0,
    )

    route = planner.resolve_route(request)

    assert route.total_distance_miles == 400.0
    assert route.pickup_distance_miles == 100.0
    assert len(route.route_geometry) == len(sample_route_geometry)
    assert route.coordinates.current == sample_route_geometry[0]


def test_build_schedule(sample_route_geometry):
    planner = _build_planner(geometry=sample_route_geometry)
    route = RoutePlanResult(
        route_geometry=sample_route_geometry,
        total_distance_miles=400.0,
        pickup_distance_miles=100.0,
        coordinates=RouteCoordinates(
            current=sample_route_geometry[0],
            pickup=sample_route_geometry[5],
            dropoff=sample_route_geometry[-1],
        ),
    )

    schedule = planner.build_schedule(route, cycle_used_hrs=10.0)

    assert len(schedule.days) == 1
    all_events = [e for day in schedule.days for e in day.events]
    assert any(e.type == EventType.PICKUP for e in all_events)


def test_enrich_and_summarize(sample_route_geometry):
    planner = _build_planner(geometry=sample_route_geometry)
    route = RoutePlanResult(
        route_geometry=sample_route_geometry,
        total_distance_miles=400.0,
        pickup_distance_miles=100.0,
        coordinates=RouteCoordinates(
            current=sample_route_geometry[0],
            pickup=sample_route_geometry[5],
            dropoff=sample_route_geometry[-1],
        ),
    )
    schedule = planner.build_schedule(route, cycle_used_hrs=10.0)

    plan = planner.enrich_and_summarize(route, schedule, cycle_used_hrs=10.0)

    assert plan.summary.total_days == 1
    assert plan.summary.total_miles == 400.0
    assert len(plan.days) == 1
