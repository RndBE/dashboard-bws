# Geothermal Multi-Well Field Expansion — Design Spec

**Date:** 2026-07-03
**Status:** Approved (design), pending implementation plan
**Author:** brainstorming session (support@bejogja.com)
**Supersedes scope of:** `2026-07-02-geothermal-wellpad-monitoring-design.md`
(that spec built the single-well Dashboard + 8 stub menus; this spec expands the
stubbed sidebar into a full multi-well telemetry system).

## 1. Purpose & Context

The geothermal sub-system currently renders a strong single-well-pad Dashboard
plus a flat 9-item sidebar where most menus route to one thin panel, and
`reporting` / `config` are "segera hadir" stubs. The goal: turn the sidebar into
a **complex, realistic geothermal-field telemetry system** — the kind of SCADA /
monitoring product a geothermal operator would actually run.

Key decisions (from brainstorming):

- **Nav structure:** grouped categories (5 groups, ~15 pages) — not a flat list.
- **Scope:** upgrade from one well pad to a **multi-well field** (production +
  reinjection wells → separator → gathering), with per-well drilldown.
- **Depth priorities (all four requested):** Analytics/Historian, Alarm & Event
  management, Reporting/Compliance, Assets & Maintenance.
- **Data:** stays **mock + 5s realtime simulation**. No backend.
- **Design system:** reuse STESY branding + existing geothermal panels/tokens.

## 2. Information Architecture (Sidebar)

Sidebar gains group headers; active-page highlight behaves as today. `GeoSection`
union + `GEO_NAV` become a grouped structure `GEO_NAV_GROUPS: { label, items[] }[]`.

```
OVERVIEW
  • Dashboard        field KPI + well-status grid + field-map preview + active alarms
  • Field Map        spatial: wells, pipelines, separator, reinjection, status pins

OPERATIONS
  • Wells            registry table → per-well drilldown (telemetry, valves, mini-trend)
  • SCADA P&ID       existing diagram + well selector, live tag overlay
  • Alarms & Events  active / history / statistics; ack/shelve, filter, event log
  • CCTV             live tiles (existing), grouped per well/area

ANALYTICS
  • Trends           multi-pen charting, tag+well picker, range, compare-wells
  • Historian        query builder (well+tags+range+aggregate), result table, CSV export
  • Production        steam/brine output, gross MW, capacity factor, decline curve

ASSETS
  • Instruments      tag/sensor registry, ranges, calibration status (folds Data Table)
  • Maintenance      work orders, calibration-due, equipment health tiles
  • Geochemistry     brine chem: silica, scaling index, NCG, pH, TDS, scaling-risk badge

SYSTEM & ADMIN
  • System Health    tabs: Status · Power (solar/battery) · Comms (VSAT)
  • Reporting        templates (daily/weekly/monthly, production, environmental/ESDM), export
  • Configuration    tag config, alarm-threshold editor, users, settings
```

Decisions applied: **all mock/simulated**; **Data Table folded into Instruments**
(raw-snapshot toggle) rather than a standalone menu.

## 3. Data Model Expansion

Current model is one implicit well pad. New shape (in `src/lib/geothermal/`):

- **Field** — aggregate KPIs derived each tick: total steam flow (t/h), total
  brine flow (m³/h), gross MW, availability %, active-alarm count.
- **Well[]** — 4–6 wells (e.g. `WP-01`…, plus 1–2 reinjection `RI-0x`). Each:
  `id, name, coords {lat,lng}, type: 'production'|'reinjection', status,
  telemetry: Telemetry, output: { steamTh, brineM3h, mw }`.
- **Sim tick** — `stepTelemetry` extended to run **per well**; field KPIs derived
  from the well array. Pipeline: `tick → step all wells → derive field KPIs →
  evaluate alarms → append history`.
- **Historian** — `geoHistory` becomes per-well per-tag longer ring buffers
  (drives Trends / Historian / Production).
- **Alarm engine** — each tick, evaluate thresholds per well per tag
  (`sensorState` already exists) → generate/clear `AlarmRow` extended with
  `{ well, tag, severity, value, ack }`. Replaces the 4 static seed alarms.
- **Static seed tables** — instrument registry, maintenance work orders,
  geochemistry samples, report templates: seed data with derived status.

Everything downstream reads Svelte stores; components stay presentational.

## 4. Per-Page Content

**OVERVIEW**
- **Dashboard** — field KPI row; well-status grid (card/well: status dot, WHP,
  flow, sparkline); mini field-map; latest-alarms strip; site/weather.
- **Field Map** — schematic; well pins colored by status; pipelines →
  separator → reinjection; click pin → drilldown; legend + layer toggle.

**OPERATIONS**
- **Wells** — sortable table (id, type, status, WHP, WHT, flow, output,
  last-update); row → drilldown (gauges, valve states, 4 mini-trends, per-well
  alarms).
- **SCADA P&ID** — existing diagram + well selector; live tag values overlay.
- **Alarms & Events** — tabs Active / History / Statistics; table (time, well,
  tag, severity waspada/siaga/awas, value, ack/shelve); filter by
  well/severity/state; event log (valve ops, comms drops, logins); stats (count
  by severity, top tags, MTTA).
- **CCTV** — existing tiles, grouped by well/area.

**ANALYTICS**
- **Trends** — up to 4 pens; tag + well pickers; range 1h/8h/24h/7d;
  compare-wells mode; cursor readout.
- **Historian** — query builder (well + tags + range + aggregate avg/min/max);
  result table; CSV export; downsample note.
- **Production** — steam/brine output stacked by well; gross-MW gauge; capacity
  factor; 30-day decline curve; per-well contribution.

**ASSETS**
- **Instruments** — registry table (tag id, kind, well, range, unit, last value,
  cal status/due); raw-snapshot toggle (folds Data Table).
- **Maintenance** — work-order list (open/scheduled/done); calibration-due list;
  equipment-health tiles (RTU, sensors, solar, VSAT).
- **Geochemistry** — per-well brine-chem cards (silica, SiO₂ scaling index, NCG %,
  pH, TDS); scaling-risk badge.

**SYSTEM & ADMIN**
- **System Health** — tabs: Status (RTU/PLC/logging rows) · Power (existing
  PowerPanel) · Comms (existing CommsPanel).
- **Reporting** — report templates (daily/weekly/monthly, production,
  environmental/ESDM); date picker; preview; export PDF/Excel (mock).
- **Configuration** — tag config; alarm-threshold editor; user list; system
  settings. Form-driven.

## 5. Build Phasing

Each phase is shippable and gets its own spec→plan→implement cycle. This spec
covers the whole IA; the first implementation plan targets Phase 1.

1. **Foundation** — multi-well data model (Field + Well[]); sim steps all wells;
   field KPIs derived; grouped sidebar nav + router; rewire existing pages to the
   new model. No net-new pages beyond rewired ones.
2. **Operations** — Wells (table + drilldown); Field Map; alarm engine + Alarms
   page; SCADA well selector.
3. **Analytics** — Trends (multi-pen); Historian; Production.
4. **Assets** — Instruments (+ Data Table fold); Maintenance; Geochemistry.
5. **System & Admin** — System Health tabs; Reporting; Configuration.

## 6. Non-Goals

- No real backend / API / auth changes.
- No changes to the STESY (river-basin) sub-system.
- Multi-tenant / multi-field hierarchy above the single field is out of scope.
```
