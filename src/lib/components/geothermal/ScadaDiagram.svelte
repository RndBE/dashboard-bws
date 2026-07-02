<script lang="ts">
  import { num } from '../../format';
  import { geoTelemetry } from '../../geothermal/store';
  import { VALVES } from '../../geothermal/seed.js';

  const t = geoTelemetry;
  let tab = $state<'pid' | '3d' | 'legend'>('pid');
  const valve = (id: string) => VALVES.find((v) => v.id === id)?.open ?? false;

  // Color code (shared with the legend)
  const C = {
    steam: '#e0736b', // steam / gas (two-phase & heat pipe)
    water: '#4f9bee', // water line
    signal: '#c9a227', // instrument signal (dashed leaders)
    elec: '#3fb27f', // electrical / comm
    metal: '#35485f',
    metalDark: '#243244',
    metalEdge: '#5b7089',
  };

  // Instrument tag chips: id + live value, colored accent, dashed leader to tap point.
  const tags = $derived([
    { id: 'PT-101', val: `${num($t.wellPressure, 1)} bar(g)`, color: C.water, x: 118, y: 92, tapX: 150, tapY: 180 },
    { id: 'PT-102', val: `${num($t.heatPipePressure, 1)} bar(g)`, color: '#e08a3c', x: 236, y: 96, tapX: 270, tapY: 158 },
    { id: 'TT-101', val: `${num($t.temperature, 1)} °C`, color: '#a78bfa', x: 320, y: 96, tapX: 348, tapY: 158 },
    { id: 'LT-201', val: `${num($t.level, 3)} m`, color: C.elec, x: 470, y: 204, tapX: 505, tapY: 250 },
  ]);

  const valves = [
    { id: 'XV-101', cx: 360, cy: 250 }, // water line
    { id: 'XV-102', cx: 470, cy: 112 }, // steam / heat pipe
  ];

  // V-notch weir illustration — water fills the 90° notch up to head H (live).
  const VERTEX_Y = 84;
  const MAX_RISE = 48;
  const waterFrac = $derived(Math.max(0.08, Math.min(1, ($t.level - 0.3) / 0.25)));
  const halfW = $derived(waterFrac * MAX_RISE);
  const waterY = $derived(VERTEX_Y - halfW);
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">SCADA — Well Pad Overview</div>
    <div class="flex items-center rounded-lg border border-line bg-panel-2 p-0.5 text-[10px]">
      {#each [['pid', 'P&ID'], ['3d', '3D View'], ['legend', 'Legend']] as [k, lbl]}
        <button onclick={() => (tab = k as typeof tab)} class="rounded-md px-2 py-1 {tab === k ? 'bg-accent/20 text-accent-bright' : 'text-ink-muted'}">{lbl}</button>
      {/each}
    </div>
  </div>

  {#if tab === 'pid'}
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
      <!-- ============================ P&ID ============================ -->
      <svg viewBox="0 0 620 350" class="w-full rounded-lg" style="background:#0d1728">
        <!-- process pipes (drawn first, animated flow overlaid) -->
        <!-- wellhead → separator (two-phase, hot) -->
        <path d="M80 180 H210" stroke={C.steam} stroke-width="5" fill="none" />
        <path class="flow" d="M80 180 H210" stroke={C.steam} stroke-width="5" fill="none" stroke-opacity="0.9" />
        <!-- separator → steam / heat pipe -->
        <path d="M345 158 V112 H578" stroke={C.steam} stroke-width="5" fill="none" />
        <path class="flow" d="M345 158 V112 H578" stroke={C.steam} stroke-width="5" fill="none" stroke-opacity="0.9" />
        <!-- separator → water line → v-notch -->
        <path d="M300 206 V250 H460" stroke={C.water} stroke-width="5" fill="none" />
        <path class="flow" d="M300 206 V250 H460" stroke={C.water} stroke-width="5" fill="none" stroke-opacity="0.9" />
        <!-- steam pipe arrowhead -->
        <path d="M578 112 l-9 -5 v10 z" fill={C.steam} />
        <text x="470" y="98" font-size="9" text-anchor="middle" letter-spacing="1" class="fill-current text-ink-muted">STEAM / HEAT PIPE</text>

        <!-- ground / skid line -->
        <line x1="34" y1="286" x2="586" y2="286" stroke="#2a3a4f" stroke-width="1.5" />

        <!-- ===== wellhead (christmas tree) ===== -->
        <g stroke={C.metalEdge} stroke-width="1.4">
          <!-- riser -->
          <rect x="74" y="122" width="12" height="164" fill={C.metal} />
          <!-- wellhead spool at base -->
          <rect x="62" y="272" width="36" height="14" rx="2" fill={C.metalDark} />
          <!-- flanges -->
          <rect x="66" y="200" width="28" height="7" rx="1.5" fill={C.metalDark} />
          <rect x="66" y="240" width="28" height="7" rx="1.5" fill={C.metalDark} />
          <!-- top gauge -->
          <circle cx="80" cy="122" r="7" fill={C.metalDark} />
          <circle cx="80" cy="122" r="2.5" fill={C.steam} stroke="none" />
        </g>
        <!-- christmas-tree gate valves (bowtie) on riser -->
        {#each [212, 252] as gy}
          <g stroke={C.metalEdge} stroke-width="1.2">
            <polygon points="66,{gy - 7} 66,{gy + 7} 80,{gy}" fill={C.metal} />
            <polygon points="94,{gy - 7} 94,{gy + 7} 80,{gy}" fill={C.metal} />
          </g>
        {/each}
        <!-- production wing outlet -->
        <rect x="80" y="176" width="14" height="8" fill={C.metalDark} stroke={C.metalEdge} stroke-width="1.2" />
        <text x="80" y="302" font-size="9" text-anchor="middle" letter-spacing="0.5" class="fill-current text-ink-dim">FROM WELLHEAD</text>

        <!-- ===== separator (horizontal drum) ===== -->
        <g>
          <rect x="210" y="158" width="150" height="48" fill={C.metal} stroke={C.metalEdge} stroke-width="1.4" />
          <ellipse cx="210" cy="182" rx="15" ry="24" fill={C.metalDark} stroke={C.metalEdge} stroke-width="1.4" />
          <ellipse cx="360" cy="182" rx="15" ry="24" fill="#3d5169" stroke={C.metalEdge} stroke-width="1.4" />
          <!-- liquid level inside -->
          <path d="M210 190 h150 v16 h-150 z" fill={C.water} fill-opacity="0.28" />
          <line x1="210" y1="190" x2="360" y2="190" stroke={C.water} stroke-width="1.2" stroke-opacity="0.7" />
          <!-- top highlight -->
          <line x1="216" y1="164" x2="354" y2="164" stroke={C.metalEdge} stroke-width="1" stroke-opacity="0.5" />
          <!-- saddle supports -->
          <polygon points="240,206 232,226 262,226 254,206" fill={C.metalDark} stroke={C.metalEdge} stroke-width="1.1" />
          <polygon points="322,206 314,226 344,226 336,206" fill={C.metalDark} stroke={C.metalEdge} stroke-width="1.1" />
          <text x="285" y="140" font-size="9" text-anchor="middle" letter-spacing="1" class="fill-current text-ink-muted">SEPARATOR V-101</text>
        </g>

        <!-- ===== v-notch outfall channel (top-down mini) ===== -->
        <g>
          <rect x="460" y="242" width="104" height="18" rx="2" fill="#12233d" stroke="#31486a" stroke-width="1.2" />
          <path d="M498 242 l8 9 -8 9" fill="none" stroke={C.elec} stroke-width="1.4" />
          <path d="M514 242 l8 9 -8 9" fill="none" stroke={C.elec} stroke-width="1.4" />
          <rect x="461" y="251" width="102" height="8" fill={C.water} fill-opacity="0.3" />
          <text x="512" y="274" font-size="8" text-anchor="middle" class="fill-current text-ink-dim">V-NOTCH CH.</text>
        </g>

        <!-- ===== valves (ISA bowtie + actuator) ===== -->
        {#each valves as v}
          {@const open = valve(v.id)}
          <g>
            <polygon points="{v.cx - 11},{v.cy - 8} {v.cx - 11},{v.cy + 8} {v.cx},{v.cy}" fill={open ? '#173d2b' : '#3a1c1c'} stroke={open ? C.elec : '#d8635f'} stroke-width="1.5" />
            <polygon points="{v.cx + 11},{v.cy - 8} {v.cx + 11},{v.cy + 8} {v.cx},{v.cy}" fill={open ? '#173d2b' : '#3a1c1c'} stroke={open ? C.elec : '#d8635f'} stroke-width="1.5" />
            <rect x={v.cx - 4} y={v.cy - 16} width="8" height="7" rx="1" fill={C.metalDark} stroke={C.metalEdge} stroke-width="1" />
            <line x1={v.cx} y1={v.cy - 9} x2={v.cx} y2={v.cy} stroke={C.metalEdge} stroke-width="1.2" />
            <text x={v.cx} y={v.cy + 24} font-size="7.5" text-anchor="middle" class="fill-current text-ink-dim">{v.id}</text>
            <text x={v.cx} y={v.cy + 33} font-size="7.5" font-weight="700" text-anchor="middle" class="fill-current {open ? 'text-normal' : 'text-awas'}">{open ? 'OPEN' : 'SHUT'}</text>
          </g>
        {/each}

        <!-- ===== instrument tags (chip + dashed signal leader) ===== -->
        {#each tags as tag}
          <g>
            <line x1={tag.tapX} y1={tag.tapY} x2={tag.x + 38} y2={tag.y + 28} stroke={C.signal} stroke-width="1" stroke-dasharray="3 3" stroke-opacity="0.8" />
            <circle cx={tag.tapX} cy={tag.tapY} r="2.6" fill="none" stroke={C.signal} stroke-width="1.3" />
            <rect x={tag.x} y={tag.y} width="76" height="28" rx="3" fill="#0f1a2e" stroke={tag.color} stroke-width="1.2" />
            <rect x={tag.x} y={tag.y} width="3.5" height="28" rx="1.5" fill={tag.color} />
            <text x={tag.x + 10} y={tag.y + 12} font-size="8.5" font-weight="700" class="fill-current" style="fill:{tag.color}">{tag.id}</text>
            <text x={tag.x + 10} y={tag.y + 22} font-size="8.5" class="fill-current text-ink-strong">{tag.val}</text>
          </g>
        {/each}

        <!-- ===== legend strip ===== -->
        <g font-size="8" transform="translate(40,326)">
          <line x1="0" y1="0" x2="18" y2="0" stroke={C.steam} stroke-width="3" /><text x="24" y="3" class="fill-current text-ink-muted">Steam / Gas</text>
          <line x1="120" y1="0" x2="138" y2="0" stroke={C.water} stroke-width="3" /><text x="144" y="3" class="fill-current text-ink-muted">Water</text>
          <line x1="220" y1="0" x2="238" y2="0" stroke={C.signal} stroke-width="2" stroke-dasharray="3 3" /><text x="244" y="3" class="fill-current text-ink-muted">Instrument Signal</text>
          <line x1="400" y1="0" x2="418" y2="0" stroke={C.elec} stroke-width="2" stroke-dasharray="3 3" /><text x="424" y="3" class="fill-current text-ink-muted">Electrical / Comm</text>
        </g>
      </svg>

      <!-- ===================== V-notch panel ===================== -->
      <div class="flex flex-col rounded-lg border border-line bg-panel-2 p-3">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">V-Notch Channel (90°)</div>
        <div class="text-[9px] text-ink-dim">Water Level (Head H)</div>

        <!-- weir illustration (front view of the 90° notch, live water fill) -->
        <svg viewBox="0 0 200 118" class="mt-2 w-full">
          <!-- channel walls -->
          <rect x="18" y="14" width="164" height="92" rx="3" fill="#0d1728" stroke="#2a3a4f" stroke-width="1.2" />
          <!-- weir plate -->
          <rect x="26" y="20" width="148" height="80" fill="#1c2b45" />
          <!-- 90° notch opening cut into the plate -->
          <polygon points="100,{VERTEX_Y} 52,36 148,36" fill="#0d1728" />
          <polygon points="100,{VERTEX_Y} 52,36 148,36" fill="none" stroke="#3a516f" stroke-width="1.2" />
          <!-- water filling the notch up to head H -->
          <polygon points="100,{VERTEX_Y} {100 - halfW},{waterY} {100 + halfW},{waterY}" fill={C.water} fill-opacity="0.7" />
          <!-- approach water surface -->
          <line x1="26" y1={waterY} x2="174" y2={waterY} stroke={C.water} stroke-width="1.4" stroke-opacity="0.85" />
          <rect x="26" y={waterY} width="148" height={100 - waterY} fill={C.water} fill-opacity="0.14" />
          <!-- nappe (jet through notch) -->
          <path d="M{100 - 5},{VERTEX_Y} q3,10 0,18 M{100 + 5},{VERTEX_Y} q-3,10 0,18" stroke={C.water} stroke-width="2" fill="none" stroke-opacity="0.55" />
          <!-- head (H) dimension -->
          <g stroke={C.signal} stroke-width="1">
            <line x1="40" y1={waterY} x2="40" y2={VERTEX_Y} />
            <line x1="36" y1={waterY} x2="44" y2={waterY} />
            <line x1="36" y1={VERTEX_Y} x2="44" y2={VERTEX_Y} />
          </g>
          <text x="47" y={(waterY + VERTEX_Y) / 2 + 3} font-size="9" font-weight="700" style="fill:{C.signal}">H</text>
          <text x="100" y="112" font-size="7.5" text-anchor="middle" class="fill-current text-ink-dim">90° V-NOTCH WEIR</text>
        </svg>

        <div class="mt-2 space-y-2">
          <div class="flex items-baseline justify-between">
            <span class="text-[9px] uppercase tracking-wide text-ink-dim">Head (H)</span>
            <span class="text-[17px] font-semibold text-ink-strong tnum">{num($t.level, 3)} m</span>
          </div>
          <div class="flex items-baseline justify-between border-t border-line/60 pt-2">
            <span class="text-[9px] uppercase tracking-wide text-ink-dim">Flow (calc.)</span>
            <span class="text-right">
              <span class="text-[17px] font-semibold text-ink-strong tnum">{num($t.flowLs, 2)}</span>
              <span class="text-[10px] text-ink-muted"> L/s</span>
              <span class="ml-1 text-[11px] text-ink-muted tnum">· {num($t.flowM3h, 2)} m³/h</span>
            </span>
          </div>
        </div>

        <div class="mt-auto pt-3">
          <div class="text-[8.5px] uppercase tracking-wide text-ink-dim">90° Weir Formula</div>
          <div class="mt-1 rounded bg-panel px-2 py-1.5 text-center font-mono text-[12px] text-accent-bright">Q = 1.417 × H<sup>2.5</sup></div>
          <div class="mt-1 text-center text-[9px] text-ink-dim">Q in L/s, H in m</div>
        </div>
      </div>
    </div>
  {:else if tab === '3d'}
    <div class="grid h-56 place-items-center rounded-lg bg-panel-2 text-[12px] text-ink-dim">3D view not available in this build</div>
  {:else}
    <div class="grid grid-cols-2 gap-2 p-2 text-[11px] text-ink-muted">
      <div class="flex items-center gap-2"><span class="h-1 w-6" style="background:{C.steam}"></span> Steam / Gas</div>
      <div class="flex items-center gap-2"><span class="h-1 w-6" style="background:{C.water}"></span> Water</div>
      <div class="flex items-center gap-2"><span class="h-0 w-6 border-t-2 border-dashed" style="border-color:{C.signal}"></span> Instrument Signal</div>
      <div class="flex items-center gap-2"><span class="h-0 w-6 border-t-2 border-dashed" style="border-color:{C.elec}"></span> Electrical / Comm</div>
    </div>
  {/if}
</div>

<style>
  .flow {
    stroke-dasharray: 8 8;
    animation: scada-dash 1.1s linear infinite;
  }
  @keyframes scada-dash {
    to {
      stroke-dashoffset: -16;
    }
  }
</style>
