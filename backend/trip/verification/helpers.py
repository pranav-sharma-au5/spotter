"""Verification route metadata and access control."""
from __future__ import annotations

from django.conf import settings
from django.http import Http404

from trip.models import SavedTripPlan, VerificationRoute


def verification_enabled() -> bool:
    return bool(settings.DEBUG or getattr(settings, "ENABLE_VERIFICATION", False))


def require_verification() -> None:
    if not verification_enabled():
        raise Http404()


def route_meta(route: VerificationRoute) -> dict:
    return {
        "slug": route.slug,
        "name": route.name,
        "current_location": route.current_location,
        "pickup_location": route.pickup_location,
        "dropoff_location": route.dropoff_location,
        "expected_miles": route.expected_miles,
        "expected_min_days": route.expected_min_days,
        "expected_max_days": route.expected_max_days,
        "cycle_used_hrs": route.cycle_used_hrs,
        "notes": route.notes,
    }


def summary_from_route(route: VerificationRoute) -> dict:
    try:
        saved = route.saved_plan
    except SavedTripPlan.DoesNotExist:
        saved = None

    if saved is None:
        return {
            **route_meta(route),
            "status": "not_seeded",
            "ors_miles": None,
            "total_days": None,
            "computed_at": None,
            "error_message": "",
        }

    plan = saved.plan_json.get("plan", {}) if saved.plan_json else {}
    summary = plan.get("summary") or {}
    return {
        **route_meta(route),
        "status": saved.status,
        "ors_miles": saved.ors_miles,
        "total_days": summary.get("total_days"),
        "computed_at": saved.computed_at.isoformat() if saved.computed_at else None,
        "error_message": saved.error_message,
    }
