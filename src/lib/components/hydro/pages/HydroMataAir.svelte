<script lang="ts">
  import Droplet from '@lucide/svelte/icons/droplet';
  import Gauge from '@lucide/svelte/icons/gauge';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Table from '@lucide/svelte/icons/table-2';
  import ChartSpline from '@lucide/svelte/icons/chart-spline';
  import Radio from '@lucide/svelte/icons/radio';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Waves from '@lucide/svelte/icons/waves';
  import FlaskConical from '@lucide/svelte/icons/flask-conical';
  import GlassWater from '@lucide/svelte/icons/glass-water';
  import TestTube from '@lucide/svelte/icons/test-tube';
  import Zap from '@lucide/svelte/icons/zap';
  import Thermometer from '@lucide/svelte/icons/thermometer';
  import type { Component } from 'svelte';

  import Panel from '../../ui/Panel.svelte';
  import KpiCard from '../../ui/KpiCard.svelte';
  import Button from '../../ui/Button.svelte';
  import MiniChart from '../../ui/MiniChart.svelte';
  import LevelBar from '../../ui/LevelBar.svelte';
  import StatusBadge from '../../ui/StatusBadge.svelte';
  import Sparkline from '../../ui/Sparkline.svelte';
  import Delta from '../../ui/Delta.svelte';

  import { mataAirList, openDetail, clock } from '../../../stores';
  import { STATUS } from '../../../status';
  import { num, relTime } from '../../../format';
  import { stats, shortDelta } from '../../../series';
  import type { PosHidrologi, SeriesPoint } from '../../../types';

  const SPRING = '#3fb27f';

  const pos = $derived($mataAirList);

  // mata air terpilih untuk panel profil (default: paling gawat / pertama)
  let selId = $state<string | null>(null);
  const sel = $derived<PosHidrologi | undefined>(
    pos.find((p) => p.id === selId) ??
      [...pos].sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight)[0],
  );

  // KPI: debit RENDAH = peringatan kekeringan
  const debitTotal = $derived(pos.reduce((s, p) => s + p.param.value, 0));
  const debitMin = $derived(pos.length ? Math.min(...pos.map((p) => p.param.value)) : 0);
  const kritisCount = $derived(
    pos.filter((p) => p.status === 'siaga' || p.status === 'awas').length,
  );

  const selStats = $derived(sel ? stats(sel.history.map((h) => h.v)) : { min: 0, max: 0, avg: 0 });
  const selDelta = $derived(sel ? shortDelta(sel.history) : 0);

  // ambil nilai instrumen mutu air (non-utama) dari mata air terpilih
  function instrVal(p: PosHidrologi | undefined, type: string): number | null {
    const it = p?.instruments.find((i) => i.type === type);
    return it ? it.value : null;
  }
  function instrHist(p: PosHidrologi | undefined, type: string): SeriesPoint[] {
    return p?.instruments.find((i) => i.type === type)?.history ?? [];
  }

  const selEc = $derived(instrVal(sel, 'Konduktivitas'));
  const selSuhu = $derived(instrVal(sel, 'Suhu Air'));
  const selPh = $derived(instrVal(sel, 'pH'));

  // kartu parameter mutu air mata air terpilih
  const paramCards = $derived([
    { label: 'Debit', value: sel ? num(sel.param.value, 1) : '–', unit: 'l/dt', tone: 'text-accent-bright' },
    { label: 'Konduktivitas', value: selEc !== null ? num(selEc, 0) : '–', unit: 'µS/cm', tone: 'text-ink-strong' },
    { label: 'Suhu', value: selSuhu !== null ? num(selSuhu, 1) : '–', unit: '°C', tone: 'text-ink-strong' },
    { label: 'pH', value: selPh !== null ? num(selPh, 2) : '–', unit: '', tone: 'text-ink-strong' },
  ]);

  // AWQR — Automatic Water Quality Recorder (mutu air baku tiap mata air)
  interface AwqrDef {
    type: string;
    label: string;
    icon: Component<any>;
    color: string;
    unit: string;
    digits: number;
  }
  const AWQR: AwqrDef[] = [
    { type: 'pH', label: 'pH', icon: FlaskConical, color: '#a78bfa', unit: 'pH', digits: 2 },
    { type: 'DO', label: 'Oksigen (DO)', icon: Droplet, color: '#4f9bee', unit: 'mg/L', digits: 1 },
    { type: 'Kekeruhan', label: 'Kekeruhan', icon: GlassWater, color: '#c9a227', unit: 'NTU', digits: 0 },
    { type: 'TDS', label: 'TDS', icon: TestTube, color: '#38bdf8', unit: 'mg/L', digits: 0 },
    { type: 'Konduktivitas', label: 'Konduktivitas', icon: Zap, color: '#3fb27f', unit: 'µS/cm', digits: 0 },
    { type: 'Suhu Air', label: 'Suhu Air', icon: Thermometer, color: '#e08a3c', unit: '°C', digits: 1 },
  ];
  const awqrCards = $derived(
    AWQR.map((a) => ({ def: a, value: instrVal(sel, a.type), history: instrHist(sel, a.type) })),
  );

  // daftar mata air — diurut paling gawat dulu (debit rendah = status buruk)
  const rows = $derived(
    [...pos].sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight),
  );

  // ambang dibaca menurun: debit turun melewati garis → makin gawat
  function thr(p: PosHidrologi) {
    return p.thresholds
      ? [
          { value: p.thresholds.waspada, color: STATUS.waspada.color, label: 'Waspada' },
          { value: p.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
          { value: p.thresholds.awas, color: STATUS.awas.color, label: 'Awas' },
        ]
      : [];
  }
</script>

<div class="flex flex-col gap-3">
  <p class="text-[12px] leading-relaxed text-ink-muted">
    Pemantauan <span class="text-ink-strong">debit &amp; mutu mata air</span> (ASDR) sebagai
    sumber air baku. Tidak seperti sungai, ambang dibaca <span class="text-ink-strong">menurun</span>:
    <span class="text-awas">debit yang rendah</span> adalah peringatan kekeringan, dilengkapi
    parameter konduktivitas, suhu, dan pH untuk menilai kelayakan air.
  </p>

  <!-- KPI -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Mata air dipantau" value={String(pos.length)} unit="titik" icon={Radio}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{kritisCount ? `${kritisCount} kritis` : 'semua normal'}</span>{/snippet}
    </KpiCard>
    <KpiCard label="Debit total" value={num(debitTotal, 1)} unit="l/dt" icon={Droplet} accent />
    <KpiCard label="Debit terendah" value={num(debitMin, 1)} unit="l/dt" icon={Gauge}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">indikator kekeringan</span>{/snippet}
    </KpiCard>
    <KpiCard label="Mata air kritis" value={String(kritisCount)} unit="titik" icon={TriangleAlert}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{kritisCount ? 'debit menurun' : 'debit aman'}</span>{/snippet}
    </KpiCard>
  </div>

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <!-- profil mata air terpilih -->
    <div class="xl:col-span-2">
      <Panel
        title="Profil Mata Air"
        subtitle={sel ? `${sel.name} · ${sel.river ?? '—'}` : '—'}
        icon={ChartSpline}
        accent
      >
        {#snippet actions()}
          {#if sel}<StatusBadge status={sel.status} pulse={sel.status !== 'normal'} />{/if}
        {/snippet}

        <!-- pemilih mata air -->
        <div class="mb-3 flex flex-wrap gap-1.5">
          {#each pos as p (p.id)}
            {@const on = sel?.id === p.id}
            <button
              onclick={() => (selId = p.id)}
              class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors {on
                ? 'border-accent/50 bg-accent/15 text-ink-strong'
                : 'border-line bg-surface text-ink-muted hover:bg-panel hover:text-ink'}"
            >
              <span class="h-1.5 w-1.5 rounded-full" style="background:{STATUS[p.status].color}"></span>
              {p.name}
            </button>
          {/each}
        </div>

        {#if sel}
          <MiniChart
            points={sel.history}
            height={260}
            color={SPRING}
            unit="l/dt"
            digits={1}
            yMin={0}
            thresholds={thr(sel)}
          />

          <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {#each paramCards as c (c.label)}
              <div class="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">{c.label}</div>
                <div class="mt-0.5 font-mono text-[14px] font-semibold {c.tone} tnum">
                  {c.value}{#if c.unit}<span class="ml-0.5 text-[9px] font-normal text-ink-muted">{c.unit}</span>{/if}
                </div>
              </div>
            {/each}
          </div>

          <!-- AWQR — Automatic Water Quality Recorder -->
          <div class="mt-3 border-t border-line-soft pt-3">
            <div class="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-dim">
              <FlaskConical size={12} class="text-accent-bright" />
              AWQR · Mutu Air Baku
              <span class="rounded bg-panel-2 px-1 py-px font-mono text-[8px] tracking-wide text-ink-dim">Automatic Water Quality Recorder</span>
            </div>
            <div class="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {#each awqrCards as c (c.def.type)}
                <div class="rounded-lg border border-line bg-panel-2 px-2 py-2">
                  <div class="flex items-center gap-1 text-ink-muted">
                    <c.def.icon size={11} strokeWidth={2} style="color:{c.def.color}" />
                    <span class="truncate text-[9px] font-medium uppercase tracking-[0.03em]">{c.def.label}</span>
                  </div>
                  <div class="mt-1 font-mono text-[14px] font-semibold leading-none text-ink-strong tnum">
                    {c.value !== null ? num(c.value, c.def.digits) : '–'}<span class="ml-0.5 text-[8px] font-normal text-ink-muted">{c.def.unit}</span>
                  </div>
                  <div class="mt-1 h-[18px]">
                    <Sparkline points={c.history.map((h) => h.v)} color={c.def.color} height={18} dot={false} />
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2.5">
            <span class="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
              <span class="flex items-center gap-1"><MapPin size={11} />{num(sel.lat, 3)}, {num(sel.lng, 3)}</span>
              <span class="text-ink-dim">·</span>
              <span class="flex items-center gap-1.5">Tren debit: <Delta delta={selDelta} unit=" l/dt" digits={1} badWhen="down" /></span>
              <span class="text-ink-dim">·</span>
              <span>min 48 jam {num(selStats.min, 1)} l/dt</span>
            </span>
            <Button size="sm" variant="accent" onclick={() => sel && openDetail('pos', sel.id)}>
              <ArrowUpRight size={13} />Detail lengkap &amp; instrumen
            </Button>
          </div>
        {/if}
      </Panel>
    </div>

    <!-- daftar mata air -->
    <Panel title="Daftar Mata Air" subtitle="Klik untuk memuat profil" icon={Table} flush>
      <div class="max-h-[520px] overflow-y-auto">
        {#each rows as p (p.id)}
          {@const on = sel?.id === p.id}
          {@const ec = instrVal(p, 'Konduktivitas')}
          <button
            onclick={() => (selId = p.id)}
            class="flex w-full items-center gap-2.5 border-b border-line-soft px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)] {on ? 'bg-accent/8' : ''}"
          >
            <span class="h-2 w-2 shrink-0 rounded-full" style="background:{STATUS[p.status].color}"></span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-[12px] font-medium text-ink-strong">{p.name}</div>
              <div class="text-[10px] text-ink-dim">{p.river ?? '—'} · {relTime(p.updatedAt, $clock)}</div>
            </div>
            <div class="hidden w-16 shrink-0 sm:block">
              <Sparkline points={instrHist(p, 'Debit Mata Air').map((x) => x.v)} color={STATUS[p.status].color} height={22} dot={false} />
            </div>
            <div class="shrink-0 text-right">
              <div class="font-mono text-[13px] font-semibold tnum" style="color:{STATUS[p.status].color}">
                {num(p.param.value, 1)}<span class="text-[9px] text-ink-muted"> l/dt</span>
              </div>
              <div class="font-mono text-[9px] text-ink-dim tnum">EC {ec !== null ? num(ec, 0) : '–'} µS/cm</div>
            </div>
          </button>
        {/each}
      </div>
    </Panel>
  </div>

  <!-- status debit mata air vs ambang per titik -->
  <Panel
    title="Status Debit Mata Air"
    subtitle="Posisi debit terkini pada rentang Waspada–Siaga–Awas"
    icon={Waves}
  >
    {#snippet actions()}
      <span class="hidden items-center gap-1.5 text-[10px] text-ink-dim sm:inline-flex">
        <TriangleAlert size={11} class="text-siaga" />
        zona peringatan berada di bawah penanda — debit turun = makin gawat
      </span>
    {/snippet}

    <div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
      {#each rows as p (p.id)}
        <button onclick={() => openDetail('pos', p.id)} class="text-left">
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <span class="flex items-center gap-2 truncate text-[12px] text-ink">
              <span class="h-2 w-2 rounded-full" style="background:{STATUS[p.status].color}"></span>
              <span class="truncate font-medium text-ink-strong">{p.name}</span>
              <span class="truncate text-[10px] text-ink-dim">{p.river ?? ''}</span>
            </span>
            <span class="shrink-0 font-mono text-[12px] font-semibold tnum" style="color:{STATUS[p.status].color}">{num(p.param.value, 1)} l/dt</span>
          </div>
          <LevelBar
            value={p.param.value}
            min={0}
            max={p.thresholds ? p.thresholds.waspada * 1.6 : 30}
            color={STATUS[p.status].color}
            markers={p.thresholds
              ? [
                  { value: p.thresholds.waspada, color: STATUS.waspada.color, label: 'Waspada' },
                  { value: p.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
                  { value: p.thresholds.awas, color: STATUS.awas.color, label: 'Awas' },
                ]
              : []}
          />
        </button>
      {/each}
    </div>

    <p class="mt-4 flex items-start gap-1.5 border-t border-line-soft pt-3 text-[10.5px] leading-relaxed text-ink-dim">
      <FlaskConical size={12} class="mt-0.5 shrink-0 text-ink-dim" />
      <span>
        Berbeda dari pos duga air, ambang mata air dibaca <span class="text-ink-muted">menurun</span>:
        bila debit jatuh <span class="text-ink-muted">melewati penanda Waspada lalu Siaga hingga Awas</span>,
        statusnya kian gawat — indikasi penurunan muka air tanah / kekeringan pada sumber air baku.
      </span>
    </p>
  </Panel>
</div>
