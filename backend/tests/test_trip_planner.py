"""Integration-style tests for TripPlannerService (services in isolation, no network)."""
from unittest.mock import MagicMock

import pytest

from trip.domain.enums import EventType
from trip.domain.models import Coordinate, TripPlan, TripRequest
from trip.services.facility import FacilityService
from trip.services.geocoding import GeocodingService
from trip.services.hos_calculator import HOSCalculatorService
from trip.services.routing import RoutingService
from trip.services.summary import SummaryService
from trip.services.trip_planner import TripPlannerService


def _make_route_result(total_miles: float, pickup_miles: float, geometry: list[Coordinate]):
    """Build a minimal RouteResult mock."""
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
    # Return empty string so the planner skips city enrichment on REST stops
    mock_geocoding.reverse_geocode.return_value = ""

    mock_routing = MagicMock(spec=RoutingService)
    mock_routing.get_route.return_value = _make_route_result(total_miles, pickup_miles, geometry)

    mock_facility = MagicMock(spec=FacilityService)
    # Return None for every per-stop query — enrichment is skipped, stops use
    # interpolated coordinates from the route geometry instead.
    mock_facility.find_best_facility_in_segment.return_value = None

    calculator = HOSCalculatorService()
    summary_service = SummaryService()

    return TripPlannerService(
        geocoding_service=mock_geocoding,
        routing_service=mock_routing,
        facility_service=mock_facility,
        hos_calculator=calculator,
        summary_service=summary_service,
    )


def test_full_plan_single_day(sample_route_geometry):
    """A short trip should produce a TripPlan with a single day and no rest stops."""
    planner = _build_planner(
        total_miles=400.0,
        pickup_miles=100.0,
        geometry=sample_route_geometry,
    )

    request = TripRequest(
        current_location="Chicago, IL",
        pickup_location="St. Louis, MO",
        dropoff_location="Kansas City, MO",
        cycle_used_hrs=10.0,
    )
    plan = planner.plan(request)

    assert isinstance(plan, TripPlan)
    assert plan.summary.total_days == 1
    assert len(plan.summary.rest_stop_steps) == 0
    assert plan.summary.restart_required is False

    all_events = [e for day in plan.days for e in day.events]
    assert any(e.type == EventType.PICKUP for e in all_events)
    assert any(e.type == EventType.DROPOFF for e in all_events)


def test_full_plan_multi_day(sample_route_geometry):
    """A 900-mile trip should span multiple days with at least one rest stop."""
    planner = _build_planner(
        total_miles=900.0,
        pickup_miles=100.0,
        geometry=sample_route_geometry,
    )

    request = TripRequest(
        current_location="Chicago, IL",
        pickup_location="St. Louis, MO",
        dropoff_location="Dallas, TX",
        cycle_used_hrs=5.0,
    )
    plan = planner.plan(request)

    assert plan.summary.total_days >= 2
    assert len(plan.summary.rest_stop_steps) >= 1
    assert plan.summary.total_miles == 900.0


def test_plan_without_facility_enrichment(sample_route_geometry):
    """When find_best_facility_in_segment returns None the planner uses interpolated coords."""
    mock_geocoding = MagicMock(spec=GeocodingService)
    mock_geocoding.geocode.side_effect = [
        sample_route_geometry[0],
        sample_route_geometry[5],
        sample_route_geometry[-1],
    ]
    mock_geocoding.reverse_geocode.return_value = ""

    mock_routing = MagicMock(spec=RoutingService)
    mock_routing.get_route.return_value = _make_route_result(
        400.0, 100.0, sample_route_geometry
    )

    mock_facility = MagicMock(spec=FacilityService)
    mock_facility.find_best_facility_in_segment.return_value = None

    planner = TripPlannerService(
        geocoding_service=mock_geocoding,
        routing_service=mock_routing,
        facility_service=mock_facility,
        hos_calculator=HOSCalculatorService(),
        summary_service=SummaryService(),
    )

    request = TripRequest(
        current_location="A", pickup_location="B", dropoff_location="C",
        cycle_used_hrs=0.0,
    )
    plan = planner.plan(request)
    assert isinstance(plan, TripPlan)
    all_events = [e for day in plan.days for e in day.events]
    assert any(e.type == EventType.DROPOFF for e in all_events)
