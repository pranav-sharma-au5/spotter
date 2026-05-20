"""Stop enrichment — POI lookup and reverse geocoding for scheduled events."""
from __future__ import annotations

import logging

from trip.core.concurrency import run_parallel
from trip.domain.enums import EventType
from trip.domain.event_groups import enrich_buffer_miles, needs_city_label
from trip.domain.models import Coordinate, RoutePlanResult, StopInfo, TripDay
from trip.domain.exceptions import FacilityDataError
from trip.services.facility import FacilityService
from trip.services.maps import GeocodingService
from trip.core.utils import coord_at_mile, cumulative_miles

_log = logging.getLogger(__name__)

_MAX_ENRICHMENT_WORKERS = 5


def geometry_segment(
    geometry: list[Coordinate],
    cum_miles: list[float],
    start_mile: float,
    end_mile: float,
) -> list[Coordinate]:
    points: list[Coordinate] = []
    for i, cum in enumerate(cum_miles):
        if cum < start_mile:
            continue
        if cum > end_mile:
            break
        points.append(geometry[i])

    if not points or cum_miles[0] < start_mile:
        lat, lng = coord_at_mile(geometry, cum_miles, start_mile)
        points.insert(0, Coordinate(lat=lat, lng=lng))

    lat, lng = coord_at_mile(geometry, cum_miles, end_mile)
    end_coord = Coordinate(lat=lat, lng=lng)
    if not points or (points[-1].lat != end_coord.lat or points[-1].lng != end_coord.lng):
        points.append(end_coord)

    return points


def collect_enrichable(
    days: list[TripDay],
    geometry: list[Coordinate],
    cum_miles: list[float],
) -> list[tuple[object, list[Coordinate]]]:
    enrichable: list[tuple[object, list[Coordinate]]] = []
    for day in days:
        for event in day.events:
            buffer = enrich_buffer_miles(event.type)
            if buffer is None:
                continue
            deadline_mile = event.miles_from_start
            start_mile = max(0.0, deadline_mile - buffer)
            segment = geometry_segment(geometry, cum_miles, start_mile, deadline_mile)
            enrichable.append((event, segment))
    return enrichable


def enrich_facilities(
    facility_service: FacilityService,
    enrichable: list[tuple[object, list[Coordinate]]],
) -> int:
    if not enrichable:
        return 0

    facility_service.clear_poi_errors()

    def lookup(item: tuple[object, list[Coordinate]]) -> tuple[object, object | None]:
        event, segment = item
        return event, facility_service.find_best_facility_in_segment(segment, event.type)

    results = run_parallel(
        enrichable,
        lookup,
        max_workers=_MAX_ENRICHMENT_WORKERS,
    )

    enriched = 0
    for event, facility in results:
        if facility:
            event.location = facility.name
            event.lat = facility.lat
            event.lng = facility.lng
            event.stop_info = facility.stop_info
            enriched += 1

    return enriched


def apply_location_labels(days: list[TripDay], route: RoutePlanResult) -> None:
    for day in days:
        for event in day.events:
            if event.type == EventType.PICKUP and route.pickup_location_label:
                event.location = route.pickup_location_label
            elif event.type == EventType.DROPOFF and route.dropoff_location_label:
                event.location = route.dropoff_location_label


def require_facility_data_if_needed(
    facility_service: FacilityService,
    enrichable_count: int,
    enriched_count: int,
) -> None:
    if enrichable_count and enriched_count == 0:
        summary = facility_service.poi_error_summary()
        if not isinstance(summary, str):
            summary = ""
        summary = summary.strip()
        if summary:
            _log.warning(
                "Facility enrichment failed for all %d stops: %s",
                enrichable_count,
                summary,
            )
            raise FacilityDataError(
                f"Could not load truck-stop data ({summary}). "
                "ORS POI quota may be exhausted — try again later or upgrade your API plan."
            )


def enrich_city_labels(
    geocoding_service: GeocodingService,
    days: list[TripDay],
) -> None:
    city_events = [
        event
        for day in days
        for event in day.events
        if needs_city_label(event.type)
        or FacilityService.is_machine_display_name(event.location)
        or FacilityService.is_generic_brand_name(event.location)
    ]
    if not city_events:
        return

    def reverse(event: object) -> tuple[object, str]:
        return event, geocoding_service.reverse_geocode(event.lat, event.lng)

    for event, city in run_parallel(city_events, reverse, max_workers=5):
        if city:
            if event.stop_info is None:
                event.stop_info = StopInfo()
            event.stop_info.city = city
            if FacilityService.is_machine_display_name(event.location):
                event.location = FacilityService.location_with_city(
                    event.location, city, event.type
                )


def enrich_stops(
    *,
    days: list[TripDay],
    route: RoutePlanResult,
    facility_service: FacilityService,
    geocoding_service: GeocodingService,
) -> int:
    """Enrich stops with POI and city labels. Returns count of POI-enriched stops."""
    cum_miles = cumulative_miles(route.route_geometry)
    enrichable = collect_enrichable(days, route.route_geometry, cum_miles)
    enriched = enrich_facilities(facility_service, enrichable)
    _log.info("Enriched %d stops with facility data", enriched)

    apply_location_labels(days, route)
    require_facility_data_if_needed(facility_service, len(enrichable), enriched)
    enrich_city_labels(geocoding_service, days)
    return enriched
