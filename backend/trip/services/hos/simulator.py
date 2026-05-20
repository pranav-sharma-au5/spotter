"""Forward HOS simulation — places stops at natural deadline miles."""
from __future__ import annotations

import logging

from trip.domain.enums import ConstraintType, EventType
from trip.domain.models import Coordinate, ScheduledStop
from trip.domain.exceptions import InsufficientCycleHoursError
from trip.services.hos.config import HOSConfig
from trip.core.utils import coord_at_mile

_log = logging.getLogger(__name__)

_BREAK_FUEL_COMBINE_MILES = 100.0
_MAX_ITERATIONS = 500


def simulate(
    config: HOSConfig,
    total_miles: float,
    pickup_miles: float,
    initial_cycle_hrs: float,
    geometry: list[Coordinate],
    cumulative_miles: list[float],
) -> list[ScheduledStop]:
    events: list[ScheduledStop] = []

    pos = 0.0
    drive_hrs_since_break = 0.0
    miles_since_fuel = 0.0
    drive_hrs_today = 0.0
    duty_hrs_today = 0.0
    cycle_hrs = initial_cycle_hrs
    pickup_done = False

    counter = 0
    prev_mile = 0.0

    def next_id() -> str:
        nonlocal counter
        counter += 1
        return f"stop_{counter}"

    def emit(
        event_type: EventType,
        label: str,
        stop_mile: float,
        duration_hrs: float,
        satisfies: list[ConstraintType],
    ) -> None:
        nonlocal pos, drive_hrs_since_break, miles_since_fuel
        nonlocal drive_hrs_today, duty_hrs_today, cycle_hrs, prev_mile

        stop_mile = max(pos, stop_mile)
        drive_dist = stop_mile - pos
        if drive_dist > 0:
            drive_hrs = drive_dist / config.avg_speed_mph
            drive_hrs_since_break += drive_hrs
            miles_since_fuel += drive_dist
            drive_hrs_today += drive_hrs
            duty_hrs_today += drive_hrs
            cycle_hrs += drive_hrs
            pos = stop_mile

        lat, lng = coord_at_mile(geometry, cumulative_miles, stop_mile)
        start_hr = duty_hrs_today

        events.append(
            ScheduledStop(
                id=next_id(),
                type=event_type,
                label=label,
                location=f"Mile {stop_mile:.0f}",
                lat=lat,
                lng=lng,
                miles_from_start=stop_mile,
                start_hour=round(start_hr, 3),
                duration_hrs=duration_hrs,
                miles_from_prev=round(stop_mile - prev_mile, 2),
                satisfies=satisfies,
            )
        )
        prev_mile = stop_mile

        is_rest_type = event_type in (EventType.REST, EventType.RESTART)
        if not is_rest_type:
            duty_hrs_today += duration_hrs
            cycle_hrs += duration_hrs

        if is_rest_type:
            drive_hrs_since_break = 0.0
            if event_type == EventType.RESTART:
                miles_since_fuel = 0.0
            drive_hrs_today = 0.0
            duty_hrs_today = 0.0
            if event_type == EventType.RESTART:
                cycle_hrs = 0.0
        else:
            if ConstraintType.BREAK in satisfies or event_type == EventType.BREAK:
                drive_hrs_since_break = 0.0
            if ConstraintType.FUEL in satisfies or event_type == EventType.FUEL:
                miles_since_fuel = 0.0

    iterations = 0

    while pos < total_miles:
        iterations += 1
        if iterations > _MAX_ITERATIONS:
            _log.error(
                "HOS simulation exceeded %d iterations at mile %.1f / %.1f",
                _MAX_ITERATIONS, pos, total_miles,
            )
            raise InsufficientCycleHoursError(
                "Trip simulation could not complete within iteration limits. "
                "Check for degenerate input (zero-distance segments, extreme cycle hours)."
            )

        break_deadline = pos + max(
            0.0, (config.drive_hrs_before_break - drive_hrs_since_break)
        ) * config.avg_speed_mph

        fuel_deadline = pos + max(0.0, config.max_miles_before_fuel - miles_since_fuel)

        drive_limit_miles = max(0.0, (config.max_drive_hrs - drive_hrs_today)) * config.avg_speed_mph
        duty_limit_miles = max(0.0, (config.max_duty_window_hrs - duty_hrs_today)) * config.avg_speed_mph
        rest_deadline = pos + min(drive_limit_miles, duty_limit_miles)

        cycle_remaining_hrs = config.max_cycle_hrs - cycle_hrs
        if cycle_remaining_hrs <= 0.01:
            raise InsufficientCycleHoursError(
                "Cycle hours exhausted mid-trip. A 34-hour restart is required."
            )
        cycle_deadline = pos + cycle_remaining_hrs * config.avg_speed_mph

        next_fixed = pickup_miles if not pickup_done and pickup_miles > pos else total_miles
        mandatory = min(break_deadline, fuel_deadline, rest_deadline, cycle_deadline)

        if next_fixed <= mandatory + 0.01:
            if not pickup_done and abs(next_fixed - pickup_miles) < 0.01:
                emit(EventType.PICKUP, "Pickup", pickup_miles, config.stop_duration_hrs, [])
                pickup_done = True
            else:
                emit(EventType.DROPOFF, "Dropoff", total_miles, config.stop_duration_hrs, [])
                break
            continue

        if cycle_deadline <= mandatory + 0.01:
            emit(EventType.RESTART, "34-Hour Restart", cycle_deadline,
                 config.restart_hrs, [ConstraintType.CYCLE_LIMIT])
            continue

        if rest_deadline <= mandatory + 0.01:
            emit(EventType.REST, "Overnight Rest", rest_deadline,
                 config.required_rest_hrs, [ConstraintType.REST])
            continue

        break_due = break_deadline <= mandatory + 0.01
        fuel_due = fuel_deadline <= mandatory + 0.01
        break_soon_after_fuel = (
            fuel_due
            and not break_due
            and (break_deadline - fuel_deadline) <= _BREAK_FUEL_COMBINE_MILES + 0.01
        )

        if break_due and fuel_due:
            emit(EventType.FUEL, "Break + Fuel Stop",
                 min(break_deadline, fuel_deadline),
                 config.required_break_hrs,
                 [ConstraintType.BREAK, ConstraintType.FUEL])
            continue

        if break_due:
            emit(EventType.BREAK, "Mandatory Break", break_deadline,
                 config.required_break_hrs, [ConstraintType.BREAK])
            continue

        if fuel_due:
            if break_soon_after_fuel:
                emit(EventType.FUEL, "Break + Fuel Stop",
                     fuel_deadline,
                     config.required_break_hrs,
                     [ConstraintType.BREAK, ConstraintType.FUEL])
            else:
                emit(EventType.FUEL, "Fuel Stop", fuel_deadline,
                     config.fuel_stop_duration_hrs, [ConstraintType.FUEL])
            continue

        if not pickup_done and pickup_miles > pos:
            emit(EventType.PICKUP, "Pickup", pickup_miles, config.stop_duration_hrs, [])
            pickup_done = True
        else:
            emit(EventType.DROPOFF, "Dropoff", total_miles, config.stop_duration_hrs, [])
            break

    return events
