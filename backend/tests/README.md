# Backend Tests

## Running the Tests

```bash
cd backend
pytest tests/ -v
```

No Django server needs to be running — all services are tested in isolation
without touching the database or external APIs.

## Test Files

### `conftest.py`
Shared fixtures:
- `calculator` — `HOSCalculatorService` with default FMCSA settings
- `sample_facilities` — 11 facilities (fuel, truck stop, rest area) at realistic
  mile markers for a 1,000-mile route
- `sample_route_geometry` — 11 `Coordinate` points forming a straight-line route

### `test_hos_calculator.py`
Tests for `HOSCalculatorService` — the core HOS simulation engine:

| Test | What it verifies |
|------|-----------------|
| `test_single_day_short_trip` | < 500 mi trip completes in 1 day, no overnight rest |
| `test_multi_day_trip` | > 800 mi trip requires at least one 10-hr rest |
| `test_break_trigger_at_8hrs` | 30-min break inserted before 8 cumulative drive hrs |
| `test_break_combined_with_fuel_stop` | Overlapping break + fuel windows → single stop |
| `test_cycle_hours_limit_requires_restart` | 65 cycle hrs → 34-hr restart inserted |
| `test_no_facilities_in_window_early_stop` | No facilities → interpolated coordinate fallback |
| `test_insufficient_hours_no_restart_possible` | 70 cycle hrs → `InsufficientCycleHoursError` |

### `test_facility.py`
Tests for `FacilityService` — Overpass API querying and route projection:

| Test | What it verifies |
|------|-----------------|
| `test_bounding_box_calculation` | Buffer is applied correctly to all four sides |
| `test_facility_projected_onto_route` | On-route facility has near-zero perpendicular distance |
| `test_facility_too_far_from_route_excluded` | Off-route facility has large perp distance |
| `test_overpass_failure_raises_facility_data_error` | HTTP failure → `FacilityDataError` |

### `test_trip_planner.py`
Integration tests for `TripPlannerService` using mocked dependencies:

| Test | What it verifies |
|------|-----------------|
| `test_full_plan_single_day` | Short trip → 1 day, pickup + dropoff present |
| `test_full_plan_multi_day` | 900-mile trip → ≥ 2 days, ≥ 1 rest stop |
| `test_facility_service_failure_degrades_gracefully` | `FacilityDataError` → plan still produced |

## pytest Configuration

The test suite does not require a `pytest.ini` or `conftest.py` at the repo root.
`pytest-django` is configured via `DJANGO_SETTINGS_MODULE` if you need to test
Django views; for unit tests of services it is not needed.
