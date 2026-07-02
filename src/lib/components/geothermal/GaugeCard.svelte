<script lang="ts">
  import GeoGauge from './GeoGauge.svelte';
  import { num } from '../../format';
  interface Props {
    tag: string; label: string; value: number; unit: string;
    min: number; max: number; digits?: number; color?: string; sublabel?: string;
  }
  let { tag, label, value, unit, min, max, digits = 1, color, sublabel }: Props = $props();
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
    <div class="text-[10px] font-mono text-ink-dim">{tag}</div>
  </div>
  <div class="relative grid place-items-center">
    <GeoGauge {value} {min} {max} {color} />
    <div class="absolute inset-x-0 bottom-1 text-center">
      <div class="text-[22px] font-semibold text-ink-strong tnum">{num(value, digits)}</div>
      <div class="text-[10px] text-ink-muted">{unit}</div>
    </div>
  </div>
  {#if sublabel}<div class="mt-1 text-center text-[10px] text-ink-dim">{sublabel}</div>{/if}
</div>
