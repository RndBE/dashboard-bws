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
