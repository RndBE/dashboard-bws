// Domain model for the BWS command center (mock prototype)

export type Siaga = 'normal' | 'waspada' | 'siaga' | 'awas';

export type ModuleKey =
  | 'ringkasan'
  | 'hidrologi'
  | 'bendungan'
  | 'irigasi'
  | 'banjir'
  | 'analisa';

export type AssetKind = 'pos' | 'bendungan' | 'irigasi' | 'sumur' | 'op';

export interface SeriesPoint {
  /** epoch ms */
  t: number;
  v: number;
}

export type InstrumentStatus = 'online' | 'offline' | 'maintenance';

/** Alat ukur / sensor yang terpasang pada sebuah aset */
export interface Instrument {
  id: string;
  name: string;
  /** jenis alat, mis. AWLR, ARR, AWS, AWQR, Piezometer, V-Notch, CCTV */
  type: string;
  status: InstrumentStatus;
  value: number;
  unit: string;
  updatedAt: number;
  history: SeriesPoint[];
  /** sensor utama yang nilainya mencerminkan metrik aset */
  primary?: boolean;
  valueDigits?: number;
  /** 'telemetry' = alat ukur, 'health' = indikator kesehatan stasiun (catu daya). default telemetry */
  category?: 'telemetry' | 'health';
}

/** Jenis pos berdasarkan logger/fungsi (satu pos satu logger) */
export type PosTipe = 'duga-air' | 'hujan' | 'klimatologi' | 'kualitas';

/** Parameter utama sebuah pos (untuk penanda peta & grafik tren) */
export interface PosParam {
  /** kunci analisa, mis. 'tma' | 'hujan' | 'suhu' | 'ph' */
  key: string;
  /** label singkat, mis. 'TMA', 'Suhu Udara' */
  label: string;
  value: number;
  unit: string;
  digits: number;
}

/** Pos hidrologi/telemetri — tipe menentukan logger & parameter terpasang */
export interface PosHidrologi {
  id: string;
  name: string;
  tipe: PosTipe;
  /** sungai (relevan utk pos duga air & pos hujan) */
  river?: string;
  lat: number;
  lng: number;
  /** parameter utama (mengikuti sensor utama logger) */
  param: PosParam;
  /** histori parameter utama */
  history: SeriesPoint[];
  /** ambang eskalasi siaga — hanya tipe yang berbasis ambang (duga-air, hujan) */
  thresholds?: { waspada: number; siaga: number; awas: number };
  /** debit turunan rating curve — hanya pos duga air */
  debit?: number;
  status: Siaga;
  updatedAt: number;
  instruments: Instrument[];
}

export interface SpillwayGate {
  id: string;
  /** bukaan pintu, % */
  opening: number;
}

export interface Bendungan {
  id: string;
  name: string;
  river: string;
  lat: number;
  lng: number;
  /** elevasi muka air waduk, mdpl */
  elevasi: number;
  elevasiNormal: number;
  elevasiBanjir: number;
  /** volume tampungan, juta m³ */
  volume: number;
  kapasitas: number;
  /** m³/s */
  inflow: number;
  outflow: number;
  gates: SpillwayGate[];
  status: Siaga;
  updatedAt: number;
  historyElevasi: SeriesPoint[];
  historyInflow: SeriesPoint[];
  instruments: Instrument[];
}

export interface PintuAir {
  id: string;
  opening: number;
}

export interface DaerahIrigasi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** luas baku, ha */
  luas: number;
  /** luas terlayani saat ini, ha */
  layanan: number;
  /** debit saluran, m³/s */
  debit: number;
  /** kebutuhan air, m³/s */
  kebutuhan: number;
  polaTanam: string;
  pintu: PintuAir[];
  status: Siaga;
  updatedAt: number;
  historyDebit: SeriesPoint[];
  instruments: Instrument[];
}

export interface SumurPantau {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** kedalaman muka air tanah dari permukaan, meter (positif = makin dalam) */
  muka: number;
  /** kedalaman acuan normal, meter */
  baseline: number;
  /** ambang penurunan (drawdown) untuk siaga, meter di bawah baseline */
  thresholds: { waspada: number; siaga: number; awas: number };
  status: Siaga;
  updatedAt: number;
  history: SeriesPoint[];
  instruments: Instrument[];
}

export interface AsetOP {
  id: string;
  name: string;
  jenis: string;
  lat: number;
  lng: number;
  /** kondisi fisik, % baik */
  kondisi: number;
  /** progres pemeliharaan, % */
  progres: number;
  status: Siaga;
  inspeksi: number;
  instruments: Instrument[];
}

export interface AlertItem {
  id: string;
  level: Siaga;
  kind: AssetKind;
  assetId: string;
  assetName: string;
  message: string;
  at: number;
  /** masih aktif atau sudah jadi log */
  active: boolean;
}

export interface DashboardData {
  pos: PosHidrologi[];
  bendungan: Bendungan[];
  irigasi: DaerahIrigasi[];
  sumur: SumurPantau[];
  op: AsetOP[];
  alerts: AlertItem[];
}

/** Penanda terpadu untuk peta & drill-down */
export interface MapMarker {
  id: string;
  name: string;
  kind: AssetKind;
  lat: number;
  lng: number;
  status: Siaga;
  primaryLabel: string;
  primaryValue: string;
  /** jenis instrumen terpasang (unik), mis. ['AWLR','ARR'] — untuk filter peta */
  instrumentTypes: string[];
}

/** Referensi untuk membuka panel detail */
export interface AssetRef {
  kind: AssetKind;
  id: string;
}
