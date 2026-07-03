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

/**
 * System health = worst of the system-status rows. Active alarms are a
 * separate indicator (bell badge + alarm panel), so they do not escalate this
 * badge — matching the reference mockup's "System Normal" alongside "2 Active".
 */
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
