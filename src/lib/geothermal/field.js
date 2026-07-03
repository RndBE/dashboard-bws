// src/lib/geothermal/field.js
// Pure multi-well field math. Plain JS so `node --test` imports it directly.
// Randomness injected (`rnd`) for deterministic tests.
import { stepTelemetry, worstStatus, sensorState, r2, clamp, RANGES } from './wellpad.js';
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
  wellPressure: { waspada: 130, siaga: 133, awas: 134.5 },
  heatPipePressure: { waspada: 91, siaga: 93, awas: 94.5 },
  level: { waspada: 0.49, siaga: 0.52, awas: 0.54 },
};

/** Reinjection wells produce no steam or MW; brine still flows.
 * @param {Record<string, number>} t @returns {{steamTh:number, brineM3h:number, mw:number}} */
function reinjectionOutput(t) {
  return { steamTh: 0, brineM3h: t.flowM3h, mw: 0 };
}

/** Steam (t/h) and gross MW derived from separator conditions. Mock but monotonic.
 * @param {Record<string, number>} t
 * @returns {{steamTh:number, brineM3h:number, mw:number}} */
export function wellOutput(t) {
  const steamTh = r2((t.wellPressure - 100) * 0.9 + (t.temperature - 180) * 0.6);
  return { steamTh, brineM3h: t.flowM3h, mw: r2(steamTh * 0.13) };
}

/** @param {Record<string, number>} t @returns {'normal'|'waspada'|'siaga'|'awas'} */
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
  telemetry.wellPressure = clamp(r2(SEED_TELEMETRY.wellPressure * seed.factor), RANGES.wellPressure.min, RANGES.wellPressure.max);
  telemetry.heatPipePressure = clamp(r2(SEED_TELEMETRY.heatPipePressure * seed.factor), RANGES.heatPipePressure.min, RANGES.heatPipePressure.max);
  telemetry.temperature = clamp(r2(SEED_TELEMETRY.temperature * (0.5 + seed.factor / 2)), RANGES.temperature.min, RANGES.temperature.max);
  const output = seed.type === 'reinjection' ? reinjectionOutput(telemetry) : wellOutput(telemetry);
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
  const output = well.type === 'reinjection' ? reinjectionOutput(telemetry) : wellOutput(telemetry);
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
