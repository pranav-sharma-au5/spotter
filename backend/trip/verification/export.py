"""Markdown export for manual LLM scoring of verification plans."""
from __future__ import annotations

from typing import Any

LLM_RUBRIC = """
## LLM scoring rubric

Score each dimension 1–5 or pass/fail, then give a brief overall note:

1. **Distance** — ORS miles vs expected (~±10%)
2. **Duration** — day count reasonable for miles at ~605 mi/driving-day
3. **HOS structure** — breaks after ~440 mi stretches, 10 h rests, fuel ~950 mi, pickup once, dropoff last
4. **Geographic plausibility** — rest/fuel stops along the corridor (qualitative)
5. **ELD consistency** — duty lines would match event types and durations per day
6. **Overall** — would you trust this plan for a real driver?

Record scores in `backend/verification_exports/SCORES.md`.
"""


def _event_type_label(raw: Any) -> str:
    if raw is None:
        return "?"
    text = str(raw)
    if text.startswith("EventType."):
        return text.split(".", 1)[-1].lower()
    return text


def build_event_timeline(plan: dict[str, Any]) -> str:
    lines: list[str] = []
    for day in plan.get("days", []):
        day_num = day.get("day_number", "?")
        for event in day.get("events", []):
            if _event_type_label(event.get("type")) == "drive":
                continue
            loc = event.get("location", "")
            lines.append(
                f"- Day {day_num}: **{_event_type_label(event.get('type'))}** — "
                f"{event.get('label')} "
                f"({event.get('duration_hrs')}h, +{event.get('miles_from_prev', 0):.0f} mi) @ {loc}"
            )
        drive_mi = sum(
            e.get("miles_from_prev", 0)
            for e in day.get("events", [])
            if _event_type_label(e.get("type")) == "drive"
        )
        lines.append(
            f"- Day {day_num}: driving **{day.get('total_driving_hrs', 0):.1f}h** "
            f"({drive_mi:.0f} mi), on-duty **{day.get('total_on_duty_hrs', 0):.1f}h**"
        )
    return "\n".join(lines) if lines else "_No events_"


def build_markdown(
    route_meta: dict[str, Any],
    plan_payload: dict[str, Any],
) -> str:
    plan = plan_payload.get("plan", {})
    summary = plan.get("summary") or {}
    request = plan_payload.get("request", {})
    ors_miles = plan_payload.get("ors_miles") or summary.get("total_miles", 0)

    return f"""# Verification: {route_meta.get("name", route_meta.get("slug"))}

## Route

| Field | Value |
|-------|-------|
| Slug | `{route_meta.get("slug")}` |
| Current | {request.get("current_location", route_meta.get("current_location"))} |
| Pickup | {request.get("pickup_location", route_meta.get("pickup_location"))} |
| Dropoff | {request.get("dropoff_location", route_meta.get("dropoff_location"))} |
| Expected miles | ~{route_meta.get("expected_miles", 0):.0f} |
| ORS miles | {ors_miles:.0f} |
| Expected days | {route_meta.get("expected_min_days")}–{route_meta.get("expected_max_days")} |
| Actual days | {summary.get("total_days", "—")} |
| Restart required | {summary.get("restart_required", False)} |

{summary.get("message", "")}

## Event timeline

{build_event_timeline(plan)}

{LLM_RUBRIC}
"""
