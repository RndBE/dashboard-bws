// Turunan status siaga dari nilai metrik tiap jenis aset
import type {
  Bendungan,
  DaerahIrigasi,
  PosHidrologi,
  Siaga,
  SumurPantau,
  AsetOP,
} from '../types';
import { siagaFromRising } from '../status';

export function posStatus(p: Pick<PosHidrologi, 'tma' | 'thresholds'>): Siaga {
  return siagaFromRising(p.tma, p.thresholds);
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
