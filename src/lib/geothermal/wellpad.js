// Pure well-pad math + telemetry stepping. Plain JS so `node --test` imports it
// directly (no TS loader). Randomness is injected (`rnd`) for deterministic tests.

export const WEIR_H0 = 0.423;
export const WEIR_Q0 = 23.48;
/** Coefficient tuned so weirFlowLs(WEIR_H0) === WEIR_Q0 (mockup anchor). */
export const WEIR_K = WEIR_Q0 / Math.pow(WEIR_H0, 2.5);

/** 90° V-notch flow in L/s from head H (m).
 * @param {number} h
 * @param {number} [k]
 * @returns {number}
 */
export function weirFlowLs(h, k = WEIR_K) {
  return k * Math.pow(Math.max(0, h), 2.5);
}

/** L/s → m³/h.
 * @param {number} ls
 * @returns {number}
 */
export function lsToM3h(ls) {
  return ls * 3.6;
}

/** @param {number} v
 * @returns {number}
 */
export function r2(v) {
  return Math.round(v * 100) / 100;
}

/** @param {number} v
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/** Random walk with optional mean-reversion, clamped and 2-dp rounded.
 * @param {number} v
 * @param {number} vol
 * @param {number} min
 * @param {number} max
 * @param {number} [pullTo]
 * @param {() => number} [rnd]
 * @returns {number}
 */
export function nudge(v, vol, min, max, pullTo = undefined, rnd = Math.random) {
  let nv = v + (rnd() - 0.5) * 2 * vol;
  if (pullTo !== undefined) nv += (pullTo - v) * 0.04;
  return clamp(r2(nv), min, max);
}

/** Plausible operating envelope per telemetry field. */
export const RANGES = {
  wellPressure: { min: 115, max: 135 },
  heatPipePressure: { min: 78, max: 95 },
  temperature: { min: 180, max: 205 },
  level: { min: 0.30, max: 0.55 },
  flowLs: { min: weirFlowLs(0.30), max: weirFlowLs(0.55) },
  flowM3h: { min: lsToM3h(weirFlowLs(0.30)), max: lsToM3h(weirFlowLs(0.55)) },
  battery: { min: 40, max: 100 },
  solarV: { min: 40, max: 60 },
  batteryV: { min: 44, max: 52 },
  chargeA: { min: 0, max: 15 },
  vsatSignal: { min: -75, max: -40 },
  vsatLink: { min: 90, max: 100 },
  latency: { min: 400, max: 800 },
};

/** Advance telemetry one tick. Flow is derived from level (physical coupling).
 * @param {Record<string, number>} prev
 * @param {() => number} [rnd]
 * @returns {Record<string, number>}
 */
export function stepTelemetry(prev, rnd = Math.random) {
  const level = nudge(prev.level, 0.006, RANGES.level.min, RANGES.level.max, 0.423, rnd);
  const flowLs = r2(clamp(weirFlowLs(level), RANGES.flowLs.min, RANGES.flowLs.max));
  const flowM3h = r2(lsToM3h(flowLs));
  return {
    wellPressure: nudge(prev.wellPressure, 0.5, RANGES.wellPressure.min, RANGES.wellPressure.max, 124.6, rnd),
    heatPipePressure: nudge(prev.heatPipePressure, 0.4, RANGES.heatPipePressure.min, RANGES.heatPipePressure.max, 86.3, rnd),
    temperature: nudge(prev.temperature, 0.5, RANGES.temperature.min, RANGES.temperature.max, 192.4, rnd),
    level,
    flowLs,
    flowM3h,
    battery: nudge(prev.battery, 0.6, RANGES.battery.min, RANGES.battery.max, 80, rnd),
    solarV: nudge(prev.solarV, 0.6, RANGES.solarV.min, RANGES.solarV.max, 54, rnd),
    batteryV: nudge(prev.batteryV, 0.3, RANGES.batteryV.min, RANGES.batteryV.max, 48.6, rnd),
    chargeA: nudge(prev.chargeA, 0.5, RANGES.chargeA.min, RANGES.chargeA.max, 8, rnd),
    vsatSignal: nudge(prev.vsatSignal, 1.5, RANGES.vsatSignal.min, RANGES.vsatSignal.max, -48, rnd),
    vsatLink: nudge(prev.vsatLink, 0.8, RANGES.vsatLink.min, RANGES.vsatLink.max, 98, rnd),
    latency: Math.round(nudge(prev.latency, 25, RANGES.latency.min, RANGES.latency.max, 620, rnd)),
  };
}

/** @type {Record<string, number>} */
export const SIAGA_WEIGHT = { normal: 0, waspada: 1, siaga: 2, awas: 3 };

/** @param {string[]} list
 * @returns {string}
 */
export function worstStatus(list) {
  return list.reduce((acc, s) => (SIAGA_WEIGHT[s] > SIAGA_WEIGHT[acc] ? s : acc), 'normal');
}

/** Rising-threshold escalation (value above threshold → more severe).
 * @param {number} value
 * @param {{ waspada: number, siaga: number, awas: number }} t
 * @returns {string}
 */
export function sensorState(value, t) {
  if (value >= t.awas) return 'awas';
  if (value >= t.siaga) return 'siaga';
  if (value >= t.waspada) return 'waspada';
  return 'normal';
}

/** @param {{ status: string }[]} alarms
 * @returns {number}
 */
export function activeAlarmCount(alarms) {
  return alarms.filter((a) => a.status === 'active').length;
}
