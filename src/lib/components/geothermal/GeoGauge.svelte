<script lang="ts">
  interface Props { value: number; min: number; max: number; color?: string; }
  let { value, min, max, color = '#4f9bee' }: Props = $props();

  const R = 62;
  const CX = 80;
  const CY = 78;
  // polar→cartesian for a semicircle spanning 180°..360° (left→right, top half)
  function pt(frac: number): [number, number] {
    const a = Math.PI + frac * Math.PI; // π..2π
    return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
  }
  function arc(f0: number, f1: number): string {
    const [x0, y0] = pt(f0);
    const [x1, y1] = pt(f1);
    const large = f1 - f0 > 0.5 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  const frac = $derived(Math.max(0, Math.min(1, (value - min) / (max - min))));
</script>

<svg width="160" height="92" viewBox="0 0 160 92">
  <path d={arc(0, 1)} fill="none" stroke="var(--color-line)" stroke-width="9" stroke-linecap="round" />
  <path d={arc(0, frac)} fill="none" stroke={color} stroke-width="9" stroke-linecap="round" />
  <text x="18" y="90" class="fill-current text-ink-dim" font-size="8">{min}</text>
  <text x="132" y="90" class="fill-current text-ink-dim" font-size="8" text-anchor="end">{max}</text>
</svg>
