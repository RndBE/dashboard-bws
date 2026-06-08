<script lang="ts">
  import Waves from '@lucide/svelte/icons/waves';
  import Gauge from '@lucide/svelte/icons/gauge';
  import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
  import Droplets from '@lucide/svelte/icons/droplets';
  import FlaskConical from '@lucide/svelte/icons/flask-conical';
  import Cctv from '@lucide/svelte/icons/cctv';
  import Map from '@lucide/svelte/icons/map';
  import Radio from '@lucide/svelte/icons/radio';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  import Panel from '../../ui/Panel.svelte';
  import KpiCard from '../../ui/KpiCard.svelte';
  import StatusBadge from '../../ui/StatusBadge.svelte';
  import Sparkline from '../../ui/Sparkline.svelte';
  import BasinMap from '../../map/BasinMap.svelte';

  import {
    data,
    pdaList,
    pchList,
    kualitasList,
    mataAirList,
    hydroAlerts,
    hydroSection,
    openDetail,
    clock,
  } from '../../../stores';
  import { STATUS, POS_TIPE_LABEL } from '../../../status';
  import { num, relTime } from '../../../format';
  import { theme } from '../../../theme';
  import { CAMERAS } from '../../../data/cameras';
  import type { HydroSection } from '../../../types';

  const pda = $derived($pdaList);
  const pch = $derived($pchList);
  const kual = $derived($kualitasList);
  const ma = $derived($mataAirList);

  const tmaMax = $derived(pda.length ? Math.max(...pda.map((p) => p.param.value)) : 0);
  const debitTotal = $derived(pda.reduce((s, p) => s + (p.debit ?? 0), 0));
  const hujanMax = $derived(pch.length ? Math.max(...pch.map((p) => p.param.value)) : 0);
  const maTotal = $derived(ma.reduce((s, p) => s + p.param.value, 0));
  const phAvg = $derived(
    kual.length ? kual.reduce((s, p) => s + p.param.value, 0) / kual.length : 0,
  );
  const camHidro = $derived(CAMERAS.filter((c) => c.group === 'hidrologi'));
  const camOnline = $derived(camHidro.filter((c) => c.online).length);

  // semua pos diurut berdasarkan keparahan untuk tabel ringkas
  const rows = $derived(
    [...$data.pos].sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight),
  );
  const alerts = $derived($hydroAlerts);

  // kartu kelompok alat ukur → tiap kartu menuju menu masing-masing
  const groups = $derived([
    { key: 'pda' as HydroSection, label: 'Pos Duga Air', icon: Waves, count: pda.length, metric: `${num(tmaMax, 2)} m`, sub: 'TMA tertinggi', color: '#4f9bee' },
    { key: 'debit' as HydroSection, label: 'Debit & Flowmeter', icon: Gauge, count: pda.length, metric: `${num(debitTotal, 0)} m³/s`, sub: 'debit sungai total', color: '#38bdf8' },
    { key: 'pch' as HydroSection, label: 'Pos Curah Hujan', icon: CloudRainWind, count: pch.length, metric: `${num(hujanMax, 1)} mm`, sub: 'hujan tertinggi', color: '#c9a227' },
    { key: 'kualitas' as HydroSection, label: 'Kualitas Air', icon: FlaskConical, count: kual.length, metric: `${num(phAvg, 1)} pH`, sub: 'rerata mutu air', color: '#a78bfa' },
    { key: 'mata-air' as HydroSection, label: 'Mata Air', icon: Droplets, count: ma.length, metric: `${num(maTotal, 1)} l/dt`, sub: 'debit mata air total', color: '#3fb27f' },
    { key: 'cctv' as HydroSection, label: 'CCTV IP Publik', icon: Cctv, count: camHidro.length, metric: `${camOnline}/${camHidro.length}`, sub: 'kamera online', color: '#f0b429' },
  ]);

  function go(key: HydroSection) {
    hydroSection.set(key);
  }
</script>

<div class="flex flex-col gap-3">
  <!-- KPI strip -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
    <KpiCard label="Stasiun dipantau" value={String($data.pos.length)} unit="pos" icon={Radio}>
      {#snippet footer()}
        <span class="text-[10px] text-ink-dim">{alerts.length ? `${alerts.length} perlu perhatian` : 'semua normal'}</span>
      {/snippet}
    </KpiCard>
    <KpiCard label="TMA tertinggi" value={num(tmaMax, 2)} unit="m" icon={Waves} accent>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{pda.length} pos duga air</span>{/snippet}
    </KpiCard>
    <KpiCard label="Debit sungai total" value={num(debitTotal, 0)} unit="m³/s" icon={Gauge} />
    <KpiCard label="Hujan tertinggi" value={num(hujanMax, 1)} unit="mm" icon={CloudRainWind}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{pch.length} pos curah hujan</span>{/snippet}
    </KpiCard>
    <KpiCard label="Debit mata air" value={num(maTotal, 1)} unit="l/dt" icon={Droplets}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{ma.length} mata air</span>{/snippet}
    </KpiCard>
    <KpiCard label="CCTV online" value={`${camOnline}/${camHidro.length}`} unit="kamera" icon={Cctv} />
  </div>

  <!-- peta + kelompok alat -->
  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <div class="xl:col-span-2">
      <Panel title="Peta Jaringan Hidrologi" subtitle="Sebaran pos telemetri · klik penanda untuk detail" icon={Map} flush>
        <div class="h-[300px] w-full overflow-hidden rounded-b-xl sm:h-[420px]">
          <BasinMap
            hiddenKinds={['bendungan', 'irigasi', 'sumur', 'op']}
            light={$theme === 'light'}
          />
        </div>
      </Panel>
    </div>

    <div class="flex flex-col gap-3">
      <Panel title="Kelompok Alat Ukur" subtitle="Klik untuk membuka menu" icon={Radio} bodyClass="space-y-2">
        {#each groups as g}
          <button
            onclick={() => go(g.key)}
            class="group flex w-full items-center gap-3 rounded-lg border border-line-soft bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-panel"
          >
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line" style="color:{g.color};background:{g.color}14">
              <g.icon size={17} />
            </span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-[12.5px] font-medium text-ink-strong">{g.label}</div>
              <div class="text-[10px] text-ink-dim">{g.count} unit · {g.sub}</div>
            </div>
            <div class="shrink-0 text-right">
              <div class="font-mono text-[13px] font-semibold text-ink-strong tnum">{g.metric}</div>
            </div>
            <ChevronRight size={15} class="shrink-0 text-ink-dim transition-transform group-hover:translate-x-0.5" />
          </button>
        {/each}
      </Panel>
    </div>
  </div>

  <!-- tabel stasiun + peringatan -->
  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <div class="xl:col-span-2">
      <Panel title="Stasiun Telemetri" subtitle="{rows.length} stasiun · diurut berdasarkan status" icon={Radio} flush>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[12px]">
            <thead>
              <tr class="border-b border-line text-[10px] uppercase tracking-wide text-ink-dim">
                <th class="px-3.5 py-2 font-medium">Stasiun / Lokasi</th>
                <th class="px-2 py-2 font-medium">Jenis</th>
                <th class="px-2 py-2 font-medium">Status</th>
                <th class="px-2 py-2 text-right font-medium">Parameter</th>
                <th class="hidden px-2 py-2 sm:table-cell">Tren</th>
                <th class="px-3.5 py-2 text-right font-medium">Update</th>
              </tr>
            </thead>
            <tbody>
              {#each rows as p (p.id)}
                <tr
                  onclick={() => openDetail('pos', p.id)}
                  class="cursor-pointer border-b border-line-soft transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <td class="px-3.5 py-2.5">
                    <div class="font-medium text-ink-strong">{p.name}</div>
                    <div class="text-[10px] text-ink-dim">{p.river ?? '—'}</div>
                  </td>
                  <td class="px-2 py-2.5 text-[10px] text-ink-dim">{POS_TIPE_LABEL[p.tipe]}</td>
                  <td class="px-2 py-2.5"><StatusBadge status={p.status} size="xs" dot={false} /></td>
                  <td class="px-2 py-2.5 text-right font-mono font-semibold tnum" style="color:{STATUS[p.status].color}">
                    {num(p.param.value, p.param.digits)}<span class="text-[9px] font-normal text-ink-muted"> {p.param.unit}</span>
                    {#if p.debit !== undefined}<div class="text-[9px] font-normal text-ink-dim">Q {num(p.debit, 0)} m³/s</div>{/if}
                  </td>
                  <td class="hidden px-2 py-2.5 sm:table-cell">
                    <div class="w-20"><Sparkline points={p.history.map((x) => x.v)} color={STATUS[p.status].color} height={24} dot={false} /></div>
                  </td>
                  <td class="px-3.5 py-2.5 text-right text-[10px] text-ink-dim">{relTime(p.updatedAt, $clock)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>

    <Panel title="Peringatan Aktif" subtitle="{alerts.length} peringatan jaringan hidrologi" icon={TriangleAlert}>
      <div class="flex h-full flex-col gap-1.5">
        {#if alerts.length === 0}
          <div class="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-center">
            <ShieldCheck size={28} class="text-normal" strokeWidth={1.6} />
            <p class="text-[12px] text-ink-muted">Tidak ada peringatan aktif</p>
            <p class="text-[10.5px] text-ink-dim">Seluruh stasiun dalam status normal</p>
          </div>
        {:else}
          {#each alerts as a (a.id)}
            <button
              onclick={() => openDetail(a.kind, a.assetId)}
              class="group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
              style="border-color:{STATUS[a.level].color}44;background:{STATUS[a.level].color}0f"
            >
              <TriangleAlert size={15} strokeWidth={2} style="color:{STATUS[a.level].color}" class="shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-[12px] text-ink">{a.message}</p>
                <p class="text-[10px] text-ink-dim">{relTime(a.at, $clock)}</p>
              </div>
              <span class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style="background:{STATUS[a.level].color};color:#0a0f1c">
                {STATUS[a.level].label}
              </span>
            </button>
          {/each}
        {/if}
      </div>
    </Panel>
  </div>
</div>
