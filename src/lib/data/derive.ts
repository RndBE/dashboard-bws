// Turunan status siaga dari nilai metrik tiap jenis aset
import type {
  Bendungan,
  DaerahIrigasi,
  Instrument,
  PosHidrologi,
  Siaga,
  SumurPantau,
  AsetOP,
} from '../types';
import { siagaFromRising } from '../status';

const SIAGA_ORDER: Siaga[] = ['normal', 'waspada', 'siaga', 'awas'];

function readVal(insts: Instrument[], type: string): number | undefined {
  return insts.find((i) => i.type === type)?.value;
}

/** status mutu air pos kualitas (pH, DO, kekeruhan) → dipetakan ke skema siaga */
export function kualitasStatus(insts: Instrument[]): Siaga {
  let level = 0;
  const ph = readVal(insts, 'pH');
  if (ph !== undefined) {
    const dev = Math.max(0, 6.5 - ph, ph - 8.5);
    level = Math.max(level, dev > 1.5 ? 3 : dev > 0.8 ? 2 : dev > 0.3 ? 1 : 0);
  }
  const dox = readVal(insts, 'DO');
  if (dox !== undefined) level = Math.max(level, dox < 2 ? 3 : dox < 3 ? 2 : dox < 4 ? 1 : 0);
  const ntu = readVal(insts, 'Kekeruhan');
  if (ntu !== undefined) level = Math.max(level, ntu > 100 ? 3 : ntu > 50 ? 2 : ntu > 25 ? 1 : 0);
  return SIAGA_ORDER[level];
}

/**
 * Status mata air berdasarkan debit (l/dt). Berbeda dari pos lain: debit
 * RENDAH yang berbahaya (kekeringan/penurunan kapasitas akuifer), sehingga
 * ambang dibaca menurun — makin kecil debit makin gawat.
 */
export function mataAirStatus(
  debit: number,
  t: { waspada: number; siaga: number; awas: number },
): Siaga {
  if (debit <= t.awas) return 'awas';
  if (debit <= t.siaga) return 'siaga';
  if (debit <= t.waspada) return 'waspada';
  return 'normal';
}

export function posStatus(
  p: Pick<PosHidrologi, 'tipe' | 'param' | 'thresholds' | 'instruments'>,
): Siaga {
  switch (p.tipe) {
    case 'duga-air':
    case 'hujan':
      return p.thresholds ? siagaFromRising(p.param.value, p.thresholds) : 'normal';
    case 'kualitas':
      return kualitasStatus(p.instruments);
    case 'mata-air':
      return p.thresholds ? mataAirStatus(p.param.value, p.thresholds) : 'normal';
    case 'klimatologi':
    default:
      return 'normal';
  }
}

export function bendunganStatus(
  b: Pick<Bendungan, 'elevasi' | 'elevasiNormal' | 'elevasiBanjir'>,
): Siaga {
  const span = b.elevasiBanjir - b.elevasiNormal;
  const over = b.elevasi - b.elevasiNormal;
  const r = span > 0 ? over / span : 0;
  if (r >= 1) return 'awas';
  if (r >= 0.75) return 'siaga';
  if (r >= 0.45) return 'waspada';
  return 'normal';
}

export function irigasiStatus(
  d: Pick<DaerahIrigasi, 'debit' | 'kebutuhan'>,
): Siaga {
  const r = d.kebutuhan > 0 ? d.debit / d.kebutuhan : 1;
  if (r < 0.6) return 'awas';
  if (r < 0.75) return 'siaga';
  if (r < 0.9) return 'waspada';
  return 'normal';
}

export function sumurStatus(
  s: Pick<SumurPantau, 'muka' | 'baseline' | 'thresholds'>,
): Siaga {
  // drawdown = penurunan muka air tanah di bawah baseline (meter)
  const drawdown = s.muka - s.baseline;
  return siagaFromRising(drawdown, s.thresholds);
}

export function opStatus(a: Pick<AsetOP, 'kondisi'>): Siaga {
  if (a.kondisi < 55) return 'awas';
  if (a.kondisi < 70) return 'siaga';
  if (a.kondisi < 82) return 'waspada';
  return 'normal';
}

/** rasio pemenuhan air irigasi (0–1+) */
export function irigasiRatio(d: Pick<DaerahIrigasi, 'debit' | 'kebutuhan'>) {
  return d.kebutuhan > 0 ? d.debit / d.kebutuhan : 1;
}
