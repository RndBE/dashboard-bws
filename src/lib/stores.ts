import { derived, get, writable } from 'svelte/store';
import type {
  AlertItem,
  AssetKind,
  AssetRef,
  DashboardData,
  HydroSection,
  Instrument,
  MapMarker,
  ModuleKey,
  PosTipe,
  Siaga,
} from './types';
import { STATUS, worst } from './status';
import { buildData } from './data/seed';
import {
  bendunganStatus,
  irigasiRatio,
  irigasiStatus,
  posStatus,
  sumurStatus,
} from './data/derive';
import { num } from './format';

const START = Date.now();

// ---------- UI state ----------
export const clock = writable<number>(START);
/** dashboard = tampilan interaktif · wall = layar dinding · hydro = Portal Hidrologi */
export const mode = writable<'dashboard' | 'wall' | 'hydro'>('dashboard');
export const activeModule = writable<ModuleKey>('ringkasan');
/** menu aktif di dalam Portal Hidrologi */
export const hydroSection = writable<HydroSection>('beranda');
export const selected = writable<AssetRef | null>(null);
export const paused = writable<boolean>(false);

// ---------- Navigasi Portal Hidrologi ----------
/** buka Portal Hidrologi pada menu tertentu (default beranda) */
export function openHydro(section: HydroSection = 'beranda') {
  selected.set(null);
  hydroSection.set(section);
  mode.set('hydro');
}
/** kembali ke dashboard utama */
export function exitHydro() {
  selected.set(null);
  mode.set('dashboard');
}

// ---------- Data ----------
export const data = writable<DashboardData>(buildData(START));

// ---------- Derived ----------
export const markers = derived(data, buildMarkers);

export const activeAlerts = derived(data, ($d) =>
  $d.alerts
    .filter((a) => a.active)
    .sort((a, b) =>
      STATUS[b.level].weight - STATUS[a.level].weight || b.at - a.at,
    ),
);

export const alertLog = derived(data, ($d) =>
  [...$d.alerts].sort((a, b) => b.at - a.at).slice(0, 40),
);

export const overallStatus = derived(markers, ($m) =>
  worst($m.map((x) => x.status)),
);

export const statusCounts = derived(markers, ($m) => {
  const c: Record<Siaga, number> = { normal: 0, waspada: 0, siaga: 0, awas: 0 };
  for (const m of $m) c[m.status]++;
  return c;
});

// ---------- Derived khusus Portal Hidrologi ----------
/** Pos Duga Air (TMA + debit sungai real-time) */
export const pdaList = derived(data, ($d) => $d.pos.filter((p) => p.tipe === 'duga-air'));
/** Pos Curah Hujan (PCH/ARR) */
export const pchList = derived(data, ($d) => $d.pos.filter((p) => p.tipe === 'hujan'));
/** Pos Kualitas Air (AWQR) */
export const kualitasList = derived(data, ($d) => $d.pos.filter((p) => p.tipe === 'kualitas'));
/** Pos Mata Air (ASDR) */
export const mataAirList = derived(data, ($d) => $d.pos.filter((p) => p.tipe === 'mata-air'));
/** Alert aktif terkait jaringan hidrologi (semua pos) */
export const hydroAlerts = derived(activeAlerts, ($a) => $a.filter((x) => x.kind === 'pos'));

// ---------- Marker assembly ----------
/** jenis instrumen telemetri unik pada sebuah aset (urutan kemunculan; indikator kesehatan dikecualikan) */
function instrTypes(insts: Instrument[]): string[] {
  return [...new Set(insts.filter((i) => i.category !== 'health').map((i) => i.type))];
}

/** akronim logger per tipe pos — dipakai sebagai jenis instrumen untuk filter peta */
const POS_LOGGER: Record<PosTipe, string> = {
  'duga-air': 'AWLR',
  hujan: 'ARR',
  klimatologi: 'AWS',
  kualitas: 'AWQR',
  'mata-air': 'ASDR',
};

function buildMarkers($d: DashboardData): MapMarker[] {
  const out: MapMarker[] = [];
  for (const p of $d.pos)
    out.push({
      id: p.id,
      name: p.name,
      kind: 'pos',
      lat: p.lat,
      lng: p.lng,
      status: p.status,
      primaryLabel: p.param.label,
      primaryValue: `${num(p.param.value, p.param.digits)} ${p.param.unit}`,
      instrumentTypes: [POS_LOGGER[p.tipe]],
    });
  for (const b of $d.bendungan)
    out.push({
      id: b.id,
      name: b.name,
      kind: 'bendungan',
      lat: b.lat,
      lng: b.lng,
      status: b.status,
      primaryLabel: 'Elevasi',
      primaryValue: `${num(b.elevasi, 2)} m`,
      instrumentTypes: instrTypes(b.instruments),
    });
  for (const d of $d.irigasi)
    out.push({
      id: d.id,
      name: d.name,
      kind: 'irigasi',
      lat: d.lat,
      lng: d.lng,
      status: d.status,
      primaryLabel: 'Pemenuhan',
      primaryValue: `${num(irigasiRatio(d) * 100, 0)}%`,
      instrumentTypes: instrTypes(d.instruments),
    });
  for (const s of $d.sumur)
    out.push({
      id: s.id,
      name: s.name,
      kind: 'sumur',
      lat: s.lat,
      lng: s.lng,
      status: s.status,
      primaryLabel: 'Muka air tanah',
      primaryValue: `${num(s.muka, 2)} m`,
      instrumentTypes: instrTypes(s.instruments),
    });
  for (const a of $d.op)
    out.push({
      id: a.id,
      name: a.name,
      kind: 'op',
      lat: a.lat,
      lng: a.lng,
      status: a.status,
      primaryLabel: 'Kondisi',
      primaryValue: `${num(a.kondisi, 0)}%`,
      instrumentTypes: instrTypes(a.instruments),
    });
  return out;
}

// ---------- Lookups ----------
export function lookup(ref: AssetRef | null) {
  if (!ref) return null;
  const $d = get(data);
  switch (ref.kind) {
    case 'pos':
      return $d.pos.find((x) => x.id === ref.id) ?? null;
    case 'bendungan':
      return $d.bendungan.find((x) => x.id === ref.id) ?? null;
    case 'irigasi':
      return $d.irigasi.find((x) => x.id === ref.id) ?? null;
    case 'sumur':
      return $d.sumur.find((x) => x.id === ref.id) ?? null;
    case 'op':
      return $d.op.find((x) => x.id === ref.id) ?? null;
  }
}

export function openDetail(kind: AssetKind, id: string) {
  selected.set({ kind, id });
}
export function closeDetail() {
  selected.set(null);
}

// ---------- Simulation ----------
const TICK_MS = 4000;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
function r2(v: number) {
  return Math.round(v * 100) / 100;
}
function nudge(v: number, vol: number, min: number, max: number, pullTo?: number) {
  let nv = v + (Math.random() - 0.5) * 2 * vol;
  if (pullTo !== undefined) nv += (pullTo - v) * 0.04;
  return clamp(r2(nv), min, max);
}

function tail(series: { t: number; v: number }[], v: number, now: number) {
  const next = series.slice(-47);
  next.push({ t: now, v: r2(v) });
  return next;
}

function tickInstruments(
  insts: Instrument[],
  primaryValue: number | undefined,
  now: number,
): Instrument[] {
  return insts.map((it) => {
    if (it.status !== 'online') return it; // alat offline/perawatan: nilai beku
    const isPct = it.unit.includes('%');
    const v =
      it.primary && primaryValue !== undefined
        ? primaryValue
        : nudge(
            it.value,
            Math.max(0.05, Math.abs(it.value) * 0.025),
            0,
            isPct ? 100 : 1_000_000,
          );
    return { ...it, value: r2(v), updatedAt: now, history: tail(it.history, v, now) };
  });
}

function alertMessage(kind: AssetKind, name: string, level: Siaga): string {
  if (kind === 'pos')
    return level === 'awas'
      ? `${name} — melampaui ambang (Awas)`
      : `${name} — status ${STATUS[level].label}`;
  if (kind === 'bendungan')
    return level === 'awas'
      ? `${name} — elevasi mencapai muka air banjir`
      : `${name} — elevasi waduk meningkat (${STATUS[level].label})`;
  if (kind === 'irigasi')
    return `${name} — debit saluran di bawah kebutuhan tanam`;
  if (kind === 'sumur') return `${name} — muka air tanah menurun`;
  return `${name} — kondisi aset perlu perhatian`;
}

let alertSeq = 0;
function reconcileAlert(
  alerts: AlertItem[],
  kind: AssetKind,
  id: string,
  name: string,
  prev: Siaga,
  next: Siaga,
  now: number,
) {
  const existing = alerts.find((a) => a.assetId === id && a.active);
  if (next === 'normal') {
    if (existing) existing.active = false;
    return;
  }
  if (!existing) {
    alerts.unshift({
      id: `al-${now}-${alertSeq++}`,
      level: next,
      kind,
      assetId: id,
      assetName: name,
      message: alertMessage(kind, name, next),
      at: now,
      active: true,
    });
  } else if (existing.level !== next) {
    existing.level = next;
    existing.message = alertMessage(kind, name, next);
    existing.at = now;
  }
}

function step(prev: DashboardData, now: number): DashboardData {
  const alerts = prev.alerts.map((a) => ({ ...a }));
  // occasional "rain event" to keep things alive
  const stormPos =
    Math.random() < 0.22
      ? prev.pos[Math.floor(Math.random() * prev.pos.length)].id
      : null;

  const pos = prev.pos.map((p) => {
    const storm = p.id === stormPos ? 0.5 : 0;
    const cur = p.param.value;
    // nudge parameter utama sesuai tipe
    const nextPrimary =
      p.tipe === 'duga-air'
        ? nudge(cur + storm, 0.07, 0.2, 5.2, (p.thresholds?.waspada ?? 2.5) - 0.6)
        : p.tipe === 'hujan'
          ? nudge(cur + (storm ? 8 : 0), 2.5, 0, 120, 2)
          : p.tipe === 'klimatologi'
            ? nudge(cur, 0.4, 18, 36)
            : p.tipe === 'mata-air'
              ? nudge(cur, 0.25, 0.5, 60) // debit mata air (l/dt) — bergerak lambat
              : nudge(cur, 0.05, 5.5, 9); // kualitas: pH
    const instruments = tickInstruments(p.instruments, nextPrimary, now);
    const prim = instruments.find((i) => i.primary) ?? instruments[0];
    const np = {
      ...p,
      param: { ...p.param, value: prim.value },
      history: prim.history,
      debit:
        p.debit !== undefined
          ? r2(nudge(p.debit * (nextPrimary / (cur || 1)), 4, 5, 600))
          : undefined,
      updatedAt: now,
      instruments,
    };
    np.status = posStatus(np);
    reconcileAlert(alerts, 'pos', p.id, p.name, p.status, np.status, now);
    return np;
  });

  const bendungan = prev.bendungan.map((b) => {
    const inflow = nudge(b.inflow, b.inflow * 0.05 + 1, 2, b.inflow * 3);
    const elevasi = nudge(
      b.elevasi,
      0.06,
      b.elevasiNormal - 3,
      b.elevasiBanjir + 0.6,
      b.elevasiNormal + (b.elevasi - b.elevasiNormal) * 0.9,
    );
    const nb = {
      ...b,
      inflow: r2(inflow),
      outflow: r2(nudge(b.outflow, 2, 0, inflow + 20)),
      elevasi,
      updatedAt: now,
      historyElevasi: tail(b.historyElevasi, elevasi, now),
      historyInflow: tail(b.historyInflow, inflow, now),
      instruments: tickInstruments(b.instruments, elevasi, now),
    };
    nb.status = bendunganStatus(nb);
    reconcileAlert(alerts, 'bendungan', b.id, b.name, b.status, nb.status, now);
    return nb;
  });

  const irigasi = prev.irigasi.map((d) => {
    const debit = nudge(d.debit, 0.3, 1, d.kebutuhan * 1.3, d.kebutuhan * 0.95);
    const nd = {
      ...d,
      debit,
      updatedAt: now,
      historyDebit: tail(d.historyDebit, debit, now),
      instruments: tickInstruments(d.instruments, debit, now),
    };
    nd.status = irigasiStatus(nd);
    reconcileAlert(alerts, 'irigasi', d.id, d.name, d.status, nd.status, now);
    return nd;
  });

  const sumur = prev.sumur.map((s) => {
    const muka = nudge(s.muka, 0.05, 3, 14, s.baseline + (s.muka - s.baseline) * 0.97);
    const ns = {
      ...s,
      muka,
      updatedAt: now,
      history: tail(s.history, muka, now),
      instruments: tickInstruments(s.instruments, muka, now),
    };
    ns.status = sumurStatus(ns);
    reconcileAlert(alerts, 'sumur', s.id, s.name, s.status, ns.status, now);
    return ns;
  });

  const op = prev.op.map((a) => ({
    ...a,
    instruments: tickInstruments(a.instruments, a.kondisi, now),
  }));

  return {
    pos,
    bendungan,
    irigasi,
    sumur,
    op,
    alerts: alerts.slice(0, 50),
  };
}

export function startSimulation() {
  const clockId = setInterval(() => clock.set(Date.now()), 1000);
  const tickId = setInterval(() => {
    if (get(paused)) return;
    const now = Date.now();
    data.update((d) => step(d, now));
  }, TICK_MS);
  return () => {
    clearInterval(clockId);
    clearInterval(tickId);
  };
}
