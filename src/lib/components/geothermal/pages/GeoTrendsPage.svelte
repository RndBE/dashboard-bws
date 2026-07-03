<script lang="ts">
  import { get } from 'svelte/store';
  import MultiChart from '../../ui/MultiChart.svelte';
  import { geoHistoryByWell, geoWells } from '../../../geothermal/store';
  import { HISTORY_TAGS } from '../../../geothermal/history.js';
  import type { SeriesPoint } from '../../../types';

  type Mode = 'single' | 'compare';
  type RangeKey = '15m' | '1h' | 'all';

  const TAG_META: Record<string, { label: string; unit: string; color: string }> = {
    wellPressure: { label: 'Well Pressure', unit: 'bar', color: '#4f9bee' },
    heatPipePressure: { label: 'Heat Pipe Pressure', unit: 'bar', color: '#e08a3c' },
    temperature: { label: 'Temperature', unit: '°C', color: '#d8635f' },
    level: { label: 'Water Level', unit: 'm', color: '#22b8e0' },
    flowM3h: { label: 'Flow Rate (Totalized)', unit: 'm³/h', color: '#3fb27f' },
    flowLs: { label: 'Flow Rate (V-Notch)', unit: 'L/s', color: '#b285f0' },
  };

  const WELL_COLORS = ['#4f9bee', '#e08a3c', '#3fb27f', '#d8635f', '#f3b115', '#22b8e0', '#b285f0', '#f0b429'];
  function wellColor(i: number): string {
    return WELL_COLORS[i % WELL_COLORS.length];
  }

  const RANGE_MS: Record<RangeKey, number | null> = { '15m': 15 * 60_000, '1h': 60 * 60_000, all: null };
  const RANGES: Array<{ id: RangeKey; label: string }> = [
    { id: '15m', label: '15m' },
    { id: '1h', label: '1h' },
    { id: 'all', label: 'All' },
  ];

  const MODES: Array<{ id: Mode; label: string }> = [
    { id: 'single', label: 'Single well' },
    { id: 'compare', label: 'Compare wells' },
  ];

  let mode = $state<Mode>('single');
  let selectedWellId = $state<string>(get(geoWells)[0]?.id ?? '');
  let compareTag = $state<string>('wellPressure');
  let range = $state<RangeKey>('all');
  let checkedTags = $state<Record<string, boolean>>({
    wellPressure: true,
    heatPipePressure: true,
    temperature: false,
    level: true,
    flowM3h: true,
    flowLs: false,
  });

  // Fall back to the first well if the selected id ever goes stale (e.g. field roster changes).
  const wellId = $derived(
    $geoWells.some((w) => w.id === selectedWellId) ? selectedWellId : ($geoWells[0]?.id ?? ''),
  );
  const activeTags = $derived(HISTORY_TAGS.filter((tag) => checkedTags[tag]));

  function filterPoints(points: SeriesPoint[]): SeriesPoint[] {
    const ms = RANGE_MS[range];
    if (ms === null) return points;
    const cutoff = Date.now() - ms;
    return points.filter((p) => p.t >= cutoff);
  }

  const series = $derived.by(() => {
    if (mode === 'single') {
      const wellData = $geoHistoryByWell[wellId] ?? {};
      return activeTags.map((tag) => ({
        name: TAG_META[tag].label,
        unit: TAG_META[tag].unit,
        color: TAG_META[tag].color,
        points: filterPoints(wellData[tag] ?? []),
      }));
    }
    return $geoWells.map((w, i) => ({
      name: w.name,
      unit: TAG_META[compareTag]?.unit ?? '',
      color: wellColor(i),
      points: filterPoints($geoHistoryByWell[w.id]?.[compareTag] ?? []),
    }));
  });

  function toggleTag(tag: string) {
    checkedTags = { ...checkedTags, [tag]: !checkedTags[tag] };
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
    <div class="flex items-center gap-1 rounded-lg border border-line bg-panel-2 p-1">
      {#each MODES as m (m.id)}
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors {mode === m.id
            ? 'bg-accent/15 text-accent-bright'
            : 'text-ink-muted hover:bg-panel hover:text-ink'}"
          onclick={() => (mode = m.id)}
        >
          {m.label}
        </button>
      {/each}
    </div>

    <div class="flex flex-wrap items-center gap-2">
      {#if mode === 'single'}
        <select
          bind:value={selectedWellId}
          class="h-8 rounded-lg border border-line bg-panel-2 px-2 text-[11px] text-ink-strong outline-none focus:border-accent/60"
        >
          {#each $geoWells as w (w.id)}
            <option value={w.id}>{w.name}</option>
          {/each}
        </select>
      {:else}
        <select
          bind:value={compareTag}
          class="h-8 rounded-lg border border-line bg-panel-2 px-2 text-[11px] text-ink-strong outline-none focus:border-accent/60"
        >
          {#each HISTORY_TAGS as tag (tag)}
            <option value={tag}>{TAG_META[tag].label}</option>
          {/each}
        </select>
      {/if}

      <div class="flex items-center gap-1 rounded-lg border border-line bg-panel-2 p-1">
        {#each RANGES as r (r.id)}
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors {range === r.id
              ? 'bg-accent/15 text-accent-bright'
              : 'text-ink-muted hover:bg-panel hover:text-ink'}"
            onclick={() => (range = r.id)}
          >
            {r.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  {#if mode === 'single'}
    <div class="flex flex-wrap gap-3 rounded-xl border border-line bg-panel p-3">
      {#each HISTORY_TAGS as tag (tag)}
        <label class="flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-muted">
          <input
            type="checkbox"
            checked={checkedTags[tag]}
            onchange={() => toggleTag(tag)}
            class="h-3.5 w-3.5 accent-[var(--color-accent-bright)]"
          />
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full" style="background:{TAG_META[tag].color}"></span>
            {TAG_META[tag].label}
          </span>
        </label>
      {/each}
    </div>
  {/if}

  <div class="rounded-xl border border-line bg-panel p-3">
    <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      {mode === 'single'
        ? `Trend — ${$geoWells.find((w) => w.id === wellId)?.name ?? wellId}`
        : `Compare Wells — ${TAG_META[compareTag]?.label ?? compareTag}`}
    </div>
    <MultiChart {series} height={320} digits={1} />
    <div class="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-ink-muted">
      {#each series as s}
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full" style="background:{s.color}"></span>{s.name} ({s.unit})
        </span>
      {/each}
    </div>
  </div>
</div>
