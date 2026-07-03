<script lang="ts">
  import MultiChart from '../ui/MultiChart.svelte';
  import { geoHistory } from '../../geothermal/store';
  const h = geoHistory;
  const series = $derived([
    { name: 'Well Pressure', unit: 'bar', color: '#4f9bee', points: $h.wellPressure },
    { name: 'Heat Pipe Pressure', unit: 'bar', color: '#e08a3c', points: $h.heatPipePressure },
    { name: 'Water Level', unit: 'm', color: '#22b8e0', points: $h.level },
    { name: 'Flow Rate', unit: 'L/s', color: '#3fb27f', points: $h.flowLs },
  ]);
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Real-time Trend (6 hours)</div>
  <MultiChart {series} height={200} digits={1} />
  <div class="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-ink-muted">
    {#each series as s}
      <span class="inline-flex items-center gap-1.5">
        <span class="h-2 w-2 rounded-full" style="background:{s.color}"></span>{s.name} ({s.unit})
      </span>
    {/each}
  </div>
</div>
