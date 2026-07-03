<script lang="ts">
  import Activity from '@lucide/svelte/icons/activity';
  import ServerCog from '@lucide/svelte/icons/server-cog';
  import BatteryCharging from '@lucide/svelte/icons/battery-charging';
  import BellRing from '@lucide/svelte/icons/bell-ring';
  import Cpu from '@lucide/svelte/icons/cpu';
  import Radio from '@lucide/svelte/icons/radio';
  import Database from '@lucide/svelte/icons/database';
  import SatelliteDish from '@lucide/svelte/icons/satellite-dish';
  import Sun from '@lucide/svelte/icons/sun';
  import Cctv from '@lucide/svelte/icons/cctv';
  import type { Component } from 'svelte';
  import { num } from '../../../format';
  import type { GeoStatus } from '../../../geothermal/types';
  import {
    geoWells,
    geoField,
    geoActiveAlarmCount,
    geoOverallStatus,
    geoSelectedWellId,
  } from '../../../geothermal/store';
  import { SYSTEM_ROWS } from '../../../geothermal/seed.js';
  import StatusBadge from '../../ui/StatusBadge.svelte';
  import PowerPanel from '../PowerPanel.svelte';
  import CommsPanel from '../CommsPanel.svelte';

  // Deterministic 0..1 from a string — gives each RTU site distinct readings
  // without touching the shared base telemetry.
  function h01(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
  }
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const SUB_ICON: Record<string, Component<any>> = {
    rtu: Cpu,
    sensors: Radio,
    logging: Database,
    vsat: SatelliteDish,
    solar: Sun,
    cctv: Cctv,
  };

  // Per-site RTU health derived from each well + a deterministic jitter.
  const sites = $derived(
    $geoWells.map((w) => {
      const a = h01(w.id);
      const b = h01(w.id + 'b');
      const battery = Math.round(clamp(72 + a * 26, 40, 100));
      const batteryV = Math.round((46.8 + a * 3) * 10) / 10;
      const solarV = Math.round((51.5 + b * 4.5) * 10) / 10;
      const signal = Math.round(-56 + b * 14); // dBm
      const link = Math.round(clamp(90 + a * 9, 84, 100)); // %
      const latency = Math.round(540 + b * 260); // ms
      const commsUp = link >= 92;
      return { w, battery, batteryV, solarV, signal, link, latency, commsUp };
    }),
  );

  const rtuOnline = $derived(sites.filter((s) => s.commsUp).length);
  const avgLatency = $derived(
    sites.length ? Math.round(sites.reduce((s, x) => s + x.latency, 0) / sites.length) : 0,
  );

  function sigBars(dbm: number): number {
    return Math.max(0, Math.min(5, Math.round((dbm + 90) / 12)));
  }
  function battColor(p: number): string {
    return p >= 60 ? 'bg-normal' : p >= 40 ? 'bg-waspada' : 'bg-awas';
  }
  function battTextColor(p: number): string {
    return p >= 60 ? 'text-normal' : p >= 40 ? 'text-waspada' : 'text-awas';
  }
</script>

<div class="space-y-3">
  <!-- Field health summary -->
  <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-dim">
        <Activity size={13} class="text-accent" /> Overall System
      </div>
      <div class="mt-2"><StatusBadge status={$geoOverallStatus} /></div>
    </div>
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-dim">
        <ServerCog size={13} class="text-accent" /> Field Availability
      </div>
      <div class="mt-1.5 flex items-baseline gap-1">
        <span class="text-[22px] font-semibold text-ink-strong tnum">{num($geoField.availability, 1)}</span>
        <span class="text-[11px] text-ink-muted">%</span>
      </div>
    </div>
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-dim">
        <SatelliteDish size={13} class="text-accent" /> RTU Online
      </div>
      <div class="mt-1.5 flex items-baseline gap-1">
        <span class="text-[22px] font-semibold text-ink-strong tnum">{rtuOnline}</span>
        <span class="text-[11px] text-ink-muted">/ {sites.length} site</span>
      </div>
    </div>
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-dim">
        <BellRing size={13} class="text-accent" /> Active Alarms
      </div>
      <div class="mt-1.5 flex items-baseline gap-1">
        <span class="text-[22px] font-semibold tnum {$geoActiveAlarmCount > 0 ? 'text-siaga' : 'text-ink-strong'}">{$geoActiveAlarmCount}</span>
        <span class="text-[11px] text-ink-muted">aktif</span>
      </div>
    </div>
  </div>

  <!-- Subsystem health + RTU site table -->
  <div class="grid grid-cols-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Subsystem Health</div>
      <ul class="space-y-2">
        {#each SYSTEM_ROWS as row (row.key)}
          {@const Icon = SUB_ICON[row.key] ?? Activity}
          <li class="flex items-center justify-between gap-2">
            <span class="flex min-w-0 items-center gap-2 text-[12px] text-ink">
              <Icon size={14} class="shrink-0 text-ink-muted" /> {row.label}
            </span>
            <StatusBadge status={row.state as GeoStatus} label={row.value} size="xs" />
          </li>
        {/each}
      </ul>
    </div>

    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        <BatteryCharging size={14} class="text-accent" /> RTU / Site Health
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-[12px]">
          <thead class="text-ink-dim">
            <tr class="border-b border-line">
              <th class="px-2 py-1.5 text-left font-medium">Site</th>
              <th class="px-2 py-1.5 text-left font-medium">Status</th>
              <th class="px-2 py-1.5 text-left font-medium">Comms</th>
              <th class="px-2 py-1.5 text-left font-medium">Battery</th>
              <th class="px-2 py-1.5 text-right font-medium">Solar V</th>
              <th class="px-2 py-1.5 text-right font-medium">Signal</th>
              <th class="px-2 py-1.5 text-right font-medium">Link %</th>
              <th class="px-2 py-1.5 text-right font-medium">Latency</th>
            </tr>
          </thead>
          <tbody>
            {#each sites as s (s.w.id)}
              <tr
                class="cursor-pointer border-b border-line/60 transition-colors hover:bg-panel-2/60 {s.w.id === $geoSelectedWellId ? 'bg-accent/10' : ''}"
                onclick={() => geoSelectedWellId.set(s.w.id)}
              >
                <td class="px-2 py-1.5">
                  <div class="font-mono text-[11px] text-accent-bright">{s.w.id}</div>
                  <div class="text-[10px] text-ink-dim">{s.w.name}</div>
                </td>
                <td class="px-2 py-1.5"><StatusBadge status={s.w.status} size="xs" /></td>
                <td class="px-2 py-1.5">
                  <span class="inline-flex items-center gap-1 text-[11px] {s.commsUp ? 'text-normal' : 'text-awas'}">
                    <span class="h-1.5 w-1.5 rounded-full {s.commsUp ? 'bg-normal' : 'bg-awas'}"></span>
                    {s.commsUp ? 'Online' : 'Degraded'}
                  </span>
                </td>
                <td class="px-2 py-1.5">
                  <div class="flex items-center gap-1.5">
                    <div class="h-1.5 w-14 overflow-hidden rounded-full bg-panel-2">
                      <div class="h-full rounded-full {battColor(s.battery)}" style="width:{s.battery}%"></div>
                    </div>
                    <span class="text-[11px] font-semibold tnum {battTextColor(s.battery)}">{s.battery}%</span>
                  </div>
                </td>
                <td class="px-2 py-1.5 text-right text-ink-muted tnum">{num(s.solarV, 1)}</td>
                <td class="px-2 py-1.5 text-right">
                  <span class="inline-flex items-end gap-0.5 align-middle">
                    {#each Array(5) as _, i}
                      <span class="w-1 rounded-sm {i < sigBars(s.signal) ? 'bg-normal' : 'bg-line'}" style="height:{4 + i * 2}px"></span>
                    {/each}
                  </span>
                  <span class="ml-1.5 text-ink-muted tnum">{s.signal}</span>
                </td>
                <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{s.link}</td>
                <td class="px-2 py-1.5 text-right tnum {s.latency > 700 ? 'text-waspada' : 'text-ink-muted'}">{s.latency} ms</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="mt-2 text-[10px] text-ink-dim">Rata-rata latency {avgLatency} ms · klik baris untuk fokus sumur.</div>
    </div>
  </div>

  <!-- Selected-site power & comms detail -->
  <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
    <PowerPanel />
    <CommsPanel />
  </div>
</div>
