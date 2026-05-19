# HOS Trip Planner

A full-stack Hours of Service (HOS) trip planner for truck drivers. Given a current location, pickup, and dropoff address, it generates an FMCSA-compliant day-by-day driving schedule including mandatory breaks, fuel stops, and overnight rests.

## Monorepo Structure

```
hos-trip-planner/
├── backend/          Django 5.2 REST API
├── frontend/         React 18 + Vite SPA
└── README.md
```

## Quick Start

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env   # fill in your ORS API key
python manage.py runserver

# Frontend
cd frontend
npm install && npm run dev
```

- API: `http://localhost:8000`
- UI: `http://localhost:5173`

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `MAPS_API_KEY` | OpenRouteService API key | Yes |
| `ORS_BASE_URL` | ORS base URL | No (default: `https://api.openrouteservice.org`) |
| `DEBUG` | Django debug mode | No (default: `True`) |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | No |

`OVERPASS_API_URL` is defined in the env example for backward compatibility but is no longer used.

## API

**POST** `/api/v1/trip/plan/`

```json
{
  "current_location": "Los Angeles, CA",
  "pickup_location": "Rat Beach, CA",
  "dropoff_location": "Boston, MA",
  "cycle_used_hrs": 20.5
}
```

Returns a `TripPlan` with `summary`, `days` (day-by-day events), and `route_geometry`.

---

## How It Works

### Request flow (one POST call)

```
1. Geocode 3 addresses           →  3 ORS /geocode/search calls
2. Get driving route              →  1 ORS /v2/directions/driving-car call
3. HOS simulation                 →  pure Python, zero API calls
4. Enrich each stop with POI      →  1 ORS /pois call per stop (~10–15 calls)
5. Build summary & return
```

**Why this order?**
The HOS rules are deterministic — given distance and speed we know exactly where a rest, break, or fuel stop will be needed. Running the simulation first means we only query POIs at the specific locations that matter, instead of scanning the entire route upfront. A 3,000-mile trip that previously required ~20 full-route chunk queries now uses ~15 targeted point queries, cutting response time from ~145s to ~30s.

---

### HOS Simulation (`HOSCalculatorService`)

Implements FMCSA 60/70-hour rules:

| Constraint | Limit | Action |
|---|---|---|
| Driving hours | 11 hrs/day | Overnight rest (10 hrs off) |
| Duty window | 14 hrs/day | Overnight rest |
| Consecutive driving | 8 hrs | Mandatory 30-min break |
| Fuel | 950 miles | Fuel stop |
| Weekly cycle | 70 hrs | 34-hr restart |

The simulator runs a forward pass over the route, placing stops at natural HOS deadline miles. Stop coordinates are **interpolated directly from the route geometry** rather than being sourced from POI data — this guarantees every stop has a real lat/lng on the road even before enrichment, eliminating the `0.0, 0.0` placeholder problem.

After the simulation, `DRIVE` events are inserted between stops so the ELD log has explicit driving segments on the correct row.

---

### Facility Enrichment (`FacilityService` + `TripPlannerService`)

After the HOS sim produces stop mile markers, each stop is enriched with the nearest real facility using a **lookback window query**, not a simple point query.

A point query (searching only at the deadline coordinate) would miss facilities that are a few miles before the deadline — exactly where a driver would realistically stop. Instead, for each stop we extract a short segment of the route ending at the deadline mile and search for the **last facility before the deadline**:

| Stop type | Lookback buffer | Rationale |
|---|---|---|
| Fuel | 100 miles | Functional safety — driver must not run dry |
| Rest / Restart | 55 miles | 1 hour before the 11-hr driving limit |
| Break | 45 miles | ~50 min before the 8-hr consecutive limit |

The ORS POI endpoint enforces a 2000m max buffer and a ~300km max LineString length. Both constraints are respected: the corridor buffer is capped at 2000m and the lookback segment is always well under 300km.

POI categories queried: `fuel` (596) and `car_repair` (590, best proxy for truck stops in ORS POI taxonomy).

---

### Routing (`OpenRouteServiceClient`)

Uses `driving-car` profile (the HGV profile requires a paid ORS plan). Route geometry is returned as an encoded polyline and decoded in-house — the `geometry_format` parameter was removed in ORS v9.9+.

When ORS returns no per-leg `segments` (which happens when `instructions: false`), distances are split proportionally by haversine leg lengths so the caller always gets one `RouteSegment` per waypoint pair.

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```
