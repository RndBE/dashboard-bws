import type { Siaga, AssetKind, PosTipe } from './types';

export interface StatusMeta {
  key: Siaga;
  label: string;
  /** hex untuk SVG/peta/inline */
  color: string;
  /** kelas tailwind teks */
  text: string;
  /** kelas tailwind untuk chip/badge (bg + border + text) */
  chip: string;
  /** kelas border tipis */
  ring: string;
  /** urutan keparahan, makin besar makin gawat */
  weight: number;
}

export const STATUS: Record<Siaga, StatusMeta> = {
  normal: {
    key: 'normal',
    label: 'Normal',
    color: '#3fb27f',
    text: 'text-normal',
    chip: 'bg-normal/12 text-normal border border-normal/30',
    ring: 'border-normal/40',
    weight: 0,
  },
  waspada: {
    key: 'waspada',
    label: 'Waspada',
    color: '#c9a227',
    text: 'text-waspada',
    chip: 'bg-waspada/12 text-waspada border border-waspada/30',
    ring: 'border-waspada/40',
    weight: 1,
  },
  siaga: {
    key: 'siaga',
    label: 'Siaga',
    color: '#e08a3c',
    text: 'text-siaga',
    chip: 'bg-siaga/12 text-siaga border border-siaga/30',
    ring: 'border-siaga/40',
    weight: 2,
  },
  awas: {
    key: 'awas',
    label: 'Awas',
    color: '#d8635f',
    text: 'text-awas',
    chip: 'bg-awas/12 text-awas border border-awas/30',
    ring: 'border-awas/40',
    weight: 3,
  },
};

export const SIAGA_ORDER: Siaga[] = ['normal', 'waspada', 'siaga', 'awas'];

export function statusColor(s: Siaga): string {
  return STATUS[s].color;
}

/** Status terburuk dari sekumpulan status */
export function worst(list: Siaga[]): Siaga {
  return list.reduce<Siaga>(
    (acc, s) => (STATUS[s].weight > STATUS[acc].weight ? s : acc),
    'normal',
  );
}

/** Eskalasi siaga berdasarkan nilai melebihi ambang naik (mis. TMA) */
export function siagaFromRising(
  value: number,
  t: { waspada: number; siaga: number; awas: number },
): Siaga {
  if (value >= t.awas) return 'awas';
  if (value >= t.siaga) return 'siaga';
  if (value >= t.waspada) return 'waspada';
  return 'normal';
}

export const KIND_LABEL: Record<AssetKind, string> = {
  pos: 'Pos Telemetri',
  bendungan: 'Bendungan',
  irigasi: 'Daerah Irigasi',
  sumur: 'Sumur Pantau',
  op: 'Aset O&P',
};

/** label per tipe pos */
export const POS_TIPE_LABEL: Record<PosTipe, string> = {
  'duga-air': 'Pos Duga Air',
  hujan: 'Pos Hujan',
  klimatologi: 'Stasiun Klimatologi',
  kualitas: 'Pos Kualitas Air',
};

/** akronim logger per tipe pos */
export const POS_TIPE_LOGGER: Record<PosTipe, string> = {
  'duga-air': 'AWLR',
  hujan: 'ARR',
  klimatologi: 'AWS',
  kualitas: 'AWQR',
};
