"""Shared geographic utility functions."""
from __future__ import annotations

import math

from trip.domain.models import Coordinate

_EARTH_RADIUS_MILES = 3_958.8


def haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return the great-circle distance in miles between two coordinates."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return _EARTH_RADIUS_MILES * c


def nearest_point_on_segment(
    px: float, py: float,
    ax: float, ay: float,
    bx: float, by: float,
) -> tuple[float, float, float]:
    """
    Return (nearest_x, nearest_y, t) where t in [0,1] is the parameter along AB.
    Uses a flat-earth approximation (fine for short segments).
    """
    dx = bx - ax
    dy = by - ay
    seg_len_sq = dx * dx + dy * dy

    if seg_len_sq == 0.0:
        return ax, ay, 0.0

    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / seg_len_sq))
    return ax + t * dx, ay + t * dy, t


def coord_at_mile(
    geometry: list[Coordinate],
    cumulative_miles: list[float],
    target: float,
) -> tuple[float, float]:
    """Linearly interpolate (lat, lng) at *target* miles along the route."""
    if not geometry:
        return 0.0, 0.0
    if target <= 0:
        return geometry[0].lat, geometry[0].lng
    for i in range(len(cumulative_miles) - 1):
        if cumulative_miles[i] <= target <= cumulative_miles[i + 1]:
            seg = cumulative_miles[i + 1] - cumulative_miles[i]
            t = (target - cumulative_miles[i]) / seg if seg else 0.0
            lat = geometry[i].lat + t * (geometry[i + 1].lat - geometry[i].lat)
            lng = geometry[i].lng + t * (geometry[i + 1].lng - geometry[i].lng)
            return lat, lng
    return geometry[-1].lat, geometry[-1].lng


def cumulative_miles(geometry: list[Coordinate]) -> list[float]:
    """Return a list of cumulative great-circle distances (in miles) along the route."""
    miles = [0.0]
    for i in range(1, len(geometry)):
        p, c = geometry[i - 1], geometry[i]
        miles.append(miles[-1] + haversine_miles(p.lat, p.lng, c.lat, c.lng))
    return miles
