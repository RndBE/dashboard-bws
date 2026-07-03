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
  const p = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Evaluate alarms against the current wells, mutating a working copy of prev.
 * @param {Array<{id: string, telemetry: Record<string, number>}>} wells
 * @param {import('./types').AlarmRow[]} prev
 * @param {number} now  epoch ms
 * @param {number} nextId
 * @returns {{alarms: import('./types').AlarmRow[], nextId: number}} */
export function evaluateAlarms(wells, prev, now, nextId) {
  const alarms = prev.map((a) => ({ ...a }));
  const activeIdx = (/** @type {string} */ wellId, /** @type {string} */ tag) =>
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
  /** @type {Record<string, number>} */
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
