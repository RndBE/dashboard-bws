<script lang="ts">
  import Download from '@lucide/svelte/icons/download';
  import { num } from '../../../format';
  import { geoTelemetry } from '../../../geothermal/store';

  const t = geoTelemetry;

  const ROWS = $derived([
    { tag: 'PT-101', desc: 'Well Pressure', value: num($t.wellPressure, 1), unit: 'bar(g)' },
    { tag: 'PT-102', desc: 'Heat Pipe Pressure', value: num($t.heatPipePressure, 1), unit: 'bar(g)' },
    { tag: 'TT-101', desc: 'Well Temperature', value: num($t.temperature, 1), unit: '°C' },
    { tag: 'LT-201', desc: 'Water Level (V-Notch)', value: num($t.level, 3), unit: 'm' },
    { tag: 'FT-201', desc: 'Flow Rate (V-Notch)', value: num($t.flowLs, 2), unit: 'L/s' },
    { tag: 'FQ-201', desc: 'Flow Rate (Totalized)', value: num($t.flowM3h, 1), unit: 'm³/h' },
    { tag: 'BT-301', desc: 'Battery State of Charge', value: num($t.battery, 0), unit: '%' },
    { tag: 'ET-301', desc: 'Solar Panel Voltage', value: num($t.solarV, 1), unit: 'V' },
    { tag: 'ET-302', desc: 'Battery Voltage', value: num($t.batteryV, 1), unit: 'V' },
    { tag: 'IT-301', desc: 'Charge Current', value: num($t.chargeA, 1), unit: 'A' },
    { tag: 'RF-401', desc: 'VSAT Signal Strength', value: num($t.vsatSignal, 0), unit: 'dBm' },
    { tag: 'RF-402', desc: 'VSAT Link Quality', value: num($t.vsatLink, 0), unit: '%' },
    { tag: 'RF-403', desc: 'Network Latency', value: num($t.latency, 0), unit: 'ms' },
  ]);
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-3 flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Live Tag Snapshot</div>
    <button class="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:bg-panel-2 hover:text-ink-strong">
      <Download size={13} /> Export CSV
    </button>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full text-[12px]">
      <thead class="text-ink-dim">
        <tr class="border-b border-line">
          <th class="px-2 py-1.5 text-left font-medium">Tag</th>
          <th class="px-2 py-1.5 text-left font-medium">Description</th>
          <th class="px-2 py-1.5 text-right font-medium">Value</th>
          <th class="px-2 py-1.5 text-left font-medium">Unit</th>
          <th class="px-2 py-1.5 text-right font-medium">Quality</th>
        </tr>
      </thead>
      <tbody>
        {#each ROWS as r}
          <tr class="border-b border-line/60 hover:bg-panel-2/60">
            <td class="px-2 py-1.5 font-mono text-[11px] text-accent-bright">{r.tag}</td>
            <td class="px-2 py-1.5 text-ink">{r.desc}</td>
            <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{r.value}</td>
            <td class="px-2 py-1.5 text-ink-muted">{r.unit}</td>
            <td class="px-2 py-1.5 text-right font-semibold text-normal">GOOD</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
