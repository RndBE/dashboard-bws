import type { Component } from 'svelte';
import type { HydroSection } from '../types';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Waves from '@lucide/svelte/icons/waves';
import Gauge from '@lucide/svelte/icons/gauge';
import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
import FlaskConical from '@lucide/svelte/icons/flask-conical';
import Droplet from '@lucide/svelte/icons/droplet';
import Cctv from '@lucide/svelte/icons/cctv';
import Map from '@lucide/svelte/icons/map';
import ChartSpline from '@lucide/svelte/icons/chart-spline';

export interface HydroNavItem {
  key: HydroSection;
  label: string;
  /** sub-label menu (deskripsi singkat alat/peruntukan) */
  desc: string;
  /** akronim logger/alat utama */
  tag: string;
  icon: Component<any>;
}

/** Menu lengkap Portal Hidrologi — tiap menu = satu kelompok alat ukur. */
export const HYDRO_NAV: HydroNavItem[] = [
  { key: 'beranda', label: 'Beranda', desc: 'Ringkasan jaringan hidrologi', tag: 'SCADA', icon: LayoutDashboard },
  { key: 'pda', label: 'Pos Duga Air', desc: 'Tinggi muka air sungai real-time', tag: 'AWLR', icon: Waves },
  { key: 'debit', label: 'Debit & Flowmeter', desc: 'Debit sungai (ultrasonik non-kontak)', tag: 'AFMR', icon: Gauge },
  { key: 'pch', label: 'Pos Curah Hujan', desc: 'Penakar hujan otomatis', tag: 'ARR', icon: CloudRainWind },
  { key: 'kualitas', label: 'Kualitas Air', desc: 'Mutu air real-time di PDA sungai', tag: 'AWQR', icon: FlaskConical },
  { key: 'mata-air', label: 'Mata Air', desc: 'Debit + mutu air baku (AWQR)', tag: 'ASDR', icon: Droplet },
  { key: 'cctv', label: 'CCTV IP Publik', desc: 'Pemantau visual terintegrasi', tag: 'RTSP', icon: Cctv },
  { key: 'peta', label: 'Peta Jaringan', desc: 'Sebaran seluruh stasiun', tag: 'GIS', icon: Map },
  { key: 'analisa', label: 'Analisa & Laporan', desc: 'AI insight · ekspor Excel & PDF', tag: 'AI', icon: ChartSpline },
];
