"""HOS Calculator Service — pure business logic, no Django, no external calls."""
from __future__ import annotations

from trip.domain.models import Coordinate, TripDay
from trip.domain.exceptions import InsufficientCycleHoursError
from trip.services.hos.config import HOSConfig
from trip.services.hos.day_builder import build_days, insert_drive_events
from trip.services.hos.simulator import simulate


class HOSCalculatorService:
    """
    Simulates an FMCSA Hours-of-Service compliant trip plan.

    All settings are injected via the constructor so this class is fully
    testable without Django running.
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
        self._config = HOSConfig(
            max_drive_hrs=max_drive_hrs,
            max_duty_window_hrs=max_duty_window_hrs,
            drive_hrs_before_break=drive_hrs_before_break,
            required_break_hrs=required_break_hrs,
            required_rest_hrs=required_rest_hrs,
            max_cycle_hrs=max_cycle_hrs,
            restart_hrs=restart_hrs,
            max_miles_before_fuel=max_miles_before_fuel,
            avg_speed_mph=avg_speed_mph,
            duty_start_time=duty_start_time,
            stop_duration_hrs=stop_duration_hrs,
            fuel_stop_duration_hrs=fuel_stop_duration_hrs,
        )
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

    def calculate(
        self,
        total_distance_miles: float,
        pickup_distance_miles: float,
        cycle_used_hrs: float,
        geometry: list[Coordinate],
        cumulative_miles: list[float],
    ) -> list[TripDay]:
        if cycle_used_hrs >= self.max_cycle_hrs:
            raise InsufficientCycleHoursError(
                f"Cycle hours exhausted ({cycle_used_hrs:.1f}/{self.max_cycle_hrs:.0f} hrs). "
                "A 34-hour restart is required before this trip."
            )

        raw = simulate(
            self._config,
            total_distance_miles,
            pickup_distance_miles,
            cycle_used_hrs,
            geometry,
            cumulative_miles,
        )
        with_drives = insert_drive_events(self._config, raw)
        return build_days(self._config, with_drives)
