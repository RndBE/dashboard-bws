<script lang="ts">
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Zap from '@lucide/svelte/icons/zap';
  import { num } from '../../format';
  import { geoTelemetry } from '../../geothermal/store';
  const t = geoTelemetry;
  const hours = $derived(num(($t.battery / 100) * 24, 1));
</script>

<div class="flex flex-col rounded-xl border border-line bg-panel p-3">
  <div class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Power Supply — Solar System</div>

  <!-- flow: solar panel → battery → inverter -->
  <div class="flex flex-1 items-center justify-between gap-1">
    <!-- solar panel -->
    <figure class="flex flex-col items-center gap-1">
      <svg width="52" height="46" viewBox="0 0 52 46" fill="none">
        <circle cx="10" cy="8" r="5" fill="#e6c34a" />
        {#each [0,45,90,135,180,225,270,315] as a}
          <line x1={10 + 6.5*Math.cos(a*Math.PI/180)} y1={8 + 6.5*Math.sin(a*Math.PI/180)} x2={10 + 9*Math.cos(a*Math.PI/180)} y2={8 + 9*Math.sin(a*Math.PI/180)} stroke="#e6c34a" stroke-width="1.2" />
        {/each}
        <g transform="translate(16,16)">
          <path d="M2 14 L8 2 L34 2 L30 14 Z" fill="#1f4e73" stroke="#3a6c94" stroke-width="1" />
          <line x1="12" y1="2" x2="8" y2="14" stroke="#3a6c94" stroke-width="0.8" />
          <line x1="21" y1="2" x2="18" y2="14" stroke="#3a6c94" stroke-width="0.8" />
          <line x1="30" y1="2" x2="27" y2="14" stroke="#3a6c94" stroke-width="0.8" />
          <line x1="5" y1="8" x2="32" y2="8" stroke="#3a6c94" stroke-width="0.8" />
          <line x1="16" y1="14" x2="16" y2="24" stroke="#4a4f57" stroke-width="1.4" />
        </g>
      </svg>
    </figure>

    <ArrowRight size={16} class="shrink-0 text-ink-dim" />

    <!-- battery -->
    <figure class="flex flex-col items-center gap-1">
      <div class="flex items-center">
        <div class="relative h-9 w-14 overflow-hidden rounded border-2 border-ink-dim/60">
          <div class="absolute inset-y-0 left-0 bg-gradient-to-r from-normal to-normal/80" style="width:{$t.battery}%"></div>
          <div class="absolute inset-0 flex items-center justify-center gap-0.5 text-[13px] font-bold text-black/85">
            <Zap size={11} strokeWidth={2.6} fill="currentColor" />{num($t.battery,0)}%
          </div>
        </div>
        <div class="h-3.5 w-1 rounded-r bg-ink-dim/60"></div>
      </div>
      <div class="text-center leading-tight">
        <div class="text-[10px] text-ink-muted">Battery</div>
        <div class="text-[10px] font-semibold text-ink-strong tnum">{hours} h</div>
      </div>
    </figure>

    <ArrowRight size={16} class="shrink-0 text-ink-dim" />

    <!-- inverter / output -->
    <figure class="flex flex-col items-center gap-1">
      <svg width="46" height="42" viewBox="0 0 46 42" fill="none">
        <rect x="7" y="6" width="32" height="26" rx="2" fill="#3a3f47" stroke="#565c66" stroke-width="1" />
        <rect x="11" y="10" width="24" height="6" rx="1" fill="#2a2e35" />
        <line x1="11" y1="21" x2="30" y2="21" stroke="#565c66" stroke-width="1" />
        <line x1="11" y1="25" x2="26" y2="25" stroke="#565c66" stroke-width="1" />
        <circle cx="33" cy="24" r="2" fill="#3fb27f" />
        <line x1="14" y1="32" x2="14" y2="37" stroke="#4a4f57" stroke-width="1.6" />
        <line x1="32" y1="32" x2="32" y2="37" stroke="#4a4f57" stroke-width="1.6" />
      </svg>
      <div class="text-center leading-tight">
        <div class="text-[10px] font-semibold text-ink-strong tnum">240 W</div>
        <div class="text-[10px] text-ink-muted">Output Power</div>
      </div>
    </figure>
  </div>

  <!-- stats -->
  <div class="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-2 text-[10px]">
    <div><div class="text-ink-dim">Solar Voltage</div><div class="font-semibold text-ink-strong tnum">{num($t.solarV,1)} V</div></div>
    <div><div class="text-ink-dim">Battery Voltage</div><div class="font-semibold text-ink-strong tnum">{num($t.batteryV,1)} V</div></div>
    <div><div class="text-ink-dim">Charge Current</div><div class="font-semibold text-ink-strong tnum">{num($t.chargeA,1)} A</div></div>
    <div><div class="text-ink-dim">System Status</div><div class="font-semibold text-normal">Normal</div></div>
  </div>
</div>
