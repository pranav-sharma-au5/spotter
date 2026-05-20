class HOSPlannerException(Exception):
    """Base exception for all HOS planner errors."""


class GeocodingError(HOSPlannerException):
    """Raised when an address cannot be geocoded."""


class RouteNotFoundError(HOSPlannerException):
    """Raised when no route can be calculated between waypoints."""


class FacilityDataError(HOSPlannerException):
    """Raised when an ORS POI API call fails unrecoverably."""


class InsufficientCycleHoursError(HOSPlannerException):
    """Raised when cycle hours are exhausted and a restart cannot be accommodated."""
