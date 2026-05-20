"""Group simulated stops into TripDay objects and inject DRIVE events."""
from __future__ import annotations

from trip.domain.enums import EventType
from trip.domain.models import ScheduledStop, TripDay
from trip.services.hos.config import HOSConfig


def insert_drive_events(config: HOSConfig, events: list[ScheduledStop]) -> list[ScheduledStop]:
    result: list[ScheduledStop] = []
    counter = 0

    for event in events:
        if event.miles_from_prev > 0:
            drive_hrs = event.miles_from_prev / config.avg_speed_mph
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


def build_days(config: HOSConfig, events: list[ScheduledStop]) -> list[TripDay]:
    days: list[TripDay] = []
    current: list[ScheduledStop] = []
    day_num = 1

    h, m = map(int, config.duty_start_time.split(":"))
    current_clock_hour: float = h + m / 60.0

    def finalize(evts: list[ScheduledStop], dnum: int, clock_hour: float) -> TripDay:
        drive_hrs = sum(ev.duration_hrs for ev in evts if ev.type == EventType.DRIVE)
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
            abs_rest_end = current_clock_hour + event.start_hour + event.duration_hrs
            current_clock_hour = abs_rest_end % 24
            day_num += 1
            current = []

    if current:
        days.append(finalize(current, day_num, current_clock_hour))

    return days
