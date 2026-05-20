"""Map domain exceptions to DRF responses."""
from __future__ import annotations

import logging
from collections.abc import Callable
from typing import TypeVar

from rest_framework.response import Response

from trip.domain.exceptions import (
    FacilityDataError,
    GeocodingError,
    InsufficientCycleHoursError,
    RouteNotFoundError,
)

_log = logging.getLogger(__name__)
T = TypeVar("T")


def handle_planning_errors(fn: Callable[[], T]) -> T | Response:
    try:
        return fn()
    except GeocodingError as exc:
        return Response(
            {"error": "location_not_found", "detail": str(exc)},
            status=400,
        )
    except RouteNotFoundError as exc:
        return Response(
            {"error": "route_not_found", "detail": str(exc)},
            status=400,
        )
    except InsufficientCycleHoursError as exc:
        return Response(
            {"error": "insufficient_hours", "detail": str(exc)},
            status=422,
        )
    except FacilityDataError as exc:
        return Response(
            {"error": "facility_data_unavailable", "detail": str(exc)},
            status=503,
        )
    except Exception:  # noqa: BLE001
        _log.exception("Unhandled error in trip planning view")
        return Response(
            {"error": "internal_error", "detail": "An unexpected error occurred."},
            status=500,
        )
