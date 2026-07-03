# Geothermal Phase 3 — Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the Analytics group: per-well history buffers, a multi-pen Trends page, a Historian query page with CSV export, and a Production page (output by well, gross MW, capacity factor, decline curve).

**Status 2026-07-03:** Tasks 1-4 are present in the codebase; Task 5 has been implemented in this pass. Local verification: `npm run check` passed with 0 errors/0 warnings, `npm test` passed 43/43 tests, and `npm run build` completed successfully. Commit steps are intentionally still unchecked.

**Architecture:** Pure history math in `src/lib/geothermal/history.js` (plain JS, injected time, `node --test`). The store keeps a per-well × per-tag ring buffer (`geoHistoryByWell`) updated every tick; the existing `geoHistory` (selected-well view) becomes a derived projection so `TrendPanel` keeps working. New pages reuse the existing `MultiChart` (multi-line + `barMode:'stacked'`) and `GeoGauge` primitives.

**Tech Stack:** Svelte 5 runes, TypeScript, Vite, Tailwind, Lucide, `node --test`.

## Global Constraints

- Mock + 5000 ms sim, no backend.
- Pure logic in plain `.js` with JSDoc; time INJECTED (`now` param), never `Date.now()`/`Math.random()` inside pure functions.
- Status vocabulary `GeoStatus`; semantic status tokens (`text-normal|waspada|siaga|awas`); no interpolated Tailwind class names.
- Reuse existing primitives: `MultiChart` (`src/lib/components/ui/MultiChart.svelte`, props `series:{name,color,points:SeriesPoint[]}[]`, `height`, `digits`, `barMode:'grouped'|'stacked'`, `yMin/yMax`), `GeoGauge`, `num` from `src/lib/format`. `SeriesPoint = {t:number, v:number}`.
- Reuse tokens (`bg-panel`, `border-line`, `text-ink*`, `tnum`, `font-mono`).
- Gates: `npm run check` 0 errors; `npm test` all pass.
- Do not touch the STESY sub-system.

---

### Task 1: Per-well history math (`history.js`) + tests

Pure buffer + aggregate + query logic. No Svelte.

**Files:**
- Create: `src/lib/geothermal/history.js`
- Test: `tests/geothermalHistory.test.js`

**Interfaces:**
- Produces:
  - `HISTORY_TAGS: Array<'wellPressure'|'heatPipePressure'|'temperature'|'level'|'flowM3h'|'flowLs'>` (includes `flowLs` so the store's selected-well `geoHistory` projection keeps `TrendPanel` working unchanged)
  - `HISTORY_CAP = 720` (points kept per well/tag; at 5s ≈ 1h... use 720 ≈ 1h at 5s. Keep as constant.)
  - `seedWellHistory(wells, now, ticks, tickMs) → Record<wellId, Record<tag, SeriesPoint[]>>` — each well/tag pre-filled with `ticks` flat points ending at `now`.
  - `appendHistory(buffers, wells, now, cap=HISTORY_CAP) → newBuffers` — pushes each well's current `telemetry[tag]` at `now`, slicing each series to the last `cap`. Returns a NEW object (no mutation of input).
  - `aggregate(points, mode) → number` — `mode ∈ 'avg'|'min'|'max'|'last'`; empty → 0.
  - `queryHistory(buffers, wellId, tag, fromT, toT) → SeriesPoint[]` — points with `fromT ≤ t ≤ toT`; missing well/tag → `[]`.

- [ ] **Step 1: Write the failing test**

```js
// tests/geothermalHistory.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_TAGS, seedWellHistory, appendHistory, aggregate, queryHistory } from '../src/lib/geothermal/history.js';

function wells() {
  return [
    { id: 'WP-01', telemetry: { wellPressure: 124, heatPipePressure: 86, temperature: 192, level: 0.42, flowM3h: 84, flowLs: 23 } },
    { id: 'RI-01', telemetry: { wellPressure: 112, heatPipePressure: 78, temperature: 178, level: 0.42, flowM3h: 84, flowLs: 23 } },
  ];
}

test('seedWellHistory fills every well and tag with N points', () => {
  const b = seedWellHistory(wells(), 100000, 10, 5000);
  assert.deepEqual(Object.keys(b).sort(), ['RI-01', 'WP-01']);
  for (const tag of HISTORY_TAGS) assert.equal(b['WP-01'][tag].length, 10);
  const last = b['WP-01'].wellPressure.at(-1);
  assert.equal(last.t, 100000);
  assert.equal(last.v, 124);
});

test('appendHistory pushes one point per well/tag and caps length', () => {
  let b = seedWellHistory(wells(), 0, 3, 5000);
  b = appendHistory(b, wells(), 5000, 3);
  assert.equal(b['WP-01'].wellPressure.length, 3); // capped
  assert.equal(b['WP-01'].wellPressure.at(-1).t, 5000);
});

test('appendHistory does not mutate the input buffers', () => {
  const b0 = seedWellHistory(wells(), 0, 2, 5000);
  const beforeLen = b0['WP-01'].wellPressure.length;
  appendHistory(b0, wells(), 5000, 10);
  assert.equal(b0['WP-01'].wellPressure.length, beforeLen);
});

test('aggregate computes avg/min/max/last', () => {
  const pts = [{ t: 1, v: 10 }, { t: 2, v: 20 }, { t: 3, v: 30 }];
  assert.equal(aggregate(pts, 'avg'), 20);
  assert.equal(aggregate(pts, 'min'), 10);
  assert.equal(aggregate(pts, 'max'), 30);
  assert.equal(aggregate(pts, 'last'), 30);
  assert.equal(aggregate([], 'avg'), 0);
});

test('queryHistory filters by time window and unknown ids yield []', () => {
  const b = seedWellHistory(wells(), 10000, 5, 1000); // t: 6000..10000
  const q = queryHistory(b, 'WP-01', 'wellPressure', 8000, 10000);
  assert.ok(q.every((p) => p.t >= 8000 && p.t <= 10000));
  assert.deepEqual(queryHistory(b, 'NOPE', 'wellPressure', 0, 1e12), []);
});
```

- [ ] **Step 2: Run test → FAIL** (`npm test`, module missing).
- [ ] **Step 3: Implement `history.js`**

```js
// src/lib/geothermal/history.js
// Pure per-well × per-tag history buffers + aggregate/query. Plain JS, injected time.

/** @type {Array<'wellPressure'|'heatPipePressure'|'temperature'|'level'|'flowM3h'|'flowLs'>} */
export const HISTORY_TAGS = ['wellPressure', 'heatPipePressure', 'temperature', 'level', 'flowM3h', 'flowLs'];

export const HISTORY_CAP = 720;

/** @param {Array<{id:string,telemetry:Record<string,number>}>} wells
 * @param {number} now @param {number} ticks @param {number} tickMs */
export function seedWellHistory(wells, now, ticks, tickMs) {
  /** @type {Record<string, Record<string, Array<{t:number,v:number}>>>} */
  const out = {};
  for (const w of wells) {
    out[w.id] = {};
    for (const tag of HISTORY_TAGS) {
      out[w.id][tag] = Array.from({ length: ticks }, (_, i) => ({
        t: now - (ticks - 1 - i) * tickMs,
        v: w.telemetry[tag],
      }));
    }
  }
  return out;
}

/** @param {Record<string,Record<string,Array<{t:number,v:number}>>>} buffers
 * @param {Array<{id:string,telemetry:Record<string,number>}>} wells
 * @param {number} now @param {number} [cap] */
export function appendHistory(buffers, wells, now, cap = HISTORY_CAP) {
  const out = {};
  for (const w of wells) {
    const prev = buffers[w.id] || {};
    out[w.id] = {};
    for (const tag of HISTORY_TAGS) {
      const series = prev[tag] || [];
      out[w.id][tag] = [...series.slice(-(cap - 1)), { t: now, v: w.telemetry[tag] }];
    }
  }
  return out;
}

/** @param {Array<{t:number,v:number}>} points @param {'avg'|'min'|'max'|'last'} mode */
export function aggregate(points, mode) {
  if (!points.length) return 0;
  const vs = points.map((p) => p.v);
  if (mode === 'min') return Math.min(...vs);
  if (mode === 'max') return Math.max(...vs);
  if (mode === 'last') return vs[vs.length - 1];
  return vs.reduce((a, b) => a + b, 0) / vs.length;
}

/** @param {Record<string,Record<string,Array<{t:number,v:number}>>>} buffers
 * @param {string} wellId @param {string} tag @param {number} fromT @param {number} toT */
export function queryHistory(buffers, wellId, tag, fromT, toT) {
  const series = buffers[wellId] && buffers[wellId][tag];
  if (!series) return [];
  return series.filter((p) => p.t >= fromT && p.t <= toT);
}
```

- [ ] **Step 4: Run test → PASS.**
- [ ] **Step 5: Commit**

```bash
git add src/lib/geothermal/history.js tests/geothermalHistory.test.js
git commit -m "feat(geothermal): pure per-well history buffers + aggregate/query"
```

---

### Task 2: Wire per-well history into the store

**Files:**
- Modify: `src/lib/geothermal/store.ts`

**Interfaces:**
- Consumes: `seedWellHistory`, `appendHistory`, `HISTORY_TAGS` from `./history.js`.
- Produces:
  - `geoHistoryByWell: Writable<Record<string, Record<string, SeriesPoint[]>>>` — seeded via `seedWellHistory(get(geoWells), Date.now(), 48, TICK_MS)`; appended each tick for ALL wells.
  - `geoHistory` — now DERIVED from `geoHistoryByWell` + `geoSelectedWellId`, projecting the selected well's `{wellPressure, heatPipePressure, level, flowLs}` keys. `flowLs` is already in `HISTORY_TAGS` (Task 1), so `TrendPanel` (which reads those 4 keys) stays untouched.

- [ ] **Step 1: Replace the history section of `store.ts`**

Remove `seedHistory()` and the old selected-well `geoHistory` writable + the tick's history-append block and the Phase-3 caveat comment. Add:

```ts
import { seedWellHistory, appendHistory } from './history.js';

export const geoHistoryByWell = writable(
  seedWellHistory(get(geoWells) as any, Date.now(), 48, TICK_MS),
);

/** Selected-well projection kept for TrendPanel/back-compat. */
export const geoHistory = derived(
  [geoHistoryByWell, geoSelectedWellId],
  ([$h, $id]) => {
    const w = $h[$id] || {};
    return {
      wellPressure: w.wellPressure || [],
      heatPipePressure: w.heatPipePressure || [],
      level: w.level || [],
      flowLs: w.flowLs || [],
    };
  },
);
```

In `startGeoSimulation`, after `geoWells.set(wells)` (and alarm handling), append history for all wells:

```ts
    geoHistoryByWell.update((h) => appendHistory(h, wells as any, now));
```

- [ ] **Step 2: Verify**

`npm run check` → 0 errors. `npm test` → all pass. `npm run dev` → Dashboard/Trend still render (TrendPanel reads the derived `geoHistory`); switching wells changes the selected-well trend cleanly (no cross-well splice — each well now has its own buffer).

- [ ] **Step 3: Commit**

```bash
git add src/lib/geothermal/store.ts
git commit -m "feat(geothermal): per-well history store; selected-well view derived"
```

---

### Task 3: Trends page (multi-pen)

**Files:**
- Create: `src/lib/components/geothermal/pages/GeoTrendsPage.svelte`
- Modify: `src/lib/components/geothermal/GeothermalShell.svelte` (route `trend` → GeoTrendsPage; keep the existing `GeoTrendPage`/`TrendPanel` unused OR delete `GeoTrendPage` — see below)

**Interfaces:**
- Consumes: `geoHistoryByWell`, `geoWells` from store; `HISTORY_TAGS` + labels; `MultiChart`.

**Requirements:**
- **Well picker:** `<select>` (single well) OR multi — implement single-well default + a "Compare wells" toggle. In single-well mode: pick a well, show up to 4 tag pens for that well. In compare mode: pick ONE tag, show that tag across all wells (one pen per well).
- **Tag picker:** checkboxes for the 5 `HISTORY_TAGS` (single-well mode). Default: wellPressure + heatPipePressure + level + flowM3h.
- **Range selector:** buttons 15m / 1h / all — filter the series by `t >= now - rangeMs` (client-side; `now` from `Date.now()` in the component is fine).
- Build `series: {name,color,points}[]` from `$geoHistoryByWell`, feed `MultiChart` (height 320). Assign each pen a stable color (a small tag→color / well→color map).
- Legend below (reuse TrendPanel's legend style). Route `trend` to this page. Currently `trend` → `GeoTrendPage` (thin wrapper over `TrendPanel`) — repoint it to `GeoTrendsPage`; leave `TrendPanel` (still used on the Dashboard) and the now-unused `GeoTrendPage` file may be deleted (report which you did).

- [ ] **Step 1: Build `GeoTrendsPage.svelte`** (pickers + range + MultiChart, single & compare modes).
- [ ] **Step 2: Route it** in `GeothermalShell.svelte`.
- [ ] **Step 3: Verify** — `npm run check` 0 errors; `npm run dev`: Trends page shows multi-pen chart, tag toggles add/remove pens, well switch changes data, compare mode overlays wells for one tag, range narrows the window.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(geothermal): multi-pen Trends page (tag/well pickers, range, compare)"
```

---

### Task 4: Historian page (query + CSV export)

**Files:**
- Create: `src/lib/components/geothermal/pages/GeoHistorianPage.svelte`
- Modify: `src/lib/components/geothermal/GeothermalShell.svelte` (route `historian`; remove its STUB entry)

**Interfaces:**
- Consumes: `geoHistoryByWell`, `geoWells` from store; `HISTORY_TAGS`; `queryHistory`, `aggregate` from `history.js`; `num`.

**Requirements:**
- **Query builder:** well `<select>` (one well), tag `<select>` (one tag), range buttons (15m/1h/all), aggregate `<select>` (raw / avg / min / max). A "Run query" button sets a `$state` query object; results derive from it.
- **Result table:** if aggregate === raw → list the queried `SeriesPoint`s (Time · Value) newest-first, capped display (e.g. 200 rows, note if truncated). Else → a single summary row (well · tag · aggregate · value · sample count).
- **CSV export:** a button that builds a CSV string from the current result and triggers a client download via a `Blob` + object URL + a temporary `<a>` click (guard for SSR: only in browser). Filename like `historian_<well>_<tag>.csv`.
- Format time via a small local `HH:MM:SS` from `p.t`. Route `historian`; remove from STUB.

- [ ] **Step 1: Build `GeoHistorianPage.svelte`.**
- [ ] **Step 2: Route it** (`PAGES.historian`, remove STUB entry).
- [ ] **Step 3: Verify** — `npm run check` 0 errors; `npm run dev`: run a raw query → rows appear; switch to avg → summary row; Export CSV downloads a file with the shown data.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(geothermal): Historian query page with CSV export"
```

---

### Task 5: Production page

**Files:**
- Create: `src/lib/components/geothermal/pages/GeoProductionPage.svelte`
- Modify: `src/lib/components/geothermal/GeothermalShell.svelte` (route `production`; remove STUB entry)

**Interfaces:**
- Consumes: `geoWells`, `geoField` from store; `GeoGauge`; `MultiChart` (`barMode:'stacked'`); `num`.

**Requirements:**
- **Constant** `FIELD_NAMEPLATE_MW = 20` (module const in the page).
- **KPI row:** gross MW (`$geoField.grossMw`), total steam t/h (`$geoField.steamTh`), total brine m³/h (`$geoField.brineM3h`), capacity factor = `grossMw / FIELD_NAMEPLATE_MW * 100` %. Reuse the FieldKpiRow tile style (or GeoGauge for gross MW vs nameplate).
- **Output by well:** a bar chart (MultiChart `barMode:'stacked'` or a simple bar list) of each production well's `output.mw` (and/or steam) — one bar per well; reinjection wells excluded from MW/steam. If MultiChart's bar mode is awkward for categorical wells, render a simple horizontal bar list with `num` labels (acceptable).
- **Decline curve:** a 30-point series (deterministic, no random) showing a gentle production decline: `v = grossMw * (1 - 0.004 * i)` for `i` in 0..29 (or similar), plotted with MultiChart as a single line. Label "30-day production trend (indicative)". Compute in the component (deterministic, index-based — no `Math.random`).
- **Per-well contribution:** small table (well · type · steam t/h · MW · % of field MW).
- Route `production`; remove from STUB.

- [x] **Step 1: Build `GeoProductionPage.svelte`.**
- [x] **Step 2: Route it.**
- [x] **Step 3: Verify** — `npm run check` 0 errors; `npm run dev`: Production page shows KPI row, per-well output bars, decline curve, contribution table; capacity factor computes.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(geothermal): Production page (output by well, capacity factor, decline curve)"
```

---

## Self-Review Notes

- **Spec coverage (Analytics row):** Trends multi-pen/compare/range → Task 3; Historian query+aggregate+CSV → Task 4; Production output/MW/capacity/decline → Task 5; per-well history data model (spec §3) → Tasks 1–2 (also resolves the Phase-1 "history tracks only selected well" caveat).
- **Back-compat:** `geoHistory` stays available as a derived selected-well projection so `TrendPanel` (Dashboard) is untouched; `flowLs` kept in `HISTORY_TAGS` for that projection.
- **Type consistency:** `SeriesPoint {t,v}`; buffer shape `Record<wellId, Record<tag, SeriesPoint[]>>` identical across `history.js` (Task 1), store (Task 2), and pages (Tasks 3–5).
- **Purity:** history math (Task 1) `node --test` covered; decline curve is deterministic index math (no random); UI gates on `npm run check` + dev observation.
```
