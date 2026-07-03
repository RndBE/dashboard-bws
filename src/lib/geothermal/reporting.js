// src/lib/geothermal/reporting.js
// Deterministic mock report registry — periodic & compliance reports.

/** @typedef {'production'|'environmental'|'compliance'|'maintenance'} RptCategory */
/** @typedef {'harian'|'mingguan'|'bulanan'|'triwulan'} RptPeriod */
/** @typedef {'ready'|'pending'|'overdue'} RptStatus */

/** Fixed report backlog. `lastGenDays` relative to now; `dueDays` next issue
 * (negative = overdue). Deterministic, hand-seeded.
 * @type {Array<{id:string,title:string,category:RptCategory,period:RptPeriod,format:string,lastGenDays:number,dueDays:number,status:RptStatus}>} */
const SEED = [
  { id: 'RPT-2041', title: 'Produksi Uap & MW Harian', category: 'production', period: 'harian', format: 'PDF', lastGenDays: 0, dueDays: 1, status: 'ready' },
  { id: 'RPT-2040', title: 'Neraca Brine & Reinjeksi', category: 'production', period: 'harian', format: 'XLSX', lastGenDays: 0, dueDays: 1, status: 'ready' },
  { id: 'RPT-2039', title: 'Emisi NCG & H₂S', category: 'environmental', period: 'mingguan', format: 'PDF', lastGenDays: 2, dueDays: 5, status: 'pending' },
  { id: 'RPT-2038', title: 'Kualitas Air Reinjeksi', category: 'environmental', period: 'bulanan', format: 'PDF', lastGenDays: 12, dueDays: 18, status: 'ready' },
  { id: 'RPT-2037', title: 'Laporan Lifting ESDM', category: 'compliance', period: 'bulanan', format: 'PDF', lastGenDays: 20, dueDays: -3, status: 'overdue' },
  { id: 'RPT-2036', title: 'Kepatuhan RKL-RPL', category: 'compliance', period: 'triwulan', format: 'PDF', lastGenDays: 45, dueDays: 12, status: 'pending' },
  { id: 'RPT-2035', title: 'Ringkasan Work Order', category: 'maintenance', period: 'mingguan', format: 'XLSX', lastGenDays: 3, dueDays: 4, status: 'ready' },
  { id: 'RPT-2034', title: 'Ketersediaan Sumur', category: 'production', period: 'bulanan', format: 'PDF', lastGenDays: 15, dueDays: 15, status: 'pending' },
  { id: 'RPT-2033', title: 'Kalibrasi Instrumen', category: 'maintenance', period: 'triwulan', format: 'PDF', lastGenDays: 30, dueDays: -1, status: 'overdue' },
];

/** @returns {typeof SEED} */
export function makeReports() {
  return SEED.map((r) => ({ ...r }));
}

/** @param {ReturnType<typeof makeReports>} rows */
export function reportKpis(rows) {
  const total = rows.length || 1;
  return {
    ready: rows.filter((r) => r.status === 'ready').length,
    pending: rows.filter((r) => r.status === 'pending').length,
    overdue: rows.filter((r) => r.status === 'overdue').length,
    compliance: Math.round((rows.filter((r) => r.status !== 'overdue').length / total) * 100),
  };
}
