// src/lib/geothermal/config.js
// Deterministic mock configuration data — alarm thresholds, users, system prefs.
import { WELL_THRESHOLDS } from './field.js';

/** Alarm threshold rows flattened from the field's rising thresholds.
 * @returns {Array<{tag:string,label:string,unit:string,waspada:number,siaga:number,awas:number}>} */
export function thresholdRows() {
  const META = {
    wellPressure: { label: 'Wellhead Pressure', unit: 'bar' },
    heatPipePressure: { label: 'Heat Pipe Pressure', unit: 'bar' },
    level: { label: 'Separator Level', unit: 'm' },
  };
  return Object.entries(WELL_THRESHOLDS).map(([tag, t]) => ({
    tag,
    label: META[/** @type {keyof typeof META} */ (tag)]?.label ?? tag,
    unit: META[/** @type {keyof typeof META} */ (tag)]?.unit ?? '',
    waspada: t.waspada,
    siaga: t.siaga,
    awas: t.awas,
  }));
}

/** @typedef {'Administrator'|'Supervisor'|'Operator'|'Viewer'} UserRole */

/** @type {Array<{name:string,email:string,role:UserRole,lastLoginDays:number,active:boolean}>} */
export const USERS = [
  { name: 'A. Saputra', email: 'a.saputra@geo.id', role: 'Administrator', lastLoginDays: 0, active: true },
  { name: 'B. Wijaya', email: 'b.wijaya@geo.id', role: 'Supervisor', lastLoginDays: 0, active: true },
  { name: 'C. Halim', email: 'c.halim@geo.id', role: 'Operator', lastLoginDays: 1, active: true },
  { name: 'D. Pratama', email: 'd.pratama@geo.id', role: 'Operator', lastLoginDays: 2, active: true },
  { name: 'E. Nugroho', email: 'e.nugroho@geo.id', role: 'Viewer', lastLoginDays: 9, active: false },
];

/** System preferences (display-only mock).
 * @type {Array<{label:string,value:string,note:string}>} */
export const SYSTEM_PREFS = [
  { label: 'Interval Polling SCADA', value: '5 detik', note: 'Laju refresh telemetri' },
  { label: 'Satuan Tekanan', value: 'bar', note: 'Unit tampilan tekanan' },
  { label: 'Satuan Suhu', value: '°C', note: 'Unit tampilan suhu' },
  { label: 'Zona Waktu', value: 'WIB (UTC+7)', note: 'Waktu tampilan & stempel log' },
  { label: 'Bahasa', value: 'Indonesia', note: 'Bahasa antarmuka' },
  { label: 'Retensi Historian', value: '90 hari', note: 'Masa simpan data historis' },
];
