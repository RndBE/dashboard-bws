<script lang="ts">
  import { get } from 'svelte/store';
  import Download from '@lucide/svelte/icons/download';
  import History from '@lucide/svelte/icons/history';
  import { geoHistoryByWell, geoWells } from '../../../geothermal/store';
  import { HISTORY_TAGS, queryHistory, aggregate } from '../../../geothermal/history.js';
  import { num } from '../../../format';
  import type { SeriesPoint } from '../../../types';

  type RangeKey = '15m' | '1h' | 'all';
  type AggMode = 'raw' | 'avg' | 'min' | 'max';

  const TAG_META: Record<string, { label: string; unit: string }> = {
    wellPressure: { label: 'Well Pressure', unit: 'bar' },
    heatPipePressure: { label: 'Heat Pipe Pressure', unit: 'bar' },
    temperature: { label: 'Temperature', unit: '°C' },
    level: { label: 'Water Level', unit: 'm' },
    flowM3h: { label: 'Flow Rate (Totalized)', unit: 'm³/h' },
    flowLs: { label: 'Flow Rate (V-Notch)', unit: 'L/s' },
  };

  const RANGE_MS: Record<RangeKey, number | null> = { '15m': 15 * 60_000, '1h': 60 * 60_000, all: null };
  const RANGES: Array<{ id: RangeKey; label: string }> = [
    { id: '15m', label: '15m' },
    { id: '1h', label: '1h' },
    { id: 'all', label: 'All' },
  ];
  const AGG_MODES: Array<{ id: AggMode; label: string }> = [
    { id: 'raw', label: 'Raw' },
    { id: 'avg', label: 'Average' },
    { id: 'min', label: 'Minimum' },
    { id: 'max', label: 'Maximum' },
  ];

  const DISPLAY_CAP = 200;

  // Query builder controls (live-edited, not yet committed).
  let wellId = $state<string>(get(geoWells)[0]?.id ?? '');
  let tag = $state<string>(HISTORY_TAGS[0]);
  let rangeKey = $state<RangeKey>('15m');
  let aggMode = $state<AggMode>('raw');

  interface Query { well: string; tag: string; range: RangeKey; agg: AggMode }

  // Committed query — results derive from this, not from the live controls above.
  let query = $state<Query | null>(null);

  function runQuery(): void {
    query = { well: wellId, tag, range: rangeKey, agg: aggMode };
  }

  function fmtTime(t: number): string {
    const d = new Date(t);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  const bounds = $derived.by(() => {
    if (!query) return null;
    const toT = Date.now();
    const ms = RANGE_MS[query.range];
    const fromT = ms === null ? 0 : toT - ms;
    return { fromT, toT };
  });

  const points = $derived<SeriesPoint[]>(
    query && bounds ? queryHistory($geoHistoryByWell, query.well, query.tag, bounds.fromT, bounds.toT) : [],
  );

  const sortedRaw = $derived([...points].sort((a, b) => b.t - a.t));
  const displayRows = $derived(sortedRaw.slice(0, DISPLAY_CAP));
  const truncated = $derived(sortedRaw.length > DISPLAY_CAP);

  const aggValue = $derived(
    query && query.agg !== 'raw' ? aggregate(points, query.agg as 'avg' | 'min' | 'max') : null,
  );

  const queryWellName = $derived($geoWells.find((w) => w.id === query?.well)?.name ?? query?.well ?? '');
  const queryTagLabel = $derived(query ? (TAG_META[query.tag]?.label ?? query.tag) : '');
  const queryTagUnit = $derived(query ? (TAG_META[query.tag]?.unit ?? '') : '');

  function exportCsv(): void {
    if (typeof document === 'undefined' || !query) return;

    let csv: string;
    if (query.agg === 'raw') {
      const lines = sortedRaw.map((p) => `${fmtTime(p.t)},${p.v}`);
      csv = ['Time,Value', ...lines].join('\n');
    } else {
      const row = [queryWellName, queryTagLabel, query.agg, num(aggValue ?? 0, 2), String(points.length)].join(',');
      csv = ['Well,Tag,Aggregate,Value,Samples', row].join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historian_${query.well}_${query.tag}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
    <select
      bind:value={wellId}
      class="h-8 rounded-lg border border-line bg-panel-2 px-2 text-[11px] text-ink-strong outline-none focus:border-accent/60"
    >
      {#each $geoWells as w (w.id)}
        <option value={w.id}>{w.name}</option>
      {/each}
    </select>

    <select
      bind:value={tag}
      class="h-8 rounded-lg border border-line bg-panel-2 px-2 text-[11px] text-ink-strong outline-none focus:border-accent/60"
    >
      {#each HISTORY_TAGS as t (t)}
        <option value={t}>{TAG_META[t]?.label ?? t}</option>
      {/each}
    </select>

    <div class="flex items-center gap-1 rounded-lg border border-line bg-panel-2 p-1">
      {#each RANGES as r (r.id)}
        <button
          type="button"
          class="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors {rangeKey === r.id
            ? 'bg-accent/15 text-accent-bright'
            : 'text-ink-muted hover:bg-panel hover:text-ink'}"
          onclick={() => (rangeKey = r.id)}
        >
          {r.label}
        </button>
      {/each}
    </div>

    <select
      bind:value={aggMode}
      class="h-8 rounded-lg border border-line bg-panel-2 px-2 text-[11px] text-ink-strong outline-none focus:border-accent/60"
    >
      {#each AGG_MODES as m (m.id)}
        <option value={m.id}>{m.label}</option>
      {/each}
    </select>

    <button
      type="button"
      class="ml-auto flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/15 px-3 py-1.5 text-[11px] font-semibold text-accent-bright transition-colors hover:bg-accent/25"
      onclick={runQuery}
    >
      <History size={13} /> Run query
    </button>
  </div>

  <div class="rounded-xl border border-line bg-panel p-3">
    {#if !query}
      <div class="grid min-h-[240px] place-items-center text-center">
        <div class="max-w-sm">
          <span class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-line bg-panel-2 text-accent-bright">
            <History size={22} />
          </span>
          <div class="text-[14px] font-semibold text-ink-strong">No query run yet</div>
          <p class="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
            Pilih well, tag, rentang waktu, dan mode agregasi, lalu klik "Run query" untuk melihat data historis.
          </p>
        </div>
      </div>
    {:else}
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {queryWellName} · {queryTagLabel}
          {#if truncated}
            <span class="ml-1 font-normal normal-case text-ink-dim">— showing {DISPLAY_CAP} of {sortedRaw.length}</span>
          {/if}
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:bg-panel-2 hover:text-ink-strong"
          onclick={exportCsv}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {#if query.agg === 'raw'}
        <div class="overflow-x-auto">
          <table class="w-full text-[12px]">
            <thead class="text-ink-dim">
              <tr class="border-b border-line">
                <th class="px-2 py-1.5 text-left font-medium">Time</th>
                <th class="px-2 py-1.5 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {#each displayRows as p (p.t)}
                <tr class="border-b border-line/60 hover:bg-panel-2/60">
                  <td class="px-2 py-1.5 font-mono text-[11px] text-ink-muted">{fmtTime(p.t)}</td>
                  <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(p.v, 2)} {queryTagUnit}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if displayRows.length === 0}
            <div class="grid min-h-[120px] place-items-center text-[12px] text-ink-muted">Tidak ada data pada rentang ini.</div>
          {/if}
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-[12px]">
            <thead class="text-ink-dim">
              <tr class="border-b border-line">
                <th class="px-2 py-1.5 text-left font-medium">Well</th>
                <th class="px-2 py-1.5 text-left font-medium">Tag</th>
                <th class="px-2 py-1.5 text-left font-medium">Aggregate</th>
                <th class="px-2 py-1.5 text-right font-medium">Value</th>
                <th class="px-2 py-1.5 text-right font-medium">Samples</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-line/60 hover:bg-panel-2/60">
                <td class="px-2 py-1.5 text-ink">{queryWellName}</td>
                <td class="px-2 py-1.5 text-ink">{queryTagLabel}</td>
                <td class="px-2 py-1.5 text-ink-muted capitalize">{query.agg}</td>
                <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(aggValue ?? 0, 2)} {queryTagUnit}</td>
                <td class="px-2 py-1.5 text-right text-ink-muted tnum">{points.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      {/if}
    {/if}
  </div>
</div>
