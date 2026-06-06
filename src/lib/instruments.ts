import type { Component } from 'svelte';
import type { InstrumentStatus } from './types';

import Waves from '@lucide/svelte/icons/waves';
import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
import Ruler from '@lucide/svelte/icons/ruler';
import Radio from '@lucide/svelte/icons/radio';
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
  AWLR: Waves,
  ARR: CloudRainWind,
  'Papan Duga': Ruler,
  Telemetri: Radio,
  'Panel Surya': Sun,
  Piezometer: Gauge,
  'V-Notch': Droplets,
  Inklinometer: MoveDiagonal,
  'Sensor Pintu': SlidersHorizontal,
  CCTV: Cctv,
  'Panel Kontrol': Cpu,
  Settlement: Ruler,
  'Water Level Logger': HardDrive,
  'Sensor Kondisi': Activity,
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
