<script lang="ts">
  import GaugeCard from './GaugeCard.svelte';
  import ScadaDiagram from './ScadaDiagram.svelte';
  import SystemStatusPanel from './SystemStatusPanel.svelte';
  import TrendPanel from './TrendPanel.svelte';
  import PowerPanel from './PowerPanel.svelte';
  import CommsPanel from './CommsPanel.svelte';
  import AlarmSummaryPanel from './AlarmSummaryPanel.svelte';
  import GeoCctvPanel from './GeoCctvPanel.svelte';
  import FieldKpiRow from './FieldKpiRow.svelte';
  import WellStatusGrid from './WellStatusGrid.svelte';
  import { geoTelemetry } from '../../geothermal/store';
  const t = geoTelemetry;
</script>

<div class="space-y-3">
  <FieldKpiRow />
  <div class="text-[11px] font-semibold uppercase tracking-wider text-ink-dim">Wells</div>
  <WellStatusGrid />

  <!-- upper region: gauges + system status + scada (left) | cctv column (right) -->
  <div class="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_290px]">
    <div class="min-w-0 space-y-3">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <GaugeCard tag="PT-101" label="Well Pressure" value={$t.wellPressure} unit="bar(g)" min={0} max={250} color="#4f9bee" footL="4–20 mA" footR="Normal" footRPill />
        <GaugeCard tag="PT-102" label="Heat Pipe Pressure" value={$t.heatPipePressure} unit="bar(g)" min={0} max={250} color="#e08a3c" footL="4–20 mA" footR="Normal" footRPill />
        <GaugeCard tag="LT-201" label="Water Level (V-Notch)" value={$t.level} unit="m" min={0} max={1} digits={3} color="#22b8e0" variant="tank" footL="Head (H)" footR="Normal" footRPill />
        <GaugeCard tag="FT-201" label="Flow Rate (V-Notch)" value={$t.flowLs} unit="L/s" min={0} max={50} digits={2} color="#3fb27f" footL={`${$t.flowM3h}`} footR="m³/h" />
        <SystemStatusPanel />
      </div>
      <ScadaDiagram />
    </div>
    <GeoCctvPanel />
  </div>

  <!-- bottom region: full-width 4 columns -->
  <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1.35fr]">
    <TrendPanel />
    <PowerPanel />
    <CommsPanel />
    <AlarmSummaryPanel />
  </div>
</div>
