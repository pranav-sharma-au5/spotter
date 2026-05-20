"""ORS POI API client for corridor facility search."""
from __future__ import annotations

import logging
from collections.abc import Callable

import httpx

from trip.core.constants import METRES_PER_MILE
from trip.domain.models import Coordinate
from trip.services.facility.constants import ORS_MAX_BUFFER_M, ORS_POI_CATEGORIES

_log = logging.getLogger(__name__)


class OrsPoiClient:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        corridor_miles: float,
        record_error: Callable[[str], None],
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._corridor_miles = corridor_miles
        self._record_error = record_error

    def fetch_features(self, segment: list[Coordinate]) -> list[dict]:
        if not self._api_key:
            self._record_error("ORS API key not configured")
            return []

        buffer_m = min(ORS_MAX_BUFFER_M, int(self._corridor_miles * METRES_PER_MILE))
        coordinates = [[c.lng, c.lat] for c in segment]

        body = {
            "request": "pois",
            "geometry": {
                "geojson": {"type": "LineString", "coordinates": coordinates},
                "buffer": buffer_m,
            },
            "filters": {"category_ids": ORS_POI_CATEGORIES},
            "limit": 100,
        }
        headers = {
            "Authorization": self._api_key,
            "Content-Type": "application/json",
        }

        try:
            response = httpx.post(
                f"{self._base_url}/pois",
                json=body,
                headers=headers,
                timeout=15.0,
            )
        except httpx.HTTPError as exc:
            self._record_error(f"ORS POI request failed: {exc}")
            _log.warning("ORS POI HTTP error: %s", exc)
            return []

        if not response.is_success:
            detail = response.text[:200]
            try:
                err_body = response.json()
                detail = str(err_body.get("error", detail))
            except ValueError:
                pass
            self._record_error(f"ORS POI {response.status_code}: {detail}")
            _log.warning("ORS POI returned %s: %s", response.status_code, detail)
            return []

        features = response.json().get("features", [])
        if not features:
            self._record_error("ORS POI returned no features for corridor segment")
        return features
