"""Shared pytest fixtures for the HOS trip planner test suite."""
import pytest

from trip.domain.enums import FacilityType
from trip.domain.models import Coordinate, Facility
from trip.services.hos_calculator import HOSCalculatorService


@pytest.fixture
def calculator() -> HOSCalculatorService:
    """HOSCalculatorService with default FMCSA settings."""
    return HOSCalculatorService(
        max_drive_hrs=11.0,
        max_duty_window_hrs=14.0,
        drive_hrs_before_break=8.0,
        required_break_hrs=0.5,
        required_rest_hrs=10.0,
        max_cycle_hrs=70.0,
        restart_hrs=34.0,
        max_miles_before_fuel=950.0,
        avg_speed_mph=55.0,
        duty_start_time="08:00",
        stop_duration_hrs=1.0,
        fuel_stop_duration_hrs=0.5,
    )


@pytest.fixture
def make_geometry():
    """
    Factory fixture that builds (geometry, cumulative_miles) for any trip distance.

    The geometry is a straight north-bound line with *n_points* evenly-spaced
    Coordinate objects.  cumulative_miles is set explicitly so it spans exactly
    [0, total_miles], making every stop interpolation correct regardless of the
    haversine approximation.
    """
    def _make(
        total_miles: float,
        n_points: int = 20,
    ) -> tuple[list[Coordinate], list[float]]:
        step = total_miles / max(n_points - 1, 1)
        geometry = [
            Coordinate(lat=35.0 + i * 0.05, lng=-97.0 - i * 0.10)
            for i in range(n_points)
        ]
        cumulative = [round(i * step, 6) for i in range(n_points)]
        return geometry, cumulative

    return _make


@pytest.fixture
def sample_facilities() -> list[Facility]:
    """
    Mix of fuel stations, truck stops, and rest areas at realistic mile markers
    for a 1,000-mile route.  Covers the main break and fuel windows.
    """
    return [
        Facility(id="f1",  name="Flying J Fuel",        type=FacilityType.FUEL,       lat=35.5, lng=-97.5,  miles_from_start=120.0),
        Facility(id="f2",  name="Pilot Travel Center",  type=FacilityType.TRUCK_STOP,  lat=35.8, lng=-98.2,  miles_from_start=275.0),
        Facility(id="f3",  name="Rest Area I-40",       type=FacilityType.REST_AREA,   lat=36.0, lng=-99.0,  miles_from_start=340.0),
        Facility(id="f4",  name="Love's Travel Stop",   type=FacilityType.TRUCK_STOP,  lat=36.2, lng=-99.8,  miles_from_start=420.0),
        Facility(id="f5",  name="TA Truck Stop",        type=FacilityType.TRUCK_STOP,  lat=36.4, lng=-100.5, miles_from_start=490.0),
        Facility(id="f6",  name="Fuel & Go",            type=FacilityType.FUEL,        lat=36.6, lng=-101.0, miles_from_start=560.0),
        Facility(id="f7",  name="Petro Stopping Ctr",  type=FacilityType.TRUCK_STOP,  lat=36.8, lng=-101.8, miles_from_start=650.0),
        Facility(id="f8",  name="Rest Area US-60",      type=FacilityType.REST_AREA,   lat=37.0, lng=-102.5, miles_from_start=720.0),
        Facility(id="f9",  name="Pilot Fuel",           type=FacilityType.FUEL,        lat=37.2, lng=-103.2, miles_from_start=800.0),
        Facility(id="f10", name="Flying J Truck Stop",  type=FacilityType.TRUCK_STOP,  lat=37.5, lng=-104.0, miles_from_start=880.0),
        Facility(id="f11", name="Rest Area I-25",       type=FacilityType.REST_AREA,   lat=37.8, lng=-104.5, miles_from_start=950.0),
    ]


@pytest.fixture
def sample_route_geometry() -> list[Coordinate]:
    """Straight-line route geometry (10 evenly spaced points over ~1,000 miles)."""
    return [
        Coordinate(lat=35.0 + i * 0.3, lng=-97.0 - i * 0.75)
        for i in range(11)
    ]
