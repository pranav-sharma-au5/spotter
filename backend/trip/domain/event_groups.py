"""Event-type groupings — single place for rest/fuel/enrich rules."""
from __future__ import annotations

from trip.domain.enums import EventType

REST_LIKE = frozenset({EventType.REST, EventType.RESTART})

ENRICH_BUFFER_MILES: dict[EventType, float] = {
    EventType.FUEL: 100.0,
    EventType.REST: 55.0,
    EventType.RESTART: 55.0,
    EventType.BREAK: 45.0,
}


def is_rest_like(event_type: EventType) -> bool:
    return event_type in REST_LIKE


def needs_city_label(event_type: EventType) -> bool:
    return event_type in REST_LIKE


def enrich_buffer_miles(event_type: EventType) -> float | None:
    return ENRICH_BUFFER_MILES.get(event_type)
