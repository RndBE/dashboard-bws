<script lang="ts">
  import type { SeriesPoint } from '../../types';
  import { num } from '../../format';
  import { splinePath } from '../../series';

  interface Threshold {
    value: number;
    color: string;
    label?: string;
  }
  interface Props {
    points: SeriesPoint[];
    color?: string;
    height?: number;
    unit?: string;
    thresholds?: Threshold[];
    /** paksa rentang sumbu Y */
    yMin?: number;
    yMax?: number;
    digits?: number;
    /** render sebagai batang (mis. curah hujan) alih-alih kurva */
    bars?: boolean;
  }
  let {
    points,
    color = '#4f9bee',
    height = 200,
    unit = '',
    thresholds = [],
    yMin,
    yMax,
    digits = 1,
    bars = false,
  }: Props = $props();

  let w = $state(640);
  const uid = `mc-${Math.round(Math.random() * 1e9).toString(36)}`;

  const padL = 42;
  const padR = 12;
  const padT = 10;
  const padB = 20;

  const g = $derived.by(() => {
    const pts = points.length ? points : [{ t: 0, v: 0 }];
    const vals = pts.map((p) => p.v);
    const thrV = thresholds.map((t) => t.value);
    let lo = yMin ?? Math.min(...vals, ...thrV);
    let hi = yMax ?? Math.max(...vals, ...thrV);
    if (hi - lo < 1e-6) hi = lo + 1;
    const margin = (hi - lo) * 0.12;
    lo -= margin;
    hi += margin;
    const span = hi - lo;

    const innerW = Math.max(10, w - padL - padR);
    const innerH = height - padT - padB;
    const x = (i: number) => padL + (i / Math.max(1, pts.length - 1)) * innerW;
    const y = (v: number) => padT + innerH - ((v - lo) / span) * innerH;

    const xy = pts.map((p, i) => [x(i), y(p.v)] as const);
    const line = splinePath(xy);
    const baseY = padT + innerH;
    const fill = `${line} L${x(pts.length - 1).toFixed(1)} ${baseY.toFixed(
      1,
    )} L${padL} ${baseY.toFixed(1)} Z`;

    const yTicks = [lo + span * 0.12, (lo + hi) / 2, hi - span * 0.12];
    const xIdx = [0, Math.floor((pts.length - 1) / 2), pts.length - 1];

    // geometri batang (mode bars)
    const barW = Math.max(2, (innerW / Math.max(1, pts.length)) * 0.62);
    const zeroY = y(Math.max(lo, Math.min(hi, 0)));

    return {
      line,
      fill,
      x,
      y,
      lo,
      hi,
      pts,
      yTicks,
      xIdx,
      innerH,
      barW,
      zeroY,
      lastX: x(pts.length - 1),
      lastY: y(pts[pts.length - 1].v),
    };
  });

  function fmtTime(t: number) {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes(),
    ).padStart(2, '0')}`;
  }
</script>

<div class="w-full" bind:clientWidth={w}>
  <svg viewBox="0 0 {w} {height}" class="block w-full" style="height:{height}px">
    <defs>
      <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={color} stop-opacity="0.26" />
        <stop offset="100%" stop-color={color} stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- horizontal grid + y labels -->
    {#each g.yTicks as tv}
      <line
        x1={padL}
        x2={w - padR}
        y1={g.y(tv)}
        y2={g.y(tv)}
        stroke="#1c2740"
        stroke-width="1"
        stroke-dasharray="2 4"
      />
      <text
        x={padL - 6}
        y={g.y(tv) + 3}
        text-anchor="end"
        class="fill-ink-dim"
        style="font-size:9px;font-family:var(--font-mono)"
      >
        {num(tv, digits)}
      </text>
    {/each}

    <!-- thresholds -->
    {#each thresholds as t}
      <line
        x1={padL}
        x2={w - padR}
        y1={g.y(t.value)}
        y2={g.y(t.value)}
        stroke={t.color}
        stroke-width="1"
        stroke-dasharray="4 3"
        opacity="0.7"
      />
      {#if t.label}
        <text
          x={w - padR}
          y={g.y(t.value) - 3}
          text-anchor="end"
          style="font-size:8.5px;fill:{t.color};font-weight:600"
        >
          {t.label}
        </text>
      {/if}
    {/each}

    {#if bars}
      <!-- batang (mis. curah hujan) -->
      {#each g.pts as p, i}
        <rect
          x={g.x(i) - g.barW / 2}
          y={Math.min(g.y(p.v), g.zeroY)}
          width={g.barW}
          height={Math.max(0, Math.abs(g.zeroY - g.y(p.v)))}
          fill={color}
          opacity="0.78"
          rx="1.5"
        />
      {/each}
    {:else}
      <!-- area + kurva spline -->
      <path d={g.fill} fill="url(#{uid})" />
      <path
        d={g.line}
        fill="none"
        stroke={color}
        stroke-width="1.8"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <circle cx={g.lastX} cy={g.lastY} r="2.8" fill={color} />
      <circle cx={g.lastX} cy={g.lastY} r="5" fill={color} opacity="0.25" />
    {/if}

    <!-- x labels -->
    {#each g.xIdx as i}
      <text
        x={g.x(i)}
        y={height - 5}
        text-anchor={i === 0 ? 'start' : i === g.pts.length - 1 ? 'end' : 'middle'}
        class="fill-ink-dim"
        style="font-size:9px;font-family:var(--font-mono)"
      >
        {fmtTime(g.pts[i].t)}
      </text>
    {/each}
  </svg>
</div>
