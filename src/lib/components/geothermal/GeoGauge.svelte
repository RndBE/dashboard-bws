<script lang="ts">
  interface Props { value: number; min: number; max: number; color?: string; segments?: number; }
  let { value, min, max, color = '#4f9bee', segments = 5 }: Props = $props();

  const R = 60;
  const CX = 80;
  const CY = 80;
  // polar→cartesian for a semicircle spanning 180°..360° (left→right, top half)
  function pt(frac: number, r = R): [number, number] {
    const a = Math.PI + frac * Math.PI; // π..2π
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  }
  function arc(f0: number, f1: number): string {
    const [x0, y0] = pt(f0);
    const [x1, y1] = pt(f1);
    const large = f1 - f0 > 0.5 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  const frac = $derived(Math.max(0, Math.min(1, (value - min) / (max - min))));

  const ticks = $derived(
    Array.from({ length: segments + 1 }, (_, i) => {
      const f = i / segments;
      const v = min + f * (max - min);
      const [tx, ty] = pt(f, R + 11);
      const [ix, iy] = pt(f, R - 6);
      const [ox, oy] = pt(f, R + 1);
      const anchor = tx < CX - 3 ? 'end' : tx > CX + 3 ? 'start' : 'middle';
      const label = Number.isInteger(v) ? String(v) : v.toFixed(v < 10 ? 1 : 0);
      return { tx, ty, ix, iy, ox, oy, anchor, label };
    })
  );
</script>

<svg width="164" height="98" viewBox="0 0 164 98">
  {#each ticks as tk}
    <line x1={tk.ix} y1={tk.iy} x2={tk.ox} y2={tk.oy} stroke="var(--color-line)" stroke-width="1.4" />
    <text x={tk.tx} y={tk.ty + 3} class="fill-current text-ink-dim" font-size="8" text-anchor={tk.anchor}>{tk.label}</text>
  {/each}
  <path d={arc(0, 1)} fill="none" stroke="var(--color-line)" stroke-width="9" stroke-linecap="round" />
  <path d={arc(0, frac)} fill="none" stroke={color} stroke-width="9" stroke-linecap="round" />
</svg>
