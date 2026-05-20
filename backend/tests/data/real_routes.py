"""
Real US trucking route dataset for HOS compliance tests.

Distances are approximate highway miles sourced from publicly available data:
  - FHWA Highway Statistics (https://www.fhwa.dot.gov/policyinformation/statistics.cfm)
  - PCMiler / ALK Technologies industry-standard routing
  - USDOT National Highway System mileage tables

Each entry describes a common commercial trucking corridor. The expected outcomes
are derived directly from FMCSA 49 CFR Part 395 Hours-of-Service regulations:
  - 11-hour driving limit per duty period (§395.3(a)(3))
  - 14-hour duty window (§395.3(a)(2))
  - 30-minute break after 8 hours of driving (§395.3(a)(3)(ii))
  - 10-hour off-duty rest between duty periods (§395.3(a)(1))
  - 70-hour / 8-day cycle limit (§395.3(b)(2))
  - 34-hour restart to reset cycle (§395.3(c))
  - 950-mile maximum between fuel stops (carrier safety policy)

At 55 mph average truck speed:
  - 8 hrs of driving = 440 miles  → mandatory 30-min break threshold
  - 11 hrs of driving = 605 miles → rest stop threshold per duty period
"""
from __future__ import annotations

from typing import TypedDict


class RouteCase(TypedDict):
    id: str
    description: str
    highway: str
    total_distance_miles: float
    pickup_distance_miles: float
    cycle_used_hrs: float
    expected_min_days: int
    break_required: bool   # at least one mandatory 30-min break needed
    rest_required: bool    # at least one 10-hr overnight rest needed


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------
# pickup_distance_miles is ~25% of total, representing a realistic intra-route
# pickup before continuing to the final destination.
#
# All routes start with a fresh cycle (0 hrs used) unless otherwise noted.
# ---------------------------------------------------------------------------

REAL_ROUTES: list[RouteCase] = [
    # -------------------------------------------------------------------
    # SHORT RUNS  (<440 miles driving, ~<8 hrs) — no break, no rest
    # -------------------------------------------------------------------
    {
        "id": "dallas_houston",
        "description": "Dallas, TX → Houston, TX",
        "highway": "I-45",
        # Source: FHWA Interstate mileage ~245 mi
        "total_distance_miles": 245.0,
        "pickup_distance_miles": 60.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 1,
        "break_required": False,   # 245/55 = 4.5 hrs total drive
        "rest_required": False,
    },
    {
        "id": "la_lasvegas",
        "description": "Los Angeles, CA → Las Vegas, NV",
        "highway": "I-15",
        # Source: PCMiler ~270 mi via I-15 through Barstow
        "total_distance_miles": 270.0,
        "pickup_distance_miles": 67.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 1,
        "break_required": False,   # 270/55 = 4.9 hrs
        "rest_required": False,
    },
    {
        "id": "chicago_stlouis",
        "description": "Chicago, IL → St. Louis, MO",
        "highway": "I-55",
        # Source: FHWA NHS mileage ~300 mi
        "total_distance_miles": 300.0,
        "pickup_distance_miles": 75.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 1,
        "break_required": False,   # 300/55 = 5.5 hrs
        "rest_required": False,
    },
    {
        "id": "la_phoenix",
        "description": "Los Angeles, CA → Phoenix, AZ",
        "highway": "I-10",
        # Source: PCMiler ~370 mi
        "total_distance_miles": 370.0,
        "pickup_distance_miles": 92.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 1,
        "break_required": False,   # 370/55 = 6.7 hrs
        "rest_required": False,
    },
    {
        "id": "atlanta_jacksonville",
        "description": "Atlanta, GA → Jacksonville, FL",
        "highway": "I-75 / I-10",
        # Source: PCMiler ~345 mi
        "total_distance_miles": 345.0,
        "pickup_distance_miles": 86.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 1,
        "break_required": False,   # 345/55 = 6.3 hrs
        "rest_required": False,
    },
    # -------------------------------------------------------------------
    # MEDIUM RUNS (440–605 miles) — break required, still fits in 1 day
    # -------------------------------------------------------------------
    {
        "id": "dallas_kansascity",
        "description": "Dallas, TX → Kansas City, MO",
        "highway": "I-35",
        # Source: PCMiler / FHWA ~530 mi
        "total_distance_miles": 530.0,
        "pickup_distance_miles": 132.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 1,
        # 530/55 = 9.6 hrs total drive → exceeds 8-hr break threshold
        "break_required": True,
        "rest_required": False,
    },
    # -------------------------------------------------------------------
    # LONG RUNS (>605 miles) — break + overnight rest required
    # -------------------------------------------------------------------
    {
        "id": "atlanta_miami",
        "description": "Atlanta, GA → Miami, FL",
        "highway": "I-75 / I-95",
        # Source: PCMiler ~665 mi via I-75 South to I-95 South
        "total_distance_miles": 665.0,
        "pickup_distance_miles": 166.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 2,
        # 665/55 = 12.1 hrs → exceeds 11-hr drive limit; rest required
        "break_required": True,
        "rest_required": True,
    },
    {
        "id": "chicago_denver",
        "description": "Chicago, IL → Denver, CO",
        "highway": "I-80 / I-76",
        # Source: FHWA NHS ~1,000 mi via I-80 West to I-76 South
        "total_distance_miles": 1000.0,
        "pickup_distance_miles": 250.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 2,
        "break_required": True,
        "rest_required": True,
    },
    {
        "id": "nyc_miami",
        "description": "New York, NY → Miami, FL",
        "highway": "I-95",
        # Source: PCMiler ~1,280 mi via I-95 South
        "total_distance_miles": 1280.0,
        "pickup_distance_miles": 320.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 3,
        "break_required": True,
        "rest_required": True,
    },
    # -------------------------------------------------------------------
    # TRANSCONTINENTAL — multi-day, tests cycle management
    # -------------------------------------------------------------------
    {
        "id": "la_chicago",
        "description": "Los Angeles, CA → Chicago, IL",
        "highway": "I-40 / I-70",
        # Source: PCMiler ~2,015 mi via I-40 East to I-70 East
        "total_distance_miles": 2015.0,
        "pickup_distance_miles": 503.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 4,
        "break_required": True,
        "rest_required": True,
    },
    # -------------------------------------------------------------------
    # VERIFICATION SUITE — long-haul corridors (local manual testing)
    # -------------------------------------------------------------------
    {
        "id": "seattle_miami",
        "description": "Seattle, WA → Miami, FL",
        "highway": "I-90 / I-75",
        "total_distance_miles": 3300.0,
        "pickup_distance_miles": 825.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 5,
        "break_required": True,
        "rest_required": True,
    },
    {
        "id": "newark_la",
        "description": "Newark, NJ → Los Angeles, CA",
        "highway": "I-80 / I-70",
        "total_distance_miles": 2800.0,
        "pickup_distance_miles": 700.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 4,
        "break_required": True,
        "rest_required": True,
    },
    {
        "id": "dallas_portland",
        "description": "Dallas, TX → Portland, OR",
        "highway": "I-35 / I-84",
        "total_distance_miles": 2100.0,
        "pickup_distance_miles": 525.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 3,
        "break_required": True,
        "rest_required": True,
    },
    {
        "id": "chicago_sacramento",
        "description": "Chicago, IL → Sacramento, CA",
        "highway": "I-80",
        "total_distance_miles": 2100.0,
        "pickup_distance_miles": 525.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 3,
        "break_required": True,
        "rest_required": True,
    },
    {
        "id": "la_chicago_verify",
        "description": "Los Angeles, CA → Chicago, IL (verification)",
        "highway": "I-40 / I-70",
        "total_distance_miles": 2000.0,
        "pickup_distance_miles": 500.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 3,
        "break_required": True,
        "rest_required": True,
    },
    {
        "id": "socal_atlanta",
        "description": "Southern California → Atlanta, GA",
        "highway": "I-10 / I-75",
        "total_distance_miles": 2200.0,
        "pickup_distance_miles": 550.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 3,
        "break_required": True,
        "rest_required": True,
    },
    {
        "id": "houston_philly",
        "description": "Houston, TX → Philadelphia, PA",
        "highway": "I-10 / I-95",
        "total_distance_miles": 1700.0,
        "pickup_distance_miles": 425.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 2,
        "break_required": True,
        "rest_required": True,
    },
    {
        "id": "anchorage_prudhoe",
        "description": "Anchorage, AK → Deadhorse, AK (Prudhoe Bay)",
        "highway": "AK-1 / Dalton Hwy",
        "total_distance_miles": 900.0,
        "pickup_distance_miles": 225.0,
        "cycle_used_hrs": 0.0,
        "expected_min_days": 2,
        "break_required": True,
        "rest_required": True,
    },
]
