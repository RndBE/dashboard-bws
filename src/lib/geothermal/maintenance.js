// src/lib/geothermal/maintenance.js
// Deterministic mock maintenance work-order backlog for the field.
import { WELL_SEED } from './field.js';

/** @typedef {'preventive'|'corrective'|'inspection'} WoType */
/** @typedef {'low'|'medium'|'high'|'critical'} WoPriority */
/** @typedef {'open'|'in-progress'|'done'} WoStatus */

const ASSIGNEES = ['A. Saputra', 'B. Wijaya', 'C. Halim', 'D. Pratama', 'E. Nugroho'];

/** Fixed backlog — hand-seeded so the board reads like a real queue.
 * `openedDays`/`dueDays` are relative to "now" (negative due = overdue).
 * @type {Array<{id:string,asset:string,title:string,type:WoType,priority:WoPriority,status:WoStatus,assignee:number,openedDays:number,dueDays:number}>} */
const SEED = [
  { id: 'WO-1042', asset: 'WP-01', title: 'Ganti seal pompa brine', type: 'corrective', priority: 'high', status: 'in-progress', assignee: 0, openedDays: 3, dueDays: 1 },
  { id: 'WO-1041', asset: 'WP-03', title: 'Kalibrasi PT separator', type: 'preventive', priority: 'medium', status: 'open', assignee: 1, openedDays: 2, dueDays: 5 },
  { id: 'WO-1040', asset: 'RI-01', title: 'Inspeksi pipa reinjeksi', type: 'inspection', priority: 'low', status: 'open', assignee: 2, openedDays: 5, dueDays: 9 },
  { id: 'WO-1039', asset: 'WP-02', title: 'Bersihkan scaling wellhead', type: 'corrective', priority: 'critical', status: 'open', assignee: 3, openedDays: 1, dueDays: -1 },
  { id: 'WO-1038', asset: 'WP-04', title: 'Servis kompresor NCG', type: 'preventive', priority: 'medium', status: 'in-progress', assignee: 4, openedDays: 6, dueDays: 2 },
  { id: 'WO-1037', asset: 'WP-01', title: 'Uji katup ESD', type: 'inspection', priority: 'high', status: 'open', assignee: 0, openedDays: 4, dueDays: -2 },
  { id: 'WO-1036', asset: 'RI-02', title: 'Ganti transmitter level', type: 'corrective', priority: 'medium', status: 'done', assignee: 1, openedDays: 12, dueDays: -5 },
  { id: 'WO-1035', asset: 'WP-03', title: 'Grease bearing pompa', type: 'preventive', priority: 'low', status: 'done', assignee: 2, openedDays: 14, dueDays: -7 },
  { id: 'WO-1034', asset: 'WP-02', title: 'Perbaiki link VSAT', type: 'corrective', priority: 'high', status: 'in-progress', assignee: 3, openedDays: 2, dueDays: 3 },
  { id: 'WO-1033', asset: 'WP-04', title: 'Inspeksi termal flowline', type: 'inspection', priority: 'medium', status: 'open', assignee: 4, openedDays: 7, dueDays: 6 },
  { id: 'WO-1032', asset: 'WP-01', title: 'Ganti filter separator', type: 'preventive', priority: 'low', status: 'done', assignee: 0, openedDays: 20, dueDays: -10 },
  { id: 'WO-1031', asset: 'RI-01', title: 'Overhaul pompa injeksi', type: 'corrective', priority: 'critical', status: 'in-progress', assignee: 2, openedDays: 9, dueDays: 4 },
];

/** @type {Record<string, string>} */
const WELL_NAME = Object.fromEntries(WELL_SEED.map((w) => [w.id, w.name]));

/** @returns {Array<{id:string,asset:string,assetName:string,title:string,type:WoType,priority:WoPriority,status:WoStatus,assignee:string,openedDays:number,dueDays:number,overdue:boolean}>} */
export function makeWorkOrders() {
  return SEED.map((w) => ({
    ...w,
    assetName: WELL_NAME[w.asset] ?? w.asset,
    assignee: ASSIGNEES[w.assignee],
    overdue: w.status !== 'done' && w.dueDays < 0,
  }));
}

/** @param {ReturnType<typeof makeWorkOrders>} rows */
export function workOrderKpis(rows) {
  return {
    open: rows.filter((r) => r.status === 'open').length,
    inProgress: rows.filter((r) => r.status === 'in-progress').length,
    overdue: rows.filter((r) => r.overdue).length,
    done: rows.filter((r) => r.status === 'done').length,
  };
}
