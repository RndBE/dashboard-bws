// Helper analitik untuk halaman Analisa Data
// — agregasi deret waktu, statistik ringkas, korelasi, dan ekspor.

import type { SeriesPoint } from './types';

export type CategoryKey = 'pos' | 'bendungan' | 'irigasi' | 'sumur';

/** Definisi parameter yang bisa dianalisa untuk tiap kategori aset. */
export interface ParamDef {
  /** kunci unik per kategori */
  key: string;
  /** label tampil */
  label: string;
  unit: string;
  /** jumlah desimal yang lazim */
  digits: number;
  /** warna garis default */
  color: string;
  /** arah yang dianggap "buruk" untuk pewarnaan delta */
  badWhen: 'up' | 'down' | 'none';
  /** nilai dasar Y dipaksa 0 (mis. hujan, debit) */
  zeroBased?: boolean;
}

/** Fungsi agregasi antar-titik dalam satu bucket. */
export type AggMode = 'avg' | 'sum' | 'max' | 'min';

export interface IntervalDef {
  key: string;
  label: string;
  /** jumlah titik histori mentah per bucket (histori = 1 titik / jam) */
  bucket: number;
  /** agregasi default untuk interval ini */
  agg: AggMode;
}

/** Rentang waktu (berapa jam terakhir dari histori, histori = 1 titik/jam). */
export interface RangeDef {
  key: string;
  label: string;
  hours: number;
}

export const RANGES: RangeDef[] = [
  { key: '6', label: '6 jam', hours: 6 },
  { key: '12', label: '12 jam', hours: 12 },
  { key: '24', label: '24 jam', hours: 24 },
  { key: '48', label: '48 jam', hours: 48 },
];

export const INTERVALS: IntervalDef[] = [
  { key: 'raw', label: 'Per jam', bucket: 1, agg: 'avg' },
  { key: '3h', label: 'Per 3 jam', bucket: 3, agg: 'avg' },
  { key: '6h', label: 'Per 6 jam', bucket: 6, agg: 'avg' },
  { key: '12h', label: 'Per 12 jam', bucket: 12, agg: 'avg' },
];

export const AGG_LABEL: Record<AggMode, string> = {
  avg: 'Rata-rata',
  sum: 'Jumlah',
  max: 'Maksimum',
  min: 'Minimum',
};

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  pos: 'Pos Duga Air',
  bendungan: 'Bendungan',
  irigasi: 'Daerah Irigasi',
  sumur: 'Sumur Pantau',
};

// ---------- Statistik ----------
export interface SeriesStats {
  min: number;
  max: number;
  avg: number;
  /** simpangan baku populasi */
  std: number;
  /** nilai terkini (titik terakhir) */
  last: number;
  /** nilai awal jendela */
  first: number;
  /** perubahan absolut last - first */
  delta: number;
  /** laju per jam (delta / jam) */
  rate: number;
  /** jumlah titik */
  n: number;
}

export function computeStats(vals: number[], hours = vals.length): SeriesStats {
  if (!vals.length) {
    return { min: 0, max: 0, avg: 0, std: 0, last: 0, first: 0, delta: 0, rate: 0, n: 0 };
  }
  let min = vals[0];
  let max = vals[0];
  let sum = 0;
  for (const v of vals) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  const avg = sum / vals.length;
  let sq = 0;
  for (const v of vals) sq += (v - avg) ** 2;
  const std = Math.sqrt(sq / vals.length);
  const last = vals[vals.length - 1];
  const first = vals[0];
  const delta = last - first;
  const rate = hours > 0 ? delta / hours : 0;
  return { min, max, avg, std, last, first, delta, rate, n: vals.length };
}

/** Pearson correlation antara dua deret sama panjang. */
export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    sa += a[i];
    sb += b[i];
  }
  const ma = sa / n;
  const mb = sb / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

/** Ambil N jam terakhir dari deret histori (1 titik/jam). */
export function takeRange(series: SeriesPoint[], hours: number): SeriesPoint[] {
  return series.slice(-hours);
}

/**
 * Agregasi deret ke bucket. bucket=1 mengembalikan deret apa adanya.
 * Stempel waktu bucket memakai titik terakhir dalam bucket.
 */
export function aggregate(
  series: SeriesPoint[],
  bucket: number,
  agg: AggMode,
): SeriesPoint[] {
  if (bucket <= 1 || series.length <= 1) return series;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < series.length; i += bucket) {
    const slice = series.slice(i, i + bucket);
    if (!slice.length) continue;
    const vals = slice.map((p) => p.v);
    let v: number;
    switch (agg) {
      case 'sum':
        v = vals.reduce((s, x) => s + x, 0);
        break;
      case 'max':
        v = Math.max(...vals);
        break;
      case 'min':
        v = Math.min(...vals);
        break;
      default:
        v = vals.reduce((s, x) => s + x, 0) / vals.length;
    }
    out.push({ t: slice[slice.length - 1].t, v: Math.round(v * 100) / 100 });
  }
  return out;
}

/** Rentang + agregasi sekaligus. */
export function prepare(
  series: SeriesPoint[],
  hours: number,
  bucket: number,
  agg: AggMode,
): SeriesPoint[] {
  return aggregate(takeRange(series, hours), bucket, agg);
}

// ---------- Parameter per kategori ----------
// Hanya parameter yang punya deret histori yang dapat dianalisa lewat grafik tren.
export const PARAMS: Record<CategoryKey, ParamDef[]> = {
  pos: [
    { key: 'tma', label: 'TMA · Pos Duga Air', unit: 'm', digits: 2, color: '#4f9bee', badWhen: 'up' },
    { key: 'hujan', label: 'Curah Hujan · Pos Hujan', unit: 'mm', digits: 1, color: '#c9a227', badWhen: 'up', zeroBased: true },
    { key: 'suhu', label: 'Suhu Udara · Klimatologi', unit: '°C', digits: 1, color: '#e08a4f', badWhen: 'none' },
    { key: 'ph', label: 'pH · Kualitas Air', unit: 'pH', digits: 1, color: '#7c5cff', badWhen: 'none' },
    { key: 'debit-ma', label: 'Debit · Mata Air', unit: 'l/dt', digits: 1, color: '#3fb27f', badWhen: 'down', zeroBased: true },
  ],
  bendungan: [
    { key: 'elevasi', label: 'Elevasi Waduk', unit: 'mdpl', digits: 2, color: '#4f9bee', badWhen: 'up' },
    { key: 'inflow', label: 'Inflow', unit: 'm³/s', digits: 0, color: '#3fb27f', badWhen: 'none', zeroBased: true },
  ],
  irigasi: [
    { key: 'debit', label: 'Debit Saluran', unit: 'm³/s', digits: 1, color: '#4f9bee', badWhen: 'down', zeroBased: true },
  ],
  sumur: [
    { key: 'muka', label: 'Muka Air Tanah', unit: 'm', digits: 2, color: '#c9a227', badWhen: 'up' },
  ],
};

// ---------- Ekspor CSV ----------
/** Susun CSV dari beberapa deret yang sudah disiapkan (asumsi t selaras per indeks). */
export function toCSV(
  cols: { name: string; series: SeriesPoint[] }[],
  digits = 2,
): string {
  if (!cols.length) return '';
  const n = Math.max(...cols.map((c) => c.series.length));
  const head = ['waktu', ...cols.map((c) => c.name)].join(',');
  const lines: string[] = [head];
  for (let i = 0; i < n; i++) {
    const t = cols[0].series[i]?.t ?? cols.find((c) => c.series[i])?.series[i]?.t;
    const iso = t ? new Date(t).toISOString() : '';
    const row = [iso];
    for (const c of cols) {
      const v = c.series[i]?.v;
      row.push(v === undefined ? '' : v.toFixed(digits));
    }
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Palet untuk multi-series ----------
export const SERIES_PALETTE = [
  '#4f9bee',
  '#f0b429',
  '#3fb27f',
  '#e08a3c',
  '#a78bfa',
  '#f472b6',
];
