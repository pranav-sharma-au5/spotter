"""HOS simulation settings — injectable, Django-free."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class HOSConfig:
    max_drive_hrs: float = 11.0
    max_duty_window_hrs: float = 14.0
    drive_hrs_before_break: float = 8.0
    required_break_hrs: float = 0.5
    required_rest_hrs: float = 10.0
    max_cycle_hrs: float = 70.0
    restart_hrs: float = 34.0
    max_miles_before_fuel: float = 950.0
    avg_speed_mph: float = 55.0
    duty_start_time: str = "08:00"
    stop_duration_hrs: float = 1.0
    fuel_stop_duration_hrs: float = 0.5
