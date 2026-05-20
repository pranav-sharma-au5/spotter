"""Django ORM models for local route verification (not used on Vercel production)."""
from __future__ import annotations

from django.db import models


class VerificationRoute(models.Model):
    slug = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    current_location = models.CharField(max_length=500)
    pickup_location = models.CharField(max_length=500)
    dropoff_location = models.CharField(max_length=500)
    expected_miles = models.FloatField()
    expected_min_days = models.PositiveSmallIntegerField()
    expected_max_days = models.PositiveSmallIntegerField()
    cycle_used_hrs = models.FloatField(default=0.0)
    sort_order = models.PositiveSmallIntegerField(default=0)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["sort_order", "slug"]

    def __str__(self) -> str:
        return self.name


class SavedTripPlan(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        OK = "ok", "OK"
        FAILED = "failed", "Failed"

    route = models.OneToOneField(
        VerificationRoute,
        on_delete=models.CASCADE,
        related_name="saved_plan",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    plan_json = models.JSONField(default=dict, blank=True)
    ors_miles = models.FloatField(null=True, blank=True)
    computed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "saved trip plan"

    def __str__(self) -> str:
        return f"{self.route.slug} ({self.status})"
