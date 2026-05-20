# Generated manually for local verification suite

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="VerificationRoute",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=128)),
                ("current_location", models.CharField(max_length=500)),
                ("pickup_location", models.CharField(max_length=500)),
                ("dropoff_location", models.CharField(max_length=500)),
                ("expected_miles", models.FloatField()),
                ("expected_min_days", models.PositiveSmallIntegerField()),
                ("expected_max_days", models.PositiveSmallIntegerField()),
                ("cycle_used_hrs", models.FloatField(default=0.0)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("notes", models.TextField(blank=True, default="")),
            ],
            options={
                "ordering": ["sort_order", "slug"],
            },
        ),
        migrations.CreateModel(
            name="SavedTripPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("ok", "OK"),
                            ("failed", "Failed"),
                        ],
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("plan_json", models.JSONField(blank=True, default=dict)),
                ("ors_miles", models.FloatField(blank=True, null=True)),
                ("computed_at", models.DateTimeField(blank=True, null=True)),
                ("error_message", models.TextField(blank=True, default="")),
                (
                    "route",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="saved_plan",
                        to="trip.verificationroute",
                    ),
                ),
            ],
            options={
                "verbose_name": "saved trip plan",
            },
        ),
    ]
