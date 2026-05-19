"""Summary service — builds TripSummary from completed TripDay list."""
from __future__ import annotations

from trip.domain.enums import EventType
from trip.domain.models import RestStopStep, TripDay, TripSummary


class SummaryService:
    """Builds a TripSummary and generates a plain-English message for the driver."""

    def build(
        self,
        days: list[TripDay],
        total_miles: float,
        initial_cycle_hrs: float,
        max_cycle_hrs: float = 70.0,
    ) -> TripSummary:
        """
        Aggregate day-level data into a TripSummary.

        Args:
            days: the list of TripDay objects produced by HOSCalculatorService.
            total_miles: total route distance.
            initial_cycle_hrs: cycle hours already used before this trip.
            max_cycle_hrs: HOS cycle limit (default 70).
        """
        total_days = len(days)
        restart_required = any(
            event.type == EventType.RESTART
            for day in days
            for event in day.events
        )

        # Cycle accounting
        total_on_duty = sum(d.total_on_duty_hrs for d in days)
        cycle_used_after = min(initial_cycle_hrs + total_on_duty, max_cycle_hrs)
        if restart_required:
            # After a restart cycle resets; compute from the last restart
            cycle_used_after = self._cycle_after_restart(days, max_cycle_hrs)
        cycle_remaining = max(0.0, max_cycle_hrs - cycle_used_after)

        # Overnight rests only (not breaks or fuel)
        rest_stops: list[dict] = []
        rest_stop_steps: list[RestStopStep] = []
        night = 0
        for day in days:
            for event in day.events:
                if event.type == EventType.REST:
                    night += 1
                    city = (event.stop_info.city if event.stop_info else "") or ""
                    rest_stops.append(
                        {
                            "day": day.day_number,
                            "location": event.location,
                            "city": city,
                            "lat": event.lat,
                            "lng": event.lng,
                            "miles_from_start": event.miles_from_start,
                            "duration_hrs": event.duration_hrs,
                        }
                    )
                    rest_stop_steps.append(
                        RestStopStep(
                            night=night,
                            day=day.day_number,
                            location=event.location,
                            city=city,
                            miles_from_start=event.miles_from_start,
                            duration_hrs=event.duration_hrs,
                        )
                    )

        day_word = "day" if total_days == 1 else "days"
        if restart_required:
            message = (
                f"Your trip takes {total_days} {day_word}. "
                "A 34-hour restart is required."
            )
        elif not rest_stop_steps:
            message = f"Your trip takes {total_days} {day_word}. No overnight rest needed."
        else:
            message = f"Your trip takes {total_days} {day_word}."

        return TripSummary(
            total_days=total_days,
            total_miles=round(total_miles, 1),
            cycle_hours_used_after_trip=round(cycle_used_after, 2),
            cycle_hours_remaining=round(cycle_remaining, 2),
            rest_stops=rest_stops,
            rest_stop_steps=rest_stop_steps,
            restart_required=restart_required,
            message=message,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _cycle_after_restart(days: list[TripDay], max_cycle_hrs: float) -> float:  # noqa: D102
        """
        When a 34-hr restart occurs, cycle resets to 0 at that point.
        Sum on-duty hours from the last restart forward.
        """
        total = 0.0
        after_restart = False
        for day in days:
            for event in day.events:
                if event.type == EventType.RESTART:
                    total = 0.0
                    after_restart = True
                elif event.type != EventType.REST:
                    total += event.duration_hrs
        return min(total, max_cycle_hrs)

