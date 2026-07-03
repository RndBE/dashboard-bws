import type { Component } from 'svelte';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Map from '@lucide/svelte/icons/map';
import Workflow from '@lucide/svelte/icons/workflow';
import LineChart from '@lucide/svelte/icons/line-chart';
import Database from '@lucide/svelte/icons/database';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import Bell from '@lucide/svelte/icons/bell';
import Cctv from '@lucide/svelte/icons/cctv';
import Gauge from '@lucide/svelte/icons/gauge';
import Wrench from '@lucide/svelte/icons/wrench';
import FlaskConical from '@lucide/svelte/icons/flask-conical';
import Activity from '@lucide/svelte/icons/activity';
import FileText from '@lucide/svelte/icons/file-text';
import Settings from '@lucide/svelte/icons/settings';
import Layers from '@lucide/svelte/icons/layers';

export type GeoSection =
  | 'dashboard' | 'fieldmap'
  | 'wells' | 'scada' | 'alarm' | 'cctv'
  | 'trend' | 'historian' | 'production'
  | 'instruments' | 'maintenance' | 'geochem'
  | 'health' | 'reporting' | 'config'
  // legacy keys still referenced until their pages fold in
  | 'data' | 'status';

export interface GeoNavItem {
  key: GeoSection;
  label: string;
  desc: string;
  icon: Component<any>;
}

export interface GeoNavGroup {
  label: string;
  items: GeoNavItem[];
}

/** Grouped Geothermal field navigation. */
export const GEO_NAV_GROUPS: GeoNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', desc: 'Ringkasan monitoring field', icon: LayoutDashboard },
      { key: 'fieldmap', label: 'Field Map', desc: 'Peta spasial sumur & pipa', icon: Map },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'wells', label: 'Wells', desc: 'Registry & drilldown per sumur', icon: Layers },
      { key: 'scada', label: 'SCADA P&ID', desc: 'Diagram P&ID proses', icon: Workflow },
      { key: 'alarm', label: 'Alarms & Events', desc: 'Manajemen alarm & kejadian', icon: Bell },
      { key: 'cctv', label: 'CCTV', desc: 'Pemantau visual live', icon: Cctv },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { key: 'trend', label: 'Trends', desc: 'Grafik multi-tag real-time', icon: LineChart },
      { key: 'historian', label: 'Historian', desc: 'Query data historis', icon: Database },
      { key: 'production', label: 'Production', desc: 'Output uap, brine & MW', icon: TrendingDown },
    ],
  },
  {
    label: 'Assets',
    items: [
      { key: 'instruments', label: 'Instruments', desc: 'Registry tag & kalibrasi', icon: Gauge },
      { key: 'maintenance', label: 'Maintenance', desc: 'Work order & kesehatan alat', icon: Wrench },
      { key: 'geochem', label: 'Geochemistry', desc: 'Kimia brine & scaling', icon: FlaskConical },
    ],
  },
  {
    label: 'System & Admin',
    items: [
      { key: 'health', label: 'System Health', desc: 'Status · daya · komunikasi', icon: Activity },
      { key: 'reporting', label: 'Reporting', desc: 'Laporan & kepatuhan', icon: FileText },
      { key: 'config', label: 'Configuration', desc: 'Pengaturan tag & sistem', icon: Settings },
    ],
  },
];

/** Flat list for key→item lookups. */
export const GEO_NAV: GeoNavItem[] = GEO_NAV_GROUPS.flatMap((g) => g.items);
