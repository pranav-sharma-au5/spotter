"""Facility display names and OSM tag parsing."""
from __future__ import annotations

from trip.domain.enums import EventType, FacilityType
from trip.domain.models import StopInfo
from trip.services.facility.constants import (
    GENERIC_BRANDS,
    MACHINE_PLACEHOLDERS,
    OSM_AMENITY_MAP,
    OSM_HIGHWAY_MAP,
    ORS_TYPE_MAP,
)


def is_generic_brand_name(name: str) -> bool:
    normalized = (name or "").strip().lower()
    if normalized in GENERIC_BRANDS:
        return True
    words = normalized.split()
    return len(words) == 1 and words[0] in GENERIC_BRANDS


def is_machine_display_name(name: str) -> bool:
    normalized = (name or "").strip().lower()
    if normalized in MACHINE_PLACEHOLDERS:
        return True
    return is_generic_brand_name(name)


def location_with_city(placeholder: str, city: str, event_type: EventType) -> str:
    if not city:
        return placeholder
    label = placeholder.strip()
    if is_generic_brand_name(label):
        if city.lower() not in label.lower():
            return f"{label}, {city}"
        return label
    if is_machine_display_name(label):
        if event_type in (EventType.REST, EventType.RESTART):
            return f"Rest Stop, {city}"
        return f"Gas Station, {city}"
    if city.lower() not in label.lower():
        return f"{label}, {city}"
    return label


def city_state_from_tags(tags: dict) -> str:
    city = (
        tags.get("addr:city")
        or tags.get("addr:town")
        or tags.get("addr:village")
        or tags.get("addr:hamlet")
        or ""
    ).strip()
    state = (tags.get("addr:state") or "").strip()
    if city and state:
        return f"{city}, {state}"
    if city:
        return city
    addr_full = (tags.get("addr:full") or "").strip()
    if addr_full and len(addr_full) <= 80:
        return addr_full
    is_in = (tags.get("is_in") or "").strip()
    if is_in and len(is_in) <= 80:
        return is_in
    return ""


def amenity_label(tags: dict, ors_type: str) -> str:
    if tags.get("amenity") == "truck_stop":
        return "Truck Stop"
    highway = tags.get("highway", "")
    if highway == "rest_area":
        return "Rest Area"
    if highway == "services":
        return "Services"
    if ors_type == "truck_stop":
        return "Truck Stop"
    return "Gas Station"


def format_facility_name(tags: dict, category_ids: dict, ors_type: str) -> str:
    raw_name = (tags.get("name") or "").strip()
    brand = (tags.get("brand") or tags.get("operator") or "").strip()
    ref = (tags.get("ref") or tags.get("ref:TA") or "").strip()
    official = (tags.get("official_name") or tags.get("alt_name") or "").strip()
    city_state = city_state_from_tags(tags)

    label = ""
    for candidate in (raw_name, official, brand):
        if candidate and not is_machine_display_name(candidate):
            label = candidate
            break

    if not label and brand:
        label = brand
    if not label and raw_name:
        label = raw_name

    if not label:
        label = amenity_label(tags, ors_type)

    if ref and ref not in label:
        label = f"{label} #{ref}" if "#" not in label else label

    if city_state and city_state.lower() not in label.lower():
        label = f"{label}, {city_state}"

    return label[:120]


def parse_ors_feature(feat: dict) -> tuple[str, str]:
    props = feat.get("properties", {})
    category_ids: dict = props.get("category_ids", {})
    tags: dict = props.get("osm_tags") or {}
    ors_type = "truck_stop" if "590" in category_ids else "fuel"
    name = format_facility_name(tags, category_ids, ors_type)
    return name, ors_type


def stop_info_from_props(props: dict) -> StopInfo:
    tags: dict = props.get("osm_tags") or {}
    category_ids: dict = props.get("category_ids", {})
    cat_name = ""
    for v in category_ids.values():
        if isinstance(v, dict):
            cat = v.get("category_name", "").replace("_", " ").title()
            if cat.lower() not in MACHINE_PLACEHOLDERS:
                cat_name = cat
            break
    return StopInfo(
        category=cat_name,
        phone=tags.get("phone", ""),
        website=tags.get("website", ""),
        opening_hours=tags.get("opening_hours", ""),
        city=city_state_from_tags(tags),
    )


def classify(tags: dict) -> FacilityType:
    if t := ORS_TYPE_MAP.get(tags.get("_ors_type", "")):
        return t
    if t := OSM_AMENITY_MAP.get(tags.get("amenity", "")):
        return t
    return OSM_HIGHWAY_MAP.get(tags.get("highway", ""), FacilityType.FUEL)
