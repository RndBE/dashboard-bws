import type { Component } from 'svelte';
import type { InstrumentStatus } from './types';

import Waves from '@lucide/svelte/icons/waves';
import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
import CloudDrizzle from '@lucide/svelte/icons/cloud-drizzle';
import FlaskConical from '@lucide/svelte/icons/flask-conical';
import Thermometer from '@lucide/svelte/icons/thermometer';
import Wind from '@lucide/svelte/icons/wind';
import Compass from '@lucide/svelte/icons/compass';
import SunMedium from '@lucide/svelte/icons/sun-medium';
import Droplet from '@lucide/svelte/icons/droplet';
import GlassWater from '@lucide/svelte/icons/glass-water';
import TestTube from '@lucide/svelte/icons/test-tube';
import Zap from '@lucide/svelte/icons/zap';
import Ruler from '@lucide/svelte/icons/ruler';
import Sun from '@lucide/svelte/icons/sun';
import Gauge from '@lucide/svelte/icons/gauge';
import Droplets from '@lucide/svelte/icons/droplets';
import MoveDiagonal from '@lucide/svelte/icons/move-diagonal';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import Cctv from '@lucide/svelte/icons/cctv';
import Cpu from '@lucide/svelte/icons/cpu';
import HardDrive from '@lucide/svelte/icons/hard-drive';
import Activity from '@lucide/svelte/icons/activity';

const ICONS: Record<string, Component<any>> = {
  // pos duga air
  AWLR: Waves,
  TMA: Waves,
  AFMR: Gauge,
  'Kecepatan Aliran': Activity,
  AWGC: SlidersHorizontal,
  AVWR: Gauge,
  AWQR: FlaskConical,
  ADR: MoveDiagonal,
  APLR: Activity,
  EWS: Activity,
  // pos mata air (ASDR)
  ASDR: Droplets,
  'Debit Mata Air': Droplets,
  'Tinggi Bukaan': Ruler,
  Konduktivitas: Zap,
  // pos hujan
  ARR: CloudRainWind,
  'Curah Hujan': CloudRainWind,
  Intensitas: CloudDrizzle,
  // stasiun klimatologi (AWS)
  'Suhu Udara': Thermometer,
  'Suhu Air': Thermometer,
  Kelembaban: Droplets,
  'Kecepatan Angin': Wind,
  'Arah Angin': Compass,
  'Tekanan Udara': Gauge,
  'Radiasi Matahari': SunMedium,
  // pos kualitas air (AWQR)
  pH: FlaskConical,
  DO: Droplet,
  Kekeruhan: GlassWater,
  TDS: TestTube,
  DHL: Zap,
  // stasiun klimatologi ringkas (AWS) di bendungan
  AWS: Thermometer,
  // bendungan / irigasi / sumur / O&P
  Piezometer: Gauge,
  'V-Notch': Droplets,
  Inklinometer: MoveDiagonal,
  'Sensor Pintu': SlidersHorizontal,
  CCTV: Cctv,
  'Panel Kontrol': Cpu,
  Settlement: Ruler,
  'Patok Geser': Ruler,
  'Crack Meter': Ruler,
  'Water Level Logger': HardDrive,
  'Sensor Kondisi': Activity,
  // health
  'Panel Surya': Sun,
};

export function instrumentIcon(type: string): Component<any> {
  return ICONS[type] ?? Gauge;
}

export interface StatusMeta {
  label: string;
  color: string;
}

export const INSTRUMENT_STATUS: Record<InstrumentStatus, StatusMeta> = {
  online: { label: 'Online', color: '#3fb27f' },
  offline: { label: 'Offline', color: '#d8635f' },
  maintenance: { label: 'Perawatan', color: '#c9a227' },
};
