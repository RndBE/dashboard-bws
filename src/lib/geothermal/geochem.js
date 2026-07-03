// src/lib/geothermal/geochem.js
// Deterministic mock brine geochemistry per well. Values hashed from well id.
import { WELL_SEED } from './field.js';

/** @param {string} str */
function h01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Silica saturation index → scaling risk.
 * @param {number} si @returns {import('./types').GeoStatus} */
export function scalingRisk(si) {
  if (si < 1.0) return 'normal';
  if (si < 1.2) return 'waspada';
  if (si < 1.4) return 'siaga';
  return 'awas';
}

/** Per-well brine chemistry snapshot.
 * @returns {Array<{well:string,wellName:string,type:import('./types').WellType,ph:number,sio2:number,cl:number,tds:number,ncg:number,si:number,risk:import('./types').GeoStatus}>} */
export function makeGeochem() {
  return WELL_SEED.map((w) => {
    const a = h01(w.id);
    const b = h01(w.id + 'b');
    const c = h01(w.id + 'c');
    const sio2 = Math.round(520 + a * 380); // 520..900 ppm
    const ph = Math.round((6.2 + b * 2.0) * 100) / 100; // 6.2..8.2
    const cl = Math.round(8000 + c * 9000); // 8000..17000 ppm
    const tds = Math.round(cl * (1.7 + a * 0.6)); // ~ Cl-scaled
    const ncg = Math.round((0.4 + b * 3.6) * 100) / 100; // 0.4..4.0 %wt
    // Silica saturation index rises with SiO2, falls with pH/temperature margin.
    const si = Math.round((sio2 / 700) * (1 + (ph - 7) * 0.06) * 100) / 100;
    return {
      well: w.id,
      wellName: w.name,
      type: w.type,
      ph,
      sio2,
      cl,
      tds,
      ncg,
      si,
      risk: scalingRisk(si),
    };
  });
}

/** @param {ReturnType<typeof makeGeochem>} rows */
export function geochemKpis(rows) {
  const n = rows.length || 1;
  /** @param {(r: ReturnType<typeof makeGeochem>[number]) => number} sel */
  const avg = (sel) => rows.reduce((s, r) => s + sel(r), 0) / n;
  return {
    avgPh: Math.round(avg((r) => r.ph) * 100) / 100,
    avgSio2: Math.round(avg((r) => r.sio2)),
    riskWells: rows.filter((r) => r.risk !== 'normal').length,
    avgNcg: Math.round(avg((r) => r.ncg) * 100) / 100,
  };
}
