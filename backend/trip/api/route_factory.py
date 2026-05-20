"""Build RoutePlanResult for schedule/enrich steps that do not re-geocode."""
from __future__ import annotations

from trip.domain.models import Coordinate, RouteCoordinates, RoutePlanResult


def _endpoint_coords(geometry: list[Coordinate]) -> RouteCoordinates:
    origin = geometry[0] if geometry else Coordinate(lat=0.0, lng=0.0)
    return RouteCoordinates(current=origin, pickup=origin, dropoff=origin)


def route_plan_from_schedule(
    route_geometry: list[Coordinate],
    total_distance_miles: float,
    pickup_distance_miles: float,
) -> RoutePlanResult:
    return RoutePlanResult(
        route_geometry=route_geometry,
        total_distance_miles=total_distance_miles,
        pickup_distance_miles=pickup_distance_miles,
        coordinates=_endpoint_coords(route_geometry),
    )


def route_plan_from_enrich(
    route_geometry: list[Coordinate],
    total_distance_miles: float,
) -> RoutePlanResult:
    return RoutePlanResult(
        route_geometry=route_geometry,
        total_distance_miles=total_distance_miles,
        pickup_distance_miles=0.0,
        coordinates=_endpoint_coords(route_geometry),
    )
