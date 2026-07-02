<script lang="ts">
  import GaugeCard from './GaugeCard.svelte';
  import ScadaDiagram from './ScadaDiagram.svelte';
  import { geoTelemetry } from '../../geothermal/store';
  const t = geoTelemetry;
</script>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
  <GaugeCard tag="PT-101" label="Well Pressure" value={$t.wellPressure} unit="bar(g)" min={0} max={250} color="#4f9bee" sublabel="4–20 mA · Normal" />
  <GaugeCard tag="PT-102" label="Heat Pipe Pressure" value={$t.heatPipePressure} unit="bar(g)" min={0} max={250} color="#e08a3c" sublabel="4–20 mA · Normal" />
  <GaugeCard tag="LT-201" label="Water Level (V-Notch)" value={$t.level} unit="m" min={0} max={1} digits={3} color="#3fb27f" sublabel="Head (H) · Normal" />
  <GaugeCard tag="FT-201" label="Flow Rate (V-Notch)" value={$t.flowLs} unit="L/s" min={0} max={50} digits={2} color="#3fb27f" sublabel={`${$t.flowM3h} m³/h`} />
</div>

<div class="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[3fr_1fr]">
  <ScadaDiagram />
  <!-- SystemStatusPanel goes here in Task 8 -->
</div>
