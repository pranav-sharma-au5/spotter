# Trip app — where to start

This Django app turns three addresses into an FMCSA-compliant driving plan. Code is grouped by **layer**, not by feature name at the root.

## Request flow (production API)

```
POST /api/v1/trip/route/      → resolve_route()
POST /api/v1/trip/schedule/   → build_schedule()
POST /api/v1/trip/enrich/     → enrich_and_summarize()
        │
        ▼
  api/views.py          ← HTTP only
        │
        ▼
  services/trip_planner.py   ← orchestrator (no business rules here)
        │
        ├── maps/          geocode + ORS route
        ├── hos/           HOS simulation → days & stops
        ├── enrichment.py  POI labels + city names on stops
        └── summary.py     trip summary message
```

The SPA uses these three endpoints for progressive loading (map appears after step 1).

## Folder map

| Folder | What lives here |
|--------|-----------------|
| **`api/`** | DRF views, serializers, request parsing, error JSON |
| **`core/`** | Wiring, geo math, constants, thread-pool helpers |
| **`domain/`** | Pydantic models, enums, exceptions, event-type rules |
| **`services/`** | Planning pipeline and external integrations |
| **`services/maps/`** | OpenRouteService geocoding & routing |
| **`services/hos/`** | FMCSA simulation |
| **`services/facility/`** | Truck-stop / fuel POI along the corridor |
| **`verification/`** | Local-only saved routes, seed command, markdown export |
| **`management/`** | Django commands (`seed_verification_plans`) |

### Root files (Django plumbing)

- `urls.py` — routes to `api.views` and (when enabled) `verification.views`
- `models.py` — re-exports ORM models from `verification/orm.py` for migrations

## Two kinds of “models”

| Module | Type | Used for |
|--------|------|----------|
| `domain/models.py` | Pydantic | API request/response bodies |
| `verification/orm.py` | Django ORM | Saved verification routes (local DB only) |

## Local verification (optional)

When `DEBUG` or `ENABLE_VERIFICATION=1`:

- API: `GET /api/v1/verification/routes/`
- Seed: `python manage.py seed_verification_plans`
- Exports: `backend/verification_exports/<slug>.md`

Preset corridors are in `verification/data.py`.

## Tests

From `backend/`:

```bash
pytest tests/ -v
```

- HOS rules: `tests/test_hos_*.py`
- Facility scoring: `tests/test_facility.py`
- Full pipeline (mocked maps): `tests/test_trip_planner*.py`

## Adding a feature

1. **New stop rule** → `domain/event_groups.py` and/or `services/hos/`
2. **New external API** → new module under `services/` (e.g. `services/maps/`)
3. **New HTTP field** → `domain/models.py` + `api/serializers.py`
4. **Do not** put logic in `api/views.py` or `trip_planner.py` — keep those thin
