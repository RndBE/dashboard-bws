# Geothermal Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the geothermal sub-system from one implicit well pad to a multi-well field data model, and replace the flat 9-item sidebar with the full grouped ~15-page navigation (new pages stubbed), with existing pages rewired to the new model and live field KPIs on the Dashboard.

**Architecture:** Keep all field math as pure JS in `src/lib/geothermal/field.js` (importable by `node --test`, same pattern as `wellpad.js`). Svelte stores hold `geoWells` (array) and derive `geoField` (aggregate KPIs) and `geoTelemetry` (selected well) so existing presentational components keep working. The sim tick steps every well each 5s. Sidebar reads a grouped nav config; the shell router maps every section, routing not-yet-built pages to the existing `GeoPlaceholder`.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vite, Tailwind, Lucide icons, `node --test` for unit tests.

## Global Constraints

- Data is **mock + realtime simulation** on a **5000 ms** tick. No backend.
- Pure field math lives in **plain JS** (`.js`, JSDoc types) so `node --test` imports it without a TS loader — mirror `wellpad.js`.
- Randomness is **injected** (`rnd = Math.random` default param) for deterministic tests. Never call `Math.random()` directly in pure functions.
- Status vocabulary is the existing `GeoStatus` union: `'normal' | 'waspada' | 'siaga' | 'awas'`.
- Reuse existing tokens/classes (`bg-surface`, `border-line`, `text-ink*`, `text-accent*`, `bg-panel`, `tnum`) and Lucide icons. No new colors.
- Do **not** touch the STESY (river-basin) sub-system.
- Test command: `npm test` (runs `node --test tests/*.test.js`). Type/UI gate: `npm run check`.

---

### Task 1: Field data model + pure functions (`field.js`)

Pure, testable multi-well field math. No Svelte, no DOM.

**Files:**
- Create: `src/lib/geothermal/field.js`
- Test: `tests/geothermalField.test.js`

**Interfaces:**
- Consumes: `stepTelemetry`, `worstStatus`, `sensorState`, `r2`, `lsToM3h`, `weirFlowLs` from `./wellpad.js`; `SEED_TELEMETRY` from `./seed.js`.
- Produces:
  - `WELL_SEED: Array<{ id, name, type: 'production'|'reinjection', lat, lng, factor }>`
  - `wellOutput(telemetry) → { steamTh:number, brineM3h:number, mw:number }` (reinjection handled by caller via `type`)
  - `WELL_THRESHOLDS` — `{ wellPressure:{waspada,siaga,awas}, heatPipePressure:{...}, level:{...} }`
  - `wellStatus(telemetry) → GeoStatus`
  - `makeWells() → Well[]` where `Well = { id, name, type, lat, lng, telemetry, output, status }`
  - `stepWell(well, rnd?) → Well`
  - `stepField(wells, rnd?) → Well[]`
  - `fieldKpis(wells) → { steamTh, brineM3h, grossMw, availability, wellsUp, wellsTotal }`

- [ ] **Step 1: Write the failing test**

```js
// tests/geothermalField.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WELL_SEED, wellOutput, wellStatus, makeWells, stepField, fieldKpis, WELL_THRESHOLDS,
} from '../src/lib/geothermal/field.js';
import { RANGES } from '../src/lib/geothermal/wellpad.js';
import { SEED_TELEMETRY } from '../src/lib/geothermal/seed.js';

test('WELL_SEED has production and reinjection wells with unique ids', () => {
  const ids = WELL_SEED.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(WELL_SEED.some((w) => w.type === 'production'));
  assert.ok(WELL_SEED.some((w) => w.type === 'reinjection'));
});

test('wellOutput anchors to seed telemetry', () => {
  const o = wellOutput(SEED_TELEMETRY);
  assert.equal(o.brineM3h, SEED_TELEMETRY.flowM3h);
  assert.ok(o.steamTh > 0 && o.mw > 0);
  assert.equal(o.mw, r2Ref(o.steamTh * 0.13));
});
function r2Ref(v) { return Math.round(v * 100) / 100; }

test('wellStatus is normal for nominal seed telemetry', () => {
  assert.equal(wellStatus(SEED_TELEMETRY), 'normal');
});

test('wellStatus escalates when heat-pipe pressure is high', () => {
  const hot = { ...SEED_TELEMETRY, heatPipePressure: WELL_THRESHOLDS.heatPipePressure.awas + 1 };
  assert.equal(wellStatus(hot), 'awas');
});

test('makeWells produces one Well per seed with derived output+status', () => {
  const wells = makeWells();
  assert.equal(wells.length, WELL_SEED.length);
  for (const w of wells) {
    assert.ok(w.telemetry && w.output && w.status);
    assert.equal(typeof w.output.mw, 'number');
  }
});

test('reinjection wells contribute no steam or MW', () => {
  const wells = makeWells();
  const ri = wells.find((w) => w.type === 'reinjection');
  assert.equal(ri.output.steamTh, 0);
  assert.equal(ri.output.mw, 0);
});

test('stepField keeps every well telemetry inside declared ranges', () => {
  let wells = makeWells();
  let draw = 0;
  const rnd = () => ((draw = (draw + 0.37) % 1), draw);
  for (let i = 0; i < 100; i++) {
    wells = stepField(wells, rnd);
    for (const w of wells) {
      for (const key of Object.keys(RANGES)) {
        assert.ok(w.telemetry[key] >= RANGES[key].min && w.telemetry[key] <= RANGES[key].max,
          `${w.id}.${key}=${w.telemetry[key]} out of range`);
      }
    }
  }
});

test('fieldKpis sums production output and reports availability', () => {
  const wells = makeWells();
  const k = fieldKpis(wells);
  const prodSteam = wells.filter((w) => w.type === 'production')
    .reduce((s, w) => s + w.output.steamTh, 0);
  assert.ok(Math.abs(k.steamTh - r2Ref(prodSteam)) < 1e-6);
  assert.equal(k.wellsTotal, wells.length);
  assert.ok(k.availability >= 0 && k.availability <= 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../src/lib/geothermal/field.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/geothermal/field.js
// Pure multi-well field math. Plain JS so `node --test` imports it directly.
// Randomness injected (`rnd`) for deterministic tests.
import { stepTelemetry, worstStatus, sensorState, r2 } from './wellpad.js';
import { SEED_TELEMETRY } from './seed.js';

/** Seed definitions for the field's wells. `factor` scales the seed telemetry
 *  so wells read differently. Reinjection wells produce no steam/MW.
 * @type {Array<{id:string,name:string,type:'production'|'reinjection',lat:number,lng:number,factor:number}>} */
export const WELL_SEED = [
  { id: 'WP-01', name: 'Well Pad 01', type: 'production', lat: -7.250, lng: 109.100, factor: 1.00 },
  { id: 'WP-02', name: 'Well Pad 02', type: 'production', lat: -7.246, lng: 109.108, factor: 0.94 },
  { id: 'WP-03', name: 'Well Pad 03', type: 'production', lat: -7.253, lng: 109.113, factor: 1.06 },
  { id: 'WP-04', name: 'Well Pad 04', type: 'production', lat: -7.258, lng: 109.104, factor: 0.88 },
  { id: 'RI-01', name: 'Reinjection 01', type: 'reinjection', lat: -7.262, lng: 109.118, factor: 0.90 },
  { id: 'RI-02', name: 'Reinjection 02', type: 'reinjection', lat: -7.244, lng: 109.096, factor: 0.85 },
];

/** Rising thresholds per tag; well status = worst across tags. */
export const WELL_THRESHOLDS = {
  wellPressure: { waspada: 132, siaga: 136, awas: 140 },
  heatPipePressure: { waspada: 92, siaga: 96, awas: 100 },
  level: { waspada: 0.52, siaga: 0.56, awas: 0.60 },
};

/** Steam (t/h) and gross MW derived from separator conditions. Mock but monotonic.
 * @param {Record<string, number>} t
 * @returns {{steamTh:number, brineM3h:number, mw:number}} */
export function wellOutput(t) {
  const steamTh = r2((t.wellPressure - 100) * 0.9 + (t.temperature - 180) * 0.6);
  return { steamTh, brineM3h: t.flowM3h, mw: r2(steamTh * 0.13) };
}

/** @param {Record<string, number>} t @returns {string} */
export function wellStatus(t) {
  return worstStatus([
    sensorState(t.wellPressure, WELL_THRESHOLDS.wellPressure),
    sensorState(t.heatPipePressure, WELL_THRESHOLDS.heatPipePressure),
    sensorState(t.level, WELL_THRESHOLDS.level),
  ]);
}

/** @param {{id:string,name:string,type:string,lat:number,lng:number,factor:number}} seed */
function buildWell(seed) {
  const telemetry = { ...SEED_TELEMETRY };
  telemetry.wellPressure = r2(SEED_TELEMETRY.wellPressure * seed.factor);
  telemetry.heatPipePressure = r2(SEED_TELEMETRY.heatPipePressure * seed.factor);
  telemetry.temperature = r2(SEED_TELEMETRY.temperature * (0.5 + seed.factor / 2));
  const output = seed.type === 'reinjection'
    ? { steamTh: 0, brineM3h: telemetry.flowM3h, mw: 0 }
    : wellOutput(telemetry);
  return {
    id: seed.id, name: seed.name, type: seed.type, lat: seed.lat, lng: seed.lng,
    telemetry, output, status: wellStatus(telemetry),
  };
}

/** @returns {Array<object>} */
export function makeWells() {
  return WELL_SEED.map(buildWell);
}

/** @param {object} well @param {() => number} [rnd] */
export function stepWell(well, rnd = Math.random) {
  const telemetry = stepTelemetry(well.telemetry, rnd);
  const output = well.type === 'reinjection'
    ? { steamTh: 0, brineM3h: telemetry.flowM3h, mw: 0 }
    : wellOutput(telemetry);
  return { ...well, telemetry, output, status: wellStatus(telemetry) };
}

/** @param {Array<object>} wells @param {() => number} [rnd] */
export function stepField(wells, rnd = Math.random) {
  return wells.map((w) => stepWell(w, rnd));
}

/** Aggregate field KPIs. Steam/MW from production wells; brine from all.
 * @param {Array<object>} wells */
export function fieldKpis(wells) {
  const prod = wells.filter((w) => w.type === 'production');
  const steamTh = r2(prod.reduce((s, w) => s + w.output.steamTh, 0));
  const grossMw = r2(prod.reduce((s, w) => s + w.output.mw, 0));
  const brineM3h = r2(wells.reduce((s, w) => s + w.output.brineM3h, 0));
  const wellsUp = wells.filter((w) => w.status !== 'awas').length;
  return {
    steamTh, grossMw, brineM3h,
    wellsUp, wellsTotal: wells.length,
    availability: r2((wellsUp / wells.length) * 100),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all `geothermalField.test.js` tests green, existing `geothermalWellpad.test.js` still green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geothermal/field.js tests/geothermalField.test.js
git commit -m "feat(geothermal): pure multi-well field model + field KPIs"
```

---

### Task 2: TypeScript types + grouped nav config

Type the new model and restructure the sidebar nav into groups. Type-only + config; gate is `svelte-check`.

**Files:**
- Modify: `src/lib/geothermal/types.ts`
- Modify: `src/lib/config/geoNav.ts`

**Interfaces:**
- Consumes: nothing at runtime.
- Produces:
  - `types.ts`: `WellType`, `WellOutput`, `Well`, `FieldKpis` interfaces.
  - `geoNav.ts`: extended `GeoSection` union (adds `fieldmap`, `wells`, `historian`, `production`, `instruments`, `maintenance`, `geochem`, `health`; renames drop nothing — keep `dashboard, scada, trend, data, alarm, cctv, status, reporting, config`); exports `GEO_NAV_GROUPS: GeoNavGroup[]` and keeps `GEO_NAV` as the flat concat for lookups.

- [ ] **Step 1: Add types to `types.ts`**

Append to `src/lib/geothermal/types.ts`:

```ts
export type WellType = 'production' | 'reinjection';

export interface WellOutput { steamTh: number; brineM3h: number; mw: number; }

export interface Well {
  id: string;
  name: string;
  type: WellType;
  lat: number;
  lng: number;
  telemetry: Telemetry;
  output: WellOutput;
  status: GeoStatus;
}

export interface FieldKpis {
  steamTh: number;
  grossMw: number;
  brineM3h: number;
  wellsUp: number;
  wellsTotal: number;
  availability: number;
}
```

- [ ] **Step 2: Rewrite `geoNav.ts` with grouped structure**

Replace the whole file `src/lib/config/geoNav.ts`:

```ts
import type { Component } from 'svelte';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Map from '@lucide/svelte/icons/map';
import Workflow from '@lucide/svelte/icons/workflow';
import LineChart from '@lucide/svelte/icons/line-chart';
import Database from '@lucide/svelte/icons/database';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import Bell from '@lucide/svelte/icons/bell';
import Cctv from '@lucide/svelte/icons/cctv';
import Gauge from '@lucide/svelte/icons/gauge';
import Wrench from '@lucide/svelte/icons/wrench';
import FlaskConical from '@lucide/svelte/icons/flask-conical';
import Activity from '@lucide/svelte/icons/activity';
import FileText from '@lucide/svelte/icons/file-text';
import Settings from '@lucide/svelte/icons/settings';
import Layers from '@lucide/svelte/icons/layers';

export type GeoSection =
  | 'dashboard' | 'fieldmap'
  | 'wells' | 'scada' | 'alarm' | 'cctv'
  | 'trend' | 'historian' | 'production'
  | 'instruments' | 'maintenance' | 'geochem'
  | 'health' | 'reporting' | 'config'
  // legacy keys still referenced until their pages fold in
  | 'data' | 'status';

export interface GeoNavItem {
  key: GeoSection;
  label: string;
  desc: string;
  icon: Component<any>;
}

export interface GeoNavGroup {
  label: string;
  items: GeoNavItem[];
}

/** Grouped Geothermal field navigation. */
export const GEO_NAV_GROUPS: GeoNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', desc: 'Ringkasan monitoring field', icon: LayoutDashboard },
      { key: 'fieldmap', label: 'Field Map', desc: 'Peta spasial sumur & pipa', icon: Map },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'wells', label: 'Wells', desc: 'Registry & drilldown per sumur', icon: Layers },
      { key: 'scada', label: 'SCADA P&ID', desc: 'Diagram P&ID proses', icon: Workflow },
      { key: 'alarm', label: 'Alarms & Events', desc: 'Manajemen alarm & kejadian', icon: Bell },
      { key: 'cctv', label: 'CCTV', desc: 'Pemantau visual live', icon: Cctv },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { key: 'trend', label: 'Trends', desc: 'Grafik multi-tag real-time', icon: LineChart },
      { key: 'historian', label: 'Historian', desc: 'Query data historis', icon: Database },
      { key: 'production', label: 'Production', desc: 'Output uap, brine & MW', icon: TrendingDown },
    ],
  },
  {
    label: 'Assets',
    items: [
      { key: 'instruments', label: 'Instruments', desc: 'Registry tag & kalibrasi', icon: Gauge },
      { key: 'maintenance', label: 'Maintenance', desc: 'Work order & kesehatan alat', icon: Wrench },
      { key: 'geochem', label: 'Geochemistry', desc: 'Kimia brine & scaling', icon: FlaskConical },
    ],
  },
  {
    label: 'System & Admin',
    items: [
      { key: 'health', label: 'System Health', desc: 'Status · daya · komunikasi', icon: Activity },
      { key: 'reporting', label: 'Reporting', desc: 'Laporan & kepatuhan', icon: FileText },
      { key: 'config', label: 'Configuration', desc: 'Pengaturan tag & sistem', icon: Settings },
    ],
  },
];

/** Flat list for key→item lookups. */
export const GEO_NAV: GeoNavItem[] = GEO_NAV_GROUPS.flatMap((g) => g.items);
```

- [ ] **Step 3: Verify types compile**

Run: `npm run check`
Expected: no new errors referencing `geoNav.ts` or `types.ts`. (Errors will surface in `GeothermalShell.svelte`/`GeoSidebar.svelte` because they still reference the old shape — those are fixed in Tasks 3 & 5. If you run this task standalone, confirm the only errors are the known missing `health`/new keys in the shell's `PAGES` record.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/geothermal/types.ts src/lib/config/geoNav.ts
git commit -m "feat(geothermal): Well/FieldKpis types + grouped sidebar nav config"
```

---

### Task 3: Grouped sidebar rendering

Render group headers + items from `GEO_NAV_GROUPS`.

**Files:**
- Modify: `src/lib/components/geothermal/GeoSidebar.svelte`

**Interfaces:**
- Consumes: `GEO_NAV_GROUPS`, `GeoSection` from `../../config/geoNav`; `geoSection` store.
- Produces: nothing new.

- [ ] **Step 1: Update the nav block**

In `src/lib/components/geothermal/GeoSidebar.svelte`, change the import line
`import { GEO_NAV, type GeoSection } from '../../config/geoNav';`
to
`import { GEO_NAV_GROUPS, type GeoSection } from '../../config/geoNav';`

Replace the `<nav>…</nav>` block (currently iterating `GEO_NAV`) with:

```svelte
  <nav class="flex flex-col gap-2 overflow-y-auto p-2">
    {#each GEO_NAV_GROUPS as group}
      <div>
        <div class="px-3 pb-1 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-dim">
          {group.label}
        </div>
        <div class="flex flex-col gap-0.5">
          {#each group.items as item}
            {@const on = $geoSection === item.key}
            <button
              onclick={() => go(item.key)}
              class="group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[12px] font-medium transition-colors
                {on ? 'bg-accent/15 text-accent-bright' : 'text-ink-muted hover:bg-[var(--surface-hover)] hover:text-ink'}"
            >
              {#if on}
                <span class="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent"></span>
              {/if}
              <item.icon size={15} /> {item.label}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </nav>
```

Also add `min-h-0` so the nav scrolls: change the `<aside>` class list to include `overflow-hidden` if not present (it already sets a fixed width; the nav's own `overflow-y-auto` handles overflow). No other changes.

- [ ] **Step 2: Verify it renders**

Run: `npm run dev`, open the geothermal system, confirm the sidebar shows 5 group headers with items, active highlight works, clicking an item still sets the section. Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/geothermal/GeoSidebar.svelte
git commit -m "feat(geothermal): grouped sidebar with category headers"
```

---

### Task 4: Store wiring — multi-well simulation

Hold the well array, derive field KPIs + selected-well telemetry, step all wells each tick.

**Files:**
- Modify: `src/lib/geothermal/store.ts`

**Interfaces:**
- Consumes: `makeWells`, `stepField`, `fieldKpis` from `./field.js`; existing `paused`, `SeriesPoint`, `SEED_TELEMETRY`.
- Produces:
  - `geoWells: Writable<Well[]>`
  - `geoSelectedWellId: Writable<string>` (default `'WP-01'`)
  - `geoSelectedWell: Readable<Well>`
  - `geoField: Readable<FieldKpis>`
  - `geoTelemetry: Readable<Telemetry>` — now DERIVED from the selected well (was a writable). Existing components importing `geoTelemetry` keep working read-only.

- [ ] **Step 1: Rewrite the telemetry/simulation section of `store.ts`**

Replace the current `geoTelemetry` writable and `startGeoSimulation` with the well-based model. Keep `geoAlarms`, `geoActiveAlarmCount`, `geoOverallStatus`, `geoHistory` as they are for now (history still tracks the primary well). New/changed top section:

```ts
import { derived, get, readable, writable } from 'svelte/store';
import type { SeriesPoint } from '../types';
import { paused } from '../stores';
import { activeAlarmCount, stepTelemetry, worstStatus } from './wellpad.js';
import { makeWells, stepField, fieldKpis } from './field.js';
import { SEED_ALARMS, SEED_TELEMETRY, SYSTEM_ROWS } from './seed.js';
import type { AlarmRow, FieldKpis, GeoStatus, Telemetry, Well } from './types';
import type { GeoSection } from '../config/geoNav';

/** menu aktif di dalam sub-sistem Geothermal */
export const geoSection = writable<GeoSection>('dashboard');

const TICK_MS = 5000;
const HISTORY_KEYS = ['wellPressure', 'heatPipePressure', 'level', 'flowLs'] as const;
type HistoryKey = (typeof HISTORY_KEYS)[number];

/** All wells in the field. Sim steps this each tick. */
export const geoWells = writable<Well[]>(makeWells() as Well[]);

/** Currently focused well (drilldown / SCADA / dashboard primary). */
export const geoSelectedWellId = writable<string>('WP-01');

export const geoSelectedWell = derived(
  [geoWells, geoSelectedWellId],
  ([$wells, $id]) => $wells.find((w) => w.id === $id) ?? $wells[0],
);

/** Aggregate field KPIs. */
export const geoField = derived(geoWells, ($wells) => fieldKpis($wells) as FieldKpis);

/** Telemetry of the selected well — read-only replacement for the old writable. */
export const geoTelemetry = derived(geoSelectedWell, ($w) => $w.telemetry);
```

- [ ] **Step 2: Point history + simulation at the selected well**

Replace `seedHistory` unchanged, but update `startGeoSimulation` to step the field and append the selected well's history:

```ts
export const geoAlarms = writable<AlarmRow[]>(SEED_ALARMS.map((a) => ({ ...a })) as AlarmRow[]);

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

export const geoOverallStatus = readable<GeoStatus>(
  worstStatus(SYSTEM_ROWS.map((r) => r.state)) as GeoStatus,
);

export function startGeoSimulation(): () => void {
  const id = setInterval(() => {
    if (get(paused)) return;
    const now = Date.now();
    const wells = stepField(get(geoWells));
    geoWells.set(wells as Well[]);
    const sel = wells.find((w) => w.id === get(geoSelectedWellId)) ?? wells[0];
    geoHistory.update((h) => {
      const out = { ...h };
      for (const k of HISTORY_KEYS) {
        out[k] = [...h[k].slice(-47), { t: now, v: sel.telemetry[k] }];
      }
      return out;
    });
  }, TICK_MS);
  return () => clearInterval(id);
}
```

- [ ] **Step 3: Verify types + behavior**

Run: `npm run check`
Expected: no errors in `store.ts`. Any component that *wrote* to `geoTelemetry` would now error — confirm none do (it was only read). Then `npm run dev`, open geothermal Dashboard, confirm gauges still animate on the 5s tick.

- [ ] **Step 4: Commit**

```bash
git add src/lib/geothermal/store.ts
git commit -m "feat(geothermal): multi-well store, field KPIs, selected-well telemetry"
```

---

### Task 5: Shell router covers all sections

Map every `GeoSection` in the shell; new pages render the placeholder until their phase.

**Files:**
- Modify: `src/lib/components/geothermal/GeothermalShell.svelte`

**Interfaces:**
- Consumes: `GEO_NAV`, `GeoSection`; existing page components.
- Produces: nothing new.

- [ ] **Step 1: Extend the PAGES + STUB maps**

In `src/lib/components/geothermal/GeothermalShell.svelte`, update the `PAGES` record and `STUB` map so every section resolves. Existing real pages keep their component; new + still-unbuilt sections use `GeoPlaceholder` via `STUB`:

```ts
  const PAGES: Record<GeoSection, any> = {
    dashboard: GeoDashboard,
    scada: GeoScadaPage,
    trend: GeoTrendPage,
    data: GeoDataPage,
    alarm: GeoAlarmPage,
    cctv: GeoCctvPage,
    status: GeoStatusPage,
    health: GeoStatusPage,       // System Health reuses the status page for now
    // Phase 2+ pages — placeholder until built:
    fieldmap: GeoPlaceholder,
    wells: GeoPlaceholder,
    historian: GeoPlaceholder,
    production: GeoPlaceholder,
    instruments: GeoPlaceholder,
    maintenance: GeoPlaceholder,
    geochem: GeoPlaceholder,
    reporting: GeoPlaceholder,
    config: GeoPlaceholder,
  };

  const STUB: Partial<Record<GeoSection, { title: string; note: string }>> = {
    fieldmap: { title: 'Field Map', note: 'Peta spasial sumur, pipa, separator, dan reinjeksi. Dibangun pada Fase 2.' },
    wells: { title: 'Wells', note: 'Registry sumur dan drilldown per sumur. Dibangun pada Fase 2.' },
    historian: { title: 'Historian', note: 'Query data historis tag telemetri. Dibangun pada Fase 3.' },
    production: { title: 'Production', note: 'Output uap, brine, gross MW, dan capacity factor. Dibangun pada Fase 3.' },
    instruments: { title: 'Instruments', note: 'Registry tag instrumen dan status kalibrasi. Dibangun pada Fase 4.' },
    maintenance: { title: 'Maintenance', note: 'Work order dan kesehatan peralatan. Dibangun pada Fase 4.' },
    geochem: { title: 'Geochemistry', note: 'Kimia brine, indeks scaling, NCG, dan pH. Dibangun pada Fase 4.' },
    reporting: { title: 'Reporting', note: 'Laporan periodik dan kepatuhan lingkungan/ESDM. Dibangun pada Fase 5.' },
    config: { title: 'Configuration', note: 'Pengaturan tag, ambang alarm, dan pengguna. Dibangun pada Fase 5.' },
  };
```

Leave the rest of the component (breadcrumb, `{#key}` transition, stub-vs-Current branch) unchanged — it already renders `GeoPlaceholder` when `stub` is set.

- [ ] **Step 2: Verify every menu resolves**

Run: `npm run check` (expect no errors). Then `npm run dev`; click through all 15 sidebar items. Existing pages render their panels; new pages render the placeholder with the phase note. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/geothermal/GeothermalShell.svelte
git commit -m "feat(geothermal): route all grouped sections, stub Phase 2-5 pages"
```

---

### Task 6: Dashboard — field KPI row + well-status grid

Surface the new multi-well model on the Dashboard.

**Files:**
- Create: `src/lib/components/geothermal/FieldKpiRow.svelte`
- Create: `src/lib/components/geothermal/WellStatusGrid.svelte`
- Modify: `src/lib/components/geothermal/GeoDashboard.svelte`

**Interfaces:**
- Consumes: `geoField`, `geoWells`, `geoSelectedWellId` stores; `num` from `../../format`; existing `GeoStatus` color conventions.
- Produces: two presentational components used by the Dashboard.

- [ ] **Step 1: FieldKpiRow component**

```svelte
<!-- src/lib/components/geothermal/FieldKpiRow.svelte -->
<script lang="ts">
  import Zap from '@lucide/svelte/icons/zap';
  import Wind from '@lucide/svelte/icons/wind';
  import Droplets from '@lucide/svelte/icons/droplets';
  import Gauge from '@lucide/svelte/icons/gauge';
  import { num } from '../../format';
  import { geoField } from '../../geothermal/store';

  const kpis = $derived([
    { icon: Zap, label: 'Gross Power', value: num($geoField.grossMw, 1), unit: 'MW' },
    { icon: Wind, label: 'Steam Flow', value: num($geoField.steamTh, 1), unit: 't/h' },
    { icon: Droplets, label: 'Brine Flow', value: num($geoField.brineM3h, 1), unit: 'm³/h' },
    { icon: Gauge, label: 'Availability', value: num($geoField.availability, 1), unit: '%' },
  ]);
</script>

<div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
  {#each kpis as k}
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-dim">
        <k.icon size={13} class="text-accent" /> {k.label}
      </div>
      <div class="mt-1.5 flex items-baseline gap-1">
        <span class="text-[22px] font-semibold text-ink-strong tnum">{k.value}</span>
        <span class="text-[11px] text-ink-muted">{k.unit}</span>
      </div>
    </div>
  {/each}
</div>
```

- [ ] **Step 2: WellStatusGrid component**

```svelte
<!-- src/lib/components/geothermal/WellStatusGrid.svelte -->
<script lang="ts">
  import { num } from '../../format';
  import { geoWells, geoSelectedWellId, geoSection } from '../../geothermal/store';
  import type { GeoStatus } from '../../geothermal/types';

  const DOT: Record<GeoStatus, string> = {
    normal: 'bg-emerald-500', waspada: 'bg-amber-500',
    siaga: 'bg-orange-500', awas: 'bg-red-500',
  };

  function open(id: string) {
    geoSelectedWellId.set(id);
    geoSection.set('wells');
  }
</script>

<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
  {#each $geoWells as w}
    <button
      onclick={() => open(w.id)}
      class="rounded-xl border border-line bg-panel p-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div class="flex items-center justify-between">
        <span class="text-[12px] font-semibold text-ink-strong">{w.id}</span>
        <span class="flex items-center gap-1.5 text-[10px] text-ink-muted">
          <span class="h-2 w-2 rounded-full {DOT[w.status]}"></span>{w.status}
        </span>
      </div>
      <div class="mt-0.5 text-[10px] text-ink-dim">{w.name} · {w.type}</div>
      <dl class="mt-2 grid grid-cols-3 gap-1 text-[10px] text-ink-muted">
        <div><dt class="text-ink-dim">WHP</dt><dd class="text-ink tnum">{num(w.telemetry.wellPressure, 1)}</dd></div>
        <div><dt class="text-ink-dim">Flow</dt><dd class="text-ink tnum">{num(w.telemetry.flowM3h, 1)}</dd></div>
        <div><dt class="text-ink-dim">MW</dt><dd class="text-ink tnum">{num(w.output.mw, 1)}</dd></div>
      </dl>
    </button>
  {/each}
</div>
```

- [ ] **Step 3: Add both to the Dashboard**

Read `src/lib/components/geothermal/GeoDashboard.svelte`, import the two new components at the top of its `<script>`, and render them above the existing dashboard content:

```svelte
  import FieldKpiRow from './FieldKpiRow.svelte';
  import WellStatusGrid from './WellStatusGrid.svelte';
```

Immediately inside the dashboard's root layout element, before the existing gauges/panels, add:

```svelte
  <FieldKpiRow />
  <div class="text-[11px] font-semibold uppercase tracking-wider text-ink-dim">Wells</div>
  <WellStatusGrid />
```

Match the existing spacing wrapper (the current root already uses a vertical gap — insert these as its first children so the gap applies).

- [ ] **Step 4: Verify**

Run: `npm run check` (no errors). Then `npm run dev`; the Dashboard shows the 4-KPI row and a grid of 6 well cards updating every 5s. Clicking a card selects that well and navigates to the (placeholder) Wells page. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/geothermal/FieldKpiRow.svelte src/lib/components/geothermal/WellStatusGrid.svelte src/lib/components/geothermal/GeoDashboard.svelte
git commit -m "feat(geothermal): dashboard field KPI row + well-status grid"
```

---

## Self-Review Notes

- **Spec coverage (Phase 1 rows):** multi-well data model → Task 1; sim steps all wells → Task 4; field KPIs derived → Tasks 1+4+6; grouped sidebar nav → Tasks 2+3; router covers all sections → Task 5; rewire existing pages → Task 4 (via derived `geoTelemetry`, no page edits needed). Phase 2–5 pages intentionally stubbed (Task 5).
- **Legacy keys:** `data` and `status` kept in the `GeoSection` union and `PAGES` map so `GeoDataPage`/`GeoStatusPage` keep resolving; `data` is no longer in the sidebar (folds into Instruments in Phase 4), `status` is reached via the new `health` key. This is intentional, not a gap.
- **Type consistency:** `Well`, `WellOutput`, `FieldKpis` field names (`steamTh`, `brineM3h`, `mw`, `grossMw`, `availability`, `wellsUp`, `wellsTotal`) are identical across `field.js` (Task 1), `types.ts` (Task 2), store (Task 4), and components (Task 6).
- **Verification honesty:** pure logic (Task 1) has real `node --test` coverage; Svelte tasks gate on `npm run check` + manual dev observation, since the repo has no component-test harness.
```
