<script lang="ts">
  import GeoGauge from './GeoGauge.svelte';
  import GeoTank from './GeoTank.svelte';
  import { num } from '../../format';
  interface Props {
    tag: string; label: string; value: number; unit: string;
    min: number; max: number; digits?: number; color?: string;
    variant?: 'gauge' | 'tank';
    footL?: string; footR?: string; footRPill?: boolean;
  }
  let {
    tag, label, value, unit, min, max, digits = 1, color = '#4f9bee',
    variant = 'gauge', footL, footR, footRPill = false,
  }: Props = $props();
</script>

<div class="flex flex-col rounded-xl border border-line bg-panel p-3">
  <div class="leading-tight">
    <div class="text-[11px] font-bold uppercase tracking-wide" style="color:{color}">{label}</div>
    <div class="text-[10px] font-mono text-ink-dim">{tag}</div>
  </div>

  {#if variant === 'tank'}
    <div class="flex h-[104px] items-center justify-center">
      <GeoTank {value} {min} {max} {unit} {digits} {color} />
    </div>
  {:else}
    <div class="relative flex h-[104px] items-end justify-center">
      <GeoGauge {value} {min} {max} {color} />
      <div class="absolute inset-x-0 bottom-2 text-center">
        <div class="text-[22px] font-semibold text-ink-strong tnum">{num(value, digits)}</div>
        <div class="text-[10px] text-ink-muted">{unit}</div>
      </div>
    </div>
  {/if}

  {#if footL || footR}
    <div class="mt-1 flex items-center justify-between text-[10px] text-ink-dim">
      <span>{footL ?? ''}</span>
      {#if footR}
        {#if footRPill}
          <span class="flex items-center gap-1 font-semibold text-normal"><span class="h-1.5 w-1.5 rounded-full bg-normal"></span>{footR}</span>
        {:else}
          <span class="text-ink-muted">{footR}</span>
        {/if}
      {/if}
    </div>
  {/if}
</div>
