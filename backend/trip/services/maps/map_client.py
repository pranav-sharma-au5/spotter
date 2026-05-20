"""Abstract map client and OpenRouteService implementation."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

import httpx
from pydantic import BaseModel

from trip.core.constants import METRES_PER_MILE
from trip.core.utils import haversine_miles
from trip.domain.exceptions import GeocodingError, RouteNotFoundError
from trip.domain.models import Coordinate

_log = logging.getLogger(__name__)


class RouteSegment(BaseModel):
    from_coord: Coordinate
    to_coord: Coordinate
    distance_miles: float
    duration_hrs: float


class RouteResult(BaseModel):
    segments: list[RouteSegment]
    total_distance_miles: float
    total_duration_hrs: float
    geometry: list[Coordinate]


class AbstractMapClient(ABC):
    @abstractmethod
    def geocode(self, address: str) -> Coordinate:
        """Resolve a human-readable address to a coordinate."""
        ...

    @abstractmethod
    def reverse_geocode(self, lat: float, lng: float) -> str:
        """Return a human-readable city/region string for coordinates, or ''."""
        ...

    @abstractmethod
    def get_route(self, waypoints: list[Coordinate]) -> RouteResult:
        """Return driving route through ordered waypoints."""
        ...


class OpenRouteServiceClient(AbstractMapClient):
    """Concrete map client backed by OpenRouteService."""

    def __init__(self, api_key: str, base_url: str = "https://api.openrouteservice.org") -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")

    def geocode(self, address: str) -> Coordinate:
        """Geocode an address string using the ORS geocode/search endpoint."""
        url = f"{self._base_url}/geocode/search"
        params = {"api_key": self._api_key, "text": address, "size": 1}

        try:
            response = httpx.get(url, params=params, timeout=10.0)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise GeocodingError(f"Geocoding request failed for '{address}': {exc}") from exc

        data = response.json()
        features = data.get("features", [])
        if not features:
            raise GeocodingError(f"No results found for address: '{address}'")

        lng, lat = features[0]["geometry"]["coordinates"]
        return Coordinate(lat=lat, lng=lng)

    def reverse_geocode(self, lat: float, lng: float) -> str:
        """
        Return 'City, ST' for a coordinate using the ORS reverse geocoding
        endpoint.  Returns an empty string on any failure.
        """
        url = f"{self._base_url}/geocode/reverse"
        params = {
            "api_key": self._api_key,
            "point.lat": lat,
            "point.lon": lng,
            "size": 1,
            "layers": "locality",
        }
        try:
            response = httpx.get(url, params=params, timeout=8.0)
            response.raise_for_status()
        except httpx.HTTPError:
            return ""

        features = response.json().get("features", [])
        if not features:
            return ""

        props = features[0].get("properties", {})
        city = props.get("locality", "") or props.get("name", "")
        region = props.get("region_a", "") or props.get("region", "")
        if city and region:
            return f"{city}, {region}"
        return city or region

    @staticmethod
    def _decode_polyline(encoded: str) -> list[Coordinate]:
        """Decode a Google/ORS encoded polyline (precision 5) into Coordinates."""
        coords: list[Coordinate] = []
        index, lat, lng = 0, 0, 0
        while index < len(encoded):
            for is_lng in (False, True):
                shift, result = 0, 0
                while True:
                    b = ord(encoded[index]) - 63
                    index += 1
                    result |= (b & 0x1F) << shift
                    shift += 5
                    if b < 0x20:
                        break
                value = ~(result >> 1) if result & 1 else result >> 1
                if is_lng:
                    lng += value
                else:
                    lat += value
            coords.append(Coordinate(lat=lat / 1e5, lng=lng / 1e5))
        return coords

    def get_route(self, waypoints: list[Coordinate]) -> RouteResult:
        """Get a driving-HGV route through the given waypoints via ORS directions."""
        if len(waypoints) < 2:
            raise RouteNotFoundError("At least two waypoints are required.")

        url = f"{self._base_url}/v2/directions/driving-car"
        snap_radius_m = 10_000
        body = {
            "coordinates": [[wp.lng, wp.lat] for wp in waypoints],
            "radiuses": [snap_radius_m] * len(waypoints),
            "instructions": False,
            "geometry": True,
        }
        headers = {
            "Authorization": self._api_key,
            "Content-Type": "application/json",
        }

        try:
            response = httpx.post(url, json=body, headers=headers, timeout=30.0)
            if not response.is_success:
                try:
                    ors_detail = response.json()
                except (ValueError, KeyError):
                    _log.debug("Could not parse ORS error body as JSON; falling back to text")
                    ors_detail = response.text
                raise RouteNotFoundError(
                    f"Routing request failed ({response.status_code}): {ors_detail}"
                )
        except httpx.HTTPError as exc:
            raise RouteNotFoundError(f"Routing request failed: {exc}") from exc

        data = response.json()
        try:
            route = data["routes"][0]
        except (KeyError, IndexError) as exc:
            raise RouteNotFoundError("ORS returned no routes.") from exc

        geometry = self._decode_polyline(route["geometry"])

        summary = route.get("summary", {})
        total_miles = summary.get("distance", 0) / METRES_PER_MILE
        total_hrs = summary.get("duration", 0) / 3_600.0

        raw_segments = route.get("segments", [])
        if raw_segments:
            segments = [
                RouteSegment(
                    from_coord=waypoints[i],
                    to_coord=waypoints[i + 1],
                    distance_miles=seg["distance"] / METRES_PER_MILE,
                    duration_hrs=seg["duration"] / 3_600.0,
                )
                for i, seg in enumerate(raw_segments)
            ]
        else:
            leg_dists = [
                haversine_miles(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng)
                for i in range(len(waypoints) - 1)
            ]
            total_hav = sum(leg_dists) or 1.0
            segments = [
                RouteSegment(
                    from_coord=waypoints[i],
                    to_coord=waypoints[i + 1],
                    distance_miles=total_miles * (leg_dists[i] / total_hav),
                    duration_hrs=total_hrs * (leg_dists[i] / total_hav),
                )
                for i in range(len(waypoints) - 1)
            ]

        return RouteResult(
            segments=segments,
            total_distance_miles=total_miles,
            total_duration_hrs=total_hrs,
            geometry=geometry,
        )
