"""Fuel stop spacing for long-haul routes."""
from trip.domain.enums import ConstraintType, EventType
from trip.domain.models import Coordinate
from trip.services.hos_calculator import HOSCalculatorService


def _fuel_miles(events: list) -> list[float]:
    return [
        e.miles_from_start
        for e in events
        if e.type == EventType.FUEL or ConstraintType.FUEL in e.satisfies
    ]


def test_seattle_miami_inserts_fuel_every_950_miles():
    """~3,373 mi corridor needs multiple explicit fuel stops, not one at mile 1750."""
    total = 3373.0
    pickup = 38.0
    step = total / 49
    geometry = [Coordinate(lat=35.0 + i * 0.05, lng=-97.0 - i * 0.10) for i in range(50)]
    cumulative = [round(i * step, 6) for i in range(50)]

    days = HOSCalculatorService().calculate(
        total, pickup, 0.0, geometry, cumulative,
    )
    all_events = [e for d in days for e in d.events]
    fuel_miles = _fuel_miles(all_events)

    assert len(fuel_miles) >= 3, f"expected ≥3 fuel stops, got {fuel_miles}"
    for i in range(1, len(fuel_miles)):
        gap = fuel_miles[i] - fuel_miles[i - 1]
        assert gap <= 950.5, f"fuel gap {gap:.0f} mi exceeds 950 between stops {fuel_miles}"

    miles_since_fuel = 0.0
    for event in all_events:
        if event.type == EventType.DRIVE:
            miles_since_fuel += event.miles_from_prev
            assert miles_since_fuel <= 950.5
        elif event.type == EventType.FUEL or ConstraintType.FUEL in event.satisfies:
            miles_since_fuel = 0.0
