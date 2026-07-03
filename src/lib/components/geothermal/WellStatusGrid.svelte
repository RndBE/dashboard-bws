<!-- src/lib/components/geothermal/WellStatusGrid.svelte -->
<script lang="ts">
  import { num } from '../../format';
  import { geoWells, geoSelectedWellId, geoSection } from '../../geothermal/store';
  import type { GeoStatus } from '../../geothermal/types';

  const DOT: Record<GeoStatus, string> = {
    normal: 'bg-emerald-500', waspada: 'bg-amber-500',
    siaga: 'bg-orange-500', awas: 'bg-red-500',
  };

  function open(id: string) {
    geoSelectedWellId.set(id);
    geoSection.set('wells');
  }
</script>

<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
  {#each $geoWells as w}
    <button
      onclick={() => open(w.id)}
      class="rounded-xl border border-line bg-panel p-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div class="flex items-center justify-between">
        <span class="text-[18px] font-semibold text-ink-strong">{w.id}</span>
        <span class="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <span class="h-2 w-2 rounded-full {DOT[w.status]}"></span>{w.status}
        </span>
      </div>
      <div class="mt-0.5 text-[11px] text-ink-dim">{w.name} · {w.type}</div>
      <dl class="mt-3 grid grid-cols-3 gap-1 text-[11px] text-ink-muted">
        <div><dt class="text-ink-dim">WHP</dt><dd class="mt-0.5 text-[19px] text-ink tnum">{num(w.telemetry.wellPressure, 1)}</dd></div>
        <div><dt class="text-ink-dim">Flow</dt><dd class="mt-0.5 text-[19px] text-ink tnum">{num(w.telemetry.flowM3h, 1)}</dd></div>
        <div><dt class="text-ink-dim">MW</dt><dd class="mt-0.5 text-[19px] text-ink tnum">{num(w.output.mw, 1)}</dd></div>
      </dl>
    </button>
  {/each}
</div>
