# Geothermal Well Pad Monitoring — Design Spec

**Date:** 2026-07-02
**Status:** Approved (design), pending implementation plan
**Author:** brainstorming session (support@bejogja.com)

## 1. Purpose & Context

The `allinone` app currently hosts **STESY** — a river-basin (BWS) command-center
dashboard. This spec adds a **second monitoring sub-system for a geothermal well
pad**, modeled on a provided reference mockup ("Geothermal Well Pad — Testing
Monitoring System"). It is a SCADA-style single-well-pad monitoring screen.

Key decisions (from brainstorming):

- **Integration:** new section **inside the same repo/app**, reusing STESY
  branding + design system (the reference mockup's own GEOCOMPANY branding is
  NOT used — only its layout/features are the reference).
- **Scope:** build the **Dashboard screen only** (everything visible in the
  mockup). The sidebar's other 8 menu items exist but are stubbed
  ("Segera hadir").
- **Entry point:** a **system switcher in the TopBar** toggling
  "Sungai (STESY)" ↔ "Geothermal". Each system has its own shell/nav.
- **Data:** **mock + realtime simulation** on a 5-second tick (matches STESY's
  `startSimulation`; mockup states "Data is refreshed every 5 seconds"). No real
  backend.

## 2. Architecture & Routing

- Add a top-level store `system: 'stesy' | 'geothermal'` (default `'stesy'`) in
  `src/lib/stores.ts`.
- `src/App.svelte` gains a top-level branch (after the `$auth` gate): when
  `system === 'geothermal'` render `<GeothermalShell />`; otherwise render the
  existing STESY shell **unchanged** (wall / detail / module logic untouched).
- Router (`src/lib/router.ts`): map path `/geothermal` ⇄ `system`. Sidebar sub-
  pages use `/geothermal/<page>` but render a stub placeholder for now. Any STESY
  path (`/`, `/bendungan`, `/wall`, …) implies `system === 'stesy'`. The switcher
  is the only new source of `system` changes; router keeps URL ⇄ store in sync
  both ways (same pattern as existing modules).
- **System switcher:** a segmented control mirroring the existing TopBar "Mode
  toggle" markup/tokens. Rendered in **both** the STESY TopBar and the geothermal
  header; both call `system.set(...)`.

## 3. Component Tree

New Svelte components under `src/lib/components/geothermal/`:

```
GeothermalShell      top-level layout (sidebar + header + main grid + footer);
                     starts geo simulation on mount, stops on destroy
├─ GeoSidebar        STESY logo; nav (9 items — Dashboard active, rest
│                    disabled/stubbed); Site Info (WELL PAD-01, Field Area
│                    Geothermal, lat -7.25 / long 109.1 / altitude 1250 m);
│                    weather widget (22.6 °C Light Rain, wind 12 km/h, hum 89%)
├─ GeoHeader         title "Geothermal Well Pad — Testing Monitoring System",
│                    REAL-TIME MONITORING label, SYSTEM NORMAL badge, Clock (WIB),
│                    action icons (Alarm+count, Report, Trend, Data Export,
│                    Settings), operator identity, + system switcher
├─ GeoDashboard      main content grid composing the panels below
│  ├─ GaugeCard ×4   PT-101 Well Pressure 124.6 bar(g); PT-102 Heat Pipe
│  │                 Pressure 86.3 bar(g); LT-201 Water Level 0.423 m (tank-fill
│  │                 viz); FT-201 Flow 23.48 L/s / 84.53 m³/h. Radial SVG arc
│  │                 gauge + status pill.
│  ├─ SystemStatusPanel   RTU/PLC, All Sensors, Data Logging, VSAT, Solar, CCTV
│  │                      → STATUS pills
│  ├─ ScadaDiagram   P&ID centerpiece (see §4); tabs P&ID / 3D VIEW / LEGEND
│  │                 (3D VIEW = placeholder)
│  ├─ TrendPanel     realtime 6-hour line chart, 4 series (reuse splinePath)
│  ├─ PowerPanel     solar → battery 78% (18.8 h) → 240 W output; solar 54.2 V,
│  │                 battery 48.6 V, charge 8.7 A, status Normal
│  ├─ CommsPanel     VSAT: signal -48 dBm, link quality 98%, Connected, IP
│  │                 10.10.10.25, latency 620 ms, uptime; signal-strength bars
│  ├─ AlarmSummaryPanel   table (time / alarm / status ACTIVE|CLEARED), active
│  │                      count badge, "View All Alarms" button
│  └─ GeoCctvPanel   4 cameras (Well Pad Overview, Separator Area, V-Notch
│                    Channel, Solar Panel Area) — reuse CameraTile + camImage
└─ GeoFooter         SYSTEM NORMAL · "Data is refreshed every 5 seconds" · v1.0.0
```

Stub sub-pages (SCADA, Trend & Chart, Data Table, Alarm & Event, CCTV
Monitoring, System Status, Reporting, Configuration) render a shared
`GeoStubPage` placeholder.

### Reuse from STESY

- `src/lib/series.ts` — `splinePath()`, `stats()`, `lastN()` for TrendPanel.
- `src/lib/status.ts` — `STATUS` chip classes + `worst()` for pills/badges.
  Geothermal severity maps onto `normal | waspada | siaga | awas`.
- `src/lib/components/cctv/CameraTile.svelte` + `data/cameras` `camImage()` —
  add geothermal camera entries; render via existing tile.
- Design tokens (`border-line`, `bg-surface`, `text-ink-*`, `accent`,
  `pu-bright`, etc.) and the TopBar segmented-control markup.

## 4. SCADA P&ID (`ScadaDiagram`)

The heaviest single component. Inline SVG static schematic:

- Geometry: wellhead → separator → heat pipe (steam, red) and water line (blue)
  → V-notch channel. Legend: steam/gas, water, instrument signal,
  electrical/comm.
- Live overlays (from store): sensor tags **PT-101**, **PT-102**,
  **TT-101 192.4 °C**, **LT-201** as value chips; valves **XV-101** / **XV-102**
  with OPEN/CLOSED state.
- Flow animation via animated dash stroke along steam/water paths.
- V-notch sub-panel: 90° weir, shows textbook formula `Q = 1.417 × H^2.5`
  (Q in L/s, H in m), plus live Head H and computed Flow.
- Tabs: P&ID (default), 3D VIEW (placeholder card), LEGEND.

## 5. State & Simulation (`src/lib/geothermal/`)

- `types.ts` — types for gauges, valves, alarms, power, comms, cctv, site info,
  weather.
- `seed.ts` — initial values matching the reference mockup exactly (all numbers
  in §3/§4), site info, camera list, alarm rows, weather.
- `store.ts` — writable stores for well-pad telemetry + `startGeoSimulation()`:
  - Runs on a 5-second tick; **respects the existing STESY `paused` store** so
    the shared pause control works across both systems.
  - Pressures / temperature / level jitter smoothly and are **clamped** to
    plausible ranges.
  - **Flow is coupled to level:** `Q_Ls = k · H^2.5` with `k ≈ 201.9` chosen so
    the seed `H = 0.423 m → 23.48 L/s`; `m³/h = L/s × 3.6`.
  - Battery charge drifts slowly; VSAT latency jitters.
  - Derived stores: `geoOverallStatus` (reuse `worst()` over sensor states) and
    `geoActiveAlarms`.

**Honesty note on the weir constant:** the mockup prints `1.417` as the
coefficient, which is inconsistent with the shown `H = 0.423 → 23.48 L/s`
(1.417 · 0.423^2.5 ≈ 0.16). The mockup is illustrative. We display the textbook
formula verbatim for authenticity, but the simulation uses a tuned coefficient
`k` so the displayed numbers match the mockup anchor and level↔flow move
together. `L/s × 3.6 = m³/h` is internally consistent (23.48 × 3.6 = 84.53 ✓).

## 6. Testing (`tests/`)

Follow the existing chatbot-test pattern. Unit tests:

- Weir formula: `H → Q` monotonic; anchor `H = 0.423 → ≈ 23.48 L/s`.
- L/s ↔ m³/h conversion (× 3.6).
- Simulation clamping: repeated ticks keep every value within its declared
  range.
- Derived status: `geoOverallStatus` reflects `worst()` of sensor states;
  `geoActiveAlarms` counts only ACTIVE rows.

## 7. Out of Scope (YAGNI)

- The 8 non-Dashboard sidebar pages (stubbed only).
- 3D VIEW rendering (placeholder only).
- Real backend / live data wiring.
- Multi-well-pad support (single WELL PAD-01 only).
- Chatbot integration into the geothermal shell (STESY chatbot stays STESY-only
  for now).
