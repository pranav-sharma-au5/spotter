"""Seed verification routes and compute saved trip plans."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import CommandError
from django.utils import timezone

from trip.domain.models import TripRequest
from trip.domain.exceptions import (
    FacilityDataError,
    GeocodingError,
    InsufficientCycleHoursError,
    RouteNotFoundError,
)
from trip.models import SavedTripPlan, VerificationRoute
from trip.services.trip_planner import TripPlannerService
from trip.verification.data import VERIFICATION_ROUTE_DEFS
from trip.verification.export import build_markdown
from trip.core.wiring import build_planner


class VerificationSeeder:
    def __init__(self, stdout, stderr, style) -> None:
        self.stdout = stdout
        self.stderr = stderr
        self.style = style

    def run(self, options: dict[str, Any]) -> None:
        if not settings.DEBUG and not getattr(settings, "ENABLE_VERIFICATION", False):
            raise CommandError(
                "Set DEBUG=True or ENABLE_VERIFICATION=1 in .env before seeding."
            )

        if not settings.DATABASES:
            raise CommandError("DATABASES is empty — enable verification in settings first.")

        fixture_path = options["from_fixture"]
        fixture_data: dict[str, dict] = {}
        if fixture_path:
            path = Path(fixture_path)
            if not path.is_file():
                raise CommandError(f"Fixture not found: {path}")
            fixture_data = json.loads(path.read_text(encoding="utf-8"))

        if options["export_md"] and not fixture_path:
            export_dir = Path(settings.BASE_DIR) / "verification_exports"
            export_dir.mkdir(parents=True, exist_ok=True)
            scores_template = export_dir / "SCORES.md"
            if not scores_template.exists():
                scores_template.write_text(
                    "# Verification LLM scores\n\n"
                    "| Route | Distance | Duration | HOS | Geography | ELD | Overall | Notes |\n"
                    "|-------|----------|----------|-----|-----------|-----|---------|-------|\n",
                    encoding="utf-8",
                )

        planner = build_planner() if not fixture_path else None
        rows: list[str] = []

        route_defs = VERIFICATION_ROUTE_DEFS
        if options["slugs"]:
            slug_set = set(options["slugs"])
            route_defs = [r for r in route_defs if r["slug"] in slug_set]
            unknown = slug_set - {r["slug"] for r in route_defs}
            if unknown:
                known = ", ".join(r["slug"] for r in VERIFICATION_ROUTE_DEFS)
                raise CommandError(
                    f"Unknown slug(s): {', '.join(sorted(unknown))}. Known: {known}"
                )

        for route_def in route_defs:
            route, _ = VerificationRoute.objects.update_or_create(
                slug=route_def["slug"],
                defaults={
                    "name": route_def["name"],
                    "current_location": route_def["current_location"],
                    "pickup_location": route_def["pickup_location"],
                    "dropoff_location": route_def["dropoff_location"],
                    "expected_miles": route_def["expected_miles"],
                    "expected_min_days": route_def["expected_min_days"],
                    "expected_max_days": route_def["expected_max_days"],
                    "cycle_used_hrs": route_def["cycle_used_hrs"],
                    "sort_order": route_def["sort_order"],
                    "notes": route_def["notes"],
                },
            )

            saved, _ = SavedTripPlan.objects.get_or_create(
                route=route,
                defaults={"status": SavedTripPlan.Status.PENDING},
            )

            if (
                not options["force"]
                and saved.status == SavedTripPlan.Status.OK
                and saved.plan_json
                and not fixture_path
            ):
                self.stdout.write(f"  skip {route.slug} (already ok, use --force)")
                rows.append(self._row(route, saved))
                if options["export_md"]:
                    self._write_export(route, saved)
                continue

            if fixture_path:
                payload = fixture_data.get(route.slug)
                if not payload:
                    self.stderr.write(f"  missing fixture for {route.slug}")
                    continue
                saved.plan_json = payload
                saved.ors_miles = payload.get("ors_miles")
                saved.status = SavedTripPlan.Status.OK
                saved.error_message = ""
                saved.computed_at = timezone.now()
                saved.save()
                rows.append(self._row(route, saved))
                continue

            trip_request = TripRequest(
                current_location=route.current_location,
                pickup_location=route.pickup_location,
                dropoff_location=route.dropoff_location,
                cycle_used_hrs=route.cycle_used_hrs,
            )

            self.stdout.write(f"  planning {route.slug}...")
            try:
                assert planner is not None
                self._plan_route(planner, trip_request, saved)
                self.stdout.write(self.style.SUCCESS(f"  ok {route.slug}"))
            except (
                GeocodingError,
                RouteNotFoundError,
                InsufficientCycleHoursError,
                FacilityDataError,
            ) as exc:
                self._mark_failed(saved, str(exc))
                self.stderr.write(self.style.ERROR(f"  failed {route.slug}: {exc}"))
            except Exception as exc:
                self._mark_failed(saved, str(exc))
                self.stderr.write(self.style.ERROR(f"  error {route.slug}: {exc}"))
                raise

            rows.append(self._row(route, saved))
            if options["export_md"] and saved.status == SavedTripPlan.Status.OK:
                self._write_export(route, saved)

        self.stdout.write("\n" + "=" * 72)
        self.stdout.write(f"{'slug':<22} {'exp mi':>8} {'ors mi':>8} {'days':>5} {'status':<8}")
        self.stdout.write("-" * 72)
        for row in rows:
            self.stdout.write(row)

    @staticmethod
    def _plan_route(
        planner: TripPlannerService,
        trip_request: TripRequest,
        saved: SavedTripPlan,
    ) -> None:
        route_result = planner.resolve_route(trip_request)
        schedule = planner.build_schedule(route_result, trip_request.cycle_used_hrs)
        plan = planner.enrich_and_summarize(
            route_result, schedule, trip_request.cycle_used_hrs
        )
        saved.plan_json = {
            "request": trip_request.model_dump(mode="json"),
            "plan": plan.model_dump(mode="json"),
            "route": route_result.model_dump(mode="json"),
        }
        saved.ors_miles = route_result.total_distance_miles
        saved.status = SavedTripPlan.Status.OK
        saved.error_message = ""
        saved.computed_at = timezone.now()
        saved.save()

    @staticmethod
    def _mark_failed(saved: SavedTripPlan, message: str) -> None:
        saved.status = SavedTripPlan.Status.FAILED
        saved.error_message = message
        saved.computed_at = timezone.now()
        saved.save()

    def _row(self, route: VerificationRoute, saved: SavedTripPlan) -> str:
        days = "—"
        if saved.plan_json and saved.plan_json.get("plan", {}).get("summary"):
            days = str(saved.plan_json["plan"]["summary"].get("total_days", "—"))
        ors = f"{saved.ors_miles:.0f}" if saved.ors_miles else "—"
        return (
            f"{route.slug:<22} {route.expected_miles:>8.0f} {ors:>8} {days:>5} "
            f"{saved.status:<8}"
        )

    def _write_export(self, route: VerificationRoute, saved: SavedTripPlan) -> None:
        export_dir = Path(settings.BASE_DIR) / "verification_exports"
        export_dir.mkdir(parents=True, exist_ok=True)
        meta = {
            "slug": route.slug,
            "name": route.name,
            "current_location": route.current_location,
            "pickup_location": route.pickup_location,
            "dropoff_location": route.dropoff_location,
            "expected_miles": route.expected_miles,
            "expected_min_days": route.expected_min_days,
            "expected_max_days": route.expected_max_days,
        }
        payload = {**saved.plan_json, "ors_miles": saved.ors_miles}
        path = export_dir / f"{route.slug}.md"
        path.write_text(build_markdown(meta, payload), encoding="utf-8")
        self.stdout.write(f"  exported {path}")
