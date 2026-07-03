<script lang="ts">
  import FileCheck from '@lucide/svelte/icons/file-check';
  import FileClock from '@lucide/svelte/icons/file-clock';
  import FileWarning from '@lucide/svelte/icons/file-warning';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Download from '@lucide/svelte/icons/download';
  import { makeReports, reportKpis } from '../../../geothermal/reporting.js';

  const rows = makeReports();
  const kpi = reportKpis(rows);

  const categories = ['all', 'production', 'environmental', 'compliance', 'maintenance'];
  const statuses = ['all', 'ready', 'pending', 'overdue'];

  let category = $state('all');
  let status = $state('all');

  const filtered = $derived(
    rows.filter(
      (r) => (category === 'all' || r.category === category) && (status === 'all' || r.status === status),
    ),
  );

  const kpis = [
    { icon: FileCheck, label: 'Ready', value: kpi.ready, unit: 'laporan' },
    { icon: FileClock, label: 'Pending', value: kpi.pending, unit: 'laporan' },
    { icon: FileWarning, label: 'Overdue', value: kpi.overdue, unit: 'laporan' },
    { icon: ShieldCheck, label: 'Compliance', value: kpi.compliance, unit: '%' },
  ];

  const STATUS_CLS: Record<string, string> = {
    ready: 'text-normal bg-normal/15',
    pending: 'text-waspada bg-waspada/15',
    overdue: 'text-awas bg-awas/15',
  };

  function lastGenLabel(d: number): string {
    return d === 0 ? 'hari ini' : `${d} hr lalu`;
  }
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
      <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Laporan & Kepatuhan</div>
      <div class="flex flex-wrap items-center gap-1.5">
        {#each categories as c}
          <button
            onclick={() => (category = c)}
            class="rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize transition-colors {category === c
              ? 'border-accent/60 bg-accent/15 text-accent-bright'
              : 'border-line bg-panel-2 text-ink-muted hover:text-ink'}"
          >{c === 'all' ? 'Semua' : c}</button>
        {/each}
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        {#each statuses as s}
          <button
            onclick={() => (status = s)}
            class="rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase transition-colors {status === s
              ? 'border-accent/60 bg-accent/15 text-accent-bright'
              : 'border-line bg-panel-2 text-ink-muted hover:text-ink'}"
          >{s === 'all' ? 'Semua' : s}</button>
        {/each}
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-[12px]">
        <thead class="text-ink-dim">
          <tr class="border-b border-line">
            <th class="px-2 py-1.5 text-left font-medium">ID</th>
            <th class="px-2 py-1.5 text-left font-medium">Judul</th>
            <th class="px-2 py-1.5 text-left font-medium">Kategori</th>
            <th class="px-2 py-1.5 text-left font-medium">Periode</th>
            <th class="px-2 py-1.5 text-left font-medium">Format</th>
            <th class="px-2 py-1.5 text-right font-medium">Terakhir</th>
            <th class="px-2 py-1.5 text-right font-medium">Jatuh Tempo</th>
            <th class="px-2 py-1.5 text-left font-medium">Status</th>
            <th class="px-2 py-1.5 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as r (r.id)}
            <tr class="border-b border-line/60 hover:bg-panel-2/60">
              <td class="px-2 py-1.5 font-mono text-[11px] text-accent-bright">{r.id}</td>
              <td class="px-2 py-1.5 text-ink">{r.title}</td>
              <td class="px-2 py-1.5 capitalize text-ink-muted">{r.category}</td>
              <td class="px-2 py-1.5 capitalize text-ink-muted">{r.period}</td>
              <td class="px-2 py-1.5 text-ink-muted">{r.format}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tnum">{lastGenLabel(r.lastGenDays)}</td>
              <td class="px-2 py-1.5 text-right tnum {r.dueDays < 0 ? 'font-semibold text-siaga' : 'text-ink-muted'}">{dueLabel(r.dueDays)}</td>
              <td class="px-2 py-1.5">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase {STATUS_CLS[r.status]}">{r.status}</span>
              </td>
              <td class="px-2 py-1.5 text-right">
                <button class="inline-flex items-center gap-1 rounded-md border border-accent/50 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent-bright transition-colors hover:bg-accent/20">
                  <Download size={11} /> Unduh
                </button>
              </td>
            </tr>
          {/each}
          {#if filtered.length === 0}
            <tr><td colspan="9" class="px-2 py-6 text-center text-ink-dim">Tidak ada laporan cocok filter.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
