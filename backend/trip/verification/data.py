"""Preset verification corridors for local testing."""
from __future__ import annotations

from typing import TypedDict


class VerificationRouteDef(TypedDict):
    slug: str
    name: str
    current_location: str
    pickup_location: str
    dropoff_location: str
    expected_miles: float
    expected_min_days: int
    expected_max_days: int
    cycle_used_hrs: float
    sort_order: int
    notes: str


def _day_bounds(miles: float) -> tuple[int, int]:
    """Min/max duty days from ~605 mi effective driving per day (11 h × 55 mph)."""
    base = max(1, int(miles / 605.0))
    return base, base + 2


def _route(
    slug: str,
    name: str,
    current: str,
    pickup: str,
    dropoff: str,
    miles: float,
    sort_order: int,
    notes: str = "",
) -> VerificationRouteDef:
    min_days, max_days = _day_bounds(miles)
    return {
        "slug": slug,
        "name": name,
        "current_location": current,
        "pickup_location": pickup,
        "dropoff_location": dropoff,
        "expected_miles": miles,
        "expected_min_days": min_days,
        "expected_max_days": max_days,
        "cycle_used_hrs": 0.0,
        "sort_order": sort_order,
        "notes": notes,
    }


VERIFICATION_ROUTE_DEFS: list[VerificationRouteDef] = [
    _route(
        "seattle_miami",
        "Seattle → Miami",
        "Tacoma, WA",
        "Seattle, WA",
        "Miami, FL",
        3300.0,
        1,
        "Transcontinental I-90 / I-75 corridor",
    ),
    _route(
        "newark_la",
        "Newark → Los Angeles",
        "Jersey City, NJ",
        "Newark, NJ",
        "Los Angeles, CA",
        2800.0,
        2,
    ),
    _route(
        "dallas_portland",
        "Dallas → Portland",
        "Fort Worth, TX",
        "Dallas, TX",
        "Portland, OR",
        2100.0,
        3,
    ),
    _route(
        "chicago_sacramento",
        "Chicago → Sacramento",
        "Naperville, IL",
        "Chicago, IL",
        "Sacramento, CA",
        2100.0,
        4,
    ),
    _route(
        "la_chicago",
        "Los Angeles → Chicago",
        "Long Beach, CA",
        "Los Angeles, CA",
        "Chicago, IL",
        2000.0,
        5,
    ),
    _route(
        "socal_atlanta",
        "Southern California → Atlanta",
        "Riverside, CA",
        "Los Angeles, CA",
        "Atlanta, GA",
        2200.0,
        6,
        "SoCal origin via Riverside + LA pickup",
    ),
    _route(
        "houston_philly",
        "Houston → Philadelphia",
        "Sugar Land, TX",
        "Houston, TX",
        "Philadelphia, PA",
        1700.0,
        7,
    ),
    _route(
        "anchorage_prudhoe",
        "Anchorage → Deadhorse (Prudhoe Bay)",
        "Wasilla, AK",
        "Anchorage International Airport, AK",
        "Deadhorse, AK",
        900.0,
        8,
        "Dalton Hwy corridor; dropoff at Deadhorse (~908 mi via ORS)",
    ),
]
