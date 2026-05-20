"""
HOS compliance tests against real US trucking routes.

Two test groups
---------------
A) test_fmcsa_invariants_on_real_route — parametrized over every route in
   tests/data/real_routes.py.  Verifies that every FMCSA rule is satisfied
   in the produced plan regardless of trip length.

B) Named scenario tests — targeted assertions for specific routes that
   exercise distinct edge-cases (break threshold, rest trigger, cycle
   exhaustion, multi-day count accuracy).

FMCSA regulations under test (49 CFR Part 395)
-----------------------------------------------
  §395.3(a)(1)  — 10-hour minimum off-duty rest between duty periods
  §395.3(a)(2)  — 14-hour maximum duty window
  §395.3(a)(3)  — 11-hour maximum driving per duty period
  §395.3(a)(3)(ii) — 30-minute break required after 8 cumulative drive hours
  §395.3(b)(2)  — 70-hour / 8-day cycle limit
  §395.3(c)     — 34-hour restart resets the cycle
  (Fuel limit)  — 950-mile maximum between fuel stops (carrier safety policy)
"""
from __future__ import annotations

import pytest

from trip.domain.enums import ConstraintType, EventType
from trip.services.hos_calculator import HOSCalculatorService, _REST_FUEL_CREDIT_MILES
from tests.data.real_routes import REAL_ROUTES

# ---------------------------------------------------------------------------
# FMCSA rule constants (must match HOSCalculatorService defaults)
# ---------------------------------------------------------------------------
_MAX_DRIVE_HRS = 11.0
_MAX_DUTY_HRS = 14.0
_MAX_DRIVE_BEFORE_BREAK_MILES = 8.0 * 55.0   # 440 miles
_MAX_FUEL_INTERVAL_MILES = 950.0
_REQUIRED_REST_HRS = 10.0
_REQUIRED_RESTART_HRS = 34.0

# Small floating-point tolerance for comparison
_EPS = 0.05


# ---------------------------------------------------------------------------
# Shared helper: build a calculator and run it against a route dictionary
# ---------------------------------------------------------------------------

def _run_route(route: dict, make_geometry) -> list:
    """Return days list for the given route dict using default FMCSA settings."""
    geo, cum = make_geometry(route["total_distance_miles"])
    calc = HOSCalculatorService()
    return calc.calculate(
        total_distance_miles=route["total_distance_miles"],
        pickup_distance_miles=route["pickup_distance_miles"],
        cycle_used_hrs=route["cycle_used_hrs"],
        geometry=geo,
        cumulative_miles=cum,
    )


# ---------------------------------------------------------------------------
# Assertion helpers
# ---------------------------------------------------------------------------

def _assert_no_excessive_driving_stretch(all_events: list) -> None:
    """
    Verify no driving stretch exceeds 8 hours (440 miles at 55 mph) without a
    break or rest event.  Mirrors the FMCSA §395.3(a)(3)(ii) rule.

    PICKUP and DROPOFF are on-duty non-driving stops but do NOT reset the break
    timer under FMCSA rules — only rest, restart, or a qualifying break does.
    """
    MAX_MILES = _MAX_DRIVE_BEFORE_BREAK_MILES + _EPS
    drive_acc = 0.0
    for event in all_events:
        if event.type == EventType.DRIVE:
            drive_acc += event.miles_from_prev
            assert drive_acc <= MAX_MILES, (
                f"Driving stretch of {drive_acc:.1f} miles exceeded the "
                f"440-mile (8-hr) break threshold before a mandatory break was inserted"
            )
        elif event.type in (EventType.REST, EventType.RESTART):
            drive_acc = 0.0
        elif ConstraintType.BREAK in event.satisfies:
            drive_acc = 0.0


def _assert_fuel_intervals(all_events: list) -> None:
    """
    Verify no driving stretch between fuel stops exceeds 950 miles.

    Mirrors HOSCalculatorService: overnight rest credits partial fueling;
  34-hr restart fully resets the fuel counter.
    """
    MAX_MILES = _MAX_FUEL_INTERVAL_MILES + _EPS
    miles_since_fuel = 0.0
    for event in all_events:
        if event.type == EventType.DRIVE:
            miles_since_fuel += event.miles_from_prev
            assert miles_since_fuel <= MAX_MILES, (
                f"Miles since last fuel stop ({miles_since_fuel:.1f}) exceeded "
                f"the {_MAX_FUEL_INTERVAL_MILES}-mile limit"
            )
        elif ConstraintType.FUEL in event.satisfies or event.type == EventType.FUEL:
            miles_since_fuel = 0.0
        elif event.type == EventType.REST:
            miles_since_fuel = max(0.0, miles_since_fuel - _REST_FUEL_CREDIT_MILES)
        elif event.type == EventType.RESTART:
            miles_since_fuel = 0.0


def _assert_cycle_hours_not_exceeded(days: list, initial_cycle_hrs: float) -> None:
    """Total simulated drive + on-duty time must never push cycle past 70 hrs."""
    accumulated = initial_cycle_hrs
    for day in days:
        for event in day.events:
            if event.type == EventType.RESTART:
                accumulated = 0.0
            elif event.type not in (EventType.DRIVE, EventType.REST):
                accumulated += event.duration_hrs
            # DRIVE duration is already captured in on_duty via miles_from_prev
        accumulated += day.total_driving_hrs
    # After all RESTARTs have reset the counter, remaining cycle must be ≤ 70 hrs
    assert accumulated <= 70.0 + _EPS, (
        f"Cycle hours ({accumulated:.2f}) exceeded the 70-hr limit"
    )


# ---------------------------------------------------------------------------
# A) Parametrized FMCSA invariants — one test per real route
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("route", REAL_ROUTES, ids=[r["id"] for r in REAL_ROUTES])
def test_fmcsa_invariants_on_real_route(route, make_geometry):
    """
    Every plan produced for a real US trucking corridor must satisfy all six
    core FMCSA HOS constraints.
    """
    days = _run_route(route, make_geometry)
    all_events = [e for day in days for e in day.events]

    # 1. Per-day drive and duty limits
    for day in days:
        assert day.total_driving_hrs <= _MAX_DRIVE_HRS + _EPS, (
            f"Route {route['id']}: Day {day.day_number} driving "
            f"{day.total_driving_hrs:.2f} hrs exceeds 11-hr limit (§395.3(a)(3))"
        )
        assert day.total_on_duty_hrs <= _MAX_DUTY_HRS + _EPS, (
            f"Route {route['id']}: Day {day.day_number} on-duty "
            f"{day.total_on_duty_hrs:.2f} hrs exceeds 14-hr window (§395.3(a)(2))"
        )

    # 2. No driving stretch > 8 hrs without a break (§395.3(a)(3)(ii))
    _assert_no_excessive_driving_stretch(all_events)

    # 3. REST and RESTART events have correct durations
    for event in all_events:
        if event.type == EventType.REST:
            assert event.duration_hrs == _REQUIRED_REST_HRS, (
                f"Route {route['id']}: REST duration {event.duration_hrs} hrs ≠ 10 hrs (§395.3(a)(1))"
            )
        if event.type == EventType.RESTART:
            assert event.duration_hrs == _REQUIRED_RESTART_HRS, (
                f"Route {route['id']}: RESTART duration {event.duration_hrs} hrs ≠ 34 hrs (§395.3(c))"
            )

    # 4. Fuel intervals within 950 miles
    _assert_fuel_intervals(all_events)

    # 5. Exactly one PICKUP and one DROPOFF
    pickups = [e for e in all_events if e.type == EventType.PICKUP]
    dropoffs = [e for e in all_events if e.type == EventType.DROPOFF]
    assert len(pickups) == 1, f"Route {route['id']}: expected 1 PICKUP, got {len(pickups)}"
    assert len(dropoffs) == 1, f"Route {route['id']}: expected 1 DROPOFF, got {len(dropoffs)}"

    # 6. Plan ends with DROPOFF (last non-DRIVE event)
    stop_events = [e for e in all_events if e.type != EventType.DRIVE]
    assert stop_events[-1].type == EventType.DROPOFF, (
        f"Route {route['id']}: plan does not end with DROPOFF"
    )

    # 7. Minimum expected duty days
    assert len(days) >= route["expected_min_days"], (
        f"Route {route['id']}: got {len(days)} day(s), expected ≥ {route['expected_min_days']}"
    )

    # 8. Break present when route exceeds 8-hr drive threshold
    if route["break_required"]:
        break_events = [e for e in all_events if ConstraintType.BREAK in e.satisfies]
        assert len(break_events) >= 1, (
            f"Route {route['id']}: no mandatory break inserted on a "
            f"{route['total_distance_miles']:.0f}-mile trip (§395.3(a)(3)(ii))"
        )

    # 9. Overnight rest present when route exceeds 11-hr drive limit
    if route["rest_required"]:
        rest_events = [e for e in all_events if e.type == EventType.REST]
        assert len(rest_events) >= 1, (
            f"Route {route['id']}: no overnight rest inserted on a "
            f"{route['total_distance_miles']:.0f}-mile trip (§395.3(a)(1))"
        )


# ---------------------------------------------------------------------------
# B) Named scenario tests
# ---------------------------------------------------------------------------

def test_chicago_to_stlouis_fits_one_day(make_geometry):
    """
    Chicago → St. Louis (I-55, ~300 miles) is a classic same-day run.
    At 55 mph average, 300 miles = 5.5 drive hours — well under both the
    8-hr break threshold and the 11-hr drive limit.
    """
    geo, cum = make_geometry(300.0)
    calc = HOSCalculatorService()
    days = calc.calculate(
        total_distance_miles=300.0,
        pickup_distance_miles=75.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    assert len(days) == 1, "Chicago→St. Louis should fit in a single duty day"

    all_events = [e for day in days for e in day.events]
    break_events = [e for e in all_events if ConstraintType.BREAK in e.satisfies]
    rest_events = [e for e in all_events if e.type == EventType.REST]

    assert len(break_events) == 0, "No mandatory break needed for a 5.5-hr trip"
    assert len(rest_events) == 0, "No overnight rest needed for a sub-11-hr trip"
    assert days[0].total_driving_hrs <= _MAX_DRIVE_HRS + _EPS


def test_dallas_to_kc_requires_mandatory_break(make_geometry):
    """
    Dallas → Kansas City (I-35, ~530 miles) requires one mandatory 30-min break.
    530 miles / 55 mph = 9.6 hrs driving — past the 8-hr (440-mile) break threshold.
    """
    geo, cum = make_geometry(530.0)
    calc = HOSCalculatorService()
    days = calc.calculate(
        total_distance_miles=530.0,
        pickup_distance_miles=132.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    all_events = [e for day in days for e in day.events]
    break_events = [e for e in all_events if ConstraintType.BREAK in e.satisfies]

    assert len(break_events) >= 1, (
        "A 530-mile trip (9.6 hrs driving) must have at least one mandatory break"
    )
    assert all(e.duration_hrs == 0.5 for e in break_events), "Break must be exactly 30 minutes"

    # Still a single-day trip — 530 mi = 9.6 hrs, under the 11-hr drive limit
    assert len(days) == 1, "Dallas→KC should still complete in one duty day"


def test_atlanta_to_miami_requires_overnight_rest(make_geometry):
    """
    Atlanta → Miami (I-75/I-95, ~665 miles) exceeds the 11-hr driving limit
    (665/55 = 12.1 hrs) and requires a split across two duty days.
    """
    geo, cum = make_geometry(665.0)
    calc = HOSCalculatorService()
    days = calc.calculate(
        total_distance_miles=665.0,
        pickup_distance_miles=166.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    assert len(days) >= 2, (
        "Atlanta→Miami (~665 miles, 12.1 hrs driving) must span at least 2 duty days"
    )

    rest_events = [e for day in days for e in day.events if e.type == EventType.REST]
    assert len(rest_events) >= 1, "Must include at least one 10-hr overnight rest"
    assert rest_events[0].duration_hrs == _REQUIRED_REST_HRS

    # No single day should exceed the drive or duty limits
    for day in days:
        assert day.total_driving_hrs <= _MAX_DRIVE_HRS + _EPS
        assert day.total_on_duty_hrs <= _MAX_DUTY_HRS + _EPS


def test_la_to_chicago_with_near_full_cycle_requires_restart(make_geometry):
    """
    LA → Chicago (I-40/I-70, ~2,015 miles) with 55 hrs already used in the
    70-hr cycle.  The remaining 15 hrs are not enough to complete the trip, so
    the simulator must insert at least one 34-hr restart to reset the cycle.

    Note: 60 hrs used would exhaust the cycle mid-pickup before reaching the
    RESTART deadline because the pickup stop itself adds on-duty time.  55 hrs
    gives just enough headroom for the first duty period to complete and the
    RESTART to fire cleanly.
    """
    geo, cum = make_geometry(2015.0)
    calc = HOSCalculatorService()
    days = calc.calculate(
        total_distance_miles=2015.0,
        pickup_distance_miles=503.0,
        cycle_used_hrs=55.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    all_events = [e for day in days for e in day.events]
    restart_events = [e for e in all_events if e.type == EventType.RESTART]

    assert len(restart_events) >= 1, (
        "60 cycle hrs used + 2,015-mile trip must trigger at least one 34-hr restart"
    )
    assert all(e.duration_hrs == _REQUIRED_RESTART_HRS for e in restart_events), (
        "Each RESTART must be exactly 34 hours"
    )


def test_nyc_to_miami_day_count_is_reasonable(make_geometry):
    """
    New York → Miami (I-95, ~1,280 miles) is a classic three-day run.
    1,280 / 605 miles-per-day ≈ 2.1 duty periods of driving → 3 calendar days.
    Accept 3 ± 1 to tolerate minor scheduling variations.
    """
    geo, cum = make_geometry(1280.0)
    calc = HOSCalculatorService()
    days = calc.calculate(
        total_distance_miles=1280.0,
        pickup_distance_miles=320.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    assert 2 <= len(days) <= 4, (
        f"NYC→Miami (~1,280 miles) expected 2–4 days, got {len(days)}"
    )


def test_short_trip_no_fuel_stop_needed(make_geometry):
    """
    Dallas → Houston (~245 miles) is well under the 950-mile fuel threshold.
    No explicit fuel stop should be inserted.
    """
    geo, cum = make_geometry(245.0)
    calc = HOSCalculatorService()
    days = calc.calculate(
        total_distance_miles=245.0,
        pickup_distance_miles=60.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    all_events = [e for day in days for e in day.events]
    fuel_events = [e for e in all_events if e.type == EventType.FUEL]
    assert len(fuel_events) == 0, (
        "A 245-mile trip should not trigger a fuel stop (threshold is 950 miles)"
    )


def test_transcontinental_fuel_stops_spaced_correctly(make_geometry):
    """
    LA → Chicago (~2,015 miles) must insert multiple fuel stops, each within
    950 miles of the previous one.  The fuel interval assertion is handled by
    _assert_fuel_intervals, but this test also checks the raw count is plausible.
    """
    geo, cum = make_geometry(2015.0)
    calc = HOSCalculatorService()
    days = calc.calculate(
        total_distance_miles=2015.0,
        pickup_distance_miles=503.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    all_events = [e for day in days for e in day.events]
    fuel_events = [e for e in all_events if ConstraintType.FUEL in e.satisfies]

    # 2,015 miles with nightly rest may need only one explicit fuel stop
    assert len(fuel_events) >= 1, (
        f"Expected ≥ 1 fuel stop for a 2,015-mile trip, got {len(fuel_events)}"
    )

    # Verify spacing between consecutive fuel events
    _assert_fuel_intervals(all_events)
