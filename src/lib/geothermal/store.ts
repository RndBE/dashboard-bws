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
    const next = stepTelemetry(get(geoTelemetry) as unknown as Record<string, number>) as unknown as Telemetry;
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
