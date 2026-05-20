# ELD daily log (frontend)

FMCSA-style 24-hour driver log sheet rendered as SVG. One sheet per `TripDay` from the trip planner API.

## Entry points

| File | Role |
|------|------|
| `ELDModal.tsx` | Dialog wrapper; opens from day accordion |
| `ELDLogSheet.tsx` | Composes the SVG (header, grid, duty lines, remarks, totals) |
| `eldPrint.ts` | Opens print window with sheet HTML |
| `eld-utils.ts` | Barrel — only exports used outside this folder (`calcTotalMiles`, etc.) |

## Data flow

```
TripDay
  → eldRules.ts          (when to shift grid, row mapping, visibility)
  → eldGridTransform.ts  (duty_start → grid hours, clip to 0–24)
  → eldDutyGraph.ts      buildDutyIntervals()   hour-based lines (G1–G4)
  → eldRemarks.ts        buildRemarks()         text lines (R1–R3)
  → eldSvgAdapter.ts     intervals → SVG segments & connectors
  → ELDLogSheet.tsx      render
```

## Module map

| Module | Owns |
|--------|------|
| `eldRules.ts` | `LATE_DUTY_START_HOUR` (10), `shouldShiftGrid`, `getEldRowForEvent`, visibility predicates |
| `eldGridTransform.ts` | `getEldGridContext`, `eventGridRange` |
| `eldDutyGraph.ts` | `DutyInterval[]` — what horizontal lines exist |
| `eldRemarks.ts` | Remark strings |
| `eldSvgAdapter.ts` | Pixels: `hourToX`, segments, connectors, row hour totals |
| `eldLayout.ts` | `ELD_LAYOUT` constants, `remarksMaxLines` |
| `eldLogData.ts` | Header fields, miles, dates, initials |

## Grid rules (summary)

**Rows:** 0 Off Duty · 1 Sleeper · 2 Driving · 3 On Duty (not driving)

**Grid shift (`-24h`):** When `duty_start_time` ≥ 10:00, shift all times so late-day duty is not drawn as a long sleeper band from midnight. Graph and remarks share `getEldGridContext`.

**Lines (graph):**

| Rule | When | Row |
|------|------|-----|
| G1 | Gap before duty starts | Off duty (day 1) or Sleeper continued (day 2+) |
| G2 | Gap between events | Off duty |
| G3 | Event visible on grid | `getEldRowForEvent(type)` — `break` → row 0 |
| G4 | After last event, not a `rest` day end | Off duty → midnight |
| G4b | Day ends with `rest` | Driving → midnight |
| G5 | Row change between intervals | Vertical connector |

**Remarks:**

| Rule | When | Example |
|------|------|---------|
| R1 | Midnight, no grid shift | `00:00 — Sleeper berth (continued)` |
| R1b | Day 2+, `duty_start` > 0 | `08:00 — On duty` |
| R2 | Each visible event | `{time} {place} — {activity}` |
| R3 | `rest` ends before midnight | `23:30 En route — Driving` |

Gaps (except R1/R1b) do not get remarks. Event copy comes from `eventConfig.ts` (`eldRemark`).

## Tests

```bash
cd frontend && npm run test
```

`eldDutyGraph.test.ts` — graph + remarks rules. Helpers in `eld.test.helpers.ts`.

## Extending

- New event type row: `eventConfig.ts` + `getEldRowForEvent` if special-cased
- New remark rule: `eldRemarks.ts` only; reuse `eventGridRange` for visibility
- Layout tweak: `eldLayout.ts` (keep `ROW_Y_TOPS` in sync with row centres in adapter)
