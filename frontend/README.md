# HOS Trip Planner — Frontend

React 18 + Vite single-page application for the HOS Trip Planner.

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`. The backend API must be running at `http://localhost:8000`.

## Stack

- **React 18** — UI framework
- **Vite 5** — build tool and dev server
- **Axios** — HTTP client for API calls

## API Base URL

API requests use same-origin `/api/*` by default (proxied to `localhost:8000` in dev). For mobile testing on your LAN, open the Network URL Vite prints (e.g. `http://192.168.x.x:5173`) — do not set `VITE_API_URL` to `localhost`. See `.env.example`.

## Pages to Build

| Route    | Component     | Description                                               |
|----------|---------------|-----------------------------------------------------------|
| `/`      | `TripForm`    | Input form (current location, pickup, dropoff, cycle hrs) |
| `/plan`  | `PlanResults` | Map with route + sidebar event list + ELD log sheets      |

## Key Components to Build

| Component      | Description                                                       |
|----------------|-------------------------------------------------------------------|
| `TripForm`     | Controlled form with address inputs and cycle hours slider        |
| `RouteMap`     | Leaflet/Mapbox map rendering route polyline and stop markers      |
| `EventSidebar` | Scrollable list of daily events with type icons and durations     |
| `ELDLogSheet`  | 24-hour grid log sheet matching FMCSA paper log format            |

## Scripts

| Script           | Description              |
|------------------|--------------------------|
| `npm run dev`    | Start dev server         |
| `npm run build`  | Production build         |
| `npm run preview`| Preview production build |
