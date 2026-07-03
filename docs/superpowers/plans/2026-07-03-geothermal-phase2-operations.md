# Geothermal Phase 2 — Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the Operations group: a live alarm/event engine, the Alarms & Events page, the Wells registry + drilldown, the Field Map, and a well selector on the SCADA page.

**Architecture:** Pure alarm logic in `src/lib/geothermal/alarms.js` (plain JS, injected time/seq, `node --test`). The store evaluates alarms every tick from the stepped wells and exposes ack/shelve actions + an event log. New Svelte pages read stores and follow existing panel patterns (`GeoDataPage` table idiom, `GaugeCard`, semantic status tokens).

**Tech Stack:** Svelte 5 runes, TypeScript, Vite, Tailwind, Lucide, `node --test`.

## Global Constraints

- Mock + 5000 ms simulation, no backend.
- Pure logic in plain `.js` with JSDoc types (mirror `field.js`/`wellpad.js`); randomness/time INJECTED (params), never `Date.now()`/`Math.random()` inside pure functions.
- Status vocabulary: `GeoStatus = 'normal'|'waspada'|'siaga'|'awas'`. Use semantic Tailwind tokens `text-normal|waspada|siaga|awas` and `bg-*` (defined in `src/app.css`) — NOT literal `bg-emerald-500` etc.
- Reuse existing tokens/classes (`bg-panel`, `bg-panel-2`, `border-line`, `text-ink*`, `text-accent-bright`, `tnum`, `font-mono`) and `num(value, digits)` from `src/lib/format`.
- Thresholds come from `WELL_THRESHOLDS` in `field.js` via `sensorState` (`wellpad.js`).
- Gates: `npm run check` → 0 errors; `npm test` → all pass.
- Do not touch the STESY sub-system.

---

### Task 1: Alarm engine (`alarms.js`) + types + tests

Pure alarm evaluation. No Svelte.

**Files:**
- Create: `src/lib/geothermal/alarms.js`
- Modify: `src/lib/geothermal/types.ts` (extend `AlarmRow`, add `GeoEvent`)
- Test: `tests/geothermalAlarms.test.js`

**Interfaces:**
- Consumes: `sensorState` from `./wellpad.js`; `WELL_THRESHOLDS` from `./field.js`.
- Produces:
  - `MONITORED: Array<{ tag: 'wellPressure'|'heatPipePressure'|'level', label: string, unit: string }>`
  - `fmtClock(ms) → 'HH:MM:SS'` (pure, from injected ms; UTC-free local formatting via `new Date(ms)` is allowed here since it's not in the sim's hot path — but keep it a leaf helper)
  - `evaluateAlarms(wells, prev, now, nextId) → { alarms: AlarmRow[], nextId: number }` where `now` is ms and `nextId` is the next integer id to assign. For each well × each MONITORED tag: compute `sensorState(well.telemetry[tag], WELL_THRESHOLDS[tag])`. Maintain at most ONE active alarm per (wellId, tag):
    - breach (state !== 'normal') & no active alarm for (well,tag) → append `{ id: nextId++, time: fmtClock(now), raisedAt: now, well: well.id, tag, label, severity: state, value: well.telemetry[tag], status: 'active', ack: false }`
    - breach & active exists → update its `severity` and `value` in place (preserve `id`, `ack`, `raisedAt`, `time`)
    - normal & active exists → set that alarm's `status: 'cleared'`
  - `alarmStats(alarms) → { bySeverity: Record<GeoStatus, number>, active: number, topTags: Array<{tag:string,count:number}> }` (counts over active alarms; topTags sorted desc)

- [ ] **Step 1: Write the failing test**

```js
// tests/geothermalAlarms.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { MONITORED, evaluateAlarms, alarmStats } from '../src/lib/geothermal/alarms.js';
import { WELL_THRESHOLDS } from '../src/lib/geothermal/field.js';

function wellWith(id, over) {
  return { id, name: id, type: 'production', lat: 0, lng: 0,
    telemetry: { wellPressure: 124, heatPipePressure: 86, level: 0.42, ...over },
    output: { steamTh: 1, brineM3h: 1, mw: 1 }, status: 'normal' };
}

test('MONITORED covers the three thresholded tags', () => {
  assert.deepEqual(MONITORED.map((m) => m.tag).sort(),
    ['heatPipePressure', 'level', 'wellPressure']);
});

test('raises an active alarm when a tag breaches waspada', () => {
  const w = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.waspada + 0.5 });
  const { alarms, nextId } = evaluateAlarms([w], [], 1000, 1);
  const a = alarms.find((x) => x.well === 'WP-01' && x.tag === 'wellPressure');
  assert.ok(a && a.status === 'active' && a.severity === 'waspada' && a.ack === false);
  assert.equal(nextId, 2);
});

test('does not duplicate an active alarm across ticks; updates severity in place', () => {
  const w1 = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.waspada + 0.5 });
  const r1 = evaluateAlarms([w1], [], 1000, 1);
  const w2 = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.awas + 0.5 });
  const r2 = evaluateAlarms([w2], r1.alarms, 2000, r1.nextId);
  const active = r2.alarms.filter((x) => x.well === 'WP-01' && x.tag === 'wellPressure' && x.status === 'active');
  assert.equal(active.length, 1);
  assert.equal(active[0].severity, 'awas');
  assert.equal(active[0].id, r1.alarms[0].id); // same alarm, updated in place
});

test('clears an alarm when the tag returns to normal, preserving ack', () => {
  const hot = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.waspada + 0.5 });
  const r1 = evaluateAlarms([hot], [], 1000, 1);
  r1.alarms[0].ack = true;
  const cool = wellWith('WP-01', {});
  const r2 = evaluateAlarms([cool], r1.alarms, 2000, r1.nextId);
  const a = r2.alarms.find((x) => x.id === r1.alarms[0].id);
  assert.equal(a.status, 'cleared');
  assert.equal(a.ack, true);
});

test('alarmStats counts active alarms by severity', () => {
  const wells = [
    wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.awas + 0.5 }),
    wellWith('WP-02', { heatPipePressure: WELL_THRESHOLDS.heatPipePressure.waspada + 0.5 }),
  ];
  const { alarms } = evaluateAlarms(wells, [], 1000, 1);
  const s = alarmStats(alarms);
  assert.equal(s.active, 2);
  assert.equal(s.bySeverity.awas, 1);
  assert.equal(s.bySeverity.waspada, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find `../src/lib/geothermal/alarms.js`.

- [ ] **Step 3: Implement `alarms.js`**

```js
// src/lib/geothermal/alarms.js
// Pure alarm evaluation over the well array. Plain JS so `node --test` imports
// it directly. Time (`now` ms) and id sequence (`nextId`) are injected.
import { sensorState } from './wellpad.js';
import { WELL_THRESHOLDS } from './field.js';

/** Tags that raise alarms, with display metadata.
 * @type {Array<{tag:'wellPressure'|'heatPipePressure'|'level', label:string, unit:string}>} */
export const MONITORED = [
  { tag: 'wellPressure', label: 'Well Pressure', unit: 'bar(g)' },
  { tag: 'heatPipePressure', label: 'Heat Pipe Pressure', unit: 'bar(g)' },
  { tag: 'level', label: 'Water Level', unit: 'm' },
];

/** @param {number} ms @returns {string} HH:MM:SS */
export function fmtClock(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Evaluate alarms against the current wells, mutating a working copy of prev.
 * @param {Array<object>} wells
 * @param {import('./types').AlarmRow[]} prev
 * @param {number} now  epoch ms
 * @param {number} nextId
 * @returns {{alarms: import('./types').AlarmRow[], nextId: number}} */
export function evaluateAlarms(wells, prev, now, nextId) {
  const alarms = prev.map((a) => ({ ...a }));
  const activeIdx = (wellId, tag) =>
    alarms.findIndex((a) => a.well === wellId && a.tag === tag && a.status === 'active');
  for (const w of wells) {
    for (const m of MONITORED) {
      const state = sensorState(w.telemetry[m.tag], WELL_THRESHOLDS[m.tag]);
      const i = activeIdx(w.id, m.tag);
      if (state !== 'normal') {
        if (i === -1) {
          alarms.push({
            id: nextId++, time: fmtClock(now), raisedAt: now,
            well: w.id, tag: m.tag, label: `${w.id} · ${m.label}`,
            severity: /** @type {import('./types').GeoStatus} */ (state),
            value: w.telemetry[m.tag], status: 'active', ack: false,
          });
        } else {
          alarms[i].severity = /** @type {import('./types').GeoStatus} */ (state);
          alarms[i].value = w.telemetry[m.tag];
        }
      } else if (i !== -1) {
        alarms[i].status = 'cleared';
      }
    }
  }
  return { alarms, nextId };
}

/** @param {import('./types').AlarmRow[]} alarms */
export function alarmStats(alarms) {
  const active = alarms.filter((a) => a.status === 'active');
  const bySeverity = { normal: 0, waspada: 0, siaga: 0, awas: 0 };
  const tagCount = {};
  for (const a of active) {
    bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    tagCount[a.tag] = (tagCount[a.tag] || 0) + 1;
  }
  const topTags = Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count }))
    .sort((x, y) => y.count - x.count);
  return { bySeverity, active: active.length, topTags };
}
```

- [ ] **Step 4: Extend types in `types.ts`**

Replace the existing `AlarmRow` interface and add `GeoEvent`:

```ts
export interface AlarmRow {
  id: number;
  time: string;
  raisedAt: number;
  well: string;
  tag: string;
  label: string;
  severity: GeoStatus;
  value: number;
  status: 'active' | 'cleared';
  ack: boolean;
}

export interface GeoEvent {
  id: number;
  time: string;
  kind: 'alarm' | 'valve' | 'comms' | 'operator';
  message: string;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (new alarm tests + existing suites green).

- [ ] **Step 6: Commit**

```bash
git add src/lib/geothermal/alarms.js src/lib/geothermal/types.ts tests/geothermalAlarms.test.js
git commit -m "feat(geothermal): pure alarm engine (evaluate/clear/stats) + extended AlarmRow"
```

**Note:** Changing `AlarmRow` shape and the seed will break `AlarmSummaryPanel.svelte` (reads `a.label`/`a.status` — still present, OK) and the store's `SEED_ALARMS` mapping. Task 2 rewires the store; `AlarmSummaryPanel` keeps working because `label`/`time`/`status` remain. `npm run check` may report errors in `store.ts`/seed until Task 2 — that is expected and resolved in Task 2.

---

### Task 2: Wire alarm engine + event log into the store

**Files:**
- Modify: `src/lib/geothermal/store.ts`
- Modify: `src/lib/geothermal/seed.js` (drop or convert `SEED_ALARMS`; add `SEED_EVENTS`)

**Interfaces:**
- Consumes: `evaluateAlarms`, `fmtClock` from `./alarms.js`.
- Produces:
  - `geoAlarms: Writable<AlarmRow[]>` — now empty at start (engine fills it), or seeded empty `[]`.
  - `geoEvents: Writable<GeoEvent[]>` — seeded from `SEED_EVENTS`.
  - `ackAlarm(id: number): void` — sets `ack: true` on that alarm and appends an `operator` event.
  - `shelveAlarm(id: number): void` — sets `status: 'cleared'` on that alarm and appends an `operator` event.
  - `geoActiveAlarmCount` unchanged (derived from `geoAlarms`).

- [ ] **Step 1: Replace SEED_ALARMS with SEED_EVENTS in `seed.js`**

Remove the old `SEED_ALARMS` array (its shape no longer matches). Add:

```js
export const SEED_EVENTS = [
  { id: 1, time: '09:12:03', kind: 'comms', message: 'VSAT link quality recovered to 98%' },
  { id: 2, time: '09:45:11', kind: 'valve', message: 'XV-102 commanded OPEN (WP-02)' },
  { id: 3, time: '10:02:44', kind: 'operator', message: 'Operator acknowledged WP-03 · Heat Pipe Pressure' },
];
```

- [ ] **Step 2: Rewire the store**

In `store.ts`: remove the `SEED_ALARMS` import; import `SEED_EVENTS`; import `evaluateAlarms`, `fmtClock` from `./alarms.js`. Change the alarms declarations and simulation:

```ts
import { evaluateAlarms, fmtClock } from './alarms.js';
import { SEED_EVENTS, SEED_TELEMETRY, SYSTEM_ROWS } from './seed.js';
import type { AlarmRow, FieldKpis, GeoEvent, GeoStatus, Telemetry, Well } from './types';

export const geoAlarms = writable<AlarmRow[]>([]);
export const geoEvents = writable<GeoEvent[]>(SEED_EVENTS.map((e) => ({ ...e })) as GeoEvent[]);

let alarmSeq = 1;
let eventSeq = 100;

export function ackAlarm(id: number): void {
  let label = '';
  geoAlarms.update((list) =>
    list.map((a) => (a.id === id ? ((label = a.label), { ...a, ack: true }) : a)));
  if (label) pushEvent('operator', `Operator acknowledged ${label}`);
}

export function shelveAlarm(id: number): void {
  let label = '';
  geoAlarms.update((list) =>
    list.map((a) => (a.id === id ? ((label = a.label), { ...a, status: 'cleared' as const }) : a)));
  if (label) pushEvent('operator', `Operator shelved ${label}`);
}

function pushEvent(kind: GeoEvent['kind'], message: string): void {
  geoEvents.update((list) => [{ id: eventSeq++, time: fmtClock(Date.now()), kind, message }, ...list].slice(0, 60));
}
```

In `startGeoSimulation`, after `geoWells.set(wells)`, evaluate alarms and emit events for newly-raised ones:

```ts
    const prevActive = new Set(get(geoAlarms).filter((a) => a.status === 'active').map((a) => a.id));
    const res = evaluateAlarms(wells, get(geoAlarms), now, alarmSeq);
    alarmSeq = res.nextId;
    geoAlarms.set(res.alarms as AlarmRow[]);
    for (const a of res.alarms) {
      if (a.status === 'active' && !prevActive.has(a.id)) {
        pushEvent('alarm', `${a.severity.toUpperCase()} — ${a.label} = ${a.value}`);
      }
    }
```

- [ ] **Step 3: Verify**

Run `npm run check` → 0 errors (Task 1's expected store/seed errors now resolved). Run `npm test` → all pass. Run `npm run dev`, open the app, watch the alarm section populate as WP-03 (the hot well) breaches, and confirm the event log grows.

- [ ] **Step 4: Commit**

```bash
git add src/lib/geothermal/store.ts src/lib/geothermal/seed.js
git commit -m "feat(geothermal): drive alarms from engine each tick + event log with ack/shelve"
```

---

### Task 3: Alarms & Events page

Full replacement for the `alarm` section (currently `AlarmSummaryPanel`).

**Files:**
- Create: `src/lib/components/geothermal/pages/GeoAlarmPage.svelte` (overwrite the current thin one)
- Create: `src/lib/components/geothermal/SeverityChip.svelte` (small reusable severity badge)

**Interfaces:**
- Consumes: `geoAlarms`, `geoEvents`, `ackAlarm`, `shelveAlarm` from store; `alarmStats` from `alarms.js`; `num`.
- Produces: `SeverityChip` — `{ severity: GeoStatus }` → colored pill using `text-<severity>`/`bg-<severity>/15`.

**Requirements (spec-checkable):**
- Three tabs (local `$state` string `'active'|'history'|'stats'`): **Active**, **History**, **Statistics**.
- **Active tab:** table of `status==='active'` alarms, columns: Time · Well · Tag/Label · Severity (SeverityChip) · Value · Actions (Ack button disabled when `ack`, Shelve button). Filter bar: well `<select>` (options from distinct alarm wells + "All"), severity `<select>` (All + 4 levels). Empty state ("No active alarms") when none.
- **History tab:** all alarms (active + cleared) newest first, same columns minus actions, status column (ACTIVE/CLEARED).
- **Statistics tab:** cards from `alarmStats($geoAlarms)` — active count, a count-by-severity row (SeverityChip + number for each of the 4), and a "Top Tags" list (tag + count). Plus the **event log**: list of `$geoEvents` (time · kind chip · message), scrollable, max height.
- Follow the `GeoDataPage` table idiom (same classes) and use semantic status tokens. Buttons are real `<button type="button">`.

- [ ] **Step 1: Build `SeverityChip.svelte`**

```svelte
<script lang="ts">
  import type { GeoStatus } from '../../geothermal/types';
  let { severity }: { severity: GeoStatus } = $props();
  const LABEL: Record<GeoStatus, string> = {
    normal: 'NORMAL', waspada: 'WASPADA', siaga: 'SIAGA', awas: 'AWAS',
  };
</script>

<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold text-{severity} bg-{severity}/15">
  {LABEL[severity]}
</span>
```

Note: Tailwind must see the full class names. If `text-{severity}`/`bg-{severity}/15` are purged, replace with an explicit map:
```svelte
  const CLS: Record<GeoStatus, string> = {
    normal: 'text-normal bg-normal/15', waspada: 'text-waspada bg-waspada/15',
    siaga: 'text-siaga bg-siaga/15', awas: 'text-awas bg-awas/15',
  };
```
and use `class="rounded-full px-2 py-0.5 text-[10px] font-semibold {CLS[severity]}"`. **Use the explicit-map form** to be safe against purge.

- [ ] **Step 2: Build the page**

Implement `GeoAlarmPage.svelte` per the Requirements above, following `GeoDataPage`'s table markup and using `SeverityChip`. Wire the Ack/Shelve buttons to `ackAlarm(a.id)`/`shelveAlarm(a.id)`. Derive filtered lists with `$derived`. Tabs via a small header of `<button type="button">` toggling a `$state` variable.

- [ ] **Step 3: Verify**

`npm run check` → 0 errors. `npm run dev` → open Alarms & Events; confirm tabs switch, active alarms show with working Ack/Shelve (row updates + event log gains an operator line), filters narrow the list, stats reflect counts.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/geothermal/pages/GeoAlarmPage.svelte src/lib/components/geothermal/SeverityChip.svelte
git commit -m "feat(geothermal): Alarms & Events page (active/history/stats + event log)"
```

---

### Task 4: Wells registry + drilldown page

**Files:**
- Create: `src/lib/components/geothermal/pages/GeoWellsPage.svelte`
- Create: `src/lib/components/geothermal/WellDrilldown.svelte`
- Modify: `src/lib/components/geothermal/GeothermalShell.svelte` (route `wells` → `GeoWellsPage`; remove the `wells` STUB entry)

**Interfaces:**
- Consumes: `geoWells`, `geoSelectedWell`, `geoSelectedWellId`, `geoAlarms` from store; `SeverityChip` (Task 3); `num`; existing `GaugeCard` if suitable.
- Produces: `WellDrilldown` — renders the selected well's detail (no props; reads `geoSelectedWell`).

**Requirements:**
- **Registry table** (all `$geoWells`): columns Well (id) · Name · Type · Status (SeverityChip using `w.status`) · WHP (`num(w.telemetry.wellPressure,1)`) · WHT (`num(w.telemetry.temperature,1)`) · Flow m³/h · Steam t/h · MW · updated ("live"). Row is a `<button>`/clickable `<tr>` that sets `geoSelectedWellId` to that well. Selected row highlighted (`bg-accent/10`).
- **Drilldown** below/beside the table for `$geoSelectedWell`: header (id · name · type · SeverityChip); a small gauge/stat grid for wellPressure, heatPipePressure, temperature, level, flowM3h, output.mw (reuse `GaugeCard` or a simple stat tile grid — match the dashboard's tile style); a "Valves" row (from seed `VALVES`, show XV-101/102 open/closed pills); and a per-well alarms mini-list filtered from `$geoAlarms` where `a.well === $geoSelectedWell.id` (SeverityChip + label + value), empty state when none.
- Layout: table full-width on top, drilldown below (`space-y-3`). Responsive.

- [ ] **Step 1: Build `WellDrilldown.svelte`** (stat-tile grid + valves + per-well alarm list, per Requirements).
- [ ] **Step 2: Build `GeoWellsPage.svelte`** (registry table + `<WellDrilldown />`).
- [ ] **Step 3: Route it** — in `GeothermalShell.svelte` set `wells: GeoWellsPage` in `PAGES` and delete the `wells` entry from `STUB`.
- [ ] **Step 4: Verify** — `npm run check` 0 errors; `npm run dev`: Wells page lists all 6 wells, clicking a row updates the drilldown + syncs the selected well everywhere (dashboard/SCADA).
- [ ] **Step 5: Commit**

```bash
git add src/lib/components/geothermal/pages/GeoWellsPage.svelte src/lib/components/geothermal/WellDrilldown.svelte src/lib/components/geothermal/GeothermalShell.svelte
git commit -m "feat(geothermal): Wells registry table + per-well drilldown"
```

---

### Task 5: Field Map page

**Files:**
- Create: `src/lib/components/geothermal/pages/GeoFieldMapPage.svelte`
- Modify: `src/lib/components/geothermal/GeothermalShell.svelte` (route `fieldmap`; remove its STUB entry)

**Interfaces:**
- Consumes: `geoWells`, `geoSelectedWellId`, `geoSection` from store; `SeverityChip`.

**Requirements:**
- An inline SVG schematic (viewBox e.g. `0 0 400 300`). Project each well's `lat`/`lng` into the viewBox by min-max normalizing the well coordinates to a padded box (compute min/max lng→x, lat→y with `$derived`). Draw:
  - a central **Separator** node and a **Reinjection** node (fixed positions), with faint pipeline `<line>`s from each production well to the separator, and from the separator to each reinjection well.
  - one pin (`<circle>` + id label) per well, filled with the status color via `fill="var(--color-<status>)"` (build the var name from `w.status`). Production vs reinjection pins differ in shape/stroke.
  - the selected well's pin gets a highlight ring.
- Clicking a pin sets `geoSelectedWellId` (and optionally `geoSection.set('wells')` — keep to just selecting for this page, plus a small caption showing the selected well's id/status via SeverityChip).
- A legend mapping the 4 status colors + the production/reinjection glyphs.
- Wrap the SVG in a bordered `bg-panel` card; make it responsive (`w-full h-auto`, `max-h-[70vh]`).

- [ ] **Step 1: Build the page** (coordinate projection via `$derived`, pins, pipelines, legend, click-to-select).
- [ ] **Step 2: Route it** — `fieldmap: GeoFieldMapPage` in `PAGES`; remove `fieldmap` from `STUB`.
- [ ] **Step 3: Verify** — `npm run check` 0 errors; `npm run dev`: map shows 6 pins colored by status, pipelines connect, clicking a pin selects it (caption + highlight), legend present.
- [ ] **Step 4: Commit**

```bash
git add src/lib/components/geothermal/pages/GeoFieldMapPage.svelte src/lib/components/geothermal/GeothermalShell.svelte
git commit -m "feat(geothermal): Field Map schematic with status pins + pipelines"
```

---

### Task 6: SCADA well selector

**Files:**
- Modify: `src/lib/components/geothermal/pages/GeoScadaPage.svelte`

**Interfaces:**
- Consumes: `geoWells`, `geoSelectedWellId` from store.

**Requirements:**
- Add a header row above `<ScadaDiagram />` with a well `<select>` bound to `geoSelectedWellId` (options = `$geoWells` id · name), plus a `SeverityChip` of the selected well's status. `ScadaDiagram` already renders from `geoTelemetry`, which is derived from the selected well, so changing the select updates the diagram automatically — do not modify `ScadaDiagram`.
- Keep layout tidy: selector right-aligned, matches existing header styling.

- [ ] **Step 1: Add the selector header** to `GeoScadaPage.svelte`.
- [ ] **Step 2: Verify** — `npm run check` 0 errors; `npm run dev`: changing the SCADA well selector re-renders the diagram with that well's telemetry.
- [ ] **Step 3: Commit**

```bash
git add src/lib/components/geothermal/pages/GeoScadaPage.svelte
git commit -m "feat(geothermal): well selector on SCADA page"
```

---

## Self-Review Notes

- **Spec coverage (Operations row):** Wells table+drilldown → Task 4; Field Map → Task 5; alarm engine → Task 1+2; Alarms & Events page (active/history/stats + ack/shelve/filter/event log) → Task 3; SCADA well selector → Task 6. CCTV already grouped under Operations (no change needed).
- **Type consistency:** `AlarmRow` fields (`id, time, raisedAt, well, tag, label, severity, value, status, ack`) defined in Task 1, consumed identically in Tasks 2–4. `GeoEvent` (`id, time, kind, message`) in Tasks 1–3.
- **Purge safety:** SeverityChip and the map use explicit status→class / status→CSS-var maps, not interpolated Tailwind classes.
- **Verification honesty:** pure alarm logic (Task 1) has `node --test` coverage; UI tasks gate on `npm run check` + dev observation (no component-test harness in repo).
```
