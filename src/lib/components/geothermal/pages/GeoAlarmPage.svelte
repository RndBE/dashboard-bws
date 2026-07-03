<script lang="ts">
  import { num } from '../../../format';
  import { ackAlarm, geoAlarms, geoEvents, shelveAlarm } from '../../../geothermal/store';
  import { alarmStats } from '../../../geothermal/alarms.js';
  import type { AlarmRow, GeoEvent, GeoStatus } from '../../../geothermal/types';
  import SeverityChip from '../SeverityChip.svelte';

  type Tab = 'active' | 'history' | 'stats';
  let tab = $state<Tab>('active');

  let filterWell = $state<string>('all');
  let filterSeverity = $state<GeoStatus | 'all'>('all');

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'active', label: 'Active' },
    { id: 'history', label: 'History' },
    { id: 'stats', label: 'Statistics' },
  ];

  const SEVERITIES: GeoStatus[] = ['normal', 'waspada', 'siaga', 'awas'];

  const KIND_CLS: Record<GeoEvent['kind'], string> = {
    alarm: 'text-awas bg-awas/15',
    valve: 'text-accent-bright bg-accent/15',
    comms: 'text-pu-bright bg-pu/15',
    operator: 'text-normal bg-normal/15',
  };

  const activeAlarms = $derived($geoAlarms.filter((a) => a.status === 'active'));

  const wellOptions = $derived(
    Array.from(new Set($geoAlarms.map((a) => a.well))).sort(),
  );

  const filteredActive = $derived(
    activeAlarms.filter(
      (a) =>
        (filterWell === 'all' || a.well === filterWell) &&
        (filterSeverity === 'all' || a.severity === filterSeverity),
    ),
  );

  const historyAlarms = $derived(
    [...$geoAlarms].sort((a, b) => b.raisedAt - a.raisedAt),
  );

  const stats = $derived(alarmStats($geoAlarms));

  function fmtValue(a: AlarmRow): string {
    return num(a.value, a.tag === 'level' ? 3 : 1);
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center gap-1 rounded-xl border border-line bg-panel p-1">
    {#each TABS as t (t.id)}
      <button
        type="button"
        class="flex-1 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors {tab === t.id
          ? 'bg-accent/15 text-accent-bright'
          : 'text-ink-muted hover:bg-panel-2 hover:text-ink'}"
        onclick={() => (tab = t.id)}
      >
        {t.label}
      </button>
    {/each}
  </div>

  {#if tab === 'active'}
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Active Alarms</div>
        <div class="flex items-center gap-2">
          <select
            bind:value={filterWell}
            class="h-8 rounded-lg border border-line bg-panel-2 px-2 text-[11px] text-ink-strong outline-none focus:border-accent/60"
          >
            <option value="all">All Wells</option>
            {#each wellOptions as w (w)}
              <option value={w}>{w}</option>
            {/each}
          </select>
          <select
            bind:value={filterSeverity}
            class="h-8 rounded-lg border border-line bg-panel-2 px-2 text-[11px] text-ink-strong outline-none focus:border-accent/60"
          >
            <option value="all">All Severities</option>
            {#each SEVERITIES as s (s)}
              <option value={s}>{s.toUpperCase()}</option>
            {/each}
          </select>
        </div>
      </div>
      {#if filteredActive.length === 0}
        <div class="py-8 text-center text-[12px] text-ink-dim">No active alarms</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-[12px]">
            <thead class="text-ink-dim">
              <tr class="border-b border-line">
                <th class="px-2 py-1.5 text-left font-medium">Time</th>
                <th class="px-2 py-1.5 text-left font-medium">Well</th>
                <th class="px-2 py-1.5 text-left font-medium">Tag / Label</th>
                <th class="px-2 py-1.5 text-left font-medium">Severity</th>
                <th class="px-2 py-1.5 text-right font-medium">Value</th>
                <th class="px-2 py-1.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredActive as a (a.id)}
                <tr class="border-b border-line/60 hover:bg-panel-2/60">
                  <td class="px-2 py-1.5 tnum text-ink-muted">{a.time}</td>
                  <td class="px-2 py-1.5 font-mono text-[11px] text-accent-bright">{a.well}</td>
                  <td class="px-2 py-1.5 text-ink">{a.label}</td>
                  <td class="px-2 py-1.5"><SeverityChip severity={a.severity} /></td>
                  <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{fmtValue(a)}</td>
                  <td class="px-2 py-1.5">
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={a.ack}
                        class="rounded-md border border-line px-2 py-1 text-[10px] font-medium text-ink-muted transition-colors hover:bg-panel-2 hover:text-ink-strong disabled:cursor-not-allowed disabled:opacity-40"
                        onclick={() => ackAlarm(a.id)}
                      >
                        Ack
                      </button>
                      <button
                        type="button"
                        class="rounded-md border border-line px-2 py-1 text-[10px] font-medium text-ink-muted transition-colors hover:bg-panel-2 hover:text-ink-strong"
                        onclick={() => shelveAlarm(a.id)}
                      >
                        Shelve
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else if tab === 'history'}
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Alarm History</div>
      {#if historyAlarms.length === 0}
        <div class="py-8 text-center text-[12px] text-ink-dim">No alarm history</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-[12px]">
            <thead class="text-ink-dim">
              <tr class="border-b border-line">
                <th class="px-2 py-1.5 text-left font-medium">Time</th>
                <th class="px-2 py-1.5 text-left font-medium">Well</th>
                <th class="px-2 py-1.5 text-left font-medium">Label</th>
                <th class="px-2 py-1.5 text-left font-medium">Severity</th>
                <th class="px-2 py-1.5 text-right font-medium">Value</th>
                <th class="px-2 py-1.5 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {#each historyAlarms as a (a.id)}
                <tr class="border-b border-line/60 hover:bg-panel-2/60">
                  <td class="px-2 py-1.5 tnum text-ink-muted">{a.time}</td>
                  <td class="px-2 py-1.5 font-mono text-[11px] text-accent-bright">{a.well}</td>
                  <td class="px-2 py-1.5 text-ink">{a.label}</td>
                  <td class="px-2 py-1.5"><SeverityChip severity={a.severity} /></td>
                  <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{fmtValue(a)}</td>
                  <td class="px-2 py-1.5 text-right font-semibold {a.status === 'active' ? 'text-awas' : 'text-normal'}">
                    {a.status === 'active' ? 'ACTIVE' : 'CLEARED'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div class="rounded-xl border border-line bg-panel p-3">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Alarm Statistics</div>
          <span class="rounded-full bg-awas/15 px-2 py-0.5 text-[10px] font-semibold text-awas">{stats.active} Active</span>
        </div>
        <div class="mb-4 flex flex-wrap gap-3">
          {#each SEVERITIES as s (s)}
            <div class="flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5">
              <SeverityChip severity={s} />
              <span class="text-[13px] font-semibold text-ink-strong tnum">{stats.bySeverity[s]}</span>
            </div>
          {/each}
        </div>
        <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Top Tags</div>
        {#if stats.topTags.length === 0}
          <div class="py-4 text-center text-[12px] text-ink-dim">No active alarm tags</div>
        {:else}
          <ul class="mt-2 flex flex-col gap-1.5">
            {#each stats.topTags as t (t.tag)}
              <li class="flex items-center justify-between rounded-md border border-line/60 px-2.5 py-1.5 text-[12px]">
                <span class="text-ink">{t.tag}</span>
                <span class="font-semibold text-ink-strong tnum">{t.count}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="rounded-xl border border-line bg-panel p-3">
        <div class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Event Log</div>
        <div class="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
          {#each $geoEvents as e (e.id)}
            <div class="flex items-start gap-2 rounded-md border border-line/60 px-2.5 py-1.5 text-[12px]">
              <span class="shrink-0 tnum text-ink-dim">{e.time}</span>
              <span class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase {KIND_CLS[e.kind]}">{e.kind}</span>
              <span class="text-ink">{e.message}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
