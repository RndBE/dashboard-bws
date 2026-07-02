<script lang="ts">
  import Bell from '@lucide/svelte/icons/bell';
  import FileText from '@lucide/svelte/icons/file-text';
  import LineChart from '@lucide/svelte/icons/line-chart';
  import Download from '@lucide/svelte/icons/download';
  import Settings from '@lucide/svelte/icons/settings';
  import UserRound from '@lucide/svelte/icons/user-round';
  import Clock from '../ui/Clock.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import SystemSwitcher from '../layout/SystemSwitcher.svelte';
  import { geoActiveAlarmCount, geoOverallStatus } from '../../geothermal/store';

  const ACTIONS = [
    { icon: Bell, label: 'Alarm', badge: true },
    { icon: FileText, label: 'Report' },
    { icon: LineChart, label: 'Trend' },
    { icon: Download, label: 'Data Export' },
    { icon: Settings, label: 'Settings' },
  ];
</script>

<header class="flex items-center gap-4 border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur">
  <div class="min-w-0">
    <h1 class="truncate text-[15px] font-semibold tracking-tight text-ink-strong">
      Geothermal Well Pad — Testing Monitoring System
    </h1>
    <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-pu-bright">Real-time Monitoring</div>
  </div>

  <div class="ml-2 hidden items-center gap-2 md:flex">
    <StatusBadge status={$geoOverallStatus} label="System Normal" pulse={$geoOverallStatus !== 'normal'} />
  </div>

  <div class="ml-auto flex items-center gap-3">
    <div class="hidden md:block"><Clock variant="full" /></div>
    <div class="flex items-center gap-1">
      {#each ACTIONS as a}
        <button title={a.label} class="relative grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-panel hover:text-ink-strong">
          <a.icon size={14} />
          {#if a.badge && $geoActiveAlarmCount > 0}
            <span class="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-awas px-1 text-[9px] font-bold text-white">{$geoActiveAlarmCount}</span>
          {/if}
        </button>
      {/each}
    </div>
    <SystemSwitcher />
    <div class="flex items-center gap-2 border-l border-line pl-3">
      <span class="grid h-8 w-8 place-items-center rounded-full border border-line bg-panel-2 text-ink-muted"><UserRound size={15} /></span>
      <span class="hidden text-[11.5px] font-medium text-ink-strong sm:block">Operator</span>
    </div>
  </div>
</header>
