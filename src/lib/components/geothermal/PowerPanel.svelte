<script lang="ts">
  import Gauge from '../ui/Gauge.svelte';
  import { num } from '../../format';
  import { geoTelemetry } from '../../geothermal/store';
  const t = geoTelemetry;
  const hours = $derived(num(($t.battery / 100) * 24, 1));
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Power Supply — Solar System</div>
  <div class="flex items-center gap-4">
    <Gauge value={$t.battery} size={92} digits={0} unit="%" color="#3fb27f" label="Battery" sublabel={`${hours} h`} />
    <div class="grid flex-1 grid-cols-2 gap-2 text-[11px]">
      <div><div class="text-ink-dim">Solar Voltage</div><div class="font-semibold text-ink-strong tnum">{num($t.solarV,1)} V</div></div>
      <div><div class="text-ink-dim">Battery Voltage</div><div class="font-semibold text-ink-strong tnum">{num($t.batteryV,1)} V</div></div>
      <div><div class="text-ink-dim">Charge Current</div><div class="font-semibold text-ink-strong tnum">{num($t.chargeA,1)} A</div></div>
      <div><div class="text-ink-dim">Output Power</div><div class="font-semibold text-ink-strong tnum">240 W</div></div>
    </div>
  </div>
</div>
