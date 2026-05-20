"""HOS Calculator Service — pure business logic, no Django, no external calls."""
from __future__ import annotations

import logging

from trip.domain.enums import ConstraintType, EventType
from trip.domain.models import Coordinate, ScheduledStop, TripDay
from trip.exceptions import InsufficientCycleHoursError
from trip.utils import coord_at_mile

_log = logging.getLogger(__name__)

# If a mandatory break falls within this many miles after a fuel deadline, merge
# into one Break + Fuel stop (avoids fuel-then-break shortly after a long leg).
_BREAK_FUEL_COMBINE_MILES = 100.0


class HOSCalculatorService:
    """
    Simulates an FMCSA Hours-of-Service compliant trip plan.

    All settings are injected via the constructor so this class is fully
    testable without Django running.

    This service is intentionally free of external API calls.  Stop
    coordinates are interpolated directly from the route geometry so the
    caller can later enrich each stop with a targeted POI lookup rather
    than pre-fetching the entire route's worth of facilities.
    """

    def __init__(
        self,
        max_drive_hrs: float = 11.0,
        max_duty_window_hrs: float = 14.0,
        drive_hrs_before_break: float = 8.0,
        required_break_hrs: float = 0.5,
        required_rest_hrs: float = 10.0,
        max_cycle_hrs: float = 70.0,
        restart_hrs: float = 34.0,
        max_miles_before_fuel: float = 950.0,
        avg_speed_mph: float = 55.0,
        duty_start_time: str = "08:00",
        stop_duration_hrs: float = 1.0,
        fuel_stop_duration_hrs: float = 0.5,
    ) -> None:
        self.max_drive_hrs = max_drive_hrs
        self.max_duty_window_hrs = max_duty_window_hrs
        self.drive_hrs_before_break = drive_hrs_before_break
        self.required_break_hrs = required_break_hrs
        self.required_rest_hrs = required_rest_hrs
        self.max_cycle_hrs = max_cycle_hrs
        self.restart_hrs = restart_hrs
        self.max_miles_before_fuel = max_miles_before_fuel
        self.avg_speed_mph = avg_speed_mph
        self.duty_start_time = duty_start_time
        self.stop_duration_hrs = stop_duration_hrs
        self.fuel_stop_duration_hrs = fuel_stop_duration_hrs

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def calculate(
        self,
        total_distance_miles: float,
        pickup_distance_miles: float,
        cycle_used_hrs: float,
        geometry: list[Coordinate],
        cumulative_miles: list[float],
    ) -> list[TripDay]:
        """
        Simulate the full trip and return a day-by-day HOS-compliant plan.

        Raises:
            InsufficientCycleHoursError: if cycle hours are exhausted with no
                room for a restart before the trip can begin.
        """
        if cycle_used_hrs >= self.max_cycle_hrs:
            raise InsufficientCycleHoursError(
                f"Cycle hours exhausted ({cycle_used_hrs:.1f}/{self.max_cycle_hrs:.0f} hrs). "
                "A 34-hour restart is required before this trip."
            )

        all_events = self._simulate(
            total_distance_miles, pickup_distance_miles, cycle_used_hrs,
            geometry, cumulative_miles,
        )
        all_events = self._insert_drive_events(all_events)
        return self._build_days(all_events)

    # ------------------------------------------------------------------
    # Simulation
    # ------------------------------------------------------------------

    def _simulate(
        self,
        total_miles: float,
        pickup_miles: float,
        initial_cycle_hrs: float,
        geometry: list[Coordinate],
        cumulative_miles: list[float],
    ) -> list[ScheduledStop]:
        """
        Forward HOS simulation.

        Stops are placed at their natural HOS deadline miles.  Coordinates
        are interpolated from the route geometry so every stop has a real
        lat/lng on the map even before facility enrichment.
        """
        events: list[ScheduledStop] = []

        # --- Mutable simulation state ---
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

        # ---- Stop emitter ------------------------------------------

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
                drive_hrs = drive_dist / self.avg_speed_mph
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

        # ---- Main loop ---------------------------------------------

        _MAX_ITERATIONS = 500
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
                0.0, (self.drive_hrs_before_break - drive_hrs_since_break)
            ) * self.avg_speed_mph

            fuel_deadline = pos + max(0.0, self.max_miles_before_fuel - miles_since_fuel)

            drive_limit_miles = max(0.0, (self.max_drive_hrs - drive_hrs_today)) * self.avg_speed_mph
            duty_limit_miles = max(0.0, (self.max_duty_window_hrs - duty_hrs_today)) * self.avg_speed_mph
            rest_deadline = pos + min(drive_limit_miles, duty_limit_miles)

            cycle_remaining_hrs = self.max_cycle_hrs - cycle_hrs
            if cycle_remaining_hrs <= 0.01:
                raise InsufficientCycleHoursError(
                    "Cycle hours exhausted mid-trip. A 34-hour restart is required."
                )
            cycle_deadline = pos + cycle_remaining_hrs * self.avg_speed_mph

            next_fixed = pickup_miles if not pickup_done and pickup_miles > pos else total_miles
            mandatory = min(break_deadline, fuel_deadline, rest_deadline, cycle_deadline)

            if next_fixed <= mandatory + 0.01:
                if not pickup_done and abs(next_fixed - pickup_miles) < 0.01:
                    emit(EventType.PICKUP, "Pickup", pickup_miles, self.stop_duration_hrs, [])
                    pickup_done = True
                else:
                    emit(EventType.DROPOFF, "Dropoff", total_miles, self.stop_duration_hrs, [])
                    break
                continue

            if cycle_deadline <= mandatory + 0.01:
                emit(EventType.RESTART, "34-Hour Restart", cycle_deadline,
                     self.restart_hrs, [ConstraintType.CYCLE_LIMIT])
                continue

            if rest_deadline <= mandatory + 0.01:
                emit(EventType.REST, "Overnight Rest", rest_deadline,
                     self.required_rest_hrs, [ConstraintType.REST])
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
                     self.required_break_hrs,
                     [ConstraintType.BREAK, ConstraintType.FUEL])
                continue

            if break_due:
                emit(EventType.BREAK, "Mandatory Break", break_deadline,
                     self.required_break_hrs, [ConstraintType.BREAK])
                continue

            if fuel_due:
                if break_soon_after_fuel:
                    emit(EventType.FUEL, "Break + Fuel Stop",
                         fuel_deadline,
                         self.required_break_hrs,
                         [ConstraintType.BREAK, ConstraintType.FUEL])
                else:
                    emit(EventType.FUEL, "Fuel Stop", fuel_deadline,
                         self.fuel_stop_duration_hrs, [ConstraintType.FUEL])
                continue

            # Fallback: drive to next fixed stop
            if not pickup_done and pickup_miles > pos:
                emit(EventType.PICKUP, "Pickup", pickup_miles, self.stop_duration_hrs, [])
                pickup_done = True
            else:
                emit(EventType.DROPOFF, "Dropoff", total_miles, self.stop_duration_hrs, [])
                break

        return events

    # ------------------------------------------------------------------
    # Drive event injection
    # ------------------------------------------------------------------

    def _insert_drive_events(self, events: list[ScheduledStop]) -> list[ScheduledStop]:
        """
        Insert a DRIVE event before every stop that was preceded by driving.

        The simulator tracks driving implicitly via miles_from_prev on each stop.
        This method makes those driving segments explicit so the ELD log can
        render them on the correct row with the correct duration.
        """
        result: list[ScheduledStop] = []
        counter = 0

        for event in events:
            if event.miles_from_prev > 0:
                drive_hrs = event.miles_from_prev / self.avg_speed_mph
                drive_start = max(0.0, event.start_hour - drive_hrs)
                counter += 1
                result.append(
                    ScheduledStop(
                        id=f"drive_{counter}",
                        type=EventType.DRIVE,
                        label="Driving",
                        location="En route",
                        lat=0.0,
                        lng=0.0,
                        miles_from_start=event.miles_from_start,
                        start_hour=round(drive_start, 3),
                        duration_hrs=round(drive_hrs, 3),
                        miles_from_prev=event.miles_from_prev,
                        satisfies=[],
                    )
                )
            result.append(event)

        return result

    # ------------------------------------------------------------------
    # Build TripDay objects
    # ------------------------------------------------------------------

    def _build_days(self, events: list[ScheduledStop]) -> list[TripDay]:
        """Group sequential events into TripDay objects, splitting on REST/RESTART."""
        days: list[TripDay] = []
        current: list[ScheduledStop] = []
        day_num = 1

        # Track the real clock hour (0-24) when the current duty period started.
        h, m = map(int, self.duty_start_time.split(':'))
        current_clock_hour: float = h + m / 60.0

        def finalize(evts: list[ScheduledStop], dnum: int, clock_hour: float) -> TripDay:
            drive_hrs = sum(
                ev.duration_hrs for ev in evts if ev.type == EventType.DRIVE
            )
            on_duty_hrs = drive_hrs + sum(
                e.duration_hrs
                for e in evts
                if e.type not in (EventType.DRIVE, EventType.REST, EventType.RESTART)
            )
            sleeper_berth_hrs = sum(
                e.duration_hrs
                for e in evts
                if e.type in (EventType.REST, EventType.RESTART)
            )
            # Express clock_hour as "HH:MM" for this day's duty start.
            ch = int(clock_hour) % 24
            cm = round((clock_hour % 1) * 60)
            duty_time_str = f"{ch:02d}:{cm:02d}"
            return TripDay(
                day_number=dnum,
                duty_start_time=duty_time_str,
                total_driving_hrs=round(drive_hrs, 2),
                total_on_duty_hrs=round(on_duty_hrs, 2),
                total_off_duty_hrs=0.0,
                total_sleeper_berth_hrs=round(sleeper_berth_hrs, 2),
                events=evts,
            )

        for event in events:
            current.append(event)
            if event.type in (EventType.REST, EventType.RESTART):
                days.append(finalize(current, day_num, current_clock_hour))
                # Advance clock: rest starts at (clock_hour + event.start_hour),
                # duty resumes (event.duration_hrs) later, wrapping at 24.
                abs_rest_end = current_clock_hour + event.start_hour + event.duration_hrs
                current_clock_hour = abs_rest_end % 24
                day_num += 1
                current = []

        if current:
            days.append(finalize(current, day_num, current_clock_hour))

        return days
