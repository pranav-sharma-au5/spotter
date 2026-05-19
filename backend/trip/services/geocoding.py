"""Geocoding service — resolves address strings to coordinates."""
from trip.domain.models import Coordinate
from trip.services.map_client import AbstractMapClient


class GeocodingService:
    """Single responsibility: convert a human-readable address to a Coordinate."""

    def __init__(self, map_client: AbstractMapClient) -> None:
        self._client = map_client

    def geocode(self, address: str) -> Coordinate:
        """
        Resolve *address* to a lat/lng coordinate.

        Raises:
            GeocodingError: if the address cannot be found.
        """
        return self._client.geocode(address)

    def reverse_geocode(self, lat: float, lng: float) -> str:
        """Return 'City, ST' for coordinates, or '' on failure."""
        return self._client.reverse_geocode(lat, lng)
