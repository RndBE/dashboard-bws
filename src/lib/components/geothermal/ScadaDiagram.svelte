<script lang="ts">
  import { num } from '../../format';
  import { geoTelemetry } from '../../geothermal/store';
  import { VALVES } from '../../geothermal/seed.js';
  const t = geoTelemetry;
  let tab = $state<'pid' | '3d' | 'legend'>('pid');
  const valve = (id: string) => VALVES.find((v) => v.id === id)?.open ?? false;
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">SCADA — Well Pad Overview</div>
    <div class="flex items-center rounded-lg border border-line bg-panel-2 p-0.5 text-[10px]">
      {#each [['pid','P&ID'],['3d','3D View'],['legend','Legend']] as [k, lbl]}
        <button onclick={() => (tab = k as typeof tab)} class="rounded-md px-2 py-1 {tab === k ? 'bg-accent/20 text-accent-bright' : 'text-ink-muted'}">{lbl}</button>
      {/each}
    </div>
  </div>

  {#if tab === 'pid'}
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
      <svg viewBox="0 0 560 300" class="w-full rounded-lg bg-panel-2">
        <!-- water/steam pipes: dashed animated stroke -->
        <style>
          .flow { stroke-dasharray: 7 6; animation: dash 1.1s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: -13; } }
        </style>
        <!-- wellhead → separator -->
        <path class="flow" d="M60 210 H200" stroke="#4f9bee" stroke-width="4" fill="none" />
        <!-- separator → heat pipe (steam) -->
        <path class="flow" d="M300 150 H520" stroke="#d8635f" stroke-width="4" fill="none" />
        <!-- separator → v-notch (water) -->
        <path class="flow" d="M300 220 H430 V270" stroke="#4f9bee" stroke-width="4" fill="none" />

        <!-- wellhead -->
        <rect x="30" y="150" width="30" height="90" rx="3" fill="#243244" stroke="#3a516f" />
        <text x="45" y="255" font-size="9" text-anchor="middle" class="fill-current text-ink-dim">Wellhead</text>
        <!-- separator vessel -->
        <rect x="200" y="120" width="100" height="120" rx="10" fill="#2a3a4f" stroke="#3a516f" />
        <text x="250" y="185" font-size="9" text-anchor="middle" class="fill-current text-ink-muted">Separator</text>
        <!-- v-notch channel -->
        <rect x="400" y="270" width="120" height="24" rx="3" fill="#1c2b45" stroke="#3a516f" />

        <!-- valves -->
        {#each [['XV-101', 130, 196], ['XV-102', 470, 138]] as [id, x, y]}
          <g>
            <rect x={x} y={y} width="34" height="16" rx="2" fill={valve(id as string) ? '#153a2a' : '#3a1c1c'} stroke={valve(id as string) ? '#3fb27f' : '#d8635f'} />
            <text x={Number(x) + 17} y={Number(y) + 11} font-size="7" text-anchor="middle" class="fill-current {valve(id as string) ? 'text-normal' : 'text-awas'}">{valve(id as string) ? 'OPEN' : 'SHUT'}</text>
          </g>
        {/each}

        <!-- live sensor chips -->
        {#each [['PT-101', 60, 120, num($t.wellPressure,1)+' bar'], ['PT-102', 320, 110, num($t.heatPipePressure,1)+' bar'], ['TT-101', 250, 90, num($t.temperature,1)+' °C'], ['LT-201', 440, 250, num($t.level,3)+' m']] as [id, x, y, val]}
          <g>
            <rect x={x} y={y} width="70" height="26" rx="3" fill="#0f1a2e" stroke="#3a516f" />
            <text x={Number(x)+35} y={Number(y)+11} font-size="8" text-anchor="middle" class="fill-current text-accent-bright">{id}</text>
            <text x={Number(x)+35} y={Number(y)+21} font-size="8" text-anchor="middle" class="fill-current text-ink-strong">{val}</text>
          </g>
        {/each}
      </svg>

      <!-- V-notch sub-panel -->
      <div class="rounded-lg border border-line bg-panel-2 p-3">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">V-Notch Channel (90°)</div>
        <div class="mt-2 flex items-end justify-between">
          <div><div class="text-[9px] text-ink-dim">Head (H)</div><div class="text-[18px] font-semibold text-ink-strong tnum">{num($t.level,3)} m</div></div>
          <div class="text-right"><div class="text-[9px] text-ink-dim">Flow</div><div class="text-[18px] font-semibold text-ink-strong tnum">{num($t.flowLs,2)} L/s</div></div>
        </div>
        <div class="mt-2 rounded bg-panel px-2 py-1 text-center font-mono text-[11px] text-accent-bright">Q = 1.417 × H^2.5</div>
        <div class="mt-1 text-center text-[9px] text-ink-dim">Q in L/s, H in m · {num($t.flowM3h,2)} m³/h</div>
      </div>
    </div>
  {:else if tab === '3d'}
    <div class="grid h-56 place-items-center rounded-lg bg-panel-2 text-[12px] text-ink-dim">3D view not available in this build</div>
  {:else}
    <div class="grid grid-cols-2 gap-2 p-2 text-[11px] text-ink-muted">
      <div class="flex items-center gap-2"><span class="h-1 w-6 bg-[#d8635f]"></span> Steam / Gas</div>
      <div class="flex items-center gap-2"><span class="h-1 w-6 bg-[#4f9bee]"></span> Water</div>
      <div class="flex items-center gap-2"><span class="h-1 w-6 border-t-2 border-dashed border-ink-dim"></span> Instrument Signal</div>
      <div class="flex items-center gap-2"><span class="h-1 w-6 bg-[#3fb27f]"></span> Electrical / Comm</div>
    </div>
  {/if}
</div>
