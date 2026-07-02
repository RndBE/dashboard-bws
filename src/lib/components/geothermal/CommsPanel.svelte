<script lang="ts">
  import { num } from '../../format';
  import { geoTelemetry } from '../../geothermal/store';
  const t = geoTelemetry;
  const bars = $derived(Math.round(($t.vsatLink - 90) / 2)); // 90..100 → 0..5
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Communication — VSAT</div>
  <div class="flex items-center justify-between">
    <div><div class="text-ink-dim text-[10px]">Signal Strength</div><div class="text-[18px] font-semibold text-ink-strong tnum">{num($t.vsatSignal,0)} dBm</div></div>
    <div class="flex items-end gap-0.5">
      {#each Array(5) as _, i}
        <span class="w-1.5 rounded-sm {i < bars ? 'bg-normal' : 'bg-line'}" style="height:{6 + i * 4}px"></span>
      {/each}
    </div>
    <div class="text-right"><div class="text-ink-dim text-[10px]">Link Quality</div><div class="text-[18px] font-semibold text-ink-strong tnum">{num($t.vsatLink,0)}%</div></div>
  </div>
  <div class="mt-2 grid grid-cols-2 gap-1 text-[11px] text-ink-muted">
    <div>Status <span class="text-normal">Connected</span></div>
    <div>IP <span class="text-ink tnum">10.10.10.25</span></div>
    <div>Latency <span class="text-ink tnum">{$t.latency} ms</span></div>
    <div>Uptime <span class="text-ink tnum">3d 14h 25m</span></div>
  </div>
</div>
