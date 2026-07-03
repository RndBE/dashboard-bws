import type { Component } from 'svelte';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Workflow from '@lucide/svelte/icons/workflow';
import LineChart from '@lucide/svelte/icons/line-chart';
import Table from '@lucide/svelte/icons/table';
import Bell from '@lucide/svelte/icons/bell';
import Cctv from '@lucide/svelte/icons/cctv';
import Activity from '@lucide/svelte/icons/activity';
import FileText from '@lucide/svelte/icons/file-text';
import Settings from '@lucide/svelte/icons/settings';

export type GeoSection =
  | 'dashboard'
  | 'scada'
  | 'trend'
  | 'data'
  | 'alarm'
  | 'cctv'
  | 'status'
  | 'reporting'
  | 'config';

export interface GeoNavItem {
  key: GeoSection;
  label: string;
  desc: string;
  icon: Component<any>;
}

/** Menu Geothermal Well Pad — tiap menu memetakan ke satu panel/tampilan. */
export const GEO_NAV: GeoNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', desc: 'Ringkasan monitoring well pad', icon: LayoutDashboard },
  { key: 'scada', label: 'SCADA', desc: 'Diagram P&ID proses', icon: Workflow },
  { key: 'trend', label: 'Trend & Chart', desc: 'Grafik tren real-time', icon: LineChart },
  { key: 'data', label: 'Data Table', desc: 'Snapshot tag telemetri', icon: Table },
  { key: 'alarm', label: 'Alarm & Event', desc: 'Riwayat alarm & kejadian', icon: Bell },
  { key: 'cctv', label: 'CCTV Monitoring', desc: 'Pemantau visual live', icon: Cctv },
  { key: 'status', label: 'System Status', desc: 'Kesehatan sistem · daya · komunikasi', icon: Activity },
  { key: 'reporting', label: 'Reporting', desc: 'Ekspor laporan periodik', icon: FileText },
  { key: 'config', label: 'Configuration', desc: 'Pengaturan tag & sistem', icon: Settings },
];
