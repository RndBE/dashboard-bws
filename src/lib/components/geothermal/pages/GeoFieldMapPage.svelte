<script lang="ts">
  import MapPin from '@lucide/svelte/icons/map-pin';
  import { num } from '../../../format';
  import { geoWells, geoSelectedWellId, geoSelectedWell } from '../../../geothermal/store';
  import GeoFieldLeafletMap from '../GeoFieldLeafletMap.svelte';
  import SeverityChip from '../SeverityChip.svelte';

  function select(id: string): void {
    geoSelectedWellId.set(id);
  }
</script>

<div class="space-y-3">
  <div class="rounded-xl border border-line bg-panel p-3">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Field Map</div>
        <div class="mt-0.5 text-[11px] text-ink-dim">Leaflet GIS view · well pads, separator manifold, and reinjection network</div>
      </div>
      {#if $geoSelectedWell}
        <div class="flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-[11px]">
          <MapPin size={13} class="text-accent" />
          <span class="text-ink-dim">Selected</span>
          <span class="font-mono font-semibold text-accent-bright">{$geoSelectedWell.id}</span>
          <SeverityChip severity={$geoSelectedWell.status} />
        </div>
      {/if}
    </div>

    <GeoFieldLeafletMap wells={$geoWells} selectedId={$geoSelectedWellId} onselect={select} />

    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[11px] text-ink-muted">
      <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background: var(--color-normal)"></span>Normal</div>
      <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background: var(--color-waspada)"></span>Waspada</div>
      <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background: var(--color-siaga)"></span>Siaga</div>
      <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background: var(--color-awas)"></span>Awas</div>
      <div class="mx-1 hidden h-4 w-px bg-line sm:block"></div>
      <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full border border-ink-dim bg-ink-dim/40"></span>Production well</div>
      <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rotate-45 rounded-[2px] border border-ink-dim bg-ink-dim/40"></span>Reinjection well</div>
      <div class="flex items-center gap-1.5"><span class="h-0.5 w-6 bg-normal/80"></span>Production line</div>
      <div class="flex items-center gap-1.5"><span class="h-0.5 w-6 bg-accent"></span>Reinjection trunk</div>
    </div>
  </div>

  {#if $geoSelectedWell}
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-xl border border-line bg-panel p-3">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-ink-dim">Coordinates</div>
        <div class="mt-1.5 font-mono text-[13px] font-semibold text-ink-strong">
          {num($geoSelectedWell.lat, 3)}, {num($geoSelectedWell.lng, 3)}
        </div>
      </div>
      <div class="rounded-xl border border-line bg-panel p-3">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-ink-dim">Well Pressure</div>
        <div class="mt-1.5 text-[18px] font-semibold text-ink-strong tnum">{num($geoSelectedWell.telemetry.wellPressure, 1)} <span class="text-[11px] text-ink-muted">bar</span></div>
      </div>
      <div class="rounded-xl border border-line bg-panel p-3">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-ink-dim">Flow</div>
        <div class="mt-1.5 text-[18px] font-semibold text-ink-strong tnum">{num($geoSelectedWell.telemetry.flowM3h, 1)} <span class="text-[11px] text-ink-muted">m³/h</span></div>
      </div>
      <div class="rounded-xl border border-line bg-panel p-3">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-ink-dim">Gross MW</div>
        <div class="mt-1.5 text-[18px] font-semibold text-ink-strong tnum">{num($geoSelectedWell.output.mw, 1)} <span class="text-[11px] text-ink-muted">MW</span></div>
      </div>
    </div>
  {/if}
</div>
