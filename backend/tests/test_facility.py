"""Unit tests for FacilityService."""
from trip.domain.models import Coordinate
from trip.services.facility import FacilityService
from trip.utils import cumulative_miles


def test_facility_projected_onto_route(sample_route_geometry):
    """A facility sitting right on the route should project with near-zero perp distance."""
    service = FacilityService(corridor_miles=5.0)

    geometry = sample_route_geometry
    cum = cumulative_miles(geometry)

    # Place the facility exactly on the midpoint of segment 0→1
    a = geometry[0]
    b = geometry[1]
    mid_lat = (a.lat + b.lat) / 2
    mid_lng = (a.lng + b.lng) / 2

    result = service._project_onto_route(mid_lat, mid_lng, geometry, cum)
    assert result is not None
    miles_from_start, perp_dist = result
    assert perp_dist < 0.5, "Facility on route should have near-zero perpendicular distance"
    assert miles_from_start >= 0.0


def test_facility_too_far_from_route_excluded(sample_route_geometry):
    """Facilities further than corridor_miles from the route should have a large perp distance."""
    service = FacilityService(corridor_miles=5.0)

    geometry = sample_route_geometry
    cum = cumulative_miles(geometry)

    # A facility 100 miles off-route
    result = service._project_onto_route(
        50.0, -120.0,  # far from the sample geometry (~35N, ~97W)
        geometry,
        cum,
    )
    assert result is not None
    _, perp_dist = result
    assert perp_dist > 5.0, "Off-route facility should have large perpendicular distance"
