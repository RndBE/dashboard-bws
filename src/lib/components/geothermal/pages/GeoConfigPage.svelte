<script lang="ts">
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import Settings2 from '@lucide/svelte/icons/settings-2';
  import Users from '@lucide/svelte/icons/users';
  import { num } from '../../../format';
  import { thresholdRows, USERS, SYSTEM_PREFS } from '../../../geothermal/config.js';

  const thresholds = thresholdRows();

  const ROLE_CLS: Record<string, string> = {
    Administrator: 'text-awas bg-awas/15',
    Supervisor: 'text-siaga bg-siaga/15',
    Operator: 'text-accent-bright bg-accent/15',
    Viewer: 'text-ink-muted bg-panel-2',
  };

  function loginLabel(d: number): string {
    return d === 0 ? 'hari ini' : `${d} hr lalu`;
  }
</script>

<div class="space-y-3">
  <div class="rounded-xl border border-line bg-panel p-3">
    <div class="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      <SlidersHorizontal size={14} class="text-accent" /> Ambang Alarm
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-[12px]">
        <thead class="text-ink-dim">
          <tr class="border-b border-line">
            <th class="px-2 py-1.5 text-left font-medium">Tag</th>
            <th class="px-2 py-1.5 text-left font-medium">Parameter</th>
            <th class="px-2 py-1.5 text-right font-medium">Waspada</th>
            <th class="px-2 py-1.5 text-right font-medium">Siaga</th>
            <th class="px-2 py-1.5 text-right font-medium">Awas</th>
            <th class="px-2 py-1.5 text-left font-medium">Unit</th>
          </tr>
        </thead>
        <tbody>
          {#each thresholds as t (t.tag)}
            <tr class="border-b border-line/60 hover:bg-panel-2/60">
              <td class="px-2 py-1.5 font-mono text-[11px] text-accent-bright">{t.tag}</td>
              <td class="px-2 py-1.5 text-ink">{t.label}</td>
              <td class="px-2 py-1.5 text-right font-semibold text-waspada tnum">{num(t.waspada, 1)}</td>
              <td class="px-2 py-1.5 text-right font-semibold text-siaga tnum">{num(t.siaga, 1)}</td>
              <td class="px-2 py-1.5 text-right font-semibold text-awas tnum">{num(t.awas, 1)}</td>
              <td class="px-2 py-1.5 text-ink-muted">{t.unit}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        <Settings2 size={14} class="text-accent" /> Preferensi Sistem
      </div>
      <div class="divide-y divide-line/60">
        {#each SYSTEM_PREFS as p}
          <div class="flex items-center justify-between gap-3 py-2">
            <div class="min-w-0">
              <div class="text-[12px] text-ink">{p.label}</div>
              <div class="text-[10px] text-ink-dim">{p.note}</div>
            </div>
            <span class="shrink-0 rounded-md border border-line bg-panel-2 px-2 py-0.5 text-[11px] font-semibold text-ink-strong">{p.value}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        <Users size={14} class="text-accent" /> Pengguna & Peran
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-[12px]">
          <thead class="text-ink-dim">
            <tr class="border-b border-line">
              <th class="px-2 py-1.5 text-left font-medium">Nama</th>
              <th class="px-2 py-1.5 text-left font-medium">Peran</th>
              <th class="px-2 py-1.5 text-right font-medium">Login</th>
              <th class="px-2 py-1.5 text-left font-medium">Aktif</th>
            </tr>
          </thead>
          <tbody>
            {#each USERS as u (u.email)}
              <tr class="border-b border-line/60 hover:bg-panel-2/60">
                <td class="px-2 py-1.5">
                  <div class="text-ink">{u.name}</div>
                  <div class="text-[10px] text-ink-dim">{u.email}</div>
                </td>
                <td class="px-2 py-1.5">
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {ROLE_CLS[u.role]}">{u.role}</span>
                </td>
                <td class="px-2 py-1.5 text-right text-ink-muted tnum">{loginLabel(u.lastLoginDays)}</td>
                <td class="px-2 py-1.5">
                  <span class="inline-flex items-center gap-1 text-[11px] {u.active ? 'text-normal' : 'text-ink-dim'}">
                    <span class="h-1.5 w-1.5 rounded-full {u.active ? 'bg-normal' : 'bg-ink-dim'}"></span>
                    {u.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
