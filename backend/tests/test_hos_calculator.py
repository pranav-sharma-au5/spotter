"""Unit tests for HOSCalculatorService."""
import pytest

from trip.domain.enums import ConstraintType, EventType
from trip.domain.exceptions import InsufficientCycleHoursError
from trip.services.hos_calculator import HOSCalculatorService


def test_single_day_short_trip(calculator, make_geometry):
    """Trip < 500 miles should complete in 1 day with no overnight rest."""
    geo, cum = make_geometry(400.0)
    days = calculator.calculate(
        total_distance_miles=400.0,
        pickup_distance_miles=50.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    assert len(days) == 1, "Short trip should fit in a single duty day"

    event_types = [e.type for e in days[0].events]
    assert EventType.PICKUP in event_types
    assert EventType.DROPOFF in event_types

    rest_events = [e for e in days[0].events if e.type == EventType.REST]
    assert len(rest_events) == 0, "No overnight rest needed for a short trip"

    # 400 miles / 55 mph = ~7.27 drive hrs → under 8, so no mandatory break
    assert days[0].total_driving_hrs <= 11.0
    assert days[0].total_on_duty_hrs <= 14.0


def test_multi_day_trip(calculator, make_geometry):
    """Trip > 800 miles should require at least one overnight rest."""
    geo, cum = make_geometry(900.0)
    days = calculator.calculate(
        total_distance_miles=900.0,
        pickup_distance_miles=100.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    assert len(days) >= 2, "Long trip should span multiple duty days"

    rest_events = [
        e
        for day in days
        for e in day.events
        if e.type == EventType.REST
    ]
    assert len(rest_events) >= 1, "Must have at least one overnight rest"
    assert all(e.duration_hrs == 10.0 for e in rest_events), "Rest must be exactly 10 hrs"


def test_break_trigger_at_8hrs(calculator, make_geometry):
    """Driving 8 hrs (440 miles at 55 mph) must insert a mandatory break."""
    geo, cum = make_geometry(600.0)
    days = calculator.calculate(
        total_distance_miles=600.0,
        pickup_distance_miles=50.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    all_events = [e for day in days for e in day.events]
    break_events = [e for e in all_events if e.type == EventType.BREAK]
    assert len(break_events) >= 1, "A break must be inserted before 8 drive hours"
    assert all(e.duration_hrs == 0.5 for e in break_events), "Break must be 0.5 hrs"


def test_break_combined_with_fuel_stop(make_geometry):
    """When break and fuel windows coincide, a single stop should satisfy both.

    Configure the fuel interval to equal the break interval (440 miles = 8 hr × 55 mph)
    so both deadlines fall at the same mileage, exercising the combined-stop code path.
    """
    calc = HOSCalculatorService(max_miles_before_fuel=440.0)
    # tiny pickup so the first drive segment is almost zero before the shared deadline
    geo, cum = make_geometry(900.0)
    days = calc.calculate(
        total_distance_miles=900.0,
        pickup_distance_miles=1.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    all_events = [e for day in days for e in day.events]
    combined = [
        e for e in all_events
        if ConstraintType.BREAK in e.satisfies and ConstraintType.FUEL in e.satisfies
    ]
    assert len(combined) >= 1, (
        "With fuel interval == break interval, at least one combined Break+Fuel stop must fire"
    )
    assert all(e.duration_hrs == 0.5 for e in combined), (
        "Combined stop duration must equal the break duration (0.5 hrs)"
    )


def test_no_micro_break_immediately_after_fuel(calculator, make_geometry):
    """After a long drive leg to fuel, a separate break must not follow within 100 mi."""
    geo, cum = make_geometry(3_300.0)
    days = calculator.calculate(
        total_distance_miles=3_300.0,
        pickup_distance_miles=825.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    all_events = [e for day in days for e in day.events]
    for i, event in enumerate(all_events):
        if event.type != EventType.FUEL or i + 1 >= len(all_events):
            continue
        nxt = all_events[i + 1]
        if nxt.type == EventType.BREAK and nxt.miles_from_prev < 100:
            pytest.fail(
                f"Break only {nxt.miles_from_prev:.0f} mi after fuel — "
                "should be combined Break + Fuel"
            )


def test_overnight_rest_does_not_waive_fuel_requirement(calculator, make_geometry):
    """Rest is not a fuel stop — long trips still need explicit fuel every ≤950 mi."""
    from trip.domain.enums import ConstraintType

    geo, cum = make_geometry(3_300.0)
    days = calculator.calculate(
        total_distance_miles=3_300.0,
        pickup_distance_miles=825.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )
    all_events = [e for day in days for e in day.events]
    fuel_stops = [
        e for e in all_events
        if e.type == EventType.FUEL or ConstraintType.FUEL in e.satisfies
    ]
    assert len(fuel_stops) >= 3

    miles_since_fuel = 0.0
    for event in all_events:
        if event.type == EventType.DRIVE:
            miles_since_fuel += event.miles_from_prev
            assert miles_since_fuel <= 950.5
        elif event.type == EventType.FUEL or ConstraintType.FUEL in event.satisfies:
            miles_since_fuel = 0.0


def test_cycle_hours_limit_requires_restart(calculator, make_geometry):
    """A driver with 65 cycle hours on a long trip should get a 34-hr restart."""
    geo, cum = make_geometry(900.0)
    days = calculator.calculate(
        total_distance_miles=900.0,
        pickup_distance_miles=100.0,
        cycle_used_hrs=65.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    all_events = [e for day in days for e in day.events]
    restart_events = [e for e in all_events if e.type == EventType.RESTART]
    assert len(restart_events) >= 1, "Restart required when cycle hours are nearly exhausted"
    assert all(e.duration_hrs == 34.0 for e in restart_events)


def test_no_facilities_geometry_only(make_geometry):
    """With only route geometry (no facility enrichment), the plan should still complete."""
    geo, cum = make_geometry(600.0)
    calc = HOSCalculatorService()
    days = calc.calculate(
        total_distance_miles=600.0,
        pickup_distance_miles=100.0,
        cycle_used_hrs=0.0,
        geometry=geo,
        cumulative_miles=cum,
    )

    assert len(days) >= 1
    all_events = [e for day in days for e in day.events]
    assert any(e.type == EventType.DROPOFF for e in all_events), "Trip must still complete"


def test_insufficient_hours_no_restart_possible(make_geometry):
    """A driver with 70 cycle hrs used should raise InsufficientCycleHoursError immediately."""
    geo, cum = make_geometry(1_100.0)
    calc = HOSCalculatorService(max_cycle_hrs=70.0)

    with pytest.raises(InsufficientCycleHoursError):
        calc.calculate(
            total_distance_miles=1_100.0,
            pickup_distance_miles=100.0,
            cycle_used_hrs=70.0,
            geometry=geo,
            cumulative_miles=cum,
        )
