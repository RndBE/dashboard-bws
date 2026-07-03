<script lang="ts">
  import { num } from '../../format';
  interface Props { value: number; min: number; max: number; unit: string; digits?: number; color?: string; }
  let { value, min, max, unit, digits = 3, color = '#22b8e0' }: Props = $props();

  const frac = $derived(Math.max(0, Math.min(1, (value - min) / (max - min))));
  const ticks = [1, 0.8, 0.6, 0.4, 0.2, 0];
</script>

<div class="flex items-center justify-center gap-3 py-1">
  <!-- scale -->
  <div class="flex h-[78px] flex-col justify-between py-[1px] text-right text-[8px] leading-none text-ink-dim tnum">
    {#each ticks as tk}<span>{(min + tk * (max - min)).toFixed(1)}</span>{/each}
  </div>
  <!-- tank -->
  <div class="relative h-[78px] w-[64px] overflow-hidden rounded-sm border border-line bg-black/30">
    <div
      class="absolute inset-x-0 bottom-0 transition-[height] duration-500"
      style="height:{frac * 100}%; background:linear-gradient(to top, {color}, {color}bb)"
    >
      <div class="absolute inset-x-0 top-0 h-1.5" style="background:linear-gradient(to bottom, #ffffff55, transparent)"></div>
    </div>
  </div>
  <!-- value -->
  <div class="min-w-[54px]">
    <div class="text-[22px] font-semibold tnum" style="color:{color}">{num(value, digits)}</div>
    <div class="text-[10px] text-ink-muted">{unit}</div>
  </div>
</div>
