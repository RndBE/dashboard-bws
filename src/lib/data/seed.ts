// Dataset awal — Wilayah Sungai fiktif (koordinat area Banten–Jabar agar peta nyata)
import type {
  Bendungan,
  DaerahIrigasi,
  DashboardData,
  Instrument,
  InstrumentStatus,
  PosHidrologi,
  SeriesPoint,
  SumurPantau,
  AsetOP,
} from '../types';
import {
  bendunganStatus,
  irigasiStatus,
  opStatus,
  posStatus,
  sumurStatus,
} from './derive';

export const WS_NAME = 'Wilayah Sungai Cidanau–Cigaru';
export const BALAI_NAME = 'Balai Wilayah Sungai Nusa Barat';
export const MAP_CENTER: [number, number] = [-6.48, 106.16];
export const MAP_ZOOM = 10;

/** jumlah titik histori & jarak antar titik (1 jam) */
export const HIST_LEN = 48;
export const HIST_STEP = 60 * 60 * 1000;

function round(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/** Deret waktu yang berakhir tepat di nilai `end`, naik ±amp sepanjang jendela. */
function genSeries(
  end: number,
  amp: number,
  noise: number,
  now: number,
  min = 0,
): SeriesPoint[] {
  const start = end - amp;
  const pts: SeriesPoint[] = [];
  for (let i = 0; i < HIST_LEN; i++) {
    const k = i / (HIST_LEN - 1);
    const trend = start + (end - start) * k;
    const wob = Math.sin(k * Math.PI * 6) * amp * 0.16;
    const n = (Math.random() - 0.5) * 2 * noise;
    let v = trend + wob + n;
    if (i === HIST_LEN - 1) v = end;
    pts.push({ t: now - (HIST_LEN - 1 - i) * HIST_STEP, v: Math.max(min, round(v)) });
  }
  return pts;
}

/** deret hujan: kebanyakan kecil, sesekali memuncak */
function genRain(now: number): SeriesPoint[] {
  const pts: SeriesPoint[] = [];
  for (let i = 0; i < HIST_LEN; i++) {
    const burst = Math.random() < 0.18 ? Math.random() * 22 : 0;
    const base = Math.random() * 3;
    pts.push({
      t: now - (HIST_LEN - 1 - i) * HIST_STEP,
      v: round(base + burst, 1),
    });
  }
  return pts;
}

// ---------- Instrumen / alat ukur per aset ----------
let instSeq = 0;

function inst(
  ownerId: string,
  type: string,
  name: string,
  value: number,
  unit: string,
  now: number,
  opts: {
    primary?: boolean;
    digits?: number;
    amp?: number;
    noise?: number;
    min?: number;
    status?: InstrumentStatus;
  } = {},
): Instrument {
  const digits = opts.digits ?? 1;
  const amp = opts.amp ?? Math.max(0.3, Math.abs(value) * 0.1);
  const noise = opts.noise ?? Math.max(0.05, Math.abs(value) * 0.03);
  const status = opts.status ?? 'online';
  return {
    id: `${ownerId}-${type.toLowerCase().replace(/[^a-z0-9]+/g, '')}-${instSeq++}`,
    name,
    type,
    status,
    value: round(value, digits),
    unit,
    updatedAt:
      status === 'offline'
        ? now - (2 + Math.random() * 10) * 3_600_000
        : now - Math.floor(Math.random() * 150_000),
    history: genSeries(value, amp, noise, now, opts.min ?? 0),
    primary: opts.primary,
    valueDigits: digits,
  };
}

/** sesekali ada alat non-utama yang offline / perawatan (realistis) */
function withFault(list: Instrument[]): Instrument[] {
  const idx = list.map((x, i) => (x.primary ? -1 : i)).filter((i) => i >= 0);
  if (idx.length && Math.random() < 0.4) {
    const pick = idx[Math.floor(Math.random() * idx.length)];
    list[pick] = {
      ...list[pick],
      status: Math.random() < 0.5 ? 'offline' : 'maintenance',
    };
  }
  return list;
}

function posInstruments(p: { id: string; tma: number; hujan: number }, now: number): Instrument[] {
  return withFault([
    inst(p.id, 'AWLR', 'AWLR — Pencatat TMA Otomatis', p.tma, 'm', now, { primary: true, digits: 2, amp: 1.6, noise: 0.12 }),
    inst(p.id, 'ARR', 'ARR — Pencatat Hujan Otomatis', p.hujan, 'mm', now, { digits: 1, amp: 10, noise: 3, min: 0 }),
    inst(p.id, 'Papan Duga', 'Papan Duga Air (manual)', p.tma, 'm', now, { digits: 2, amp: 1.5, noise: 0.1 }),
    inst(p.id, 'Telemetri', 'Stasiun Telemetri', 88 + Math.random() * 10, '%', now, { digits: 0, amp: 6, noise: 2, min: 0 }),
    inst(p.id, 'Panel Surya', 'Catu Daya Surya', 80 + Math.random() * 18, '%', now, { digits: 0, amp: 12, noise: 3, min: 0 }),
  ]);
}

function bendunganInstruments(
  b: { id: string; elevasi: number; gates: { opening: number }[] },
  now: number,
): Instrument[] {
  const avgGate = b.gates.reduce((s, g) => s + g.opening, 0) / b.gates.length;
  return withFault([
    inst(b.id, 'AWLR', 'AWLR — Elevasi Waduk', b.elevasi, 'mdpl', now, { primary: true, digits: 2, amp: 1.4, noise: 0.08, min: b.elevasi - 6 }),
    inst(b.id, 'ARR', 'ARR — Pencatat Hujan', 6 + Math.random() * 16, 'mm', now, { digits: 1, amp: 10, noise: 3, min: 0 }),
    inst(b.id, 'Piezometer', 'Piezometer — Tekanan Pori', 4 + Math.random() * 6, 'm', now, { digits: 2, amp: 0.6, noise: 0.15 }),
    inst(b.id, 'V-Notch', 'V-Notch — Rembesan', 1.5 + Math.random() * 5, 'l/dt', now, { digits: 2, amp: 0.8, noise: 0.2, min: 0 }),
    inst(b.id, 'Inklinometer', 'Inklinometer — Deformasi', 0.5 + Math.random() * 3, 'mm', now, { digits: 2, amp: 0.4, noise: 0.1, min: 0 }),
    inst(b.id, 'Sensor Pintu', 'Sensor Bukaan Spillway', avgGate, '%', now, { digits: 0, amp: 8, noise: 2, min: 0 }),
    inst(b.id, 'CCTV', 'CCTV — Pemantau Bendungan', 96 + Math.random() * 4, '% uptime', now, { digits: 0, amp: 2, noise: 1, min: 0 }),
  ]);
}

function irigasiInstruments(
  d: { id: string; debit: number; pintu: { opening: number }[] },
  now: number,
): Instrument[] {
  const avg = d.pintu.reduce((s, g) => s + g.opening, 0) / d.pintu.length;
  return withFault([
    inst(d.id, 'AWLR', 'AWLR — Debit Saluran', d.debit, 'm³/s', now, { primary: true, digits: 1, amp: d.debit * 0.3 + 1, noise: d.debit * 0.05 + 0.2, min: 0 }),
    inst(d.id, 'Sensor Pintu', 'Sensor Bukaan Pintu', avg, '%', now, { digits: 0, amp: 8, noise: 2, min: 0 }),
    inst(d.id, 'Telemetri', 'Stasiun Telemetri', 85 + Math.random() * 12, '%', now, { digits: 0, amp: 6, noise: 2, min: 0 }),
  ]);
}

function sumurInstruments(s: { id: string; muka: number }, now: number): Instrument[] {
  return withFault([
    inst(s.id, 'Water Level Logger', 'Logger Muka Air Tanah', s.muka, 'm', now, { primary: true, digits: 2, amp: 1.2, noise: 0.1, min: 0 }),
    inst(s.id, 'Telemetri', 'Datalogger Telemetri', 82 + Math.random() * 14, '%', now, { digits: 0, amp: 6, noise: 2, min: 0 }),
  ]);
}

function opInstruments(
  a: { id: string; jenis: string; kondisi: number },
  now: number,
): Instrument[] {
  const list = [
    inst(a.id, 'Sensor Kondisi', 'Sensor Pemantau Kondisi', a.kondisi, '%', now, { primary: true, digits: 0, amp: 4, noise: 1, min: 0 }),
    inst(a.id, 'CCTV', 'CCTV — Pemantau Aset', 95 + Math.random() * 5, '% uptime', now, { digits: 0, amp: 2, noise: 1, min: 0 }),
  ];
  if (a.jenis === 'Pompa Banjir')
    list.push(inst(a.id, 'Panel Kontrol', 'Panel Kontrol Pompa', 60 + Math.random() * 40, '% beban', now, { digits: 0, amp: 15, noise: 4, min: 0 }));
  else if (a.jenis === 'Pintu Air')
    list.push(inst(a.id, 'Sensor Pintu', 'Sensor Bukaan Pintu', 40 + Math.random() * 50, '%', now, { digits: 0, amp: 10, noise: 3, min: 0 }));
  else if (a.jenis === 'Tanggul')
    list.push(inst(a.id, 'Settlement', 'Patok Settlement', 0.5 + Math.random() * 4, 'mm', now, { digits: 2, amp: 0.3, noise: 0.1, min: 0 }));
  else
    list.push(inst(a.id, 'AWLR', 'AWLR — Muka Air', 1 + Math.random() * 3, 'm', now, { digits: 2, amp: 1, noise: 0.1, min: 0 }));
  return withFault(list);
}

export function buildData(now: number): DashboardData {
  // ----- Pos Duga Air / Hidrologi -----
  const posSeed: Array<
    Omit<
      PosHidrologi,
      'status' | 'historyTMA' | 'historyHujan' | 'updatedAt' | 'instruments'
    >
  > = [
    {
      id: 'pos-cisanti',
      name: 'Pos Cisanti (Hulu)',
      river: 'S. Cigaru',
      lat: -6.305,
      lng: 105.985,
      tma: 1.42,
      debit: 38,
      hujan: 4,
      thresholds: { waspada: 2.2, siaga: 3.0, awas: 3.8 },
    },
    {
      id: 'pos-citarik',
      name: 'Pos Citarik',
      river: 'S. Citarik',
      lat: -6.41,
      lng: 106.1,
      tma: 2.05,
      debit: 96,
      hujan: 11,
      thresholds: { waspada: 2.4, siaga: 3.2, awas: 4.0 },
    },
    {
      id: 'pos-cigaru-tengah',
      name: 'Pos Cigaru Tengah',
      river: 'S. Cigaru',
      lat: -6.5,
      lng: 106.2,
      tma: 2.62,
      debit: 188,
      hujan: 18,
      thresholds: { waspada: 2.5, siaga: 3.3, awas: 4.1 },
    },
    {
      id: 'pos-cikawung',
      name: 'Pos Cikawung',
      river: 'S. Cikawung',
      lat: -6.462,
      lng: 106.33,
      tma: 1.88,
      debit: 74,
      hujan: 6,
      thresholds: { waspada: 2.3, siaga: 3.1, awas: 3.9 },
    },
    {
      id: 'pos-hilir-muara',
      name: 'Pos Duga Air Hilir',
      river: 'S. Cigaru',
      lat: -6.62,
      lng: 106.12,
      tma: 4.18,
      debit: 312,
      hujan: 27,
      thresholds: { waspada: 2.6, siaga: 3.4, awas: 4.0 },
    },
    {
      id: 'pos-cidurian',
      name: 'Pos Cidurian',
      river: 'S. Cidurian',
      lat: -6.38,
      lng: 106.25,
      tma: 1.66,
      debit: 58,
      hujan: 3,
      thresholds: { waspada: 2.2, siaga: 3.0, awas: 3.8 },
    },
  ];

  const pos: PosHidrologi[] = posSeed.map((p) => ({
    ...p,
    status: posStatus(p),
    updatedAt: now - Math.floor(Math.random() * 90_000),
    historyTMA: genSeries(p.tma, 1.6, 0.12, now, 0),
    historyHujan: genRain(now),
    instruments: posInstruments(p, now),
  }));

  // ----- Bendungan -----
  const bendSeed: Array<
    Omit<
      Bendungan,
      | 'status'
      | 'historyElevasi'
      | 'historyInflow'
      | 'updatedAt'
      | 'instruments'
    >
  > = [
    {
      id: 'bend-cigaru',
      name: 'Bendungan Cigaru',
      river: 'S. Cigaru',
      lat: -6.52,
      lng: 106.18,
      elevasi: 187.4,
      elevasiNormal: 184.0,
      elevasiBanjir: 188.5,
      volume: 142.8,
      kapasitas: 168.0,
      inflow: 96,
      outflow: 71,
      gates: [
        { id: 'P1', opening: 35 },
        { id: 'P2', opening: 20 },
        { id: 'P3', opening: 0 },
      ],
    },
    {
      id: 'bend-sindangheula',
      name: 'Bendungan Sindangheula',
      river: 'S. Cibanten',
      lat: -6.35,
      lng: 106.05,
      elevasi: 96.2,
      elevasiNormal: 95.0,
      elevasiBanjir: 100.0,
      volume: 7.9,
      kapasitas: 9.3,
      inflow: 14,
      outflow: 12,
      gates: [
        { id: 'P1', opening: 10 },
        { id: 'P2', opening: 0 },
      ],
    },
    {
      id: 'bend-cipanunjang',
      name: 'Waduk Cipanunjang',
      river: 'S. Cikawung',
      lat: -6.58,
      lng: 106.285,
      elevasi: 271.0,
      elevasiNormal: 270.0,
      elevasiBanjir: 276.0,
      volume: 21.3,
      kapasitas: 28.0,
      inflow: 31,
      outflow: 26,
      gates: [
        { id: 'P1', opening: 5 },
        { id: 'P2', opening: 0 },
      ],
    },
  ];

  const bendungan: Bendungan[] = bendSeed.map((b) => ({
    ...b,
    status: bendunganStatus(b),
    updatedAt: now - Math.floor(Math.random() * 120_000),
    historyElevasi: genSeries(b.elevasi, 1.4, 0.08, now, b.elevasiNormal - 3),
    historyInflow: genSeries(b.inflow, b.inflow * 0.5, b.inflow * 0.06, now, 0),
    instruments: bendunganInstruments(b, now),
  }));

  // ----- Daerah Irigasi -----
  const irSeed: Array<
    Omit<
      DaerahIrigasi,
      'status' | 'historyDebit' | 'updatedAt' | 'instruments'
    >
  > = [
    {
      id: 'di-cikawung',
      name: 'DI Cikawung',
      lat: -6.47,
      lng: 106.345,
      luas: 12450,
      layanan: 9800,
      debit: 7.4,
      kebutuhan: 11.2,
      polaTanam: 'Padi–Padi–Palawija',
      pintu: [
        { id: 'BCk-1', opening: 70 },
        { id: 'BCk-2', opening: 55 },
      ],
    },
    {
      id: 'di-cidurian',
      name: 'DI Cidurian',
      lat: -6.41,
      lng: 106.225,
      luas: 8600,
      layanan: 7900,
      debit: 9.1,
      kebutuhan: 10.0,
      polaTanam: 'Padi–Padi–Bera',
      pintu: [
        { id: 'BCd-1', opening: 80 },
        { id: 'BCd-2', opening: 65 },
      ],
    },
    {
      id: 'di-ciujung',
      name: 'DI Ciujung Hilir',
      lat: -6.6,
      lng: 106.155,
      luas: 23800,
      layanan: 22100,
      debit: 19.6,
      kebutuhan: 20.4,
      polaTanam: 'Padi–Padi–Padi',
      pintu: [
        { id: 'BCu-1', opening: 85 },
        { id: 'BCu-2', opening: 75 },
        { id: 'BCu-3', opening: 60 },
      ],
    },
  ];

  const irigasi: DaerahIrigasi[] = irSeed.map((d) => ({
    ...d,
    status: irigasiStatus(d),
    updatedAt: now - Math.floor(Math.random() * 150_000),
    historyDebit: genSeries(d.debit, d.kebutuhan * 0.3, d.kebutuhan * 0.04, now, 0),
    instruments: irigasiInstruments(d, now),
  }));

  // ----- Sumur Pantau (muka air tanah) -----
  const sumurSeed: Array<
    Omit<SumurPantau, 'status' | 'history' | 'updatedAt' | 'instruments'>
  > = [
    {
      id: 'sp-cibadak',
      name: 'SP Cibadak',
      lat: -6.44,
      lng: 106.16,
      muka: 6.4,
      baseline: 5.8,
      thresholds: { waspada: 1.5, siaga: 3.0, awas: 4.5 },
    },
    {
      id: 'sp-rangkas',
      name: 'SP Rangkasbitung',
      lat: -6.55,
      lng: 106.1,
      muka: 9.8,
      baseline: 6.2,
      thresholds: { waspada: 1.5, siaga: 3.0, awas: 4.5 },
    },
    {
      id: 'sp-pandeglang',
      name: 'SP Pandeglang',
      lat: -6.62,
      lng: 106.22,
      muka: 7.1,
      baseline: 6.5,
      thresholds: { waspada: 1.5, siaga: 3.0, awas: 4.5 },
    },
    {
      id: 'sp-serang',
      name: 'SP Serang',
      lat: -6.36,
      lng: 106.14,
      muka: 8.0,
      baseline: 6.0,
      thresholds: { waspada: 1.5, siaga: 3.0, awas: 4.5 },
    },
  ];

  const sumur: SumurPantau[] = sumurSeed.map((s) => ({
    ...s,
    status: sumurStatus(s),
    updatedAt: now - Math.floor(Math.random() * 200_000),
    history: genSeries(s.muka, 1.2, 0.1, now, 0),
    instruments: sumurInstruments(s, now),
  }));

  // ----- Aset O&P -----
  const opSeed: Array<Omit<AsetOP, 'status' | 'instruments'>> = [
    {
      id: 'op-tanggul-ciujung',
      name: 'Tanggul Ciujung',
      jenis: 'Tanggul',
      lat: -6.585,
      lng: 106.14,
      kondisi: 64,
      progres: 42,
      inspeksi: now - 3 * 86_400_000,
    },
    {
      id: 'op-bendung-pamarayan',
      name: 'Bendung Pamarayan',
      jenis: 'Bendung',
      lat: -6.49,
      lng: 106.13,
      kondisi: 88,
      progres: 100,
      inspeksi: now - 9 * 86_400_000,
    },
    {
      id: 'op-pintu-kragilan',
      name: 'Pintu Air Kragilan',
      jenis: 'Pintu Air',
      lat: -6.53,
      lng: 106.205,
      kondisi: 76,
      progres: 68,
      inspeksi: now - 5 * 86_400_000,
    },
    {
      id: 'op-pompa-hilir',
      name: 'Rumah Pompa Hilir',
      jenis: 'Pompa Banjir',
      lat: -6.63,
      lng: 106.165,
      kondisi: 81,
      progres: 90,
      inspeksi: now - 2 * 86_400_000,
    },
  ];

  const op: AsetOP[] = opSeed.map((a) => ({
    ...a,
    status: opStatus(a),
    instruments: opInstruments(a, now),
  }));

  return { pos, bendungan, irigasi, sumur, op, alerts: [] };
}
