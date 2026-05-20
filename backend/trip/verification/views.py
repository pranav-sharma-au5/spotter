"""Local-only API for saved verification route plans."""
from __future__ import annotations

from django.http import Http404, HttpResponse
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from trip.models import SavedTripPlan, VerificationRoute
from trip.verification.export import build_markdown
from trip.verification.helpers import require_verification, route_meta, summary_from_route


class VerificationRouteListView(APIView):
    """GET /api/v1/verification/routes/"""

    def get(self, request: Request) -> Response:
        require_verification()
        routes = VerificationRoute.objects.select_related("saved_plan").all()
        return Response([summary_from_route(r) for r in routes])


class VerificationRouteDetailView(APIView):
    """GET /api/v1/verification/routes/<slug>/"""

    def get(self, request: Request, slug: str) -> Response:
        require_verification()
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
                    "route": route_meta(route),
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
                "route": route_meta(route),
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
        require_verification()
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

        meta = route_meta(route)
        payload = {**saved.plan_json, "ors_miles": saved.ors_miles}
        body = build_markdown(meta, payload)
        return HttpResponse(body, content_type="text/markdown; charset=utf-8")
