"""Facility service — finds truck-relevant facilities along a route corridor."""
from __future__ import annotations

import logging

import httpx

from trip.domain.enums import FacilityType
from trip.domain.models import Coordinate, Facility, StopInfo
from trip.utils import haversine_miles, nearest_point_on_segment

_log = logging.getLogger(__name__)

# ORS POI category IDs (transport group = 580)
_ORS_POI_CATEGORIES = [
    596,  # fuel  (petrol / gas stations)
    590,  # car_repair  (best proxy for truck stops in ORS POI)
]

# Dispatch tables for _classify() — extend here when new facility types are added.
_ORS_TYPE_MAP: dict[str, FacilityType] = {
    "truck_stop": FacilityType.TRUCK_STOP,
}
_OSM_AMENITY_MAP: dict[str, FacilityType] = {
    "truck_stop": FacilityType.TRUCK_STOP,
    "rest_area": FacilityType.REST_AREA,
}
_OSM_HIGHWAY_MAP: dict[str, FacilityType] = {
    "rest_area": FacilityType.REST_AREA,
    "services": FacilityType.REST_AREA,
}


class FacilityService:
    """Finds fuel stations and truck-stop-like facilities along a route corridor via the ORS POI API."""

    # ORS POI buffer is capped at 2000 m by the API
    _ORS_MAX_BUFFER_M = 2000
    _METRES_PER_MILE = 1_609.344

    def __init__(
        self,
        corridor_miles: float = 5.0,
        ors_base_url: str = "https://api.openrouteservice.org",
        ors_api_key: str = "",
    ) -> None:
        self._corridor_miles = corridor_miles
        self._ors_base_url = ors_base_url.rstrip("/")
        self._ors_api_key = ors_api_key

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def find_best_facility_in_segment(
        self, segment: list[Coordinate]
    ) -> Facility | None:
        """
        Find the best facility along *segment* (a short slice of the route).

        "Best" means the **last** one before the end of the segment — i.e. the
        facility closest to the HOS deadline that the driver can still reach.
        This is used for buffer-aware enrichment: the segment spans from
        (deadline - buffer) to deadline, so the returned facility is the last
        safe stop before a constraint expires.

        Returns None if the ORS POI call fails or the segment has no results.
        """
        if not self._ors_api_key or len(segment) < 2:
            return None

        buffer_m = min(self._ORS_MAX_BUFFER_M, int(self._corridor_miles * self._METRES_PER_MILE))
        coordinates = [[c.lng, c.lat] for c in segment]

        body = {
            "request": "pois",
            "geometry": {
                "geojson": {"type": "LineString", "coordinates": coordinates},
                "buffer": buffer_m,
            },
            "filters": {"category_ids": _ORS_POI_CATEGORIES},
            "limit": 100,
        }
        headers = {
            "Authorization": self._ors_api_key,
            "Content-Type": "application/json",
        }

        try:
            response = httpx.post(
                f"{self._ors_base_url}/pois",
                json=body,
                headers=headers,
                timeout=15.0,
            )
            if not response.is_success:
                return None
        except httpx.HTTPError:
            return None

        features = response.json().get("features", [])
        if not features:
            return None

        # Project each feature onto the segment; pick the one with the
        # highest mile value (closest to the deadline end of the segment).
        cum = self._cumulative_miles(segment)
        best_facility: Facility | None = None
        best_mile = -1.0

        for feat in features:
            coords = feat.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2:
                continue
            props = feat.get("properties", {})
            name, ors_type = self._parse_ors_feature(feat)

            fac_lat, fac_lng = coords[1], coords[0]
            result = self._project_onto_route(fac_lat, fac_lng, segment, cum)
            if result is None:
                continue
            mile_in_seg, perp_dist = result
            if perp_dist > self._corridor_miles:
                continue
            if mile_in_seg > best_mile:
                best_mile = mile_in_seg
                best_facility = Facility(
                    id=str(props.get("osm_id", "")),
                    name=name,
                    type=self._classify({"_ors_type": ors_type}),
                    lat=fac_lat,
                    lng=fac_lng,
                    miles_from_start=0.0,
                    stop_info=self._stop_info_from_props(props),
                )

        return best_facility

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _cumulative_miles(self, geometry: list[Coordinate]) -> list[float]:
        miles = [0.0]
        for i in range(1, len(geometry)):
            prev, curr = geometry[i - 1], geometry[i]
            miles.append(miles[-1] + haversine_miles(prev.lat, prev.lng, curr.lat, curr.lng))
        return miles

    def _project_onto_route(
        self,
        fac_lat: float,
        fac_lng: float,
        geometry: list[Coordinate],
        cumulative_miles: list[float],
    ) -> tuple[float, float] | None:
        if len(geometry) < 2:
            return None

        best_dist = float("inf")
        best_miles_from_start = 0.0

        for i in range(len(geometry) - 1):
            a, b = geometry[i], geometry[i + 1]
            nx, ny, t = nearest_point_on_segment(
                fac_lng, fac_lat, a.lng, a.lat, b.lng, b.lat,
            )
            perp_dist = haversine_miles(fac_lat, fac_lng, ny, nx)
            if perp_dist < best_dist:
                best_dist = perp_dist
                seg_len = cumulative_miles[i + 1] - cumulative_miles[i]
                best_miles_from_start = cumulative_miles[i] + t * seg_len

        return best_miles_from_start, best_dist

    @staticmethod
    def _parse_ors_feature(feat: dict) -> tuple[str, str]:
        """Return (name, ors_type) from an ORS POI GeoJSON feature."""
        props = feat.get("properties", {})
        category_ids: dict = props.get("category_ids", {})
        ors_type = "truck_stop" if "590" in category_ids else "fuel"
        name = (props.get("osm_tags") or {}).get("name", "") or ors_type.replace("_", " ").title()
        return name, ors_type

    @staticmethod
    def _stop_info_from_props(props: dict) -> StopInfo:
        """Extract StopInfo from an ORS POI feature's properties dict."""
        tags: dict = props.get("osm_tags") or {}
        category_ids: dict = props.get("category_ids", {})
        cat_name = ""
        for v in category_ids.values():
            if isinstance(v, dict):
                cat_name = v.get("category_name", "").replace("_", " ").title()
                break
        return StopInfo(
            category=cat_name,
            phone=tags.get("phone", ""),
            website=tags.get("website", ""),
            opening_hours=tags.get("opening_hours", ""),
        )

    @staticmethod
    def _classify(tags: dict) -> FacilityType:
        if t := _ORS_TYPE_MAP.get(tags.get("_ors_type", "")):
            return t
        if t := _OSM_AMENITY_MAP.get(tags.get("amenity", "")):
            return t
        return _OSM_HIGHWAY_MAP.get(tags.get("highway", ""), FacilityType.FUEL)
