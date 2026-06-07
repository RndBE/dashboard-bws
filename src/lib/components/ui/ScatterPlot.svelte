<script lang="ts">
  import { num } from '../../format';

  interface Pt {
    x: number;
    y: number;
    color?: string;
  }
  interface Props {
    points: Pt[];
    height?: number;
    xLabel?: string;
    yLabel?: string;
    color?: string;
    /** garis regresi linier */
    fit?: boolean;
  }
  let {
    points,
    height = 240,
    xLabel = '',
    yLabel = '',
    color = '#4f9bee',
    fit = true,
  }: Props = $props();

  let w = $state(420);
  const padL = 40;
  const padR = 14;
  const padT = 12;
  const padB = 30;

  const g = $derived.by(() => {
    const pts = points.length ? points : [];
    if (!pts.length) return null;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    let xlo = Math.min(...xs);
    let xhi = Math.max(...xs);
    let ylo = Math.min(...ys);
    let yhi = Math.max(...ys);
    if (xhi - xlo < 1e-6) xhi = xlo + 1;
    if (yhi - ylo < 1e-6) yhi = ylo + 1;
    const mx = (xhi - xlo) * 0.08;
    const my = (yhi - ylo) * 0.08;
    xlo -= mx;
    xhi += mx;
    ylo -= my;
    yhi += my;

    const innerW = Math.max(10, w - padL - padR);
    const innerH = height - padT - padB;
    const sx = (v: number) => padL + ((v - xlo) / (xhi - xlo)) * innerW;
    const sy = (v: number) => padT + innerH - ((v - ylo) / (yhi - ylo)) * innerH;

    // regresi linier (least squares)
    let line = '';
    const n = pts.length;
    if (fit && n >= 2) {
      let sX = 0;
      let sY = 0;
      let sXY = 0;
      let sXX = 0;
      for (const p of pts) {
        sX += p.x;
        sY += p.y;
        sXY += p.x * p.y;
        sXX += p.x * p.x;
      }
      const den = n * sXX - sX * sX;
      if (Math.abs(den) > 1e-9) {
        const slope = (n * sXY - sX * sY) / den;
        const intercept = (sY - slope * sX) / n;
        const y1 = slope * xlo + intercept;
        const y2 = slope * xhi + intercept;
        line = `M${sx(xlo)} ${sy(y1)} L${sx(xhi)} ${sy(y2)}`;
      }
    }

    return {
      sx,
      sy,
      xlo,
      xhi,
      ylo,
      yhi,
      innerH,
      xTicks: [xlo, (xlo + xhi) / 2, xhi],
      yTicks: [ylo, (ylo + yhi) / 2, yhi],
      line,
      pts,
    };
  });
</script>

<div class="w-full" bind:clientWidth={w}>
  {#if !g}
    <div class="flex items-center justify-center rounded-lg border border-dashed border-line text-[12px] text-ink-dim" style="height:{height}px">
      Data tidak cukup.
    </div>
  {:else}
    <svg viewBox="0 0 {w} {height}" class="block w-full" style="height:{height}px">
      {#each g.yTicks as tv}
        <line x1={padL} x2={w - padR} y1={g.sy(tv)} y2={g.sy(tv)} style="stroke:var(--color-line)" stroke-width="1" stroke-dasharray="2 4" />
        <text x={padL - 5} y={g.sy(tv) + 3} text-anchor="end" class="fill-ink-dim" style="font-size:8.5px;font-family:var(--font-mono)">{num(tv, 1)}</text>
      {/each}
      {#each g.xTicks as tv}
        <text x={g.sx(tv)} y={height - 14} text-anchor="middle" class="fill-ink-dim" style="font-size:8.5px;font-family:var(--font-mono)">{num(tv, 1)}</text>
      {/each}

      {#if g.line}
        <path d={g.line} stroke="#f0b429" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.8" fill="none" />
      {/if}

      {#each g.pts as p}
        <circle cx={g.sx(p.x)} cy={g.sy(p.y)} r="3" fill={p.color ?? color} opacity="0.7" />
      {/each}

      <text x={(padL + w - padR) / 2} y={height - 1} text-anchor="middle" class="fill-ink-muted" style="font-size:9px">{xLabel}</text>
      <text x={11} y={padT + g.innerH / 2} text-anchor="middle" transform="rotate(-90 11 {padT + g.innerH / 2})" class="fill-ink-muted" style="font-size:9px">{yLabel}</text>
    </svg>
  {/if}
</div>
