<script lang="ts">
  import type { SeriesPoint } from '../../types';
  import { num } from '../../format';
  import { splinePath } from '../../series';

  interface Series {
    name: string;
    color: string;
    points: SeriesPoint[];
  }
  interface Threshold {
    value: number;
    color: string;
    label?: string;
  }
  interface Props {
    series: Series[];
    height?: number;
    unit?: string;
    digits?: number;
    thresholds?: Threshold[];
    yMin?: number;
    yMax?: number;
    /** tampilkan selubung min–max + garis rata-rata (statistical band) */
    band?: boolean;
    /** gambar batang (mis. hujan) alih-alih garis untuk seri tunggal */
    bars?: boolean;
    /**
     * Mode batang untuk banyak seri:
     * - 'grouped' → batang per pos berdiri berdampingan (dijejer)
     * - 'stacked' → batang per pos ditumpuk menjadi satu kolom
     * Diabaikan bila hanya 1 seri (pakai `bars`).
     */
    barMode?: 'grouped' | 'stacked' | null;
  }
  let {
    series,
    height = 320,
    unit = '',
    digits = 1,
    thresholds = [],
    yMin,
    yMax,
    band = false,
    bars = false,
    barMode = null,
  }: Props = $props();

  // apakah render sebagai batang (single, grouped, atau stacked)
  const isBars = $derived(
    (bars && series.filter((s) => s.points.length).length === 1) ||
      (!!barMode && series.filter((s) => s.points.length).length >= 1),
  );

  let w = $state(720);
  let hoverX = $state<number | null>(null);
  const uid = `mx-${Math.round(Math.random() * 1e9).toString(36)}`;

  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 26;

  const g = $derived.by(() => {
    const active = series.filter((s) => s.points.length);
    const len = active.length ? Math.max(...active.map((s) => s.points.length)) : 1;
    const allVals: number[] = [];
    for (const s of active) for (const p of s.points) allVals.push(p.v);
    for (const t of thresholds) allVals.push(t.value);
    if (!allVals.length) allVals.push(0, 1);

    // mode stacked: rentang Y harus mencakup jumlah per indeks (tinggi kolom total)
    if (barMode === 'stacked' && active.length > 1) {
      for (let i = 0; i < len; i++) {
        let sum = 0;
        for (const s of active) if (s.points[i]) sum += s.points[i].v;
        allVals.push(sum);
      }
    }

    let lo = yMin ?? Math.min(...allVals);
    let hi = yMax ?? Math.max(...allVals);
    if (hi - lo < 1e-6) hi = lo + 1;
    const margin = (hi - lo) * 0.12;
    lo -= margin;
    hi += margin;
    const span = hi - lo;

    const innerW = Math.max(10, w - padL - padR);
    const innerH = height - padT - padB;
    const x = (i: number) => padL + (i / Math.max(1, len - 1)) * innerW;
    const y = (v: number) => padT + innerH - ((v - lo) / span) * innerH;

    // kurva spline per seri
    const lines = active.map((s) => ({
      name: s.name,
      color: s.color,
      d: splinePath(s.points.map((p, i) => [x(i), y(p.v)] as const)),
      last: s.points.length
        ? { x: x(s.points.length - 1), y: y(s.points[s.points.length - 1].v) }
        : null,
    }));

    // selubung statistik (min/mean/max per indeks) bila band aktif & >1 seri.
    // Tidak ditampilkan pada mode batang.
    let envFill = '';
    let meanLine = '';
    if (band && active.length > 1 && !isBars) {
      const mins: number[] = [];
      const maxs: number[] = [];
      const means: number[] = [];
      for (let i = 0; i < len; i++) {
        const col: number[] = [];
        for (const s of active) if (s.points[i]) col.push(s.points[i].v);
        if (!col.length) continue;
        mins.push(Math.min(...col));
        maxs.push(Math.max(...col));
        means.push(col.reduce((a, b) => a + b, 0) / col.length);
      }
      const topPath = splinePath(maxs.map((v, i) => [x(i), y(v)] as const));
      // tepi bawah ditelusuri mundur, lalu disambung ke tepi atas
      const botXY = mins.map((_, i) => [x(mins.length - 1 - i), y(mins[mins.length - 1 - i])] as const);
      // ubah perintah "moveto" awal jadi "lineto" agar tersambung mulus ke ujung tepi atas
      const botPath = splinePath(botXY).replace(/^M/, 'L');
      envFill = `${topPath} ${botPath} Z`;
      meanLine = splinePath(means.map((v, i) => [x(i), y(v)] as const));
    }

    const yTicks = [lo + span * 0.1, (lo + hi) / 2, hi - span * 0.1];
    const xIdx = len > 1 ? [0, Math.floor((len - 1) / 2), len - 1] : [0];

    const zeroY = y(Math.max(lo, Math.min(hi, 0)));

    // ---- geometri batang ----
    interface Rect { x: number; y: number; w: number; h: number; color: string }
    const barRects: Rect[] = [];
    const slot = innerW / Math.max(1, len); // lebar slot per langkah waktu
    if (isBars) {
      if (barMode === 'grouped' && active.length > 1) {
        const groupW = slot * 0.72;
        const sub = groupW / active.length;
        for (let i = 0; i < len; i++) {
          const cx = x(i);
          active.forEach((s, si) => {
            const p = s.points[i];
            if (!p) return;
            const bx = cx - groupW / 2 + si * sub;
            const by = Math.min(y(p.v), zeroY);
            barRects.push({ x: bx, y: by, w: Math.max(1, sub * 0.86), h: Math.max(0, Math.abs(zeroY - y(p.v))), color: s.color });
          });
        }
      } else if (barMode === 'stacked' && active.length > 1) {
        const bw = Math.max(2, slot * 0.62);
        for (let i = 0; i < len; i++) {
          let acc = 0;
          active.forEach((s) => {
            const p = s.points[i];
            if (!p) return;
            const yTop = y(acc + p.v);
            const yBot = y(acc);
            barRects.push({ x: x(i) - bw / 2, y: yTop, w: bw, h: Math.max(0, yBot - yTop), color: s.color });
            acc += p.v;
          });
        }
      } else if (active[0]) {
        // seri tunggal
        const bw = Math.max(2, slot * 0.62);
        for (let i = 0; i < active[0].points.length; i++) {
          const p = active[0].points[i];
          barRects.push({ x: x(i) - bw / 2, y: Math.min(y(p.v), zeroY), w: bw, h: Math.max(0, Math.abs(zeroY - y(p.v))), color: active[0].color });
        }
      }
    }

    return {
      active,
      len,
      x,
      y,
      lo,
      hi,
      span,
      innerH,
      lines,
      envFill,
      meanLine,
      yTicks,
      xIdx,
      barRects,
      zeroY,
    };
  });

  const hoverIdx = $derived.by(() => {
    if (hoverX === null || g.len < 1) return null;
    const innerW = Math.max(10, w - padL - padR);
    const rel = (hoverX - padL) / innerW;
    const i = Math.round(rel * (g.len - 1));
    return Math.max(0, Math.min(g.len - 1, i));
  });

  function onMove(e: MouseEvent) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    hoverX = px >= padL && px <= w - padR ? px : null;
  }
  function onLeave() {
    hoverX = null;
  }

  function fmtTime(t: number) {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function fmtDay(t: number) {
    const d = new Date(t);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
</script>

<div class="w-full" bind:clientWidth={w}>
  {#if !g.active.length}
    <div
      class="flex items-center justify-center rounded-lg border border-dashed border-line text-[12px] text-ink-dim"
      style="height:{height}px"
    >
      Tidak ada data untuk ditampilkan — pilih minimal satu pos.
    </div>
  {:else}
    <svg
      viewBox="0 0 {w} {height}"
      class="block w-full select-none"
      style="height:{height}px"
      role="presentation"
      onmousemove={onMove}
      onmouseleave={onLeave}
    >
      <defs>
        {#each g.lines as ln, i}
          <linearGradient id="{uid}-{i}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color={ln.color} stop-opacity={g.active.length > 1 ? 0.04 : 0.22} />
            <stop offset="100%" stop-color={ln.color} stop-opacity="0" />
          </linearGradient>
        {/each}
      </defs>

      <!-- grid + y labels -->
      {#each g.yTicks as tv}
        <line x1={padL} x2={w - padR} y1={g.y(tv)} y2={g.y(tv)} stroke="#1c2740" stroke-width="1" stroke-dasharray="2 4" />
        <text x={padL - 6} y={g.y(tv) + 3} text-anchor="end" class="fill-ink-dim" style="font-size:9px;font-family:var(--font-mono)">
          {num(tv, digits)}
        </text>
      {/each}

      <!-- statistical band -->
      {#if g.envFill}
        <path d={g.envFill} fill="#4f9bee" opacity="0.07" />
        <path d={g.meanLine} fill="none" stroke="#7b8aa3" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.8" />
      {/if}

      <!-- thresholds -->
      {#each thresholds as t}
        <line x1={padL} x2={w - padR} y1={g.y(t.value)} y2={g.y(t.value)} stroke={t.color} stroke-width="1" stroke-dasharray="4 3" opacity="0.7" />
        {#if t.label}
          <text x={w - padR} y={g.y(t.value) - 3} text-anchor="end" style="font-size:8.5px;fill:{t.color};font-weight:600">{t.label}</text>
        {/if}
      {/each}

      <!-- bars (single / grouped / stacked) -->
      {#if isBars}
        {#each g.barRects as r}
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color} opacity="0.82" rx="1.5" />
        {/each}
      {:else}
        <!-- areas + lines -->
        {#each g.lines as ln, i}
          {#if g.active.length === 1}
            <path d="{ln.d} L{g.x(g.active[0].points.length - 1).toFixed(1)} {(padT + g.innerH).toFixed(1)} L{padL} {(padT + g.innerH).toFixed(1)} Z" fill="url(#{uid}-{i})" />
          {/if}
          <path d={ln.d} fill="none" stroke={ln.color} stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" />
          {#if ln.last}
            <circle cx={ln.last.x} cy={ln.last.y} r="2.6" fill={ln.color} />
            <circle cx={ln.last.x} cy={ln.last.y} r="5" fill={ln.color} opacity="0.22" />
          {/if}
        {/each}
      {/if}

      <!-- hover crosshair + points -->
      {#if hoverIdx !== null}
        {@const hx = g.x(hoverIdx)}
        <line x1={hx} x2={hx} y1={padT} y2={padT + g.innerH} stroke="#4f9bee" stroke-width="1" opacity="0.4" />
        {#if !isBars}
          {#each g.lines as ln}
            {#if g.active.find((s) => s.name === ln.name)?.points[hoverIdx]}
              {@const pv = g.active.find((s) => s.name === ln.name)!.points[hoverIdx].v}
              <circle cx={hx} cy={g.y(pv)} r="3.2" fill={ln.color} stroke="#0a0f1c" stroke-width="1.5" />
            {/if}
          {/each}
        {/if}
      {/if}

      <!-- x labels -->
      {#each g.xIdx as i}
        {@const t = g.active[0].points[i]?.t ?? g.active.find((s) => s.points[i])?.points[i]?.t ?? 0}
        <text
          x={g.x(i)}
          y={height - 7}
          text-anchor={i === 0 ? 'start' : i === g.len - 1 ? 'end' : 'middle'}
          class="fill-ink-dim"
          style="font-size:9px;font-family:var(--font-mono)"
        >
          {g.len > 24 ? fmtDay(t) + ' ' : ''}{fmtTime(t)}
        </text>
      {/each}
    </svg>

    <!-- hover tooltip -->
    {#if hoverIdx !== null}
      {@const t = g.active[0].points[hoverIdx]?.t ?? 0}
      <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-[11px]">
        <span class="font-mono text-ink-dim">{fmtDay(t)} {fmtTime(t)}</span>
        {#each g.active as s}
          {#if s.points[hoverIdx]}
            <span class="inline-flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full" style="background:{s.color}"></span>
              <span class="text-ink-muted">{s.name}</span>
              <span class="font-mono font-semibold text-ink-strong tnum">{num(s.points[hoverIdx].v, digits)}{unit}</span>
            </span>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
</div>
