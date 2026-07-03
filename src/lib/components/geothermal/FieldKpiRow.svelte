<!-- src/lib/components/geothermal/FieldKpiRow.svelte -->
<script lang="ts">
  import Zap from '@lucide/svelte/icons/zap';
  import Wind from '@lucide/svelte/icons/wind';
  import Droplets from '@lucide/svelte/icons/droplets';
  import Gauge from '@lucide/svelte/icons/gauge';
  import { num } from '../../format';
  import { geoField } from '../../geothermal/store';

  const kpis = $derived([
    { icon: Zap, label: 'Gross Power', value: num($geoField.grossMw, 1), unit: 'MW' },
    { icon: Wind, label: 'Steam Flow', value: num($geoField.steamTh, 1), unit: 't/h' },
    { icon: Droplets, label: 'Brine Flow', value: num($geoField.brineM3h, 1), unit: 'm³/h' },
    { icon: Gauge, label: 'Availability', value: num($geoField.availability, 1), unit: '%' },
  ]);
</script>

<div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
  {#each kpis as k}
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-dim">
        <k.icon size={13} class="text-accent" /> {k.label}
      </div>
      <div class="mt-1.5 flex items-baseline gap-1">
        <span class="text-[22px] font-semibold text-ink-strong tnum">{k.value}</span>
        <span class="text-[11px] text-ink-muted">{k.unit}</span>
      </div>
    </div>
  {/each}
</div>
