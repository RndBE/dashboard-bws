<script lang="ts">
  import MultiChart from '../ui/MultiChart.svelte';
  import { geoHistory } from '../../geothermal/store';
  const h = geoHistory;
  const series = $derived([
    { name: 'Well Pressure', color: '#4f9bee', points: $h.wellPressure },
    { name: 'Heat Pipe Pressure', color: '#e08a3c', points: $h.heatPipePressure },
    { name: 'Water Level', color: '#3fb27f', points: $h.level },
    { name: 'Flow Rate', color: '#c9a227', points: $h.flowLs },
  ]);
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Real-time Trend (6 hours)</div>
  <MultiChart {series} height={200} digits={1} />
</div>
