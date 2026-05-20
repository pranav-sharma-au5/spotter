"""Score and pick the best facility candidate along a corridor segment."""
from __future__ import annotations

from trip.domain.enums import EventType, FacilityType
from trip.domain.models import Facility, StopInfo
from trip.services.facility.constants import MACHINE_PLACEHOLDERS, PICK_MILE_WINDOW, RICHNESS_TAG_KEYS
from trip.services.facility.naming import (
    is_generic_brand_name,
    is_machine_display_name,
)


def has_quality_label(name: str, stop_info: StopInfo) -> bool:
    if (stop_info.city or "").strip():
        return True
    if name and not is_machine_display_name(name):
        if not is_generic_brand_name(name):
            return True
        if "," in name or "#" in name:
            return True
    return False


def populated_field_count(
    tags: dict,
    stop_info: StopInfo,
    display_name: str,
    ors_type: str,
    event_type: EventType | None,
) -> int:
    count = 0

    for val in (
        stop_info.city,
        stop_info.phone,
        stop_info.website,
        stop_info.opening_hours,
    ):
        if (val or "").strip():
            count += 2

    cat = (stop_info.category or "").strip().lower()
    if cat and cat not in MACHINE_PLACEHOLDERS:
        count += 1

    for key in RICHNESS_TAG_KEYS:
        val = (tags.get(key) or "").strip()
        if not val:
            continue
        if key in ("name", "brand") and (
            is_machine_display_name(val) or is_generic_brand_name(val)
        ):
            continue
        count += 1

    if display_name and has_quality_label(display_name, stop_info):
        count += 2

    if ors_type == "truck_stop" or tags.get("amenity") == "truck_stop":
        count += 1
    if tags.get("highway") in ("rest_area", "services"):
        count += 1

    if event_type in (EventType.REST, EventType.RESTART):
        if tags.get("amenity") == "truck_stop" or tags.get("highway") in (
            "rest_area",
            "services",
        ):
            count += 2
        elif ors_type == "fuel" and tags.get("amenity") != "truck_stop":
            count -= 4

    return count


def select_best_candidate(
    candidates: list[tuple[float, int, Facility, bool]],
    event_type: EventType | None = None,
) -> Facility | None:
    if not candidates:
        return None
    max_mile = max(m for m, _, _, _ in candidates)
    in_window = [c for c in candidates if c[0] >= max_mile - PICK_MILE_WINDOW]
    pool = in_window or candidates
    if event_type in (EventType.REST, EventType.RESTART):
        rest_suitable = [
            c for c in pool
            if c[2].type in (FacilityType.TRUCK_STOP, FacilityType.REST_AREA)
        ]
        if rest_suitable:
            pool = rest_suitable
    quality = [c for c in pool if c[3]]
    pool = quality if quality else pool
    _, _, best, _ = max(pool, key=lambda item: (item[1], item[0]))
    return best
