import { derived, get, readable, writable } from 'svelte/store';
import type { SeriesPoint } from '../types';
import { paused } from '../stores';
import { activeAlarmCount, stepTelemetry, worstStatus } from './wellpad.js';
import { SEED_ALARMS, SEED_TELEMETRY, SYSTEM_ROWS } from './seed.js';
import type { AlarmRow, GeoStatus, Telemetry } from './types';
import type { GeoSection } from '../config/geoNav';

/** menu aktif di dalam sub-sistem Geothermal */
export const geoSection = writable<GeoSection>('dashboard');

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
