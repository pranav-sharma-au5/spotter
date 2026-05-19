class HOSPlannerException(Exception):
    """Base exception for all HOS planner errors."""


class GeocodingError(HOSPlannerException):
    """Raised when an address cannot be geocoded."""


class RouteNotFoundError(HOSPlannerException):
    """Raised when no route can be calculated between waypoints."""


class FacilityDataError(HOSPlannerException):
    """Raised when the Overpass API call fails. Should be handled gracefully."""


class InsufficientCycleHoursError(HOSPlannerException):
    """Raised when cycle hours are exhausted and a restart cannot be accommodated."""


class InvalidTripRequestError(HOSPlannerException):
    """Raised when the trip request contains invalid or inconsistent data."""
