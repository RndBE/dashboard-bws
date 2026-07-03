<!-- src/lib/components/geothermal/WellDrilldown.svelte -->
<script lang="ts">
  import { num } from '../../format';
  import { geoAlarms, geoSelectedWell } from '../../geothermal/store';
  import { VALVES } from '../../geothermal/seed.js';
  import SeverityChip from './SeverityChip.svelte';

  const w = geoSelectedWell;

  const STATS = $derived([
    { label: 'Well Pressure', value: num($w.telemetry.wellPressure, 1), unit: 'bar(g)' },
    { label: 'Heat Pipe Pressure', value: num($w.telemetry.heatPipePressure, 1), unit: 'bar(g)' },
    { label: 'Temperature', value: num($w.telemetry.temperature, 1), unit: '°C' },
    { label: 'Level', value: num($w.telemetry.level, 3), unit: 'm' },
    { label: 'Flow', value: num($w.telemetry.flowM3h, 1), unit: 'm³/h' },
    { label: 'Output', value: num($w.output.mw, 1), unit: 'MW' },
  ]);

  const wellAlarms = $derived($geoAlarms.filter((a) => a.well === $w.id));

  function fmtValue(a: (typeof wellAlarms)[number]): string {
    return num(a.value, a.tag === 'level' ? 3 : 1);
  }
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      <span class="font-mono text-[13px] font-semibold text-accent-bright">{$w.id}</span>
      <span class="text-[12px] text-ink">{$w.name}</span>
      <span class="text-[11px] text-ink-dim">· {$w.type}</span>
    </div>
    <SeverityChip severity={$w.status} />
  </div>

  <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
    {#each STATS as s (s.label)}
      <div class="rounded-lg border border-line bg-panel-2 p-2.5">
        <div class="text-[9px] font-semibold uppercase tracking-wider text-ink-dim">{s.label}</div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="text-[16px] font-semibold text-ink-strong tnum">{s.value}</span>
          <span class="text-[10px] text-ink-muted">{s.unit}</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-3">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Valves</div>
    <div class="mt-1.5 flex flex-wrap gap-2">
      {#each VALVES as v (v.id)}
        <span class="flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-[11px]">
          <span class="font-mono text-ink-muted">{v.id}</span>
          <span class="flex items-center gap-1 font-semibold {v.open ? 'text-normal' : 'text-ink-dim'}">
            <span class="h-1.5 w-1.5 rounded-full {v.open ? 'bg-normal' : 'bg-ink-dim'}"></span>
            {v.open ? 'OPEN' : 'CLOSED'}
          </span>
        </span>
      {/each}
    </div>
  </div>

  <div class="mt-3">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Alarms — {$w.id}</div>
    {#if wellAlarms.length === 0}
      <div class="mt-1.5 rounded-lg border border-line/60 py-4 text-center text-[12px] text-ink-dim">
        No alarms for this well
      </div>
    {:else}
      <ul class="mt-1.5 flex flex-col gap-1.5">
        {#each wellAlarms as a (a.id)}
          <li class="flex items-center justify-between gap-2 rounded-md border border-line/60 px-2.5 py-1.5 text-[12px]">
            <div class="flex min-w-0 items-center gap-2">
              <SeverityChip severity={a.severity} />
              <span class="truncate text-ink">{a.label}</span>
            </div>
            <span class="shrink-0 font-semibold text-ink-strong tnum">{fmtValue(a)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
