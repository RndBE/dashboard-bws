import { derived, get, readable, writable } from 'svelte/store';
import type { SeriesPoint } from '../types';
import { paused } from '../stores';
import { activeAlarmCount, worstStatus } from './wellpad.js';
import { makeWells, stepField, fieldKpis } from './field.js';
import { evaluateAlarms, fmtClock } from './alarms.js';
import { SEED_EVENTS, SEED_TELEMETRY, SYSTEM_ROWS } from './seed.js';
import { seedWellHistory, appendHistory } from './history.js';
import type { AlarmRow, FieldKpis, GeoEvent, GeoStatus, Telemetry, Well } from './types';
import type { GeoSection } from '../config/geoNav';

/** menu aktif di dalam sub-sistem Geothermal */
export const geoSection = writable<GeoSection>('dashboard');

const TICK_MS = 5000;

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

export const geoAlarms = writable<AlarmRow[]>([]);
export const geoEvents = writable<GeoEvent[]>(SEED_EVENTS.map((e) => ({ ...e })) as GeoEvent[]);

let alarmSeq = 1;
let eventSeq = 100;

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

export const geoActiveAlarmCount = derived(geoAlarms, ($a) => activeAlarmCount($a));

/**
 * System health = worst of the system-status rows. Active alarms are a
 * separate indicator (bell badge + alarm panel), so they do not escalate this
 * badge — matching the reference mockup's "System Normal" alongside "2 Active".
 */
export const geoOverallStatus = readable<GeoStatus>(
  worstStatus(SYSTEM_ROWS.map((r) => r.state)) as GeoStatus,
);

export function ackAlarm(id: number): void {
  let label = '';
  geoAlarms.update((list) =>
    list.map((a) => (a.id === id ? ((label = a.label), { ...a, ack: true }) : a)));
  if (label) pushEvent('operator', `Operator acknowledged ${label}`);
}

export function shelveAlarm(id: number): void {
  let label = '';
  geoAlarms.update((list) =>
    list.map((a) => (a.id === id ? ((label = a.label), { ...a, status: 'shelved' as const }) : a)));
  if (label) pushEvent('operator', `Operator shelved ${label}`);
}

function pushEvent(kind: GeoEvent['kind'], message: string): void {
  geoEvents.update((list) => [{ id: eventSeq++, time: fmtClock(Date.now()), kind, message }, ...list].slice(0, 60));
}

export function startGeoSimulation(): () => void {
  const id = setInterval(() => {
    if (get(paused)) return;
    const now = Date.now();
    const wells = stepField(get(geoWells));
    geoWells.set(wells as Well[]);
    const prevActive = new Set(get(geoAlarms).filter((a) => a.status === 'active').map((a) => a.id));
    const res = evaluateAlarms(wells as unknown as Array<{ id: string; telemetry: Record<string, number> }>, get(geoAlarms), now, alarmSeq);
    alarmSeq = res.nextId;
    geoAlarms.set(res.alarms as AlarmRow[]);
    for (const a of res.alarms) {
      if (a.status === 'active' && !prevActive.has(a.id)) {
        pushEvent('alarm', `${a.severity.toUpperCase()} — ${a.label} = ${a.value}`);
      }
    }
    geoHistoryByWell.update((h) => appendHistory(h, wells as any, now));
  }, TICK_MS);
  return () => clearInterval(id);
}
