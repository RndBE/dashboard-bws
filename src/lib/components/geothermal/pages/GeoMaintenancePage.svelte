<script lang="ts">
  import Wrench from '@lucide/svelte/icons/wrench';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import Loader from '@lucide/svelte/icons/loader';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import { makeWorkOrders, workOrderKpis } from '../../../geothermal/maintenance.js';

  const rows = makeWorkOrders();
  const kpi = workOrderKpis(rows);

  const statuses = ['all', 'open', 'in-progress', 'done'];
  const priorities = ['all', 'critical', 'high', 'medium', 'low'];

  let status = $state('all');
  let priority = $state('all');

  const filtered = $derived(
    rows.filter(
      (r) => (status === 'all' || r.status === status) && (priority === 'all' || r.priority === priority),
    ),
  );

  const kpis = [
    { icon: CircleDot, label: 'Open', value: kpi.open, unit: 'WO' },
    { icon: Loader, label: 'In Progress', value: kpi.inProgress, unit: 'WO' },
    { icon: AlertTriangle, label: 'Overdue', value: kpi.overdue, unit: 'WO' },
    { icon: Wrench, label: 'Done', value: kpi.done, unit: 'WO' },
  ];

  const PRIORITY_CLS: Record<string, string> = {
    critical: 'text-awas bg-awas/15',
    high: 'text-siaga bg-siaga/15',
    medium: 'text-waspada bg-waspada/15',
    low: 'text-ink-muted bg-panel-2',
  };
  const STATUS_CLS: Record<string, string> = {
    open: 'text-accent-bright bg-accent/15',
    'in-progress': 'text-waspada bg-waspada/15',
    done: 'text-normal bg-normal/15',
  };
  const STATUS_LABEL: Record<string, string> = {
    open: 'OPEN',
    'in-progress': 'PROGRESS',
    done: 'DONE',
  };

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
      <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Work Orders</div>
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
      <div class="flex flex-wrap items-center gap-1.5">
        {#each priorities as p}
          <button
            onclick={() => (priority = p)}
            class="rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize transition-colors {priority === p
              ? 'border-accent/60 bg-accent/15 text-accent-bright'
              : 'border-line bg-panel-2 text-ink-muted hover:text-ink'}"
          >{p === 'all' ? 'Semua' : p}</button>
        {/each}
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-[12px]">
        <thead class="text-ink-dim">
          <tr class="border-b border-line">
            <th class="px-2 py-1.5 text-left font-medium">WO</th>
            <th class="px-2 py-1.5 text-left font-medium">Asset</th>
            <th class="px-2 py-1.5 text-left font-medium">Title</th>
            <th class="px-2 py-1.5 text-left font-medium">Type</th>
            <th class="px-2 py-1.5 text-left font-medium">Priority</th>
            <th class="px-2 py-1.5 text-left font-medium">Status</th>
            <th class="px-2 py-1.5 text-left font-medium">Assignee</th>
            <th class="px-2 py-1.5 text-right font-medium">Due</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as r (r.id)}
            <tr class="border-b border-line/60 hover:bg-panel-2/60">
              <td class="px-2 py-1.5 font-mono text-[11px] text-accent-bright">{r.id}</td>
              <td class="px-2 py-1.5 text-ink-muted">{r.asset}</td>
              <td class="px-2 py-1.5 text-ink">{r.title}</td>
              <td class="px-2 py-1.5 capitalize text-ink-muted">{r.type}</td>
              <td class="px-2 py-1.5">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase {PRIORITY_CLS[r.priority]}">{r.priority}</span>
              </td>
              <td class="px-2 py-1.5">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {STATUS_CLS[r.status]}">{STATUS_LABEL[r.status]}</span>
              </td>
              <td class="px-2 py-1.5 text-ink-muted">{r.assignee}</td>
              <td class="px-2 py-1.5 text-right tnum {r.overdue ? 'font-semibold text-siaga' : 'text-ink-muted'}">
                {r.status === 'done' ? '—' : dueLabel(r.dueDays)}
              </td>
            </tr>
          {/each}
          {#if filtered.length === 0}
            <tr><td colspan="8" class="px-2 py-6 text-center text-ink-dim">Tidak ada work order cocok filter.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
