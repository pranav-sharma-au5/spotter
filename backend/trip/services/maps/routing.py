"""Routing service — calculates a driving route through ordered waypoints."""
from trip.domain.models import Coordinate
from trip.services.maps.map_client import AbstractMapClient, RouteResult


class RoutingService:
    """Single responsibility: given a list of Coordinates, return a RouteResult."""

    def __init__(self, map_client: AbstractMapClient) -> None:
        self._client = map_client

    def get_route(self, waypoints: list[Coordinate]) -> RouteResult:
        """
        Compute a driving route through *waypoints* in order.

        Raises:
            RouteNotFoundError: if no route can be calculated.
        """
        return self._client.get_route(waypoints)
