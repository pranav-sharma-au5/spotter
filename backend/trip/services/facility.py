"""Facility service — finds truck-relevant facilities along a route corridor."""
from __future__ import annotations

import logging

import httpx

_log = logging.getLogger(__name__)

from trip.domain.enums import FacilityType
from trip.domain.models import Coordinate, Facility, StopInfo
from trip.utils import haversine_miles, nearest_point_on_segment

# degrees latitude per mile (approximate)
_DEG_PER_MILE = 0.0145

# ORS POI category IDs (transport group = 580)
_ORS_POI_CATEGORIES = [
    596,  # fuel  (petrol / gas stations)
    590,  # car_repair  (best proxy for truck stops in ORS POI)
]

# ORS POI max LineString length is ~300 km; we stay well under it
_ORS_POI_MAX_CHUNK_KM = 250
# Maximum geometry points in a single Overpass around() query
_MAX_AROUND_POINTS = 60


class FacilityService:
    """
    Finds fuel stations and truck-stop-like facilities along a route corridor.

    Primary source: ORS POI API (uses the same API key as routing).
    Fallback: Overpass API (used when ORS POI key is not available).
    """

    _METRES_PER_MILE = 1_609.344

    def __init__(
        self,
        overpass_url: str = "https://overpass-api.de/api/interpreter",
        corridor_miles: float = 5.0,
        ors_base_url: str = "https://api.openrouteservice.org",
        ors_api_key: str = "",
    ) -> None:
        self._overpass_url = overpass_url
        self._corridor_miles = corridor_miles
        self._ors_base_url = ors_base_url.rstrip("/")
        self._ors_api_key = ors_api_key

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_facilities(self, route_geometry: list[Coordinate]) -> list[Facility]:
        """
        Return all facilities within *corridor_miles* of the route, sorted
        by their projected mile marker from the start of the route.

        Raises:
            FacilityDataError: if every data source fails.
        """
        from trip.exceptions import FacilityDataError

        if not route_geometry:
            return []

        cumulative_miles = self._cumulative_miles(route_geometry)

        # Try ORS POI first (fast, targeted corridor query)
        if self._ors_api_key:
            try:
                raw_nodes = self._query_ors_pois(route_geometry)
                _log.info("ORS POI returned %d raw nodes", len(raw_nodes))
                facilities = self._build_facilities(raw_nodes, route_geometry, cumulative_miles)
                _log.info("ORS POI facilities after corridor filter: %d", len(facilities))
                return facilities
            except FacilityDataError as exc:
                _log.warning("ORS POI failed, falling back to Overpass: %s", exc)

        # Fallback: Overpass with around() for long routes, bbox for short ones
        south, west, north, east = self._bounding_box(route_geometry)
        bbox_area = (north - south) * (east - west)
        _log.info("Overpass fallback — bbox area=%.1f deg²", bbox_area)
        if bbox_area > 10.0:
            raw_nodes = self._query_overpass_around(route_geometry)
        else:
            raw_nodes = self._query_overpass_bbox(south, west, north, east)

        _log.info("Overpass returned %d raw nodes", len(raw_nodes))
        return self._build_facilities(raw_nodes, route_geometry, cumulative_miles)

    # ------------------------------------------------------------------
    # Targeted single-point lookup (used by TripPlannerService per stop)
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

        # Project each feature onto the segment, pick the one with the
        # highest mile value (closest to the deadline end of the segment).
        cum = self._cumulative_miles(segment)
        best_facility: Facility | None = None
        best_mile = -1.0

        for feat in features:
            coords = feat.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2:
                continue
            props = feat.get("properties", {})
            category_ids: dict = props.get("category_ids", {})
            ors_type = "truck_stop" if "590" in category_ids else "fuel"
            name = (props.get("osm_tags") or {}).get("name", "") or ors_type.replace("_", " ").title()

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

    def find_nearest_facility(self, lat: float, lng: float) -> Facility | None:
        """
        Return the nearest fuel station or truck stop within *corridor_miles*
        of the given coordinate, or None if the ORS POI call fails or nothing
        is found.

        This is a cheap Point query — one API call per stop — rather than
        scanning the entire route.
        """
        if not self._ors_api_key:
            return None

        buffer_m = min(self._ORS_MAX_BUFFER_M, int(self._corridor_miles * self._METRES_PER_MILE))
        body = {
            "request": "pois",
            "geometry": {
                "geojson": {"type": "Point", "coordinates": [lng, lat]},
                "buffer": buffer_m,
            },
            "filters": {"category_ids": _ORS_POI_CATEGORIES},
            "sortby": "distance",
            "limit": 1,
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
                timeout=10.0,
            )
            if not response.is_success:
                return None
        except httpx.HTTPError:
            return None

        features = response.json().get("features", [])
        if not features:
            return None

        feat = features[0]
        coords = feat.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            return None

        props = feat.get("properties", {})
        category_ids: dict = props.get("category_ids", {})
        ors_type = "truck_stop" if "590" in category_ids else "fuel"
        name = (props.get("osm_tags") or {}).get("name", "") or ors_type.replace("_", " ").title()

        return Facility(
            id=str(props.get("osm_id", "")),
            name=name,
            type=self._classify({"_ors_type": ors_type}),
            lat=coords[1],
            lng=coords[0],
            miles_from_start=0.0,
            stop_info=self._stop_info_from_props(props),
        )

    # ------------------------------------------------------------------
    # ORS POI
    # ------------------------------------------------------------------

    # ORS POI buffer is capped at 2000 m by the API
    _ORS_MAX_BUFFER_M = 2000

    def _query_ors_pois(self, geometry: list[Coordinate]) -> list[dict]:
        """
        Query the ORS POI endpoint in chunks ≤ 250 km to stay under the
        server's LineString length limit, then combine all results.

        Returns normalised node dicts compatible with the Overpass shape:
          { "id": str, "lat": float, "lon": float, "tags": {...} }
        """
        import math as _math

        chunks = self._split_geometry_by_km(geometry, _ORS_POI_MAX_CHUNK_KM)
        _log.info("ORS POI: querying %d chunk(s) for %d geometry points", len(chunks), len(geometry))

        all_nodes: list[dict] = []
        seen_ids: set[str] = set()

        for chunk in chunks:
            nodes = self._query_ors_pois_chunk(chunk)
            for n in nodes:
                if n["id"] not in seen_ids:
                    seen_ids.add(n["id"])
                    all_nodes.append(n)

        return all_nodes

    def _split_geometry_by_km(
        self, geometry: list[Coordinate], max_km: float
    ) -> list[list[Coordinate]]:
        """Split geometry into consecutive segments whose total length ≤ max_km."""
        import math as _math

        _KM_PER_MILE = 1.60934
        chunks: list[list[Coordinate]] = []
        current: list[Coordinate] = [geometry[0]]
        current_km = 0.0

        for i in range(1, len(geometry)):
            prev, curr = geometry[i - 1], geometry[i]
            seg_km = haversine_miles(prev.lat, prev.lng, curr.lat, curr.lng) * _KM_PER_MILE
            if current_km + seg_km > max_km and len(current) >= 2:
                chunks.append(current)
                current = [prev, curr]
                current_km = seg_km
            else:
                current.append(curr)
                current_km += seg_km

        if len(current) >= 2:
            chunks.append(current)
        elif chunks:
            chunks[-1].append(geometry[-1])

        return chunks

    def _query_ors_pois_chunk(self, chunk: list[Coordinate]) -> list[dict]:
        """Single ORS POI request for one geometry chunk."""
        from trip.exceptions import FacilityDataError

        buffer_m = min(self._ORS_MAX_BUFFER_M, int(self._corridor_miles * self._METRES_PER_MILE))
        coordinates = [[c.lng, c.lat] for c in chunk]

        body = {
            "request": "pois",
            "geometry": {
                "geojson": {"type": "LineString", "coordinates": coordinates},
                "buffer": buffer_m,
            },
            "filters": {"category_ids": _ORS_POI_CATEGORIES},
            "limit": 2000,
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
                timeout=30.0,
            )
            if not response.is_success:
                try:
                    detail = response.json()
                except Exception:
                    detail = response.text
                raise FacilityDataError(
                    f"ORS POI chunk failed ({response.status_code}): {detail}"
                )
        except httpx.HTTPError as exc:
            raise FacilityDataError(f"ORS POI chunk request failed: {exc}") from exc

        nodes: list[dict] = []
        for feat in response.json().get("features", []):
            coords = feat.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2:
                continue
            props = feat.get("properties", {})
            # category_ids keys are strings in the JSON response
            category_ids: dict = props.get("category_ids", {})
            ors_type = "truck_stop" if "590" in category_ids else "fuel"
            name = (props.get("osm_tags") or {}).get("name", "") or ors_type.replace("_", " ").title()
            nodes.append({
                "id": str(props.get("osm_id", "")),
                "lat": coords[1],
                "lon": coords[0],
                "tags": {"name": name, "_ors_type": ors_type},
            })

        return nodes

    # ------------------------------------------------------------------
    # Overpass (fallback)
    # ------------------------------------------------------------------

    def _query_overpass_bbox(
        self, south: float, west: float, north: float, east: float
    ) -> list[dict]:
        """Overpass bbox query — suitable for short/regional routes."""
        from trip.exceptions import FacilityDataError

        bbox = f"{south},{west},{north},{east}"
        query = (
            f"[out:json][timeout:60];\n"
            f"(\n"
            f'  node["amenity"="fuel"]({bbox});\n'
            f'  node["amenity"="truck_stop"]({bbox});\n'
            f'  node["highway"="rest_area"]({bbox});\n'
            f'  node["amenity"="rest_area"]({bbox});\n'
            f'  node["highway"="services"]({bbox});\n'
            f");\n"
            f"out body;"
        )
        return self._run_overpass(query)

    def _query_overpass_around(self, geometry: list[Coordinate]) -> list[dict]:
        """
        Overpass around() query on sampled route points.
        Avoids giant-bbox timeouts for long routes.
        """
        radius_m = int(self._corridor_miles * self._METRES_PER_MILE)

        step = max(1, len(geometry) // _MAX_AROUND_POINTS)
        sampled = list(geometry[::step])
        if geometry[-1] not in sampled:
            sampled.append(geometry[-1])

        # Correct Overpass around() format: RADIUS,lat1,lng1,lat2,lng2,...
        coord_str = ",".join(f"{c.lat},{c.lng}" for c in sampled)
        around = f"around:{radius_m},{coord_str}"

        query = (
            f"[out:json][timeout:60];\n"
            f"(\n"
            f'  node["amenity"="fuel"]({around});\n'
            f'  node["amenity"="truck_stop"]({around});\n'
            f'  node["highway"="rest_area"]({around});\n'
            f'  node["amenity"="rest_area"]({around});\n'
            f'  node["highway"="services"]({around});\n'
            f");\n"
            f"out body;"
        )
        return self._run_overpass(query)

    def _run_overpass(self, query: str) -> list[dict]:
        from trip.exceptions import FacilityDataError

        try:
            response = httpx.post(
                self._overpass_url,
                data={"data": query},
                timeout=65.0,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise FacilityDataError(f"Overpass API request failed: {exc}") from exc

        return response.json().get("elements", [])

    # ------------------------------------------------------------------
    # Shared projection + classification
    # ------------------------------------------------------------------

    def _build_facilities(
        self,
        raw_nodes: list[dict],
        route_geometry: list[Coordinate],
        cumulative_miles: list[float],
    ) -> list[Facility]:
        facilities: list[Facility] = []

        for node in raw_nodes:
            fac_lat = node["lat"]
            fac_lng = node["lon"]

            result = self._project_onto_route(
                fac_lat, fac_lng, route_geometry, cumulative_miles
            )
            if result is None:
                continue

            miles_from_start, perp_dist_miles = result
            if perp_dist_miles > self._corridor_miles:
                continue

            fac_type = self._classify(node.get("tags", {}))
            name = node.get("tags", {}).get("name", "") or fac_type.value.replace("_", " ").title()

            facilities.append(
                Facility(
                    id=str(node["id"]),
                    name=name,
                    type=fac_type,
                    lat=fac_lat,
                    lng=fac_lng,
                    miles_from_start=round(miles_from_start, 2),
                )
            )

        return sorted(facilities, key=lambda f: f.miles_from_start)

    # ------------------------------------------------------------------
    # Geometry helpers
    # ------------------------------------------------------------------

    def _bounding_box(self, geometry: list[Coordinate]) -> tuple[float, float, float, float]:
        lats = [c.lat for c in geometry]
        lngs = [c.lng for c in geometry]
        buf = self._corridor_miles * _DEG_PER_MILE
        return (min(lats) - buf, min(lngs) - buf, max(lats) + buf, max(lngs) + buf)

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
    def _stop_info_from_props(props: dict) -> StopInfo:
        """Extract StopInfo from an ORS POI feature's properties dict."""
        tags: dict = props.get("osm_tags") or {}
        category_ids: dict = props.get("category_ids", {})
        # Derive a human-readable category label
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
        ors_type = tags.get("_ors_type", "")
        if ors_type == "truck_stop":
            return FacilityType.TRUCK_STOP
        amenity = tags.get("amenity", "")
        highway = tags.get("highway", "")
        if amenity == "truck_stop":
            return FacilityType.TRUCK_STOP
        if highway in ("rest_area", "services") or amenity == "rest_area":
            return FacilityType.REST_AREA
        return FacilityType.FUEL
