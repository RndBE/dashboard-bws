<script lang="ts">
  import Gauge from '@lucide/svelte/icons/gauge';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import Clock from '@lucide/svelte/icons/clock';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import { num } from '../../../format';
  import { makeInstruments, instrumentKpis } from '../../../geothermal/instruments.js';
  import SeverityChip from '../SeverityChip.svelte';

  const rows = makeInstruments();
  const kpi = instrumentKpis(rows);

  const wells = ['all', ...Array.from(new Set(rows.map((r) => r.well)))];
  const kinds = ['all', 'pressure', 'temperature', 'level', 'flow'];

  let well = $state('all');
  let kind = $state('all');

  const filtered = $derived(
    rows.filter((r) => (well === 'all' || r.well === well) && (kind === 'all' || r.kind === kind)),
  );

  const kpis = [
    { icon: Gauge, label: 'Total Tags', value: kpi.total, unit: 'tag' },
    { icon: CheckCircle2, label: 'Calibrated', value: kpi.calibrated, unit: 'ok' },
    { icon: Clock, label: 'Due Soon', value: kpi.dueSoon, unit: '<30 hr' },
    { icon: AlertTriangle, label: 'Overdue / Fault', value: kpi.overdue, unit: 'tag' },
  ];

  function dueLabel(d: number): string {
    return d < 0 ? `terlambat ${-d} hr` : `${d} hr lagi`;
  }
</script>

<div class="space-y-3">
  <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
    {#each kpis as k}
      <div class="rounded-xl border border-line bg-panel p-3">
        <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-dim">
          <k.icon size={13} class="text-accent" /> {k.label}
        </div>
        <div class="mt-1.5 flex items-baseline gap-1">
          <span class="text-[22px] font-semibold text-ink-strong tnum">{k.value}</span>
          <span class="text-[11px] text-ink-muted">{k.unit}</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="rounded-xl border border-line bg-panel p-3">
    <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Instrument Registry</div>
      <div class="flex flex-wrap items-center gap-1.5">
        {#each wells as w}
          <button
            onclick={() => (well = w)}
            class="rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase transition-colors {well === w
              ? 'border-accent/60 bg-accent/15 text-accent-bright'
              : 'border-line bg-panel-2 text-ink-muted hover:text-ink'}"
          >{w === 'all' ? 'Semua' : w}</button>
        {/each}
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        {#each kinds as k}
          <button
            onclick={() => (kind = k)}
            class="rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize transition-colors {kind === k
              ? 'border-accent/60 bg-accent/15 text-accent-bright'
              : 'border-line bg-panel-2 text-ink-muted hover:text-ink'}"
          >{k === 'all' ? 'Semua' : k}</button>
        {/each}
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-[12px]">
        <thead class="text-ink-dim">
          <tr class="border-b border-line">
            <th class="px-2 py-1.5 text-left font-medium">Tag</th>
            <th class="px-2 py-1.5 text-left font-medium">Well</th>
            <th class="px-2 py-1.5 text-left font-medium">Type</th>
            <th class="px-2 py-1.5 text-right font-medium">Range</th>
            <th class="px-2 py-1.5 text-right font-medium">Last Cal</th>
            <th class="px-2 py-1.5 text-right font-medium">Due</th>
            <th class="px-2 py-1.5 text-right font-medium">Drift %</th>
            <th class="px-2 py-1.5 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as r (r.tag)}
            <tr class="border-b border-line/60 hover:bg-panel-2/60">
              <td class="px-2 py-1.5 font-mono text-[11px] text-accent-bright">{r.tag}</td>
              <td class="px-2 py-1.5 text-ink-muted">{r.well}</td>
              <td class="px-2 py-1.5 capitalize text-ink-muted">{r.kind}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tnum">{r.rangeLo}–{r.rangeHi} {r.unit}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tnum">{r.lastCalDays} hr lalu</td>
              <td class="px-2 py-1.5 text-right tnum {r.dueDays < 0 ? 'font-semibold text-siaga' : 'text-ink-muted'}">{dueLabel(r.dueDays)}</td>
              <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(r.driftPct, 1)}</td>
              <td class="px-2 py-1.5"><SeverityChip severity={r.status} /></td>
            </tr>
          {/each}
          {#if filtered.length === 0}
            <tr><td colspan="8" class="px-2 py-6 text-center text-ink-dim">Tidak ada tag cocok filter.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
