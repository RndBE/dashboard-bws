// src/lib/geothermal/instruments.js
// Deterministic mock instrument-tag registry derived from the field's wells.
// No Math.random at load — values hashed from the tag id so renders are stable.
import { WELL_SEED } from './field.js';

/** Cheap deterministic 0..1 hash from a string.
 * @param {string} str */
function h01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Instrument kinds present on every well pad. */
const KINDS = [
  { kind: 'pressure', prefix: 'PT', unit: 'bar', range: [0, 160] },
  { kind: 'temperature', prefix: 'TT', unit: '°C', range: [0, 320] },
  { kind: 'level', prefix: 'LT', unit: 'm', range: [0, 2] },
  { kind: 'flow', prefix: 'FT', unit: 'm³/h', range: [0, 800] },
];

/** @param {number} dueDays @param {number} drift @returns {import('./types').GeoStatus} */
function calStatus(dueDays, drift) {
  if (drift >= 2.5) return 'awas'; // out-of-tolerance drift = faulty
  if (dueDays < 0) return 'siaga'; // calibration overdue
  if (dueDays < 30) return 'waspada'; // due soon
  return 'normal';
}

/** Full registry: 4 tags per well.
 * @returns {Array<{tag:string,well:string,wellName:string,kind:string,unit:string,rangeLo:number,rangeHi:number,lastCalDays:number,dueDays:number,driftPct:number,status:import('./types').GeoStatus}>} */
export function makeInstruments() {
  /** @type {Array<{tag:string,well:string,wellName:string,kind:string,unit:string,rangeLo:number,rangeHi:number,lastCalDays:number,dueDays:number,driftPct:number,status:import('./types').GeoStatus}>} */
  const rows = [];
  WELL_SEED.forEach((w, wi) => {
    KINDS.forEach((k, ki) => {
      const loop = 101 + ki + wi * 10;
      const tag = `${w.id}-${k.prefix}-${loop}`;
      const r = h01(tag);
      const r2 = h01(tag + 'x');
      // Calibration cadence ~365d; last cal 20..350d ago; due = 365 - since.
      const lastCalDays = Math.round(20 + r * 330);
      const dueDays = 365 - lastCalDays;
      const driftPct = Math.round((0.1 + r2 * 3.4) * 10) / 10;
      rows.push({
        tag,
        well: w.id,
        wellName: w.name,
        kind: k.kind,
        unit: k.unit,
        rangeLo: k.range[0],
        rangeHi: k.range[1],
        lastCalDays,
        dueDays,
        driftPct,
        status: calStatus(dueDays, driftPct),
      });
    });
  });
  return rows;
}

/** KPI roll-up over a registry.
 * @param {ReturnType<typeof makeInstruments>} rows */
export function instrumentKpis(rows) {
  return {
    total: rows.length,
    calibrated: rows.filter((r) => r.status === 'normal').length,
    dueSoon: rows.filter((r) => r.status === 'waspada').length,
    overdue: rows.filter((r) => r.status === 'siaga' || r.status === 'awas').length,
  };
}
