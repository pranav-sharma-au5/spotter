"""Local-only API for saved verification route plans."""
from __future__ import annotations

from django.conf import settings
from django.http import Http404, HttpResponse
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from trip.models import SavedTripPlan, VerificationRoute
from trip.verification_export import build_markdown


def verification_enabled() -> bool:
    return bool(settings.DEBUG or getattr(settings, "ENABLE_VERIFICATION", False))


def _require_verification() -> None:
    if not verification_enabled():
        raise Http404()


def _route_meta(route: VerificationRoute) -> dict:
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


def _summary_from_route(route: VerificationRoute) -> dict:
    try:
        saved = route.saved_plan
    except SavedTripPlan.DoesNotExist:
        saved = None

    if saved is None:
        return {
            **_route_meta(route),
            "status": "not_seeded",
            "ors_miles": None,
            "total_days": None,
            "computed_at": None,
            "error_message": "",
        }

    plan = saved.plan_json.get("plan", {}) if saved.plan_json else {}
    summary = plan.get("summary") or {}
    return {
        **_route_meta(route),
        "status": saved.status,
        "ors_miles": saved.ors_miles,
        "total_days": summary.get("total_days"),
        "computed_at": saved.computed_at.isoformat() if saved.computed_at else None,
        "error_message": saved.error_message,
    }


class VerificationRouteListView(APIView):
    """GET /api/v1/verification/routes/"""

    def get(self, request: Request) -> Response:
        _require_verification()
        routes = VerificationRoute.objects.select_related("saved_plan").all()
        return Response([_summary_from_route(r) for r in routes])


class VerificationRouteDetailView(APIView):
    """GET /api/v1/verification/routes/<slug>/"""

    def get(self, request: Request, slug: str) -> Response:
        _require_verification()
        try:
            route = VerificationRoute.objects.select_related("saved_plan").get(slug=slug)
        except VerificationRoute.DoesNotExist as exc:
            raise Http404 from exc

        try:
            saved = route.saved_plan
        except SavedTripPlan.DoesNotExist:
            saved = None

        if saved is None:
            return Response(
                {
                    "route": _route_meta(route),
                    "status": "not_seeded",
                    "request": None,
                    "plan": None,
                    "route_result": None,
                    "error_message": "",
                },
                status=200,
            )

        payload = saved.plan_json or {}
        return Response(
            {
                "route": _route_meta(route),
                "status": saved.status,
                "request": payload.get("request"),
                "plan": payload.get("plan"),
                "route_result": payload.get("route"),
                "ors_miles": saved.ors_miles,
                "computed_at": saved.computed_at.isoformat() if saved.computed_at else None,
                "error_message": saved.error_message,
            },
            status=200,
        )


class VerificationRouteExportView(APIView):
    """GET /api/v1/verification/routes/<slug>/export/ — Markdown for LLM review."""

    def get(self, request: Request, slug: str) -> HttpResponse:
        _require_verification()
        try:
            route = VerificationRoute.objects.select_related("saved_plan").get(slug=slug)
        except VerificationRoute.DoesNotExist as exc:
            raise Http404 from exc

        try:
            saved = route.saved_plan
        except SavedTripPlan.DoesNotExist as exc:
            raise Http404 from exc

        if saved.status != SavedTripPlan.Status.OK or not saved.plan_json:
            raise Http404

        meta = _route_meta(route)
        payload = {**saved.plan_json, "ors_miles": saved.ors_miles}
        body = build_markdown(meta, payload)
        return HttpResponse(body, content_type="text/markdown; charset=utf-8")
