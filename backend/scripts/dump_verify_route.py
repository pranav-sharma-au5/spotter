"""Dump non-drive events for a verification route slug."""
import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from trip.models import SavedTripPlan

slug = sys.argv[1] if len(sys.argv) > 1 else "seattle_miami"
sp = SavedTripPlan.objects.select_related("route").get(route__slug=slug)
plan = sp.plan_json["plan"]
for day in plan["days"]:
    print(f"=== Day {day['day_number']} ===")
    for e in day["events"]:
        if e["type"] != "drive":
            loc = (e.get("location") or "")[:60]
            print(
                f"  {e['type']:8} +{e['miles_from_prev']:6.0f} mi  "
                f"{e['duration_hrs']}h  {e['label']} @ {loc}"
            )
