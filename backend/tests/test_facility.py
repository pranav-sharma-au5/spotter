"""Unit tests for FacilityService."""
import pytest

from trip.domain.models import Coordinate
from trip.exceptions import FacilityDataError
from trip.services.facility import FacilityService


def test_bounding_box_calculation():
    """Bounding box should expand by corridor buffer on all sides."""
    service = FacilityService(corridor_miles=5.0)

    geometry = [
        Coordinate(lat=35.0, lng=-97.0),
        Coordinate(lat=36.0, lng=-98.0),
    ]
    south, west, north, east = service._bounding_box(geometry)

    buf = 5.0 * 0.0145  # ~0.0725 degrees
    assert south < 35.0
    assert north > 36.0
    assert west < -98.0
    assert east > -97.0
    assert abs(south - (35.0 - buf)) < 1e-6
    assert abs(north - (36.0 + buf)) < 1e-6


def test_facility_projected_onto_route(sample_route_geometry):
    """A facility sitting right on the route should project with near-zero perp distance."""
    service = FacilityService(corridor_miles=5.0)

    geometry = sample_route_geometry
    cumulative = service._cumulative_miles(geometry)

    # Place the facility exactly on the midpoint of segment 0→1
    a = geometry[0]
    b = geometry[1]
    mid_lat = (a.lat + b.lat) / 2
    mid_lng = (a.lng + b.lng) / 2

    result = service._project_onto_route(mid_lat, mid_lng, geometry, cumulative)
    assert result is not None
    miles_from_start, perp_dist = result
    assert perp_dist < 0.5, "Facility on route should have near-zero perpendicular distance"
    assert miles_from_start >= 0.0


def test_facility_too_far_from_route_excluded(sample_route_geometry, sample_facilities):
    """Facilities further than corridor_miles from the route should be dropped."""
    service = FacilityService(corridor_miles=5.0)

    geometry = sample_route_geometry
    cumulative = service._cumulative_miles(geometry)

    # A facility 100 miles off-route
    result = service._project_onto_route(
        50.0, -120.0,  # far from the sample geometry (~35N, ~97W)
        geometry,
        cumulative,
    )
    assert result is not None
    _, perp_dist = result
    assert perp_dist > 5.0, "Off-route facility should have large perpendicular distance"


def test_overpass_failure_raises_facility_data_error(monkeypatch):
    """An HTTP error from Overpass should raise FacilityDataError."""
    import httpx

    def mock_post(*args, **kwargs):
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(httpx, "post", mock_post)

    service = FacilityService()
    geometry = [Coordinate(lat=35.0, lng=-97.0), Coordinate(lat=36.0, lng=-98.0)]

    with pytest.raises(FacilityDataError):
        service.get_facilities(geometry)
