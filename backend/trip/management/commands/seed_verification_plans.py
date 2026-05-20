"""Seed verification routes and optionally compute plans via ORS."""
from __future__ import annotations

from django.core.management.base import BaseCommand

from trip.verification.seeder import VerificationSeeder


class Command(BaseCommand):
    help = "Upsert verification routes and compute trip plans (local testing only)."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--force",
            action="store_true",
            help="Recompute plans even if a successful plan already exists.",
        )
        parser.add_argument(
            "--export-md",
            action="store_true",
            help="Write backend/verification_exports/<slug>.md for each successful plan.",
        )
        parser.add_argument(
            "--from-fixture",
            type=str,
            default="",
            metavar="PATH",
            help="Load plan JSON from fixture file instead of calling ORS.",
        )
        parser.add_argument(
            "--slug",
            action="append",
            dest="slugs",
            metavar="SLUG",
            help="Only seed these route slugs (repeatable). Default: all routes.",
        )

    def handle(self, *args, **options) -> None:
        VerificationSeeder(self.stdout, self.stderr, self.style).run(options)
