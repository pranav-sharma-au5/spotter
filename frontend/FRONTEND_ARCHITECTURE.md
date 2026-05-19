# Frontend Architecture

## Stack

- **React 19** + **TypeScript** (strict mode)
- **Vite 5** — dev server with `/api` proxy to Django backend
- **Tailwind CSS v3** — class-based dark mode, CSS-variable design tokens
- **shadcn/ui** — Dialog, Accordion, Tooltip (Radix UI primitives)
- **react-map-gl v8** with **MapLibre GL JS** — no Mapbox token required
- **Zustand** — global trip state
- **TanStack Query v5** — mutation for trip planning API call
- **React Router v7** — client-side routing
- **Lucide React** — icons
- **Axios** — HTTP client

## Directory structure

```
src/
├── types/trip.ts           All TypeScript types
├── stores/tripStore.ts     Zustand store
├── services/api.ts         Axios client + TanStack Query mutation factory
├── config/eventConfig.ts   Single source of truth for event types
├── hooks/                  Custom hooks (one concern each)
│   ├── useTheme.ts
│   ├── useTripPlan.ts
│   ├── useActiveEvent.ts
│   ├── useMapBounds.ts
│   └── useCycleStatus.ts
├── utils/format.ts         Number and time formatting
├── lib/utils.ts            cn() helper (clsx + tailwind-merge)
├── components/
│   ├── ui/                 shadcn/ui primitives
│   ├── layout/Topbar.tsx
│   ├── input/              RouteSpine, CycleGauge, GPSButton
│   ├── map/                RouteMap, StopMarker, RouteLayer
│   ├── sidebar/            EventSidebar, DayAccordion, EventItem
│   └── eld/                ELDModal, ELDLogSheet, eld-utils.ts
└── pages/                  Dashboard, PlanInput, TripSummary, TripDetail
```

## Design principles

### SOLID in React

**Single Responsibility** — logic is extracted into custom hooks in `src/hooks/`.
Components render. Hooks manage state and side effects. Services handle I/O.
Three distinct layers, no overlap.

**Open/Closed** — `src/config/eventConfig.ts` is the single source of truth for
event types. Closed for modification, open to extension by adding a new key.
No component has hardcoded event colours or labels.

**Interface Segregation** — components receive the minimum data needed.
Prop interfaces are narrow. No component accepts `TripPlan` when it only
needs a `ScheduledStop`.

| Component    | Receives         |
|--------------|------------------|
| EventItem    | ScheduledStop    |
| DayAccordion | TripDay          |
| ELDLogSheet  | TripDay + TripRequest |
| StopMarker   | ScheduledStop    |
| CycleGauge   | { value, onChange } |

**Dependency Inversion** — components depend on hooks, hooks depend on the
service layer, the service layer depends on the HTTP client. Swapping any
layer does not affect the layers above it.

```
Component → custom hook → service (api.ts) → axios
Component → custom hook → store (tripStore.ts) → zustand
```

### Theme system

Light and dark mode via CSS custom properties on `:root` and `.dark`.
All design tokens are variables — no hardcoded colours in components.
Theme preference is persisted to `localStorage` via `useTheme` hook.
Map tile URL switches between Carto Dark Matter (dark) and Carto Positron
(light) based on theme.

### Event config

All event colours, labels, ELD grid rows, and legend visibility are
defined once in `src/config/eventConfig.ts`. Adding a new event type
requires one entry in this file — nothing else changes.

### Code style

Airbnb ESLint config with TypeScript. Strict mode. No `any`. Intentional
rule overrides are documented inline with a comment explaining why.
Dynamic values (gauge fill %, SVG coordinates) use `style` prop where
Tailwind cannot handle them — this is documented in `.eslintrc.cjs`.
