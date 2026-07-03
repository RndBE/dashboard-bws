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
  /** @type {Record<string, Record<string, Array<{t:number,v:number}>>>} */
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
