<script lang="ts">
  import SatelliteDish from '@lucide/svelte/icons/satellite-dish';
  import { num } from '../../format';
  import { geoTelemetry } from '../../geothermal/store';
  const t = geoTelemetry;
  // signal strength -30(best)..-90(worst) → 0..5 ; link 90..100 → 0..5
  const sigBars = $derived(Math.max(0, Math.min(5, Math.round((($t.vsatSignal) + 90) / 12))));
  const linkBars = $derived(Math.max(0, Math.min(5, Math.round(($t.vsatLink - 90) / 2))));
</script>

<div class="flex flex-col rounded-xl border border-line bg-panel p-3">
  <div class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Communication — VSAT</div>

  <div class="flex flex-1 items-center gap-3">
    <SatelliteDish size={44} strokeWidth={1.4} class="shrink-0 text-ink-muted" />

    <div class="flex flex-1 items-start justify-around gap-2">
      <div class="text-center">
        <div class="text-[10px] text-ink-dim">Signal Strength</div>
        <div class="my-0.5 text-[18px] font-semibold text-ink-strong tnum">{num($t.vsatSignal,0)} <span class="text-[10px] text-ink-muted">dBm</span></div>
        <div class="flex items-end justify-center gap-0.5">
          {#each Array(5) as _, i}<span class="w-1.5 rounded-sm {i < sigBars ? 'bg-normal' : 'bg-line'}" style="height:{6 + i*3}px"></span>{/each}
        </div>
      </div>
      <div class="text-center">
        <div class="text-[10px] text-ink-dim">Link Quality</div>
        <div class="my-0.5 text-[18px] font-semibold text-ink-strong tnum">{num($t.vsatLink,0)}<span class="text-[10px] text-ink-muted">%</span></div>
        <div class="flex items-end justify-center gap-0.5">
          {#each Array(5) as _, i}<span class="w-1.5 rounded-sm {i < linkBars ? 'bg-normal' : 'bg-line'}" style="height:{6 + i*3}px"></span>{/each}
        </div>
      </div>
    </div>
  </div>

  <div class="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-2 text-[10px]">
    <div><div class="text-ink-dim">VSAT Status</div><div class="font-semibold text-normal">Connected</div></div>
    <div><div class="text-ink-dim">IP Address</div><div class="font-semibold text-ink-strong tnum">10.10.10.25</div></div>
    <div><div class="text-ink-dim">Latency</div><div class="font-semibold text-ink-strong tnum">{$t.latency} ms</div></div>
    <div><div class="text-ink-dim">Uptime</div><div class="font-semibold text-ink-strong tnum">3d 14h 25m</div></div>
  </div>
</div>
