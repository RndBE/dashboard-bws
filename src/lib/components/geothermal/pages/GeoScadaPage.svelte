<script lang="ts">
  import ScadaDiagram from '../ScadaDiagram.svelte';
  import SeverityChip from '../SeverityChip.svelte';
  import { geoWells, geoSelectedWellId, geoSelectedWell } from '../../../geothermal/store';
</script>

<div class="space-y-3">
  <div class="rounded-xl border border-line bg-panel p-3">
    <div class="flex items-center justify-between">
      <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Well</div>
      <div class="flex items-center gap-2">
        <select
          bind:value={$geoSelectedWellId}
          class="h-8 rounded-lg border border-line bg-panel-2 px-2 text-[11px] text-ink-strong outline-none focus:border-accent/60"
        >
          {#each $geoWells as w (w.id)}
            <option value={w.id}>{w.id} · {w.name}</option>
          {/each}
        </select>
        <SeverityChip severity={$geoSelectedWell.status} />
      </div>
    </div>
  </div>

  <ScadaDiagram />
</div>
