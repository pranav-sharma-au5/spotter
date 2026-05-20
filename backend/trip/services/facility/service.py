"""Facility service — finds truck-relevant facilities along a route corridor."""
from __future__ import annotations

import logging
import threading

from trip.domain.enums import EventType
from trip.domain.models import Coordinate, Facility
from trip.services.facility.poi_client import OrsPoiClient
from trip.services.facility.projection import (
    cumulative_for_segment,
    feature_point,
    project_onto_route,
)
from trip.services.facility import naming as naming_mod
from trip.services.facility import projection as projection_mod
from trip.services.facility import selection as selection_mod
from trip.services.facility.selection import (
    has_quality_label,
    populated_field_count,
    select_best_candidate,
)

_log = logging.getLogger(__name__)


class FacilityService:
    """Finds fuel stations and truck-stop-like facilities along a route corridor via the ORS POI API."""

    def __init__(
        self,
        corridor_miles: float = 5.0,
        ors_base_url: str = "https://api.openrouteservice.org",
        ors_api_key: str = "",
    ) -> None:
        self._corridor_miles = corridor_miles
        self._poi_errors: list[str] = []
        self._poi_errors_lock = threading.Lock()
        self._poi = OrsPoiClient(
            ors_base_url,
            ors_api_key,
            corridor_miles,
            self._record_poi_error,
        )

    def clear_poi_errors(self) -> None:
        with self._poi_errors_lock:
            self._poi_errors.clear()

    def poi_error_summary(self) -> str:
        with self._poi_errors_lock:
            if not self._poi_errors:
                return ""
            unique = list(dict.fromkeys(self._poi_errors))
            return unique[0] if len(unique) == 1 else "; ".join(unique[:3])

    def _record_poi_error(self, message: str) -> None:
        with self._poi_errors_lock:
            self._poi_errors.append(message)

    def find_best_facility_in_segment(
        self,
        segment: list[Coordinate],
        event_type: EventType | None = None,
    ) -> Facility | None:
        if len(segment) < 2:
            return None

        features = self._poi.fetch_features(segment)
        if not features:
            return None

        cum = cumulative_for_segment(segment)
        candidates: list[tuple[float, int, Facility, bool]] = []

        for feat in features:
            point = feature_point(feat)
            if point is None:
                continue
            fac_lat, fac_lng = point
            props = feat.get("properties", {})
            tags: dict = props.get("osm_tags") or {}
            name, ors_type = naming_mod.parse_ors_feature(feat)
            stop_info = naming_mod.stop_info_from_props(props)
            result = project_onto_route(fac_lat, fac_lng, segment, cum)
            if result is None:
                continue
            mile_in_seg, perp_dist = result
            if perp_dist > self._corridor_miles:
                continue

            field_count = populated_field_count(
                tags, stop_info, name, ors_type, event_type
            )
            has_quality = has_quality_label(name, stop_info)
            candidates.append(
                (
                    mile_in_seg,
                    field_count,
                    Facility(
                        id=str(props.get("osm_id", "")),
                        name=name,
                        type=naming_mod.classify({"_ors_type": ors_type, **tags}),
                        lat=fac_lat,
                        lng=fac_lng,
                        miles_from_start=0.0,
                        stop_info=stop_info,
                    ),
                    has_quality,
                )
            )

        return select_best_candidate(candidates, event_type=event_type)

    # Backward-compatible helpers used by enrichment and tests.
    is_generic_brand_name = staticmethod(naming_mod.is_generic_brand_name)
    is_machine_display_name = staticmethod(naming_mod.is_machine_display_name)
    location_with_city = staticmethod(naming_mod.location_with_city)

    def _project_onto_route(
        self,
        fac_lat: float,
        fac_lng: float,
        geometry: list[Coordinate],
        cumulative_miles: list[float],
    ) -> tuple[float, float] | None:
        return projection_mod.project_onto_route(
            fac_lat, fac_lng, geometry, cumulative_miles
        )

    _format_facility_name = staticmethod(naming_mod.format_facility_name)
    _populated_field_count = staticmethod(selection_mod.populated_field_count)
    _select_best_candidate = staticmethod(selection_mod.select_best_candidate)
    _feature_point = staticmethod(projection_mod.feature_point)
    _stop_info_from_props = staticmethod(naming_mod.stop_info_from_props)
