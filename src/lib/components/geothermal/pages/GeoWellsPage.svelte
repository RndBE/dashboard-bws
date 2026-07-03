<script lang="ts">
  import { num } from '../../../format';
  import { geoSelectedWellId, geoWells } from '../../../geothermal/store';
  import SeverityChip from '../SeverityChip.svelte';
  import WellDrilldown from '../WellDrilldown.svelte';

  function select(id: string) {
    geoSelectedWellId.set(id);
  }

  function onRowKeydown(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(id);
    }
  }
</script>

<div class="space-y-3">
  <div class="rounded-xl border border-line bg-panel p-3">
    <div class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Wells Registry</div>
    <div class="overflow-x-auto">
      <table class="w-full text-[12px]">
        <thead class="text-ink-dim">
          <tr class="border-b border-line">
            <th class="px-2 py-1.5 text-left font-medium">Well</th>
            <th class="px-2 py-1.5 text-left font-medium">Name</th>
            <th class="px-2 py-1.5 text-left font-medium">Type</th>
            <th class="px-2 py-1.5 text-left font-medium">Status</th>
            <th class="px-2 py-1.5 text-right font-medium">WHP</th>
            <th class="px-2 py-1.5 text-right font-medium">WHT</th>
            <th class="px-2 py-1.5 text-right font-medium">Flow m³/h</th>
            <th class="px-2 py-1.5 text-right font-medium">Steam t/h</th>
            <th class="px-2 py-1.5 text-right font-medium">MW</th>
            <th class="px-2 py-1.5 text-right font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {#each $geoWells as w (w.id)}
            <tr
              role="button"
              tabindex="0"
              onclick={() => select(w.id)}
              onkeydown={(e) => onRowKeydown(e, w.id)}
              class="cursor-pointer border-b border-line/60 outline-none transition-colors hover:bg-panel-2/60 focus-visible:bg-panel-2/60 {w.id === $geoSelectedWellId
                ? 'bg-accent/10'
                : ''}"
            >
              <td class="px-2 py-1.5 font-mono text-[11px] text-accent-bright">{w.id}</td>
              <td class="px-2 py-1.5 text-ink">{w.name}</td>
              <td class="px-2 py-1.5 text-ink-muted">{w.type}</td>
              <td class="px-2 py-1.5"><SeverityChip severity={w.status} /></td>
              <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(w.telemetry.wellPressure, 1)}</td>
              <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(w.telemetry.temperature, 1)}</td>
              <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(w.telemetry.flowM3h, 1)}</td>
              <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(w.output.steamTh, 1)}</td>
              <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(w.output.mw, 1)}</td>
              <td class="px-2 py-1.5 text-right font-semibold text-normal">LIVE</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <WellDrilldown />
</div>
