<script lang="ts">
  import { geoWells, geoSelectedWellId, geoSelectedWell } from '../../../geothermal/store';
  import SeverityChip from '../SeverityChip.svelte';

  // Padded projection box inside the 400x300 viewBox — leaves room above for
  // the Separator node and below for the Reinjection hub node.
  const PAD_X: [number, number] = [50, 350];
  const PAD_Y: [number, number] = [70, 230];

  const SEPARATOR = { x: 200, y: 30 };
  const REINJ_HUB = { x: 200, y: 275 };

  function select(id: string): void {
    geoSelectedWellId.set(id);
  }

  function onPinKeydown(e: KeyboardEvent, id: string): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(id);
    }
  }

  // Min-max bounds over the live well coordinates. Guarded against a
  // degenerate (all-equal) range, which would otherwise divide by zero.
  const bounds = $derived.by(() => {
    const wells = $geoWells;
    const lngs = wells.map((w) => w.lng);
    const lats = wells.map((w) => w.lat);
    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    };
  });

  function projectX(lng: number): number {
    const { minLng, maxLng } = bounds;
    const span = maxLng - minLng;
    const t = span === 0 ? 0.5 : (lng - minLng) / span;
    return PAD_X[0] + t * (PAD_X[1] - PAD_X[0]);
  }

  function projectY(lat: number): number {
    const { minLat, maxLat } = bounds;
    const span = maxLat - minLat;
    // Larger (less negative) latitude = further north = nearer the top of the map.
    const t = span === 0 ? 0.5 : (maxLat - lat) / span;
    return PAD_Y[0] + t * (PAD_Y[1] - PAD_Y[0]);
  }

  const points = $derived(
    $geoWells.map((w) => ({ well: w, x: projectX(w.lng), y: projectY(w.lat) })),
  );

  const productionPoints = $derived(points.filter((p) => p.well.type === 'production'));
  const reinjectionPoints = $derived(points.filter((p) => p.well.type === 'reinjection'));

  function diamondPoints(cx: number, cy: number, r = 7): string {
    return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
  }
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Field Map</div>

  <svg
    viewBox="0 0 400 300"
    class="h-auto max-h-[70vh] w-full"
    role="img"
    aria-label="Field schematic showing well pin locations, separator, and reinjection hub"
  >
    <!-- pipelines -->
    <g stroke="var(--color-normal)" stroke-opacity="0.25" stroke-width="1.5" fill="none">
      {#each productionPoints as p (p.well.id)}
        <line x1={p.x} y1={p.y} x2={SEPARATOR.x} y2={SEPARATOR.y} />
      {/each}
      <line x1={SEPARATOR.x} y1={SEPARATOR.y} x2={REINJ_HUB.x} y2={REINJ_HUB.y} stroke-width="2.5" />
      {#each reinjectionPoints as p (p.well.id)}
        <line x1={REINJ_HUB.x} y1={REINJ_HUB.y} x2={p.x} y2={p.y} />
      {/each}
    </g>

    <!-- Separator node (fixed) -->
    <g>
      <rect
        x={SEPARATOR.x - 26}
        y={SEPARATOR.y - 12}
        width="52"
        height="24"
        rx="6"
        class="fill-panel-2 stroke-line"
        stroke-width="1.5"
      />
      <text x={SEPARATOR.x} y={SEPARATOR.y + 4} text-anchor="middle" class="fill-ink-strong" font-size="9" font-weight="600">SEP</text>
      <text x={SEPARATOR.x} y={SEPARATOR.y - 18} text-anchor="middle" class="fill-ink-dim" font-size="7">Separator</text>
    </g>

    <!-- Reinjection hub node (fixed) -->
    <g>
      <rect
        x={REINJ_HUB.x - 34}
        y={REINJ_HUB.y - 12}
        width="68"
        height="24"
        rx="6"
        class="fill-panel-2 stroke-line"
        stroke-width="1.5"
      />
      <text x={REINJ_HUB.x} y={REINJ_HUB.y + 4} text-anchor="middle" class="fill-ink-strong" font-size="9" font-weight="600">REINJ HUB</text>
      <text x={REINJ_HUB.x} y={REINJ_HUB.y + 24} text-anchor="middle" class="fill-ink-dim" font-size="7">Reinjection</text>
    </g>

    <!-- well pins -->
    {#each points as p (p.well.id)}
      <g
        role="button"
        tabindex="0"
        aria-label={`Select well ${p.well.id}, status ${p.well.status}`}
        class="cursor-pointer outline-none"
        onclick={() => select(p.well.id)}
        onkeydown={(e) => onPinKeydown(e, p.well.id)}
      >
        {#if p.well.id === $geoSelectedWellId}
          <circle cx={p.x} cy={p.y} r="11" fill="none" stroke="var(--color-{p.well.status})" stroke-width="1.5" opacity="0.65" />
        {/if}
        {#if p.well.type === 'production'}
          <circle cx={p.x} cy={p.y} r="7" fill="var(--color-{p.well.status})" stroke="var(--color-line)" stroke-width="1.5" />
        {:else}
          <polygon
            points={diamondPoints(p.x, p.y)}
            fill="var(--color-{p.well.status})"
            stroke="var(--color-line)"
            stroke-width="1.5"
            stroke-dasharray="2 1"
          />
        {/if}
        <text x={p.x} y={p.y - 12} text-anchor="middle" class="fill-ink-strong" font-size="8" font-weight="600">{p.well.id}</text>
      </g>
    {/each}
  </svg>

  {#if $geoSelectedWell}
    <div class="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[12px]">
      <span class="text-ink-dim">Selected well</span>
      <span class="font-mono text-accent-bright">{$geoSelectedWell.id}</span>
      <SeverityChip severity={$geoSelectedWell.status} />
    </div>
  {/if}

  <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[11px] text-ink-muted">
    <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background: var(--color-normal)"></span>Normal</div>
    <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background: var(--color-waspada)"></span>Waspada</div>
    <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background: var(--color-siaga)"></span>Siaga</div>
    <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background: var(--color-awas)"></span>Awas</div>
    <div class="mx-2 h-4 w-px bg-line"></div>
    <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full border border-ink-dim bg-ink-dim/40"></span>Production well</div>
    <div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rotate-45 border border-ink-dim bg-ink-dim/40"></span>Reinjection well</div>
  </div>
</div>
