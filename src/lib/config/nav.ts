import type { Component } from 'svelte';
import type { ModuleKey } from '../types';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Waves from '@lucide/svelte/icons/waves';
import Sprout from '@lucide/svelte/icons/sprout';
import Siren from '@lucide/svelte/icons/siren';
import Activity from '@lucide/svelte/icons/activity';
import DamIcon from '../components/icons/DamIcon.svelte';

export interface NavItem {
  key: ModuleKey;
  label: string;
  short: string;
  icon: Component<any>;
}

export const NAV: NavItem[] = [
  { key: 'ringkasan', label: 'Ringkasan', short: 'Ringkasan', icon: LayoutDashboard },
  { key: 'hidrologi', label: 'Hidrologi', short: 'Hidrologi', icon: Waves },
  { key: 'bendungan', label: 'Bendungan', short: 'Bendungan', icon: DamIcon },
  { key: 'irigasi', label: 'Irigasi & Air Tanah', short: 'Irigasi', icon: Sprout },
  { key: 'banjir', label: 'Banjir & O&P', short: 'Banjir & O&P', icon: Siren },
  { key: 'analisa', label: 'Analisa Data', short: 'Analisa', icon: Activity },
];
