# Geothermal Well Pad Monitoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second monitoring sub-system to `allinone` — a SCADA-style geothermal well-pad dashboard modeled on the reference mockup, reusing STESY's branding, design tokens, and UI components.

**Architecture:** New self-contained namespace `src/lib/geothermal/` (pure logic in `.js` for `node --test`, Svelte stores in `.ts`) plus components under `src/lib/components/geothermal/`. A top-level `system: 'stesy' | 'geothermal'` store gates which shell `App.svelte` renders; a `SystemSwitcher` in both shells flips it; the router maps `/geothermal` ⇄ `system`. Data is mock + a 5-second simulation that respects STESY's existing `paused` store.

**Tech Stack:** Svelte 5 (runes), Vite 8, Tailwind v4, TypeScript, `@lucide/svelte`, Node.js built-in test runner (`node --test`).

## Global Constraints

- Svelte 5 runes only (`$state`, `$derived`, `$props`, `$derived.by`) — match existing components.
- Pure, unit-tested logic lives in **plain `.js`** modules (the test runner is `node --test tests/*.test.js` with no TS loader). Components/stores may be `.ts`/`.svelte`.
- Tests use `node:test` + `node:assert/strict`, importing source by relative `.js` path (mirror `tests/chatRuntime.test.js`).
- Reuse existing design tokens: `bg-surface`, `bg-panel`, `bg-panel-2`, `border-line`, `text-ink-strong`, `text-ink`, `text-ink-muted`, `text-ink-dim`, `text-pu-bright`, `accent`, `accent-bright`, and status colors `normal|waspada|siaga|awas`.
- Reuse existing components where they fit: `MultiChart`, `Gauge`, `StatusBadge`, `Clock`, `CameraTile`, and helpers `splinePath`/`stats` (`src/lib/series.ts`), `num`/`pct`/`clockTime` (`src/lib/format.ts`), `STATUS`/`worst` (`src/lib/status.ts`).
- No emoji in UI copy. Indonesian/English mix as in the mockup is fine; keep STESY logo/branding.
- Exact numeric anchors from the mockup (verbatim): PT-101 `124.6` bar(g); PT-102 `86.3` bar(g); TT-101 `192.4` °C; LT-201 `0.423` m; FT-201 `23.48` L/s = `84.53` m³/h; battery `78`% / `18.8` h / `240` W; solar `54.2` V; battery `48.6` V; charge `8.7` A; VSAT signal `-48` dBm / link `98`% / IP `10.10.10.25` / latency `620` ms; site WELL PAD-01, lat `-7.25`, long `109.1`, altitude `1250` m; weather `22.6` °C Light Rain, wind `12` km/h, humidity `89`%; footer `v1.0.0`, "Data is refreshed every 5 seconds".
- Weir coefficient is derived so the seed anchor is exact: `WEIR_K = 23.48 / 0.423**2.5`. The UI prints the textbook formula `Q = 1.417 × H^2.5` verbatim (mockup fidelity) even though the sim uses `WEIR_K`.

---

## File Structure

**Create:**
- `src/lib/geothermal/wellpad.js` — pure logic (weir flow, unit conversion, clamp/nudge, `stepTelemetry`, status/alarm derivation). Unit-tested.
- `src/lib/geothermal/seed.js` — initial telemetry + site/weather/cameras/alarms/valves (exact mockup numbers).
- `src/lib/geothermal/types.ts` — TS interfaces for telemetry/site/weather/alarm/valve.
- `src/lib/geothermal/store.ts` — Svelte stores, derived status/alarms, `startGeoSimulation()`.
- `src/lib/components/layout/SystemSwitcher.svelte` — segmented STESY↔Geothermal toggle (shared).
- `src/lib/components/geothermal/GeothermalShell.svelte` — top-level layout.
- `src/lib/components/geothermal/GeoSidebar.svelte` — nav + site info + weather.
- `src/lib/components/geothermal/GeoHeader.svelte` — title, status, clock, action icons, switcher.
- `src/lib/components/geothermal/GeoDashboard.svelte` — main grid assembling panels.
- `src/lib/components/geothermal/GeoGauge.svelte` — semicircular arc KPI gauge.
- `src/lib/components/geothermal/GaugeCard.svelte` — gauge + label + status pill card.
- `src/lib/components/geothermal/ScadaDiagram.svelte` — P&ID centerpiece.
- `src/lib/components/geothermal/SystemStatusPanel.svelte`
- `src/lib/components/geothermal/TrendPanel.svelte`
- `src/lib/components/geothermal/PowerPanel.svelte`
- `src/lib/components/geothermal/CommsPanel.svelte`
- `src/lib/components/geothermal/AlarmSummaryPanel.svelte`
- `src/lib/components/geothermal/GeoCctvPanel.svelte`
- `src/lib/components/geothermal/GeoFooter.svelte`
- `tests/geothermalWellpad.test.js`

**Modify:**
- `src/lib/stores.ts` — add `system` store; start geo sim is done in `App.svelte`.
- `src/lib/router.ts` — map `/geothermal` ⇄ `system`.
- `src/App.svelte` — branch on `$system`; start `startGeoSimulation()` in `onMount`.
- `src/lib/components/layout/TopBar.svelte` — render `SystemSwitcher`.
- `src/lib/data/cameras.ts` — extend `CameraGroup` with `'geothermal'`.

**Simplification vs spec:** sidebar sub-pages are rendered as **inert (disabled) nav items** rather than routed stub pages. Scope is the Dashboard screen only, so no `/geothermal/<page>` routing is added (YAGNI). Only `/geothermal` exists.

---

## Task 1: Pure well-pad logic (`wellpad.js`)

**Files:**
- Create: `src/lib/geothermal/wellpad.js`
- Test: `tests/geothermalWellpad.test.js`

**Interfaces:**
- Produces:
  - `WEIR_H0 = 0.423`, `WEIR_Q0 = 23.48`, `WEIR_K` (number)
  - `weirFlowLs(h: number, k = WEIR_K): number`
  - `lsToM3h(ls: number): number`
  - `r2(v: number): number`, `clamp(v, min, max): number`
  - `nudge(v, vol, min, max, pullTo?, rnd = Math.random): number`
  - `RANGES` (object of `{min,max}` per telemetry field)
  - `stepTelemetry(prev: object, rnd = Math.random): object`
  - `SIAGA_WEIGHT` (record), `worstStatus(list: string[]): string`
  - `sensorState(value, {waspada,siaga,awas}): string`
  - `activeAlarmCount(alarms: {status:string}[]): number`

- [ ] **Step 1: Write the failing test**

Create `tests/geothermalWellpad.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEIR_H0, WEIR_Q0, weirFlowLs, lsToM3h, r2, clamp, nudge, RANGES,
  stepTelemetry, worstStatus, sensorState, activeAlarmCount,
} from '../src/lib/geothermal/wellpad.js';

test('weir flow hits the mockup anchor exactly', () => {
  assert.ok(Math.abs(weirFlowLs(WEIR_H0) - WEIR_Q0) < 1e-9);
});

test('weir flow is monotonic in head', () => {
  assert.ok(weirFlowLs(0.5) > weirFlowLs(0.4));
});

test('L/s to m3/h uses the 3.6 factor and matches the mockup', () => {
  assert.equal(r2(lsToM3h(23.48)), 84.53);
});

test('clamp bounds values', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
});

test('nudge stays within [min,max] for any rng draw', () => {
  for (const draw of [0, 0.5, 1]) {
    const v = nudge(10, 5, 0, 12, undefined, () => draw);
    assert.ok(v >= 0 && v <= 12);
  }
});

test('stepTelemetry keeps every field inside its declared range', () => {
  let t = {
    wellPressure: 124.6, heatPipePressure: 86.3, temperature: 192.4,
    level: 0.423, flowLs: 23.48, flowM3h: 84.53,
    battery: 78, solarV: 54.2, batteryV: 48.6, chargeA: 8.7,
    vsatSignal: -48, vsatLink: 98, latency: 620,
  };
  let draw = 0;
  const rnd = () => ((draw = (draw + 0.37) % 1), draw); // deterministic spread
  for (let i = 0; i < 200; i++) {
    t = stepTelemetry(t, rnd);
    for (const key of Object.keys(RANGES)) {
      assert.ok(t[key] >= RANGES[key].min && t[key] <= RANGES[key].max, `${key}=${t[key]} out of range`);
    }
    // flow stays coupled to level
    assert.ok(Math.abs(t.flowM3h - r2(lsToM3h(t.flowLs))) < 1e-6);
  }
});

test('worstStatus picks the most severe', () => {
  assert.equal(worstStatus(['normal', 'siaga', 'waspada']), 'siaga');
  assert.equal(worstStatus(['normal', 'normal']), 'normal');
});

test('sensorState escalates on rising thresholds', () => {
  const th = { waspada: 90, siaga: 100, awas: 110 };
  assert.equal(sensorState(80, th), 'normal');
  assert.equal(sensorState(95, th), 'waspada');
  assert.equal(sensorState(105, th), 'siaga');
  assert.equal(sensorState(120, th), 'awas');
});

test('activeAlarmCount counts only active rows', () => {
  assert.equal(activeAlarmCount([
    { status: 'active' }, { status: 'cleared' }, { status: 'active' },
  ]), 2);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/lib/geothermal/wellpad.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/geothermal/wellpad.js`:

```js
// Pure well-pad math + telemetry stepping. Plain JS so `node --test` imports it
// directly (no TS loader). Randomness is injected (`rnd`) for deterministic tests.

export const WEIR_H0 = 0.423;
export const WEIR_Q0 = 23.48;
/** Coefficient tuned so weirFlowLs(WEIR_H0) === WEIR_Q0 (mockup anchor). */
export const WEIR_K = WEIR_Q0 / Math.pow(WEIR_H0, 2.5);

/** 90° V-notch flow in L/s from head H (m). */
export function weirFlowLs(h, k = WEIR_K) {
  return k * Math.pow(Math.max(0, h), 2.5);
}

/** L/s → m³/h. */
export function lsToM3h(ls) {
  return ls * 3.6;
}

export function r2(v) {
  return Math.round(v * 100) / 100;
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/** Random walk with optional mean-reversion, clamped and 2-dp rounded. */
export function nudge(v, vol, min, max, pullTo = undefined, rnd = Math.random) {
  let nv = v + (rnd() - 0.5) * 2 * vol;
  if (pullTo !== undefined) nv += (pullTo - v) * 0.04;
  return clamp(r2(nv), min, max);
}

/** Plausible operating envelope per telemetry field. */
export const RANGES = {
  wellPressure: { min: 115, max: 135 },
  heatPipePressure: { min: 78, max: 95 },
  temperature: { min: 180, max: 205 },
  level: { min: 0.30, max: 0.55 },
  flowLs: { min: weirFlowLs(0.30), max: weirFlowLs(0.55) },
  flowM3h: { min: lsToM3h(weirFlowLs(0.30)), max: lsToM3h(weirFlowLs(0.55)) },
  battery: { min: 40, max: 100 },
  solarV: { min: 40, max: 60 },
  batteryV: { min: 44, max: 52 },
  chargeA: { min: 0, max: 15 },
  vsatSignal: { min: -75, max: -40 },
  vsatLink: { min: 90, max: 100 },
  latency: { min: 400, max: 800 },
};

/** Advance telemetry one tick. Flow is derived from level (physical coupling). */
export function stepTelemetry(prev, rnd = Math.random) {
  const level = nudge(prev.level, 0.006, RANGES.level.min, RANGES.level.max, 0.423, rnd);
  const flowLs = r2(clamp(weirFlowLs(level), RANGES.flowLs.min, RANGES.flowLs.max));
  const flowM3h = r2(lsToM3h(flowLs));
  return {
    wellPressure: nudge(prev.wellPressure, 0.5, RANGES.wellPressure.min, RANGES.wellPressure.max, 124.6, rnd),
    heatPipePressure: nudge(prev.heatPipePressure, 0.4, RANGES.heatPipePressure.min, RANGES.heatPipePressure.max, 86.3, rnd),
    temperature: nudge(prev.temperature, 0.5, RANGES.temperature.min, RANGES.temperature.max, 192.4, rnd),
    level,
    flowLs,
    flowM3h,
    battery: nudge(prev.battery, 0.6, RANGES.battery.min, RANGES.battery.max, 80, rnd),
    solarV: nudge(prev.solarV, 0.6, RANGES.solarV.min, RANGES.solarV.max, 54, rnd),
    batteryV: nudge(prev.batteryV, 0.3, RANGES.batteryV.min, RANGES.batteryV.max, 48.6, rnd),
    chargeA: nudge(prev.chargeA, 0.5, RANGES.chargeA.min, RANGES.chargeA.max, 8, rnd),
    vsatSignal: nudge(prev.vsatSignal, 1.5, RANGES.vsatSignal.min, RANGES.vsatSignal.max, -48, rnd),
    vsatLink: nudge(prev.vsatLink, 0.8, RANGES.vsatLink.min, RANGES.vsatLink.max, 98, rnd),
    latency: Math.round(nudge(prev.latency, 25, RANGES.latency.min, RANGES.latency.max, 620, rnd)),
  };
}

export const SIAGA_WEIGHT = { normal: 0, waspada: 1, siaga: 2, awas: 3 };

export function worstStatus(list) {
  return list.reduce((acc, s) => (SIAGA_WEIGHT[s] > SIAGA_WEIGHT[acc] ? s : acc), 'normal');
}

/** Rising-threshold escalation (value above threshold → more severe). */
export function sensorState(value, t) {
  if (value >= t.awas) return 'awas';
  if (value >= t.siaga) return 'siaga';
  if (value >= t.waspada) return 'waspada';
  return 'normal';
}

export function activeAlarmCount(alarms) {
  return alarms.filter((a) => a.status === 'active').length;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `geothermalWellpad.test.js` tests green (existing chat tests still pass).

- [ ] **Step 5: Commit**

```bash
git add src/lib/geothermal/wellpad.js tests/geothermalWellpad.test.js
git commit -m "feat(geothermal): add pure well-pad telemetry logic + tests"
```

---

## Task 2: Seed data + types

**Files:**
- Create: `src/lib/geothermal/seed.js`, `src/lib/geothermal/types.ts`
- Modify: `src/lib/data/cameras.ts:5` (extend `CameraGroup`)
- Test: `tests/geothermalWellpad.test.js` (append one assertion)

**Interfaces:**
- Consumes: `weirFlowLs`, `lsToM3h`, `r2` from `wellpad.js`.
- Produces (from `seed.js`):
  - `SEED_TELEMETRY` (object matching `stepTelemetry` shape)
  - `SITE` `{ name:'WELL PAD-01', field:'Geothermal', lat:-7.25, lng:109.1, altitude:1250 }`
  - `WEATHER` `{ temp:22.6, cond:'Light Rain', wind:12, humidity:89 }`
  - `VALVES` `[{id:'XV-101', open:true},{id:'XV-102', open:true}]`
  - `SENSOR_TAGS` `[{id:'PT-101',...},{id:'PT-102',...},{id:'TT-101',...},{id:'LT-201',...}]`
  - `SYSTEM_ROWS` `[{key:'rtu', label:'RTU / PLC', state:'normal', value:'Normal'}, ...]`
  - `GEO_CAMERAS` (`Camera[]`, `group:'geothermal'`)
  - `SEED_ALARMS` `[{ time, label, status:'active'|'cleared' }, ...]`
- Produces (from `types.ts`): `Telemetry`, `Site`, `Weather`, `Valve`, `SensorTag`, `SystemRow`, `AlarmRow` interfaces.

- [ ] **Step 1: Extend the camera group**

In `src/lib/data/cameras.ts`, change line 5:

```ts
export type CameraGroup = 'bendungan' | 'hidrologi' | 'irigasi' | 'banjir' | 'geothermal';
```

- [ ] **Step 2: Write `types.ts`**

Create `src/lib/geothermal/types.ts`:

```ts
import type { Camera } from '../data/cameras';

export type GeoStatus = 'normal' | 'waspada' | 'siaga' | 'awas';

export interface Telemetry {
  wellPressure: number;
  heatPipePressure: number;
  temperature: number;
  level: number;
  flowLs: number;
  flowM3h: number;
  battery: number;
  solarV: number;
  batteryV: number;
  chargeA: number;
  vsatSignal: number;
  vsatLink: number;
  latency: number;
}

export interface Site { name: string; field: string; lat: number; lng: number; altitude: number; }
export interface Weather { temp: number; cond: string; wind: number; humidity: number; }
export interface Valve { id: string; open: boolean; }
export interface SensorTag { id: string; kind: 'pressure' | 'temp' | 'level'; }
export interface SystemRow { key: string; label: string; state: GeoStatus; value: string; }
export interface AlarmRow { time: string; label: string; status: 'active' | 'cleared'; }
export type GeoCamera = Camera;
```

- [ ] **Step 3: Write `seed.js`**

Create `src/lib/geothermal/seed.js`:

```js
import { weirFlowLs, lsToM3h, r2 } from './wellpad.js';

const level0 = 0.423;
const flowLs0 = r2(weirFlowLs(level0));

export const SEED_TELEMETRY = {
  wellPressure: 124.6,
  heatPipePressure: 86.3,
  temperature: 192.4,
  level: level0,
  flowLs: flowLs0,
  flowM3h: r2(lsToM3h(flowLs0)),
  battery: 78,
  solarV: 54.2,
  batteryV: 48.6,
  chargeA: 8.7,
  vsatSignal: -48,
  vsatLink: 98,
  latency: 620,
};

export const SITE = { name: 'WELL PAD-01', field: 'Geothermal', lat: -7.25, lng: 109.1, altitude: 1250 };
export const WEATHER = { temp: 22.6, cond: 'Light Rain', wind: 12, humidity: 89 };

export const VALVES = [
  { id: 'XV-101', open: true },
  { id: 'XV-102', open: true },
];

export const SENSOR_TAGS = [
  { id: 'PT-101', kind: 'pressure' },
  { id: 'PT-102', kind: 'pressure' },
  { id: 'TT-101', kind: 'temp' },
  { id: 'LT-201', kind: 'level' },
];

export const SYSTEM_ROWS = [
  { key: 'rtu', label: 'RTU / PLC', state: 'normal', value: 'Normal' },
  { key: 'sensors', label: 'All Sensors', state: 'normal', value: 'Normal' },
  { key: 'logging', label: 'Data Logging', state: 'normal', value: 'Normal' },
  { key: 'vsat', label: 'VSAT Connection', state: 'normal', value: 'Connected' },
  { key: 'solar', label: 'Solar System', state: 'normal', value: 'Normal' },
  { key: 'cctv', label: 'CCTV System', state: 'normal', value: 'Normal' },
];

export const GEO_CAMERAS = [
  { id: 'cam-geo-wellpad', name: 'CAM 1 — Well Pad Overview', area: 'WELL PAD-01', group: 'geothermal', online: true },
  { id: 'cam-geo-separator', name: 'CAM 2 — Separator Area', area: 'WELL PAD-01', group: 'geothermal', online: true },
  { id: 'cam-geo-vnotch', name: 'CAM 3 — V-Notch Channel', area: 'WELL PAD-01', group: 'geothermal', online: true },
  { id: 'cam-geo-solar', name: 'CAM 4 — Solar Panel Area', area: 'WELL PAD-01', group: 'geothermal', online: true },
];

export const SEED_ALARMS = [
  { time: '10:22:15', label: 'High Heat Pipe Pressure', status: 'active' },
  { time: '10:18:47', label: 'High Water Level', status: 'active' },
  { time: '09:45:11', label: 'VSAT Signal Loss', status: 'cleared' },
  { time: '09:12:03', label: 'Low Battery Voltage', status: 'cleared' },
];
```

- [ ] **Step 4: Add the seed-consistency assertion**

Append to `tests/geothermalWellpad.test.js`:

```js
import { SEED_TELEMETRY } from '../src/lib/geothermal/seed.js';

test('seed flow is consistent with seed level via the weir', () => {
  assert.equal(SEED_TELEMETRY.flowLs, r2(weirFlowLs(SEED_TELEMETRY.level)));
  assert.equal(SEED_TELEMETRY.flowM3h, r2(lsToM3h(SEED_TELEMETRY.flowLs)));
});
```

- [ ] **Step 5: Run tests + type check**

Run: `npm test && npm run check`
Expected: tests PASS; `svelte-check`/`tsc` report no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/geothermal/seed.js src/lib/geothermal/types.ts src/lib/data/cameras.ts tests/geothermalWellpad.test.js
git commit -m "feat(geothermal): add seed data, types, geothermal camera group"
```

---

## Task 3: `system` store + router wiring

**Files:**
- Modify: `src/lib/stores.ts:29` (add `system`), `src/lib/router.ts`

**Interfaces:**
- Produces: `system` writable (`'stesy' | 'geothermal'`, default `'stesy'`) exported from `stores.ts`.
- Consumes: nothing new.

- [ ] **Step 1: Add the store**

In `src/lib/stores.ts`, after the `mode` line (line 28), add:

```ts
export const system = writable<'stesy' | 'geothermal'>('stesy');
```

- [ ] **Step 2: Wire the router**

In `src/lib/router.ts`:

Import `system` (add to the existing import from `./stores`):

```ts
import { activeModule, mode, selected, system } from './stores';
```

Replace `pathFromState()` (lines 32-37) with:

```ts
function pathFromState(): string {
  if (get(system) === 'geothermal') return '/geothermal';
  if (get(mode) === 'wall') return '/wall';
  const sel = get(selected);
  if (sel) return `/${sel.kind}/${sel.id}`;
  return `/${get(activeModule)}`;
}
```

In `applyUrl()`, at the very start of the `try` block (before the `/wall` check on line 74), add:

```ts
    // /geothermal → sub-sistem geothermal
    if (parts[0] === 'geothermal') {
      system.set('geothermal');
      return;
    }
    // path lain → sub-sistem STESY
    system.set('stesy');
```

Add `system.subscribe(writeUrl)` to the `unsubs` array (after `selected.subscribe(writeUrl)` on line 126):

```ts
    system.subscribe(writeUrl),
```

- [ ] **Step 3: Type check**

Run: `npm run check`
Expected: no new errors.

- [ ] **Step 4: Manual smoke (URL only)**

Run: `npm run dev`, open the app, in the console run `history.pushState(null,'','/geothermal')` then reload — the URL persists (rendering handled in later tasks). Revert with `/`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores.ts src/lib/router.ts
git commit -m "feat(geothermal): add system store and /geothermal routing"
```

---

## Task 4: Geo store + simulation (`store.ts`)

**Files:**
- Create: `src/lib/geothermal/store.ts`

**Interfaces:**
- Consumes: `SEED_TELEMETRY`, `SEED_ALARMS`, `SYSTEM_ROWS` from `seed.js`; `stepTelemetry`, `worstStatus`, `activeAlarmCount` from `wellpad.js`; `paused`, `clock` from `../stores`.
- Produces:
  - `geoTelemetry` writable(`Telemetry`)
  - `geoHistory` writable(`Record<'wellPressure'|'heatPipePressure'|'level'|'flowLs', SeriesPoint[]>`)
  - `geoAlarms` writable(`AlarmRow[]`)
  - `geoActiveAlarmCount` derived(number)
  - `geoOverallStatus` derived(`GeoStatus`)
  - `startGeoSimulation(): () => void`

- [ ] **Step 1: Write the store**

Create `src/lib/geothermal/store.ts`:

```ts
import { derived, get, writable } from 'svelte/store';
import type { SeriesPoint } from '../types';
import { paused } from '../stores';
import { activeAlarmCount, stepTelemetry, worstStatus } from './wellpad.js';
import { SEED_ALARMS, SEED_TELEMETRY, SYSTEM_ROWS } from './seed.js';
import type { AlarmRow, GeoStatus, Telemetry } from './types';

const TICK_MS = 5000;
const HISTORY_KEYS = ['wellPressure', 'heatPipePressure', 'level', 'flowLs'] as const;
type HistoryKey = (typeof HISTORY_KEYS)[number];

export const geoTelemetry = writable<Telemetry>({ ...SEED_TELEMETRY });
export const geoAlarms = writable<AlarmRow[]>(SEED_ALARMS.map((a) => ({ ...a })));

function seedHistory(): Record<HistoryKey, SeriesPoint[]> {
  const now = Date.now();
  const out = {} as Record<HistoryKey, SeriesPoint[]>;
  for (const k of HISTORY_KEYS) {
    out[k] = Array.from({ length: 48 }, (_, i) => ({
      t: now - (47 - i) * TICK_MS,
      v: SEED_TELEMETRY[k],
    }));
  }
  return out;
}
export const geoHistory = writable<Record<HistoryKey, SeriesPoint[]>>(seedHistory());

export const geoActiveAlarmCount = derived(geoAlarms, ($a) => activeAlarmCount($a));

/** Overall status = worst of the system rows (seeded normal; alarms drive severity). */
export const geoOverallStatus = derived<[typeof geoActiveAlarmCount], GeoStatus>(
  [geoActiveAlarmCount],
  ([$active]) => {
    const base = worstStatus(SYSTEM_ROWS.map((r) => r.state)) as GeoStatus;
    if ($active >= 2) return worstStatus([base, 'siaga']) as GeoStatus;
    if ($active === 1) return worstStatus([base, 'waspada']) as GeoStatus;
    return base;
  },
);

export function startGeoSimulation(): () => void {
  const id = setInterval(() => {
    if (get(paused)) return;
    const now = Date.now();
    const next = stepTelemetry(get(geoTelemetry));
    geoTelemetry.set(next);
    geoHistory.update((h) => {
      const out = { ...h };
      for (const k of HISTORY_KEYS) {
        out[k] = [...h[k].slice(-47), { t: now, v: next[k] }];
      }
      return out;
    });
  }, TICK_MS);
  return () => clearInterval(id);
}
```

- [ ] **Step 2: Type check**

Run: `npm run check`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/geothermal/store.ts
git commit -m "feat(geothermal): add telemetry store + 5s simulation"
```

---

## Task 5: Shell skeleton (Sidebar, Header, Switcher, App wiring)

**Files:**
- Create: `src/lib/components/layout/SystemSwitcher.svelte`, `src/lib/components/geothermal/GeothermalShell.svelte`, `GeoSidebar.svelte`, `GeoHeader.svelte`
- Modify: `src/App.svelte`, `src/lib/components/layout/TopBar.svelte`

**Interfaces:**
- Consumes: `system` store; `geoTelemetry`, `geoOverallStatus`, `geoActiveAlarmCount`, `startGeoSimulation` from geo store; `SITE`, `WEATHER` from seed; `Clock`, `StatusBadge`, `Logo`.
- Produces: `<GeothermalShell />` renders a full-screen layout with a placeholder `<main>` (filled in Task 6+).

- [ ] **Step 1: SystemSwitcher**

Create `src/lib/components/layout/SystemSwitcher.svelte` (mirror TopBar's mode-toggle markup/tokens):

```svelte
<script lang="ts">
  import Waves from '@lucide/svelte/icons/waves';
  import Flame from '@lucide/svelte/icons/flame';
  import { system } from '../../stores';
</script>

<div class="flex items-center rounded-lg border border-line bg-panel-2 p-0.5">
  <button
    onclick={() => system.set('stesy')}
    class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors {$system === 'stesy' ? 'bg-accent/20 text-accent-bright' : 'text-ink-muted hover:text-ink'}"
  >
    <Waves size={13} /> <span class="hidden sm:inline">Sungai</span>
  </button>
  <button
    onclick={() => system.set('geothermal')}
    class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors {$system === 'geothermal' ? 'bg-accent/20 text-accent-bright' : 'text-ink-muted hover:text-ink'}"
  >
    <Flame size={13} /> <span class="hidden sm:inline">Geothermal</span>
  </button>
</div>
```

- [ ] **Step 2: Mount switcher in TopBar**

In `src/lib/components/layout/TopBar.svelte`, import it and render it just before the "Mode toggle" block (before line 73's comment):

```svelte
  import SystemSwitcher from './SystemSwitcher.svelte';
```

```svelte
    <SystemSwitcher />
```

- [ ] **Step 3: GeoSidebar**

Create `src/lib/components/geothermal/GeoSidebar.svelte`. Nav items: Dashboard (active) + 8 inert. Use Lucide icons (`LayoutDashboard`, `Workflow`, `LineChart`, `Table`, `Bell`, `Cctv`, `Activity`, `FileText`, `Settings`). Below nav: Site Info from `SITE`, weather from `WEATHER`.

```svelte
<script lang="ts">
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Workflow from '@lucide/svelte/icons/workflow';
  import LineChart from '@lucide/svelte/icons/line-chart';
  import Table from '@lucide/svelte/icons/table';
  import Bell from '@lucide/svelte/icons/bell';
  import Cctv from '@lucide/svelte/icons/cctv';
  import Activity from '@lucide/svelte/icons/activity';
  import FileText from '@lucide/svelte/icons/file-text';
  import Settings from '@lucide/svelte/icons/settings';
  import CloudRain from '@lucide/svelte/icons/cloud-rain';
  import Logo from '../layout/Logo.svelte';
  import { num } from '../../format';
  import { SITE, WEATHER } from '../../geothermal/seed.js';

  const NAV = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Workflow, label: 'SCADA', active: false },
    { icon: LineChart, label: 'Trend & Chart', active: false },
    { icon: Table, label: 'Data Table', active: false },
    { icon: Bell, label: 'Alarm & Event', active: false },
    { icon: Cctv, label: 'CCTV Monitoring', active: false },
    { icon: Activity, label: 'System Status', active: false },
    { icon: FileText, label: 'Reporting', active: false },
    { icon: Settings, label: 'Configuration', active: false },
  ];
</script>

<aside class="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
  <div class="flex items-center gap-2 border-b border-line px-4 py-3">
    <Logo height={24} />
    <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-pu-bright">Geothermal</div>
  </div>

  <nav class="flex flex-col gap-0.5 p-2">
    {#each NAV as item}
      <button
        disabled={!item.active}
        class="flex items-center gap-2.5 rounded-md px-3 py-2 text-[12px] font-medium transition-colors
          {item.active ? 'bg-accent/15 text-accent-bright' : 'text-ink-dim cursor-not-allowed'}"
      >
        <item.icon size={15} /> {item.label}
      </button>
    {/each}
  </nav>

  <div class="mt-auto space-y-3 border-t border-line p-4 text-[11px]">
    <div>
      <div class="mb-1 text-[9px] font-semibold uppercase tracking-widest text-ink-dim">Site Information</div>
      <div class="font-semibold text-ink-strong">{SITE.name}</div>
      <dl class="mt-1 space-y-0.5 text-ink-muted">
        <div class="flex justify-between"><dt>Field Area</dt><dd class="text-ink">{SITE.field}</dd></div>
        <div class="flex justify-between"><dt>Latitude</dt><dd class="text-ink tnum">{SITE.lat}</dd></div>
        <div class="flex justify-between"><dt>Longitude</dt><dd class="text-ink tnum">{SITE.lng}</dd></div>
        <div class="flex justify-between"><dt>Altitude</dt><dd class="text-ink tnum">{SITE.altitude} m</dd></div>
      </dl>
    </div>
    <div class="border-t border-line pt-3">
      <div class="flex items-center gap-2">
        <CloudRain size={22} class="text-accent" />
        <div>
          <div class="text-[18px] font-semibold text-ink-strong tnum">{num(WEATHER.temp, 1)} °C</div>
          <div class="text-ink-muted">{WEATHER.cond}</div>
        </div>
      </div>
      <div class="mt-1 flex justify-between text-ink-muted">
        <span>Wind {WEATHER.wind} km/h</span><span>Hum {WEATHER.humidity}%</span>
      </div>
    </div>
  </div>
</aside>
```

- [ ] **Step 4: GeoHeader**

Create `src/lib/components/geothermal/GeoHeader.svelte`:

```svelte
<script lang="ts">
  import Bell from '@lucide/svelte/icons/bell';
  import FileText from '@lucide/svelte/icons/file-text';
  import LineChart from '@lucide/svelte/icons/line-chart';
  import Download from '@lucide/svelte/icons/download';
  import Settings from '@lucide/svelte/icons/settings';
  import UserRound from '@lucide/svelte/icons/user-round';
  import Clock from '../ui/Clock.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import SystemSwitcher from '../layout/SystemSwitcher.svelte';
  import { geoActiveAlarmCount, geoOverallStatus } from '../../geothermal/store';

  const ACTIONS = [
    { icon: Bell, label: 'Alarm', badge: true },
    { icon: FileText, label: 'Report' },
    { icon: LineChart, label: 'Trend' },
    { icon: Download, label: 'Data Export' },
    { icon: Settings, label: 'Settings' },
  ];
</script>

<header class="flex items-center gap-4 border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur">
  <div class="min-w-0">
    <h1 class="truncate text-[15px] font-semibold tracking-tight text-ink-strong">
      Geothermal Well Pad — Testing Monitoring System
    </h1>
    <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-pu-bright">Real-time Monitoring</div>
  </div>

  <div class="ml-2 hidden items-center gap-2 md:flex">
    <StatusBadge status={$geoOverallStatus} label="System Normal" pulse={$geoOverallStatus !== 'normal'} />
  </div>

  <div class="ml-auto flex items-center gap-3">
    <div class="hidden md:block"><Clock variant="full" /></div>
    <div class="flex items-center gap-1">
      {#each ACTIONS as a}
        <button title={a.label} class="relative grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-panel hover:text-ink-strong">
          <a.icon size={14} />
          {#if a.badge && $geoActiveAlarmCount > 0}
            <span class="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-awas px-1 text-[9px] font-bold text-white">{$geoActiveAlarmCount}</span>
          {/if}
        </button>
      {/each}
    </div>
    <SystemSwitcher />
    <div class="flex items-center gap-2 border-l border-line pl-3">
      <span class="grid h-8 w-8 place-items-center rounded-full border border-line bg-panel-2 text-ink-muted"><UserRound size={15} /></span>
      <span class="hidden text-[11.5px] font-medium text-ink-strong sm:block">Operator</span>
    </div>
  </div>
</header>
```

- [ ] **Step 5: GeothermalShell (placeholder main)**

Create `src/lib/components/geothermal/GeothermalShell.svelte`:

```svelte
<script lang="ts">
  import GeoSidebar from './GeoSidebar.svelte';
  import GeoHeader from './GeoHeader.svelte';
</script>

<div class="flex h-screen overflow-hidden">
  <GeoSidebar />
  <div class="flex min-w-0 flex-1 flex-col">
    <GeoHeader />
    <main class="min-h-0 flex-1 overflow-y-auto p-3">
      <div class="grid h-full place-items-center text-ink-dim">Dashboard panels — coming in next tasks</div>
    </main>
  </div>
</div>
```

- [ ] **Step 6: Wire App.svelte**

In `src/App.svelte`:

Add imports:

```ts
  import GeothermalShell from './lib/components/geothermal/GeothermalShell.svelte';
  import { system } from './lib/stores';
  import { startGeoSimulation } from './lib/geothermal/store';
```

In `onMount`, add `const stopGeo = startGeoSimulation();` and return it in cleanup alongside the others.

Wrap the authenticated block: change the `{:else}` branch (line 60) so the whole existing shell is nested under a `system` check:

```svelte
{:else if $system === 'geothermal'}
  <GeothermalShell />
{:else}
  <div class="flex h-screen flex-col overflow-hidden ...">
    ...existing STESY shell unchanged...
  </div>
{/if}
```

(Keep the existing `<div class="flex h-screen ...">` STESY block exactly as-is inside the final `{:else}`.)

- [ ] **Step 7: Type check + visual smoke**

Run: `npm run check` (expect no new errors), then `npm run dev`.
Verify: login → TopBar shows the Sungai/Geothermal switcher → click Geothermal → sidebar + header render (matching mockup chrome), URL becomes `/geothermal`, clock ticks, alarm badge shows `2`; click Sungai → back to STESY, URL `/…`. Browser back/forward moves between systems.

- [ ] **Step 8: Commit**

```bash
git add src/App.svelte src/lib/components/layout/SystemSwitcher.svelte src/lib/components/layout/TopBar.svelte src/lib/components/geothermal/GeothermalShell.svelte src/lib/components/geothermal/GeoSidebar.svelte src/lib/components/geothermal/GeoHeader.svelte
git commit -m "feat(geothermal): add shell, sidebar, header, and system switcher"
```

---

## Task 6: KPI gauge row (GeoGauge + GaugeCard)

**Files:**
- Create: `src/lib/components/geothermal/GeoGauge.svelte`, `GaugeCard.svelte`, `GeoDashboard.svelte`
- Modify: `GeothermalShell.svelte` (render `GeoDashboard`)

**Interfaces:**
- Consumes: `geoTelemetry`; `num`.
- Produces: `<GaugeCard tag value unit min max digits sublabel />`; `<GeoDashboard />`.

- [ ] **Step 1: GeoGauge (semicircular arc, 180°)**

Create `src/lib/components/geothermal/GeoGauge.svelte`. Concrete arc math: map `value∈[min,max]` to a 180° sweep; draw a track arc + value arc via SVG path.

```svelte
<script lang="ts">
  interface Props { value: number; min: number; max: number; color?: string; size?: number; }
  let { value, min, max, color = '#4f9bee', size = 150 }: Props = $props();

  const R = 62;
  const CX = 80;
  const CY = 78;
  // polar→cartesian for a semicircle spanning 180°..360° (left→right, top half)
  function pt(frac: number): [number, number] {
    const a = Math.PI + frac * Math.PI; // π..2π
    return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
  }
  function arc(f0: number, f1: number): string {
    const [x0, y0] = pt(f0);
    const [x1, y1] = pt(f1);
    const large = f1 - f0 > 0.5 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  const frac = $derived(Math.max(0, Math.min(1, (value - min) / (max - min))));
</script>

<svg width={size} height={size * 0.62} viewBox="0 0 160 92">
  <path d={arc(0, 1)} fill="none" stroke="var(--color-line)" stroke-width="9" stroke-linecap="round" />
  <path d={arc(0, frac)} fill="none" stroke={color} stroke-width="9" stroke-linecap="round" />
  <text x="18" y="90" class="fill-current text-ink-dim" font-size="8">{min}</text>
  <text x="132" y="90" class="fill-current text-ink-dim" font-size="8" text-anchor="end">{max}</text>
</svg>
```

- [ ] **Step 2: GaugeCard**

Create `src/lib/components/geothermal/GaugeCard.svelte`:

```svelte
<script lang="ts">
  import GeoGauge from './GeoGauge.svelte';
  import { num } from '../../format';
  interface Props {
    tag: string; label: string; value: number; unit: string;
    min: number; max: number; digits?: number; color?: string; sublabel?: string;
  }
  let { tag, label, value, unit, min, max, digits = 1, color, sublabel }: Props = $props();
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
    <div class="text-[10px] font-mono text-ink-dim">{tag}</div>
  </div>
  <div class="relative grid place-items-center">
    <GeoGauge {value} {min} {max} {color} />
    <div class="absolute inset-x-0 bottom-1 text-center">
      <div class="text-[22px] font-semibold text-ink-strong tnum">{num(value, digits)}</div>
      <div class="text-[10px] text-ink-muted">{unit}</div>
    </div>
  </div>
  {#if sublabel}<div class="mt-1 text-center text-[10px] text-ink-dim">{sublabel}</div>{/if}
</div>
```

- [ ] **Step 3: GeoDashboard with the 4 KPI cards**

Create `src/lib/components/geothermal/GeoDashboard.svelte`:

```svelte
<script lang="ts">
  import GaugeCard from './GaugeCard.svelte';
  import { geoTelemetry } from '../../geothermal/store';
  const t = geoTelemetry;
</script>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
  <GaugeCard tag="PT-101" label="Well Pressure" value={$t.wellPressure} unit="bar(g)" min={0} max={250} color="#4f9bee" sublabel="4–20 mA · Normal" />
  <GaugeCard tag="PT-102" label="Heat Pipe Pressure" value={$t.heatPipePressure} unit="bar(g)" min={0} max={250} color="#e08a3c" sublabel="4–20 mA · Normal" />
  <GaugeCard tag="LT-201" label="Water Level (V-Notch)" value={$t.level} unit="m" min={0} max={1} digits={3} color="#3fb27f" sublabel="Head (H) · Normal" />
  <GaugeCard tag="FT-201" label="Flow Rate (V-Notch)" value={$t.flowLs} unit="L/s" min={0} max={50} digits={2} color="#3fb27f" sublabel={`${$t.flowM3h} m³/h`} />
</div>
```

- [ ] **Step 4: Render GeoDashboard in the shell**

In `GeothermalShell.svelte`, replace the placeholder `<main>` content with `<GeoDashboard />` (import it).

- [ ] **Step 5: Verify**

Run: `npm run check` then `npm run dev`. On `/geothermal`, four arc gauges render with live values (level ~0.42, flow ~23, values jitter every 5 s). Compare against the mockup KPI row.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/geothermal/GeoGauge.svelte src/lib/components/geothermal/GaugeCard.svelte src/lib/components/geothermal/GeoDashboard.svelte src/lib/components/geothermal/GeothermalShell.svelte
git commit -m "feat(geothermal): add KPI arc gauges (well/heat-pipe/level/flow)"
```

---

## Task 7: SCADA P&ID diagram (`ScadaDiagram`)

**Files:**
- Create: `src/lib/components/geothermal/ScadaDiagram.svelte`
- Modify: `GeoDashboard.svelte` (place it)

**Interfaces:**
- Consumes: `geoTelemetry`; `VALVES` from seed; `num`.

**Note:** this is a hand-built SVG schematic and the one component that needs visual iteration against the mockup. The step below gives a concrete, working starting structure (pipes, equipment blocks, live sensor chips, valve states, flow animation, V-notch sub-panel with the printed formula, and the P&ID/3D/Legend tabs). Refine geometry visually after it renders.

- [ ] **Step 1: Build the diagram**

Create `src/lib/components/geothermal/ScadaDiagram.svelte`:

```svelte
<script lang="ts">
  import { num } from '../../format';
  import { geoTelemetry } from '../../geothermal/store';
  import { VALVES } from '../../geothermal/seed.js';
  const t = geoTelemetry;
  let tab = $state<'pid' | '3d' | 'legend'>('pid');
  const valve = (id: string) => VALVES.find((v) => v.id === id)?.open ?? false;
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">SCADA — Well Pad Overview</div>
    <div class="flex items-center rounded-lg border border-line bg-panel-2 p-0.5 text-[10px]">
      {#each [['pid','P&ID'],['3d','3D View'],['legend','Legend']] as [k, lbl]}
        <button onclick={() => (tab = k as typeof tab)} class="rounded-md px-2 py-1 {tab === k ? 'bg-accent/20 text-accent-bright' : 'text-ink-muted'}">{lbl}</button>
      {/each}
    </div>
  </div>

  {#if tab === 'pid'}
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
      <svg viewBox="0 0 560 300" class="w-full rounded-lg bg-panel-2">
        <!-- water/steam pipes: dashed animated stroke -->
        <style>
          .flow { stroke-dasharray: 7 6; animation: dash 1.1s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: -13; } }
        </style>
        <!-- wellhead → separator -->
        <path class="flow" d="M60 210 H200" stroke="#4f9bee" stroke-width="4" fill="none" />
        <!-- separator → heat pipe (steam) -->
        <path class="flow" d="M300 150 H520" stroke="#d8635f" stroke-width="4" fill="none" />
        <!-- separator → v-notch (water) -->
        <path class="flow" d="M300 220 H430 V270" stroke="#4f9bee" stroke-width="4" fill="none" />

        <!-- wellhead -->
        <rect x="30" y="150" width="30" height="90" rx="3" fill="#243244" stroke="#3a516f" />
        <text x="45" y="255" font-size="9" text-anchor="middle" class="fill-current text-ink-dim">Wellhead</text>
        <!-- separator vessel -->
        <rect x="200" y="120" width="100" height="120" rx="10" fill="#2a3a4f" stroke="#3a516f" />
        <text x="250" y="185" font-size="9" text-anchor="middle" class="fill-current text-ink-muted">Separator</text>
        <!-- v-notch channel -->
        <rect x="400" y="270" width="120" height="24" rx="3" fill="#1c2b45" stroke="#3a516f" />

        <!-- valves -->
        {#each [['XV-101', 130, 196], ['XV-102', 470, 138]] as [id, x, y]}
          <g>
            <rect x={x} y={y} width="34" height="16" rx="2" fill={valve(id as string) ? '#153a2a' : '#3a1c1c'} stroke={valve(id as string) ? '#3fb27f' : '#d8635f'} />
            <text x={Number(x) + 17} y={Number(y) + 11} font-size="7" text-anchor="middle" class="fill-current {valve(id as string) ? 'text-normal' : 'text-awas'}">{valve(id as string) ? 'OPEN' : 'SHUT'}</text>
          </g>
        {/each}

        <!-- live sensor chips -->
        {#each [['PT-101', 60, 120, num($t.wellPressure,1)+' bar'], ['PT-102', 320, 110, num($t.heatPipePressure,1)+' bar'], ['TT-101', 250, 90, num($t.temperature,1)+' °C'], ['LT-201', 440, 250, num($t.level,3)+' m']] as [id, x, y, val]}
          <g>
            <rect x={x} y={y} width="70" height="26" rx="3" fill="#0f1a2e" stroke="#3a516f" />
            <text x={Number(x)+35} y={Number(y)+11} font-size="8" text-anchor="middle" class="fill-current text-accent-bright">{id}</text>
            <text x={Number(x)+35} y={Number(y)+21} font-size="8" text-anchor="middle" class="fill-current text-ink-strong">{val}</text>
          </g>
        {/each}
      </svg>

      <!-- V-notch sub-panel -->
      <div class="rounded-lg border border-line bg-panel-2 p-3">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">V-Notch Channel (90°)</div>
        <div class="mt-2 flex items-end justify-between">
          <div><div class="text-[9px] text-ink-dim">Head (H)</div><div class="text-[18px] font-semibold text-ink-strong tnum">{num($t.level,3)} m</div></div>
          <div class="text-right"><div class="text-[9px] text-ink-dim">Flow</div><div class="text-[18px] font-semibold text-ink-strong tnum">{num($t.flowLs,2)} L/s</div></div>
        </div>
        <div class="mt-2 rounded bg-panel px-2 py-1 text-center font-mono text-[11px] text-accent-bright">Q = 1.417 × H^2.5</div>
        <div class="mt-1 text-center text-[9px] text-ink-dim">Q in L/s, H in m · {num($t.flowM3h,2)} m³/h</div>
      </div>
    </div>
  {:else if tab === '3d'}
    <div class="grid h-56 place-items-center rounded-lg bg-panel-2 text-[12px] text-ink-dim">3D view not available in this build</div>
  {:else}
    <div class="grid grid-cols-2 gap-2 p-2 text-[11px] text-ink-muted">
      <div class="flex items-center gap-2"><span class="h-1 w-6 bg-[#d8635f]"></span> Steam / Gas</div>
      <div class="flex items-center gap-2"><span class="h-1 w-6 bg-[#4f9bee]"></span> Water</div>
      <div class="flex items-center gap-2"><span class="h-1 w-6 border-t-2 border-dashed border-ink-dim"></span> Instrument Signal</div>
      <div class="flex items-center gap-2"><span class="h-1 w-6 bg-[#3fb27f]"></span> Electrical / Comm</div>
    </div>
  {/if}
</div>
```

- [ ] **Step 2: Place it in GeoDashboard**

In `GeoDashboard.svelte`, add below the gauge row (import `ScadaDiagram`):

```svelte
<div class="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[3fr_1fr]">
  <ScadaDiagram />
  <!-- SystemStatusPanel goes here in Task 8 -->
</div>
```

- [ ] **Step 3: Verify**

Run: `npm run check` then `npm run dev`. The P&ID renders with animated flow, valve states, live sensor chips updating every 5 s, and the V-notch panel showing the formula + live head/flow. Tabs switch. Iterate on geometry until it reads clearly.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/geothermal/ScadaDiagram.svelte src/lib/components/geothermal/GeoDashboard.svelte
git commit -m "feat(geothermal): add SCADA P&ID diagram with live tags and V-notch"
```

---

## Task 8: System status + trend panels

**Files:**
- Create: `src/lib/components/geothermal/SystemStatusPanel.svelte`, `TrendPanel.svelte`
- Modify: `GeoDashboard.svelte`

**Interfaces:**
- Consumes: `SYSTEM_ROWS` from seed; `geoHistory`; `MultiChart`; `StatusBadge`.

- [ ] **Step 1: SystemStatusPanel**

Create `src/lib/components/geothermal/SystemStatusPanel.svelte`:

```svelte
<script lang="ts">
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { SYSTEM_ROWS } from '../../geothermal/seed.js';
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">System Status</div>
  <ul class="space-y-1.5">
    {#each SYSTEM_ROWS as row}
      <li class="flex items-center justify-between text-[12px]">
        <span class="text-ink">{row.label}</span>
        <StatusBadge status={row.state} label={row.value} size="xs" />
      </li>
    {/each}
  </ul>
</div>
```

Put `<SystemStatusPanel />` into the right column of the ScadaDiagram row in `GeoDashboard.svelte` (replacing the Task 7 comment).

- [ ] **Step 2: TrendPanel (reuse MultiChart)**

Create `src/lib/components/geothermal/TrendPanel.svelte`:

```svelte
<script lang="ts">
  import MultiChart from '../ui/MultiChart.svelte';
  import { geoHistory } from '../../geothermal/store';
  const h = geoHistory;
  const series = $derived([
    { name: 'Well Pressure', color: '#4f9bee', points: $h.wellPressure },
    { name: 'Heat Pipe Pressure', color: '#e08a3c', points: $h.heatPipePressure },
    { name: 'Water Level', color: '#3fb27f', points: $h.level },
    { name: 'Flow Rate', color: '#c9a227', points: $h.flowLs },
  ]);
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Real-time Trend (6 hours)</div>
  <MultiChart {series} height={200} digits={1} />
</div>
```

- [ ] **Step 3: Place TrendPanel**

In `GeoDashboard.svelte`, add a new row: `<div class="mt-3"><TrendPanel /></div>` (import it). Final panel placement is finalized in Task 10.

- [ ] **Step 4: Verify**

Run: `npm run check` then `npm run dev`. System status rows show green pills; the trend chart draws 4 smooth series that extend every 5 s.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/geothermal/SystemStatusPanel.svelte src/lib/components/geothermal/TrendPanel.svelte src/lib/components/geothermal/GeoDashboard.svelte
git commit -m "feat(geothermal): add system status + realtime trend panels"
```

---

## Task 9: Power + comms panels

**Files:**
- Create: `src/lib/components/geothermal/PowerPanel.svelte`, `CommsPanel.svelte`
- Modify: `GeoDashboard.svelte`

**Interfaces:**
- Consumes: `geoTelemetry`; `Gauge` (battery %); `num`.

- [ ] **Step 1: PowerPanel (reuse Gauge for battery %)**

Create `src/lib/components/geothermal/PowerPanel.svelte`:

```svelte
<script lang="ts">
  import Gauge from '../ui/Gauge.svelte';
  import { num } from '../../format';
  import { geoTelemetry } from '../../geothermal/store';
  const t = geoTelemetry;
  const hours = $derived(num(($t.battery / 100) * 24, 1));
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Power Supply — Solar System</div>
  <div class="flex items-center gap-4">
    <Gauge value={$t.battery} size={92} digits={0} unit="%" color="#3fb27f" label="Battery" sublabel={`${hours} h`} />
    <div class="grid flex-1 grid-cols-2 gap-2 text-[11px]">
      <div><div class="text-ink-dim">Solar Voltage</div><div class="font-semibold text-ink-strong tnum">{num($t.solarV,1)} V</div></div>
      <div><div class="text-ink-dim">Battery Voltage</div><div class="font-semibold text-ink-strong tnum">{num($t.batteryV,1)} V</div></div>
      <div><div class="text-ink-dim">Charge Current</div><div class="font-semibold text-ink-strong tnum">{num($t.chargeA,1)} A</div></div>
      <div><div class="text-ink-dim">Output Power</div><div class="font-semibold text-ink-strong tnum">240 W</div></div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: CommsPanel (VSAT)**

Create `src/lib/components/geothermal/CommsPanel.svelte`. Signal bars: 5 bars, count lit from `vsatLink`.

```svelte
<script lang="ts">
  import { num } from '../../format';
  import { geoTelemetry } from '../../geothermal/store';
  const t = geoTelemetry;
  const bars = $derived(Math.round(($t.vsatLink - 90) / 2)); // 90..100 → 0..5
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Communication — VSAT</div>
  <div class="flex items-center justify-between">
    <div><div class="text-ink-dim text-[10px]">Signal Strength</div><div class="text-[18px] font-semibold text-ink-strong tnum">{num($t.vsatSignal,0)} dBm</div></div>
    <div class="flex items-end gap-0.5">
      {#each Array(5) as _, i}
        <span class="w-1.5 rounded-sm {i < bars ? 'bg-normal' : 'bg-line'}" style="height:{6 + i * 4}px"></span>
      {/each}
    </div>
    <div class="text-right"><div class="text-ink-dim text-[10px]">Link Quality</div><div class="text-[18px] font-semibold text-ink-strong tnum">{num($t.vsatLink,0)}%</div></div>
  </div>
  <div class="mt-2 grid grid-cols-2 gap-1 text-[11px] text-ink-muted">
    <div>Status <span class="text-normal">Connected</span></div>
    <div>IP <span class="text-ink tnum">10.10.10.25</span></div>
    <div>Latency <span class="text-ink tnum">{$t.latency} ms</span></div>
    <div>Uptime <span class="text-ink tnum">3d 14h 25m</span></div>
  </div>
</div>
```

- [ ] **Step 3: Place both**

In `GeoDashboard.svelte`, add a row: `<div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2"><PowerPanel /><CommsPanel /></div>` (finalized in Task 10).

- [ ] **Step 4: Verify**

Run: `npm run check` then `npm run dev`. Battery ring, solar metrics, VSAT signal bars + metrics render and update.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/geothermal/PowerPanel.svelte src/lib/components/geothermal/CommsPanel.svelte src/lib/components/geothermal/GeoDashboard.svelte
git commit -m "feat(geothermal): add solar power + VSAT comms panels"
```

---

## Task 10: Alarm summary, CCTV, footer, final layout

**Files:**
- Create: `src/lib/components/geothermal/AlarmSummaryPanel.svelte`, `GeoCctvPanel.svelte`, `GeoFooter.svelte`
- Modify: `GeoDashboard.svelte` (final grid), `GeothermalShell.svelte` (footer)
- Add assets: `public/cctv/cam-geo-*.jpg` (stand-ins)

**Interfaces:**
- Consumes: `geoAlarms`, `geoActiveAlarmCount` from store; `GEO_CAMERAS` from seed; `CameraTile`; status colors.

- [ ] **Step 1: Add geothermal camera stand-in images**

Run:

```bash
cp public/cctv/cam-cigaru-spillway.jpg public/cctv/cam-geo-wellpad.jpg
cp public/cctv/cam-pompa-muara.jpg   public/cctv/cam-geo-separator.jpg
cp public/cctv/cam-di-cikawung.jpg   public/cctv/cam-geo-vnotch.jpg
cp public/cctv/cam-klimat.jpg        public/cctv/cam-geo-solar.jpg
```

- [ ] **Step 2: GeoCctvPanel (reuse CameraTile)**

Create `src/lib/components/geothermal/GeoCctvPanel.svelte`:

```svelte
<script lang="ts">
  import CameraTile from '../cctv/CameraTile.svelte';
  import { GEO_CAMERAS } from '../../geothermal/seed.js';
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">CCTV Monitoring</div>
    <span class="flex items-center gap-1 text-[10px] font-semibold text-normal"><span class="h-1.5 w-1.5 rounded-full bg-normal"></span>Live</span>
  </div>
  <div class="grid grid-cols-2 gap-2">
    {#each GEO_CAMERAS as cam}<CameraTile {cam} compact />{/each}
  </div>
</div>
```

- [ ] **Step 3: AlarmSummaryPanel**

Create `src/lib/components/geothermal/AlarmSummaryPanel.svelte`:

```svelte
<script lang="ts">
  import { geoActiveAlarmCount } from '../../geothermal/store';
  import { geoAlarms } from '../../geothermal/store';
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-awas">Alarm Summary</div>
    <span class="rounded-full bg-awas/15 px-2 py-0.5 text-[10px] font-semibold text-awas">{$geoActiveAlarmCount} Active</span>
  </div>
  <table class="w-full text-[11px]">
    <thead class="text-ink-dim"><tr><th class="text-left font-medium">Time</th><th class="text-left font-medium">Alarm</th><th class="text-right font-medium">Status</th></tr></thead>
    <tbody>
      {#each $geoAlarms as a}
        <tr class="border-t border-line/60">
          <td class="py-1 tnum text-ink-muted">{a.time}</td>
          <td class="py-1 text-ink">{a.label}</td>
          <td class="py-1 text-right font-semibold {a.status === 'active' ? 'text-awas' : 'text-normal'}">{a.status === 'active' ? 'ACTIVE' : 'CLEARED'}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <button class="mt-2 w-full rounded-md border border-line py-1.5 text-[11px] text-ink-muted hover:bg-panel-2">View All Alarms</button>
</div>
```

- [ ] **Step 4: GeoFooter**

Create `src/lib/components/geothermal/GeoFooter.svelte`:

```svelte
<script lang="ts">
  import { geoOverallStatus } from '../../geothermal/store';
  import { STATUS } from '../../status';
</script>

<footer class="flex items-center justify-between border-t border-line bg-surface px-4 py-1.5 text-[10px] text-ink-dim">
  <span class="flex items-center gap-1.5 font-semibold" style="color:{STATUS[$geoOverallStatus].color}">
    <span class="h-1.5 w-1.5 rounded-full" style="background:{STATUS[$geoOverallStatus].color}"></span>
    {$geoOverallStatus === 'normal' ? 'System Normal' : STATUS[$geoOverallStatus].label}
  </span>
  <span>Geothermal Well Pad Testing Monitoring System · Data is refreshed every 5 seconds</span>
  <span>v1.0.0</span>
</footer>
```

- [ ] **Step 5: Final GeoDashboard layout**

Rewrite `GeoDashboard.svelte` to assemble all panels in a mockup-faithful grid:

```svelte
<script lang="ts">
  import GaugeCard from './GaugeCard.svelte';
  import ScadaDiagram from './ScadaDiagram.svelte';
  import SystemStatusPanel from './SystemStatusPanel.svelte';
  import TrendPanel from './TrendPanel.svelte';
  import PowerPanel from './PowerPanel.svelte';
  import CommsPanel from './CommsPanel.svelte';
  import AlarmSummaryPanel from './AlarmSummaryPanel.svelte';
  import GeoCctvPanel from './GeoCctvPanel.svelte';
  import { geoTelemetry } from '../../geothermal/store';
  const t = geoTelemetry;
</script>

<div class="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_260px]">
  <div class="min-w-0 space-y-3">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <GaugeCard tag="PT-101" label="Well Pressure" value={$t.wellPressure} unit="bar(g)" min={0} max={250} color="#4f9bee" sublabel="4–20 mA · Normal" />
      <GaugeCard tag="PT-102" label="Heat Pipe Pressure" value={$t.heatPipePressure} unit="bar(g)" min={0} max={250} color="#e08a3c" sublabel="4–20 mA · Normal" />
      <GaugeCard tag="LT-201" label="Water Level (V-Notch)" value={$t.level} unit="m" min={0} max={1} digits={3} color="#3fb27f" sublabel="Head (H) · Normal" />
      <GaugeCard tag="FT-201" label="Flow Rate (V-Notch)" value={$t.flowLs} unit="L/s" min={0} max={50} digits={2} color="#3fb27f" sublabel={`${$t.flowM3h} m³/h`} />
    </div>
    <ScadaDiagram />
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <TrendPanel />
      <div class="space-y-3"><PowerPanel /><CommsPanel /></div>
    </div>
    <AlarmSummaryPanel />
  </div>
  <div class="space-y-3">
    <SystemStatusPanel />
    <GeoCctvPanel />
  </div>
</div>
```

- [ ] **Step 6: Add footer to the shell**

In `GeothermalShell.svelte`, import `GeoFooter` and render it after `</main>` (inside the column div).

- [ ] **Step 7: Verify against the mockup**

Run: `npm run check` then `npm run dev`. On `/geothermal`: KPI gauges, SCADA diagram, right-rail system status + CCTV (4 live tiles), trend chart, power + comms, alarm table (2 ACTIVE), footer. Values update every 5 s; the shared TopBar pause control freezes both systems. Compare side-by-side with the reference mockup and adjust spacing.

- [ ] **Step 8: Final test + commit**

```bash
npm test && npm run check
git add public/cctv/cam-geo-*.jpg src/lib/components/geothermal/AlarmSummaryPanel.svelte src/lib/components/geothermal/GeoCctvPanel.svelte src/lib/components/geothermal/GeoFooter.svelte src/lib/components/geothermal/GeoDashboard.svelte src/lib/components/geothermal/GeothermalShell.svelte
git commit -m "feat(geothermal): add alarms, CCTV, footer, and final dashboard layout"
```

---

## Self-Review

**Spec coverage:**
- §2 architecture/routing → Tasks 3, 5. ✅
- §3 component tree → Tasks 5–10 (every panel has a task). ✅
- §4 SCADA P&ID → Task 7. ✅
- §5 state/simulation + weir honesty note → Tasks 1, 4 (formula printed verbatim in Task 7). ✅
- §6 testing → Tasks 1, 2 (`node --test`). ✅
- §7 out of scope → inert nav items (Task 5), 3D placeholder (Task 7), single well pad, no chatbot. ✅

**Placeholder scan:** no "TBD"/"handle edge cases"/"similar to Task N" — code is inlined per step. ScadaDiagram is explicitly flagged as visual-iterative but ships a complete, working component. ✅

**Type consistency:** `stepTelemetry`/`Telemetry` field names match across `wellpad.js`, `seed.js`, `store.ts`, and every consuming component (`wellPressure`, `heatPipePressure`, `temperature`, `level`, `flowLs`, `flowM3h`, `battery`, `solarV`, `batteryV`, `chargeA`, `vsatSignal`, `vsatLink`, `latency`). History keys (`wellPressure`, `heatPipePressure`, `level`, `flowLs`) are consistent between `store.ts` and `TrendPanel`. `GEO_CAMERAS` uses the extended `CameraGroup` `'geothermal'`. ✅
