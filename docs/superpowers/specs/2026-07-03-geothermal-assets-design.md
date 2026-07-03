# Geothermal — Assets group pages (design)

Date: 2026-07-03
Branch: feat/geothermal-multiwell

## Goal

Build the three placeholder pages in the sidebar **Assets** group so they become
real, data-backed views consistent with the existing Geothermal pages:

| key           | page                    | data module                     |
|---------------|-------------------------|---------------------------------|
| `instruments` | Instruments registry    | `src/lib/geothermal/instruments.js` |
| `maintenance` | Maintenance work orders | `src/lib/geothermal/maintenance.js` |
| `geochem`     | Geochemistry            | `src/lib/geothermal/geochem.js`     |

All data is simulated (mock), matching the prototype's existing approach. Data is
**deterministic** — derived from the fixed `WELL_SEED` list, no `Math.random` at
module load (stable across renders/SSR). These domains (calibration, work orders,
brine chemistry) do not tick on the 5s sim loop; static seed is realistic.

## Shared conventions (from existing pages)

- Layout: `div.space-y-3`; cards `rounded-xl border border-line bg-panel p-3`.
- KPI row: `grid grid-cols-2 gap-3 xl:grid-cols-4`, tile = Lucide icon + uppercase
  label + big `tnum` value + unit. Copy from `GeoProductionPage`.
- Table: `w-full text-[12px]`, `thead.text-ink-dim`, header `border-b border-line`,
  rows `border-b border-line/60 hover:bg-panel-2/60`. Numbers `text-right … tnum`.
- Filters: soft segmented pills (translucent bg + border, accent when active) —
  restrained, per user design prefs (one accent, no neon, no emoji).
- Status chips: reuse `SeverityChip` (GeoStatus: normal/waspada/siaga/awas) where a
  status maps cleanly to severity; otherwise a small local pill map.
- Numbers via `num()` from `../../../format`. Icons from `@lucide/svelte/icons/*`.

## Page 1 — Instruments

Instrument tag registry. Deterministic tags generated per well: each well gets a
pressure (PT), temperature (TT), level (LT) and flow (FT) transmitter — ISA-style
tag id `WP-01-PT-101`. Row fields: `tag, well, kind, range, unit, lastCalDays,
dueDays, driftPct, status`.

- Calibration status → GeoStatus (reuse SeverityChip): `normal` ok, `waspada` due
  soon (<30d), `siaga` overdue, `awas` faulty.
- KPI row: Total Tags · Calibrated (ok) · Due Soon · Overdue+Fault.
- Filters: well (All + each), kind (All/Pressure/Temp/Level/Flow).
- Table: Tag | Well | Type | Range | Last Cal | Due | Drift % | Status.

## Page 2 — Maintenance

Work-order board. Deterministic WO list (~12): `id (WO-1xxx), asset (well id),
title, type (preventive/corrective/inspection), priority (low/med/high/critical),
status (open/in-progress/done), assignee, openedDays, dueDays`.

- Priority + status use local color pills (not GeoStatus).
- KPI row: Open · In Progress · Overdue · Done (30d).
- Filters: status (All/open/in-progress/done), priority (All/…).
- Table: WO | Asset | Title | Type | Priority | Status | Assignee | Due.

## Page 3 — Geochemistry

Brine chemistry per well. Row per well: `well, ph, sio2 (ppm), cl (ppm), tds (ppm),
ncg (%wt), si (silica saturation index)`.

- Scaling risk from SI → GeoStatus (SeverityChip): <1.0 normal, <1.2 waspada,
  <1.4 siaga, else awas.
- KPI row: Avg pH · Avg SiO₂ · Scaling-risk wells · Avg NCG.
- Filter: well type (All/Production/Reinjection).
- Table: Well | pH | SiO₂ | Cl | TDS | NCG | SI | Scaling risk.

## Wiring

- `GeothermalShell.svelte`: import the three pages, map them in `PAGES`, drop the
  three entries from the `STUB` map so they render instead of the placeholder.
- No `geoNav.ts` change (keys already exist).

## Verification

- `npm run check` clean.
- `npm run build` succeeds.
- Manual: each Assets menu item renders KPI row + filterable table, filters work.
