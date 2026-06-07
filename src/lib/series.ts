import type { SeriesPoint } from './types';

export function values(s: SeriesPoint[]): number[] {
  return s.map((p) => p.v);
}

export function avgSeries(list: SeriesPoint[][]): number[] {
  if (!list.length) return [];
  const n = Math.min(...list.map((a) => a.length));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (const arr of list) sum += arr[i].v;
    out.push(sum / list.length);
  }
  return out;
}

export function sumSeries(list: SeriesPoint[][]): number[] {
  if (!list.length) return [];
  const n = Math.min(...list.map((a) => a.length));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (const arr of list) sum += arr[i].v;
    out.push(sum);
  }
  return out;
}

/** selisih nilai terakhir vs ~6 langkah lalu (tren jangka pendek) */
export function shortDelta(s: SeriesPoint[], back = 6): number {
  if (s.length < 2) return 0;
  const last = s[s.length - 1].v;
  const prev = s[Math.max(0, s.length - 1 - back)].v;
  return last - prev;
}

export function deltaArr(a: number[], back = 6): number {
  if (a.length < 2) return 0;
  return a[a.length - 1] - a[Math.max(0, a.length - 1 - back)];
}

export function lastN<T>(a: T[], n: number): T[] {
  return a.slice(-n);
}

/**
 * Bangun path SVG kurva mulus (spline Catmull-Rom → Bézier kubik)
 * dari daftar titik [x, y]. `tension` 0..1 (default 0.5) mengatur kelengkungan.
 * Mengembalikan string `d` yang siap dipakai pada <path>.
 */
export function splinePath(
  pts: ReadonlyArray<readonly [number, number]>,
  tension = 0.5,
): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0][0]} ${pts[0][1]}`;
  if (n === 2) return `M${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]}`;

  const k = tension / 6;
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < n ? i + 2 : n - 1];
    const c1x = p1[0] + (p2[0] - p0[0]) * k;
    const c1y = p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[0] - (p3[0] - p1[0]) * k;
    const c2y = p2[1] - (p3[1] - p1[1]) * k;
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

export function stats(a: number[]): { min: number; max: number; avg: number } {
  if (!a.length) return { min: 0, max: 0, avg: 0 };
  let min = a[0];
  let max = a[0];
  let sum = 0;
  for (const v of a) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, avg: sum / a.length };
}
