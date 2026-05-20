"""Facility service — finds truck-relevant facilities along a route corridor."""
from __future__ import annotations

import logging
import threading

import httpx

from trip.domain.enums import EventType, FacilityType
from trip.domain.models import Coordinate, Facility, StopInfo
from trip.utils import haversine_miles, nearest_point_on_segment

_log = logging.getLogger(__name__)

# ORS POI category IDs (transport group = 580)
_ORS_POI_CATEGORIES = [
    596,  # fuel  (petrol / gas stations)
    590,  # car_repair  (best proxy for truck stops in ORS POI)
]

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

# Category placeholders returned when OSM has almost no tags.
_MACHINE_PLACEHOLDERS: frozenset[str] = frozenset({
    "fuel",
    "gas",
    "gas station",
    "petrol",
    "filling station",
    "service station",
    "car repair",
    "car_repair",
})

# Single-word brand labels — need city/ref to be useful stop names.
_GENERIC_BRANDS: frozenset[str] = frozenset({
    "shell",
    "sinclair",
    "bp",
    "chevron",
    "exxon",
    "mobil",
    "marathon",
    "phillips 66",
    "76",
    "speedway",
    "casey's",
    "kwik trip",
    "circle k",
    "valero",
    "conoco",
    "sunoco",
    "citgo",
    "arco",
})

# Prefer POIs within this many miles of the segment end (HOS deadline).
_PICK_MILE_WINDOW = 30.0


class FacilityService:
    """Finds fuel stations and truck-stop-like facilities along a route corridor via the ORS POI API."""

    _ORS_MAX_BUFFER_M = 2000
    _METRES_PER_MILE = 1_609.344

    # OSM tag keys — each non-empty value counts toward POI richness.
    _RICHNESS_TAG_KEYS: tuple[str, ...] = (
        "name",
        "brand",
        "operator",
        "official_name",
        "alt_name",
        "ref",
        "ref:TA",
        "phone",
        "website",
        "opening_hours",
        "addr:city",
        "addr:town",
        "addr:village",
        "addr:state",
        "addr:street",
        "addr:postcode",
        "addr:full",
        "amenity",
        "highway",
        "is_in",
    )

    def __init__(
        self,
        corridor_miles: float = 5.0,
        ors_base_url: str = "https://api.openrouteservice.org",
        ors_api_key: str = "",
    ) -> None:
        self._corridor_miles = corridor_miles
        self._ors_base_url = ors_base_url.rstrip("/")
        self._ors_api_key = ors_api_key
        self._poi_errors: list[str] = []
        self._poi_errors_lock = threading.Lock()

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
        """
        Find the best facility along *segment* (a short slice of the route).

        Every POI in the corridor is scored by how many metadata fields are
        populated (city, phone, website, brand, ref, etc.). The POI with the
        highest count wins; ties go to the one closest to the HOS deadline
        (farther along the segment).
        """
        if not self._ors_api_key or len(segment) < 2:
            if not self._ors_api_key:
                self._record_poi_error("ORS API key not configured")
            return None

        features = self._fetch_poi_features(segment)
        if not features:
            return None

        cum = self._cumulative_miles(segment)
        candidates: list[tuple[float, int, Facility, bool]] = []

        for feat in features:
            point = self._feature_point(feat)
            if point is None:
                continue
            fac_lat, fac_lng = point
            props = feat.get("properties", {})
            tags: dict = props.get("osm_tags") or {}
            name, ors_type = self._parse_ors_feature(feat)
            stop_info = self._stop_info_from_props(props)
            result = self._project_onto_route(fac_lat, fac_lng, segment, cum)
            if result is None:
                continue
            mile_in_seg, perp_dist = result
            if perp_dist > self._corridor_miles:
                continue

            field_count = self._populated_field_count(
                tags, stop_info, name, ors_type, event_type
            )
            has_quality = FacilityService._has_quality_label(name, stop_info)
            candidates.append(
                (
                    mile_in_seg,
                    field_count,
                    Facility(
                        id=str(props.get("osm_id", "")),
                        name=name,
                        type=self._classify({"_ors_type": ors_type, **tags}),
                        lat=fac_lat,
                        lng=fac_lng,
                        miles_from_start=0.0,
                        stop_info=stop_info,
                    ),
                    has_quality,
                )
            )

        return self._select_best_candidate(candidates)

    def _fetch_poi_features(self, segment: list[Coordinate]) -> list[dict]:
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
        except httpx.HTTPError as exc:
            self._record_poi_error(f"ORS POI request failed: {exc}")
            _log.warning("ORS POI HTTP error: %s", exc)
            return []

        if not response.is_success:
            detail = response.text[:200]
            try:
                err_body = response.json()
                detail = str(err_body.get("error", detail))
            except ValueError:
                pass
            self._record_poi_error(f"ORS POI {response.status_code}: {detail}")
            _log.warning("ORS POI returned %s: %s", response.status_code, detail)
            return []

        features = response.json().get("features", [])
        if not features:
            self._record_poi_error("ORS POI returned no features for corridor segment")
        return features

    @staticmethod
    def _feature_point(feat: dict) -> tuple[float, float] | None:
        """Extract (lat, lng) from a GeoJSON Point POI feature."""
        geometry = feat.get("geometry") or {}
        coords = geometry.get("coordinates")
        if not isinstance(coords, (list, tuple)) or len(coords) < 2:
            return None
        lng, lat = float(coords[0]), float(coords[1])
        return lat, lng

    @staticmethod
    def _select_best_candidate(
        candidates: list[tuple[float, int, Facility, bool]],
    ) -> Facility | None:
        if not candidates:
            return None
        max_mile = max(m for m, _, _, _ in candidates)
        in_window = [c for c in candidates if c[0] >= max_mile - _PICK_MILE_WINDOW]
        pool = in_window or candidates
        quality = [c for c in pool if c[3]]
        pool = quality if quality else pool
        _, _, best, _ = max(pool, key=lambda item: (item[1], item[0]))
        return best

    @staticmethod
    def is_generic_brand_name(name: str) -> bool:
        normalized = (name or "").strip().lower()
        if normalized in _GENERIC_BRANDS:
            return True
        words = normalized.split()
        return len(words) == 1 and words[0] in _GENERIC_BRANDS

    @staticmethod
    def _has_quality_label(name: str, stop_info: StopInfo) -> bool:
        if (stop_info.city or "").strip():
            return True
        if name and not FacilityService.is_machine_display_name(name):
            if not FacilityService.is_generic_brand_name(name):
                return True
            if "," in name or "#" in name:
                return True
        return False

    @staticmethod
    def _populated_field_count(
        tags: dict,
        stop_info: StopInfo,
        display_name: str,
        ors_type: str,
        event_type: EventType | None,
    ) -> int:
        """Count non-empty metadata fields — higher means a more grounded stop label."""
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
        if cat and cat not in _MACHINE_PLACEHOLDERS:
            count += 1

        for key in FacilityService._RICHNESS_TAG_KEYS:
            val = (tags.get(key) or "").strip()
            if not val:
                continue
            if key in ("name", "brand") and (
                FacilityService.is_machine_display_name(val)
                or FacilityService.is_generic_brand_name(val)
            ):
                continue
            count += 1

        if display_name and FacilityService._has_quality_label(display_name, stop_info):
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

        return count

    @staticmethod
    def is_machine_display_name(name: str) -> bool:
        """True for category placeholders like 'Fuel' with no real POI identity."""
        normalized = (name or "").strip().lower()
        if normalized in _MACHINE_PLACEHOLDERS:
            return True
        return FacilityService.is_generic_brand_name(name)

    @staticmethod
    def location_with_city(
        placeholder: str, city: str, event_type: EventType
    ) -> str:
        """Upgrade a machine placeholder using reverse-geocoded city."""
        if not city:
            return placeholder
        label = placeholder.strip()
        if FacilityService.is_generic_brand_name(label):
            if city.lower() not in label.lower():
                return f"{label}, {city}"
            return label
        if FacilityService.is_machine_display_name(label):
            if event_type in (EventType.REST, EventType.RESTART):
                return f"Rest Stop, {city}"
            return f"Gas Station, {city}"
        if city.lower() not in label.lower():
            return f"{label}, {city}"
        return label

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
        props = feat.get("properties", {})
        category_ids: dict = props.get("category_ids", {})
        tags: dict = props.get("osm_tags") or {}
        ors_type = "truck_stop" if "590" in category_ids else "fuel"
        name = FacilityService._format_facility_name(tags, category_ids, ors_type)
        return name, ors_type

    @staticmethod
    def _format_facility_name(
        tags: dict, category_ids: dict, ors_type: str
    ) -> str:
        """Prefer brand/name tags; never emit a bare 'Fuel' category label."""
        raw_name = (tags.get("name") or "").strip()
        brand = (tags.get("brand") or tags.get("operator") or "").strip()
        ref = (tags.get("ref") or tags.get("ref:TA") or "").strip()
        official = (tags.get("official_name") or tags.get("alt_name") or "").strip()
        city_state = FacilityService._city_state_from_tags(tags)

        label = ""
        for candidate in (raw_name, official, brand):
            if candidate and not FacilityService.is_machine_display_name(candidate):
                label = candidate
                break

        if not label and brand:
            label = brand
        if not label and raw_name:
            label = raw_name

        if not label:
            label = FacilityService._amenity_label(tags, ors_type)

        if ref and ref not in label:
            label = f"{label} #{ref}" if "#" not in label else label

        if city_state and city_state.lower() not in label.lower():
            label = f"{label}, {city_state}"

        return label[:120]

    @staticmethod
    def _amenity_label(tags: dict, ors_type: str) -> str:
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

    @staticmethod
    def _city_state_from_tags(tags: dict) -> str:
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

    @staticmethod
    def _stop_info_from_props(props: dict) -> StopInfo:
        tags: dict = props.get("osm_tags") or {}
        category_ids: dict = props.get("category_ids", {})
        cat_name = ""
        for v in category_ids.values():
            if isinstance(v, dict):
                cat = v.get("category_name", "").replace("_", " ").title()
                if cat.lower() not in _MACHINE_PLACEHOLDERS:
                    cat_name = cat
                break
        return StopInfo(
            category=cat_name,
            phone=tags.get("phone", ""),
            website=tags.get("website", ""),
            opening_hours=tags.get("opening_hours", ""),
            city=FacilityService._city_state_from_tags(tags),
        )

    @staticmethod
    def _classify(tags: dict) -> FacilityType:
        if t := _ORS_TYPE_MAP.get(tags.get("_ors_type", "")):
            return t
        if t := _OSM_AMENITY_MAP.get(tags.get("amenity", "")):
            return t
        return _OSM_HIGHWAY_MAP.get(tags.get("highway", ""), FacilityType.FUEL)
