"""Project facility coordinates onto route geometry."""
from __future__ import annotations

from trip.domain.models import Coordinate
from trip.core.utils import cumulative_miles, haversine_miles, nearest_point_on_segment


def feature_point(feat: dict) -> tuple[float, float] | None:
    geometry = feat.get("geometry") or {}
    coords = geometry.get("coordinates")
    if not isinstance(coords, (list, tuple)) or len(coords) < 2:
        return None
    lng, lat = float(coords[0]), float(coords[1])
    return lat, lng


def project_onto_route(
    fac_lat: float,
    fac_lng: float,
    geometry: list[Coordinate],
    cum: list[float],
) -> tuple[float, float] | None:
    if len(geometry) < 2:
        return None

    best_dist = float("inf")
    best_miles_from_start = 0.0

    for i in range(len(geometry) - 1):
        a, b = geometry[i], geometry[i + 1]
        nx, ny, t = nearest_point_on_segment(
            fac_lng, fac_lat, a.lng, a.lat, b.lng, b.lat,
        )
        perp_dist = haversine_miles(fac_lat, fac_lng, ny, nx)
        if perp_dist < best_dist:
            best_dist = perp_dist
            seg_len = cum[i + 1] - cum[i]
            best_miles_from_start = cum[i] + t * seg_len

    return best_miles_from_start, best_dist


def cumulative_for_segment(geometry: list[Coordinate]) -> list[float]:
    return cumulative_miles(geometry)
