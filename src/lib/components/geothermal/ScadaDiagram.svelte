<script lang="ts">
  import { geoTelemetry } from '../../geothermal/store';
  import { VALVES } from '../../geothermal/seed.js';
  import pidBase from '../../assets/scada-pid-base.png';

  const t = geoTelemetry;
  let tab = $state<'pid' | '3d' | 'legend'>('pid');
  const valve = (id: string) => VALVES.find((v) => v.id === id)?.open ?? false;

  // Dot decimals like the render (the rest of the dashboard uses id-ID commas)
  const fmt = (v: number, d: number) => v.toFixed(d);

  const C = {
    steam: '#e23b28',
    water: '#2f8fe6',
    signal: '#e8b73a',
    elec: '#8fd431',
    unit: '#d3dce8',
    chipFill: '#02182a',
    coverFill: '#031829',
  };

  // Live overlay chips, geometry measured pixel-exact from the reference
  // render (1998x787). Everything else on the P&ID is the render itself.
  const tags = $derived([
    { id: 'PT-101', value: fmt($t.wellPressure, 1), valSize: 30, unit: 'bar(g)', border: '#12aef7', title: '#29b4f8',
      x: 353, y: 158, w: 109, h: 124, titleBase: 186, divY: 194, valBase: 230, unitBase: 261 },
    { id: 'PT-102', value: fmt($t.heatPipePressure, 1), valSize: 33, unit: 'bar(g)', border: '#e98e15', title: '#f7a723',
      x: 854, y: 85, w: 111, h: 129, titleBase: 113, divY: 120, valBase: 161, unitBase: 197 },
    { id: 'TT-101', value: fmt($t.temperature, 1), valSize: 30, unit: '°C', border: '#b968f6', title: '#c47ef8',
      x: 1078, y: 115, w: 103, h: 123, titleBase: 143, divY: 150, valBase: 188, unitBase: 221 },
    { id: 'LT-201', value: fmt($t.level, 3), valSize: 32, unit: 'm', border: '#0f97dd', title: '#2aacf2',
      x: 877, y: 545, w: 117, h: 128, titleBase: 573, divY: 581, valBase: 614, unitBase: 649 },
  ]);

  const valveChips = [
    { id: 'XV-101', x: 480, y: 422, w: 89, h: 35, textY: 446, textSize: 18 },
    { id: 'XV-102', x: 1398, y: 321, w: 88, h: 34, textY: 345, textSize: 18 },
  ];

  // V-notch panel right-column readouts (cover the baked numbers, keep labels)
  const readouts = $derived([
    { value: fmt($t.level, 3), unit: 'm', coverY: 402, coverH: 52, base: 447 },
    { value: fmt($t.flowLs, 2), unit: 'L/s', coverY: 572, coverH: 52, base: 615 },
    { value: fmt($t.flowM3h, 2), unit: 'm³/h', coverY: 664, coverH: 54, base: 709 },
  ]);

  // Baked render labels, covered and redrawn in the app font.
  // cover: [x, y, w, h] hides the original; text is placed at (x, y) baseline.
  const labels = [
    { t: 'V-NOTCH CHANNEL (90°)', x: 1533, y: 342, size: 21, weight: 700, anchor: 'start', color: '#f2f6fa', cover: [1524, 314, 290, 36] },
    { t: 'WATER LEVEL (Head H)', x: 1533, y: 382, size: 19, weight: 400, anchor: 'start', color: '#c9d5e3', cover: [1524, 357, 250, 34] },
    { t: 'HEAD (H)', x: 1907, y: 392, size: 16, weight: 600, anchor: 'middle', color: '#d3dce8', cover: [1842, 372, 130, 28] },
    { t: 'FLOW RATE', x: 1907, y: 529, size: 16, weight: 600, anchor: 'middle', color: '#d3dce8', cover: [1842, 509, 130, 26] },
    { t: '(Calculated)', x: 1907, y: 558, size: 15.5, weight: 400, anchor: 'middle', color: '#c9d5e3', cover: [1842, 537, 130, 28] },
    { t: 'V-NOTCH 90° WEIR FORMULA', x: 1670, y: 666, size: 16, weight: 600, ls: 1, anchor: 'middle', color: '#c9d5e3', cover: [1530, 640, 276, 36] },
    { t: '(Q in L/s, H in m)', x: 1668, y: 748, size: 15, weight: 400, anchor: 'middle', color: '#8fa0b5', cover: [1586, 726, 166, 28] },
    { t: 'FROM WELLHEAD', x: 212, y: 130, size: 22, weight: 600, ls: 1.2, anchor: 'middle', color: '#e9eef4', cover: [119, 109, 187, 28] },
    { t: 'TO SEPARATOR', x: 747, y: 152, size: 22, weight: 600, ls: 1.2, anchor: 'middle', color: '#e9eef4', cover: [664, 130, 168, 28] },
    { t: 'STEAM / HEAT PIPE', x: 1576, y: 208, size: 22, weight: 600, ls: 1.2, anchor: 'middle', color: '#e9eef4', cover: [1471, 185, 210, 29] },
    { t: 'TO V-NOTCH CHANNEL', x: 1281, y: 634, size: 22, weight: 600, ls: 1.2, anchor: 'middle', color: '#e9eef4', cover: [1161, 613, 240, 27] },
    { t: 'XV-101', x: 522, y: 487, size: 20, weight: 600, anchor: 'middle', color: '#eef2f6', cover: [482, 465, 80, 28] },
    { t: 'XV-102', x: 1442, y: 385, size: 20, weight: 600, anchor: 'middle', color: '#eef2f6', cover: [1390, 360, 104, 31] },
    { t: 'STEAM / GAS', x: 112, y: 585, size: 17, weight: 400, anchor: 'start', color: '#eef2f6', cover: [106, 566, 152, 25] },
    { t: 'WATER', x: 112, y: 628, size: 17, weight: 400, anchor: 'start', color: '#eef2f6', cover: [106, 609, 90, 25] },
    { t: 'INSTRUMENT SIGNAL', x: 112, y: 671, size: 17, weight: 400, anchor: 'start', color: '#eef2f6', cover: [106, 652, 230, 25] },
    { t: 'ELECTRICAL / COMM', x: 112, y: 715, size: 17, weight: 400, anchor: 'start', color: '#eef2f6', cover: [106, 696, 226, 26] },
  ];
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 flex items-center justify-between">
    <div class="text-[13px] font-bold tracking-wide text-ink-strong">
      SCADA - WELL PAD OVERVIEW
    </div>
    <div class="flex items-center gap-1.5 text-[11px]">
      {#each [['pid', 'P&ID'], ['3d', '3D VIEW'], ['legend', 'LEGEND']] as [k, lbl]}
        <button
          onclick={() => (tab = k as typeof tab)}
         
          class="rounded-lg border px-4 py-1.5 font-bold tracking-wide transition-colors {tab === k
            ? 'border-[#aebdd0] bg-[#122036] text-white'
            : 'border-[#5c6d83] bg-[#0a1526] text-[#dbe4ef] hover:border-[#8fa2ba] hover:text-white'}">{lbl}</button>
      {/each}
    </div>
  </div>

  {#if tab === 'pid'}
    <!-- Reference render as base layer, cropped past its own frame + title bar;
         live telemetry drawn on top of the baked-in chips at matched positions. -->
    <svg viewBox="8 72 1982 702" class="w-full rounded-lg">
      <defs>
        <filter id="valveGlow" x="-40%" y="-80%" width="180%" height="260%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#8fd431" flood-opacity="0.25" />
        </filter>
        <filter id="valveGlowShut" x="-40%" y="-80%" width="180%" height="260%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#ff5a4e" flood-opacity="0.32" />
        </filter>
      </defs>

      <image href={pidBase} x="0" y="0" width="1998" height="787" preserveAspectRatio="none" />

      <!-- baked labels covered, then redrawn in the app font -->
      {#each labels as l}
        <rect x={l.cover[0]} y={l.cover[1]} width={l.cover[2]} height={l.cover[3]} fill="#021627" />
      {/each}
      <rect x="1550" y="678" width="236" height="42" fill="#021627" />
      {#each labels as l}
        <text x={l.x} y={l.y} font-size={l.size} font-weight={l.weight} letter-spacing={l.ls ?? 0} text-anchor={l.anchor} fill={l.color}>{l.t}</text>
      {/each}
      <text x="1668" y="709" font-size="26" font-weight="700" text-anchor="middle" fill="#ffffff">Q = 1.417 × H<tspan font-size="16" dy="-11">2.5</tspan></text>

      <!-- instrument tag chips -->
      {#each tags as g}
        <g>
          <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="9" fill={C.chipFill} stroke={g.border} stroke-width="2" />
          <rect x={g.x + 2} y={g.y + 2} width={g.w - 4} height={g.h - 4} rx="7.5" fill="none" stroke={g.border} stroke-width="3.5" opacity="0.07" />
          <text x={g.x + g.w / 2} y={g.titleBase} font-size="21" font-weight="700" text-anchor="middle" fill={g.title}>{g.id}</text>
          <line x1={g.x} y1={g.divY} x2={g.x + g.w} y2={g.divY} stroke={g.border} stroke-width="2" />
          <text x={g.x + g.w / 2} y={g.valBase} font-size={g.valSize} font-weight="700" text-anchor="middle" fill="#ffffff">{g.value}</text>
          <text x={g.x + g.w / 2} y={g.unitBase} font-size="21" text-anchor="middle" fill={C.unit}>{g.unit}</text>
        </g>
      {/each}

      <!-- valve state chips (labels XV-101/102 are part of the render) -->
      {#each valveChips as v}
        {@const open = valve(v.id)}
        <g filter={open ? 'url(#valveGlow)' : 'url(#valveGlowShut)'}>
          <rect x={v.x} y={v.y} width={v.w} height={v.h} rx="6" fill="#04120a" stroke={open ? C.elec : '#ff5a4e'} stroke-width="2" />
          <rect x={v.x + 2} y={v.y + 2} width={v.w - 4} height={v.h - 4} rx="4.5" fill="none" stroke={open ? C.elec : '#ff5a4e'} stroke-width="3.5" opacity="0.14" />
          <text x={v.x + v.w / 2} y={v.textY} font-size={v.textSize} font-weight="700" letter-spacing="0.5" text-anchor="middle" fill={open ? '#b4f04d' : '#ff6c60'}>{open ? 'OPEN' : 'SHUT'}</text>
        </g>
      {/each}

      <!-- V-notch panel live readouts -->
      {#each readouts as r}
        <g>
          <rect x="1838" y={r.coverY} width="134" height={r.coverH} fill={C.coverFill} />
          <text x="1842" y={r.base} font-size="26" font-weight="700" fill="#ffffff">{r.value}</text>
          <text x="1970" y={r.base} font-size="18" text-anchor="end" fill={C.unit}>{r.unit}</text>
        </g>
      {/each}
    </svg>
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
