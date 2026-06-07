<script lang="ts">
  import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
  import Waves from '@lucide/svelte/icons/waves';
  import Sprout from '@lucide/svelte/icons/sprout';
  import Siren from '@lucide/svelte/icons/siren';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Radio from '@lucide/svelte/icons/radio';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Activity from '@lucide/svelte/icons/activity';
  import Gauge from '@lucide/svelte/icons/gauge';
  import Droplets from '@lucide/svelte/icons/droplets';
  import Pause from '@lucide/svelte/icons/pause';
  import Play from '@lucide/svelte/icons/play';
  import Maximize from '@lucide/svelte/icons/maximize';
  import Minimize from '@lucide/svelte/icons/minimize';
  import LogOut from '@lucide/svelte/icons/log-out';
  import type { Component, Snippet } from 'svelte';
  import type { AssetKind } from '../../types';

  import BasinMap from '../map/BasinMap.svelte';
  import WallMapControls from '../map/WallMapControls.svelte';
  import WallCctvPanel from '../cctv/WallCctvPanel.svelte';
  import Logo from '../layout/Logo.svelte';
  import DamIcon from '../icons/DamIcon.svelte';
  import Sparkline from '../ui/Sparkline.svelte';
  import WallDonut from '../ui/WallDonut.svelte';
  import {
    data,
    clock,
    mode,
    paused,
    overallStatus,
    statusCounts,
    activeAlerts,
    openDetail,
    markers,
  } from '../../stores';

  // ---------- kontrol layar dinding ----------
  let isFullscreen = $state(false);

  function toggleFullscreen() {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  }
  function onFsChange() {
    isFullscreen = !!document.fullscreenElement;
  }

  import { requestLogout } from '../../auth';
  import { irigasiRatio } from '../../data/derive';
  import { SIAGA_ORDER, STATUS, KIND_LABEL } from '../../status';
  import { clockTime, fullDate, num, relTime, signed } from '../../format';

  const d = $derived($data);

  // ---------- filter peta (layer aset & instrumen) ----------
  let hiddenKinds = $state<AssetKind[]>([]);
  let hiddenInstruments = $state<string[]>([]);
  function toggleKind(k: AssetKind) {
    hiddenKinds = hiddenKinds.includes(k)
      ? hiddenKinds.filter((x) => x !== k)
      : [...hiddenKinds, k];
  }
  function toggleInstrument(t: string) {
    hiddenInstruments = hiddenInstruments.includes(t)
      ? hiddenInstruments.filter((x) => x !== t)
      : [...hiddenInstruments, t];
  }
  function resetFilters() {
    hiddenKinds = [];
    hiddenInstruments = [];
  }

  const agg = $derived.by(() => {
    const dugaAir = d.pos.filter((p) => p.tipe === 'duga-air');
    const hujanPos = d.pos.filter((p) => p.tipe === 'hujan');
    const hujan = hujanPos.length ? hujanPos.reduce((s, p) => s + p.param.value, 0) / hujanPos.length : 0;
    const peak = dugaAir.length ? dugaAir.reduce((a, b) => (b.param.value > a.param.value ? b : a)) : null;
    const sumVol = d.bendungan.reduce((s, b) => s + b.volume, 0);
    const sumKap = d.bendungan.reduce((s, b) => s + b.kapasitas, 0);
    const ir = (d.irigasi.reduce((s, x) => s + irigasiRatio(x), 0) / d.irigasi.length) * 100;
    const siaga = d.pos.filter((p) => p.status !== 'normal').length;
    const debitTotal = dugaAir.reduce((s, p) => s + (p.debit ?? 0), 0);
    return { hujan, peak, tampungan: (sumVol / sumKap) * 100, ir, siaga, debitTotal, sumVol, sumKap };
  });

  // tren mini untuk KPI (delta ~6 langkah)
  function arrDelta(a: number[], back = 6) {
    if (a.length < 2) return 0;
    return a[a.length - 1] - a[Math.max(0, a.length - 1 - back)];
  }
  const hujanAvgSeries = $derived.by(() => {
    const hp = d.pos.filter((p) => p.tipe === 'hujan');
    if (!hp.length) return [];
    const n = Math.min(...hp.map((p) => p.history.length));
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(hp.reduce((s, p) => s + p.history[i].v, 0) / hp.length);
    return out;
  });

  interface Kpi {
    label: string;
    value: string;
    unit: string;
    icon: Component<any>;
    color: string;
    series: number[];
    delta: number;
    badWhen: 'up' | 'down' | 'none';
    digits: number;
    /** render mini-chart sebagai batang (curah hujan) */
    bars?: boolean;
  }
  const kpis = $derived<Kpi[]>([
    { label: 'Hujan rata-rata', value: num(agg.hujan, 1), unit: 'mm', icon: CloudRainWind, color: '#c9a227', series: hujanAvgSeries, delta: arrDelta(hujanAvgSeries), badWhen: 'up', digits: 1, bars: true },
    { label: 'TMA puncak', value: num(agg.peak?.param.value ?? 0, 2), unit: 'm', icon: Waves, color: agg.peak ? STATUS[agg.peak.status].color : STATUS.normal.color, series: (agg.peak?.history ?? []).map((p) => p.v), delta: arrDelta((agg.peak?.history ?? []).map((p) => p.v)), badWhen: 'up', digits: 2 },
    { label: 'Debit total', value: num(agg.debitTotal, 0), unit: 'm³/s', icon: Activity, color: '#38bdf8', series: (agg.peak?.history ?? []).map((p) => p.v), delta: 0, badWhen: 'none', digits: 0 },
    { label: 'Tampungan waduk', value: num(agg.tampungan, 0), unit: '%', icon: DamIcon, color: '#4f9bee', series: d.bendungan[0]?.historyElevasi.map((p) => p.v) ?? [], delta: 0, badWhen: 'none', digits: 0 },
    { label: 'Pemenuhan irigasi', value: num(agg.ir, 0), unit: '%', icon: Sprout, color: agg.ir < 90 ? '#e08a3c' : '#3fb27f', series: d.irigasi[0]?.historyDebit.map((p) => p.v) ?? [], delta: 0, badWhen: 'down', digits: 0 },
  ]);

  // pos teratas (paling gawat / TMA tertinggi) untuk panel monitoring kiri
  const topPos = $derived(
    [...d.pos]
      .sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight || b.param.value - a.param.value)
      .slice(0, 4),
  );

  const time = $derived(clockTime($clock));
  const date = $derived(fullDate($clock));

  const tickerItems = $derived.by(() => {
    const crit = [...d.pos]
      .filter((p) => p.status !== 'normal')
      .sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight)
      .map((p) => `${STATUS[p.status].label.toUpperCase()} · ${p.name} — ${p.param.label} ${num(p.param.value, p.param.digits)} ${p.param.unit}${p.debit !== undefined ? ` / debit ${num(p.debit, 0)} m³/s` : ''}`);
    const dams = d.bendungan.map(
      (b) => `${b.name} — elevasi ${num(b.elevasi, 2)} mdpl · tampungan ${num((b.volume / b.kapasitas) * 100, 0)}%`,
    );
    const items = [...crit, ...dams];
    return items.length ? items : ['Seluruh pos dalam kondisi normal — tidak ada peringatan aktif'];
  });
</script>

{#snippet panelHead(title: string, Icon: Component<any>, right?: Snippet)}
  <div class="flex items-center gap-2 border-b border-line/50 px-3 py-2">
    <Icon size={13} class="text-accent-bright" strokeWidth={2} />
    <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{title}</span>
    {#if right}<div class="ml-auto">{@render right()}</div>{/if}
  </div>
{/snippet}

<svelte:document onfullscreenchange={onFsChange} />

<div class="relative h-full w-full overflow-hidden bg-bg">
  <!-- ════════ PETA FULL-BLEED (lapisan dasar) ════════ -->
  <div class="absolute inset-0 z-0">
    <BasinMap
      interactive={false}
      wall
      autoTour
      zoom={10}
      {hiddenKinds}
      {hiddenInstruments}
    />
  </div>
  <div class="wall-vignette"></div>
  <div class="wall-scanline"></div>
  <!-- sentuhan aksen oranye PU di latar dinding (sangat tipis) -->
  <div
    class="pointer-events-none absolute inset-0 z-[402]"
    style="background:
      radial-gradient(680px 360px at 50% 100%, rgba(243,177,21,0.06), transparent 60%),
      radial-gradient(520px 300px at 0% 0%, rgba(243,177,21,0.04), transparent 58%);"
  ></div>
  <!-- label HUD peta (di area tengah-atas, di antara header & dock) -->
  <div class="pointer-events-none absolute left-1/2 top-[92px] z-[405] -translate-x-1/2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-dim/70">
    Peta Operasional · Auto-tour aktif
  </div>

  <!-- kontrol layer & legenda peta (collapsible) -->
  <WallMapControls
    markers={$markers}
    {hiddenKinds}
    {hiddenInstruments}
    {toggleKind}
    {toggleInstrument}
    reset={resetFilters}
  />

  <!-- ════════ LAPISAN HUD (overlay mengambang) ════════ -->
  <!-- ════════ HEADER BAR (mengambang) — tiga zona berkelompok ════════ -->
  <header class="overlay-in glass-strong hud-bracket hud-bracket-gold absolute inset-x-3 top-3 z-[620] flex items-center gap-5 overflow-hidden rounded-2xl px-5 py-2.5">
    <div class="glass-sheen"></div>

    <!-- ───── ZONA KIRI · identitas ───── -->
    <div class="flex shrink-0 items-center gap-3">
      <Logo height={30} />
      <div class="leading-tight">
        <div class="text-[9px] font-semibold uppercase tracking-[0.26em] text-pu-bright">Pusat Kendali Operasi</div>
        <div class="text-[16.5px] font-semibold tracking-tight text-ink-strong">STESY Command Center</div>
      </div>
    </div>

    <!-- ───── ZONA TENGAH · inventaris terpantau ───── -->
    <div class="mx-auto hidden items-stretch rounded-xl border border-line/60 bg-white/[0.015] lg:flex">
      {#each [
        { n: d.pos.length, l: 'Pos Duga Air', I: Waves },
        { n: d.bendungan.length, l: 'Bendungan', I: DamIcon },
        { n: d.irigasi.length, l: 'Daerah Irigasi', I: Sprout },
        { n: d.sumur.length, l: 'Sumur Pantau', I: Droplets },
      ] as it, i}
        <div class="flex items-center gap-2.5 px-4 py-1 {i > 0 ? 'border-l border-line/50' : ''}">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-pu/12 text-pu-bright" style="border:1px solid color-mix(in srgb, var(--color-pu) 28%, transparent)">
            <it.I size={15} strokeWidth={1.9} />
          </div>
          <div class="leading-none">
            <div class="font-mono text-[19px] font-semibold text-ink-strong tnum">{it.n}</div>
            <div class="mt-1 text-[8.5px] uppercase tracking-[0.1em] text-ink-dim">{it.l}</div>
          </div>
        </div>
      {/each}
    </div>

    <!-- ───── ZONA KANAN · waktu + kontrol ───── -->
    <div class="ml-auto flex shrink-0 items-center gap-4">
      <!-- jam + LIVE + tanggal -->
      <div class="flex items-center gap-3">
        <div class="flex flex-col items-end leading-none">
          <span class="flex items-center gap-1.5">
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-normal opacity-75"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-normal"></span>
            </span>
            <span class="text-[9px] font-semibold uppercase tracking-[0.24em] text-normal">Live</span>
          </span>
          <span class="mt-1.5 text-[10.5px] text-ink-muted">{date}</span>
        </div>
        <div class="font-mono text-[40px] font-semibold leading-none text-ink-strong tnum tracking-tight">{time}</div>
      </div>

      <!-- cluster kontrol / navigasi -->
      <div class="flex items-center gap-2 border-l border-line/60 pl-4">
        <button
          onclick={() => mode.set('dashboard')}
          title="Buka mode interaktif (dashboard)"
          class="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-3 py-2 text-[11.5px] font-semibold text-accent-bright transition-colors hover:bg-accent/25"
        >
          <LayoutDashboard size={15} strokeWidth={2} /> Interaktif
        </button>

        <button
          onclick={() => paused.update((p) => !p)}
          title={$paused ? 'Lanjutkan data realtime' : 'Jeda data realtime'}
          class="grid h-9 w-9 place-items-center rounded-lg border transition-colors {$paused
            ? 'border-waspada/50 bg-waspada/15 text-waspada'
            : 'border-line text-ink-muted hover:bg-white/[0.06] hover:text-ink-strong'}"
        >
          {#if $paused}<Play size={15} />{:else}<Pause size={15} />{/if}
        </button>

        <button
          onclick={toggleFullscreen}
          title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
          class="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink-strong"
        >
          {#if isFullscreen}<Minimize size={15} />{:else}<Maximize size={15} />{/if}
        </button>

        <button
          onclick={requestLogout}
          title="Keluar sesi"
          class="grid h-9 w-9 place-items-center rounded-lg border border-awas/40 text-awas/90 transition-colors hover:bg-awas/15 hover:text-awas"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  </header>

  <!-- ───── RAIL KIRI (mengambang) ───── -->
  <aside class="overlay-in absolute bottom-[138px] left-3 top-[88px] z-[610] flex w-[300px] flex-col gap-2.5 overflow-hidden">
      <!-- donut status -->
      <section class="glass hud-bracket overflow-hidden rounded-xl">
        {@render panelHead('Status Pos Terpantau', Gauge)}
        <div class="flex items-center gap-3 p-3">
          <WallDonut
            counts={$statusCounts}
            centerValue={String(d.pos.length + d.bendungan.length + d.irigasi.length + d.sumur.length)}
            centerLabel="Total Aset"
            centerStatus={$overallStatus}
          />
          <div class="flex flex-1 flex-col gap-1.5">
            {#each SIAGA_ORDER as s}
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-sm" style="background:{STATUS[s].color}"></span>
                <span class="text-[11px] text-ink-muted">{STATUS[s].label}</span>
                <span class="ml-auto font-mono text-[14px] font-semibold tnum" style="color:{STATUS[s].color}">{$statusCounts[s]}</span>
              </div>
            {/each}
          </div>
        </div>
      </section>

      <!-- tampungan waduk agregat -->
      <section class="glass hud-bracket overflow-hidden rounded-xl">
        {@render panelHead('Tampungan Waduk', DamIcon)}
        <div class="p-3">
          <div class="flex items-end justify-between">
            <span class="font-mono text-[28px] font-semibold leading-none text-ink-strong tnum">{num(agg.tampungan, 0)}<span class="text-[14px] text-ink-muted">%</span></span>
            <span class="text-right text-[10px] text-ink-dim">{num(agg.sumVol, 1)} / {num(agg.sumKap, 0)}<br />juta m³</span>
          </div>
          <div class="mt-2.5 h-2.5 overflow-hidden rounded-full bg-panel-2 ring-1 ring-line">
            <div class="h-full rounded-full" style="width:{Math.min(100, agg.tampungan)}%;background:linear-gradient(90deg,#1d6fd6aa,#4f9bee)"></div>
          </div>
        </div>
      </section>

      <!-- monitoring pos teratas (sparkline TMA) -->
      <section class="glass hud-bracket flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        {@render panelHead('Monitoring TMA · Pos Prioritas', Waves)}
        <div class="flex min-h-0 flex-1 flex-col divide-y divide-line/40 overflow-y-auto">
          {#each topPos as p (p.id)}
            <button onclick={() => openDetail('pos', p.id)} class="flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]">
              <span class="h-2 w-2 shrink-0 rounded-full" style="background:{STATUS[p.status].color}"></span>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[11.5px] font-medium text-ink-strong">{p.name}</div>
                <div class="text-[9.5px] text-ink-dim">{p.river ?? p.param.label}</div>
              </div>
              <div class="h-7 w-16 shrink-0">
                <Sparkline points={p.history.map((x) => x.v)} color={STATUS[p.status].color} height={28} dot={false} />
              </div>
              <div class="w-12 shrink-0 text-right">
                <div class="font-mono text-[13px] font-semibold tnum" style="color:{STATUS[p.status].color}">{num(p.param.value, p.param.digits)}</div>
                <div class="text-[9px] text-ink-dim">{p.param.unit}</div>
              </div>
            </button>
          {/each}
        </div>
      </section>
    </aside>

  <!-- ───── RAIL KANAN (mengambang) ───── -->
  <aside class="overlay-in absolute bottom-[138px] right-3 top-[88px] z-[610] flex w-[344px] flex-col gap-2.5 overflow-hidden" style="animation-delay:.08s">
      <!-- peringatan aktif -->
      <section class="glass-strong hud-bracket hud-bracket-gold flex min-h-0 flex-[1.3] flex-col overflow-hidden rounded-xl">
        <div class="glass-sheen"></div>
        {#snippet alertCount()}
          <span class="rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[12px] font-semibold text-gold tnum">{$activeAlerts.length}</span>
        {/snippet}
        {@render panelHead('Peringatan Aktif', Radio, alertCount)}
        <div class="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
          {#if $activeAlerts.length === 0}
            <div class="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
              <ShieldCheck size={30} class="text-normal" strokeWidth={1.6} />
              <p class="text-[12px] text-ink-muted">Tidak ada peringatan aktif</p>
              <p class="text-[10.5px] text-ink-dim">Seluruh pos dalam status normal</p>
            </div>
          {:else}
            {#each $activeAlerts.slice(0, 12) as a (a.id)}
              <button
                onclick={() => openDetail(a.kind, a.assetId)}
                class="group flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]"
                style="border-color:{STATUS[a.level].color}40;background:{STATUS[a.level].color}12"
              >
                <TriangleAlert size={15} strokeWidth={2} style="color:{STATUS[a.level].color}" class="shrink-0" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[12px] text-ink">{a.message}</p>
                  <p class="text-[10px] text-ink-dim">{KIND_LABEL[a.kind]} · {relTime(a.at, $clock)}</p>
                </div>
                <span class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style="background:{STATUS[a.level].color};color:#0a0f1c">
                  {STATUS[a.level].label}
                </span>
              </button>
            {/each}
          {/if}
        </div>
      </section>

      <!-- bendungan: level elevasi -->
      <section class="glass hud-bracket flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        {@render panelHead('Elevasi Bendungan', DamIcon)}
        <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5">
          {#each d.bendungan as b (b.id)}
            {@const lo = b.elevasiNormal - 3}
            {@const hi = b.elevasiBanjir + 1}
            {@const pos = Math.max(0, Math.min(100, ((b.elevasi - lo) / (hi - lo)) * 100))}
            {@const nrm = ((b.elevasiNormal - lo) / (hi - lo)) * 100}
            {@const bnj = ((b.elevasiBanjir - lo) / (hi - lo)) * 100}
            <button onclick={() => openDetail('bendungan', b.id)} class="rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/[0.04]">
              <div class="mb-1 flex items-center justify-between">
                <span class="truncate text-[11.5px] font-medium text-ink-strong">{b.name}</span>
                <span class="font-mono text-[12px] font-semibold tnum" style="color:{STATUS[b.status].color}">{num(b.elevasi, 2)} <span class="text-[9px] text-ink-dim">mdpl</span></span>
              </div>
              <div class="relative h-2.5 overflow-visible rounded-full bg-panel-2 ring-1 ring-line">
                <div class="absolute inset-y-0 left-0 rounded-full" style="width:{pos}%;background:linear-gradient(90deg,{STATUS[b.status].color}55,{STATUS[b.status].color})"></div>
                <div class="absolute top-1/2 h-[14px] w-0.5 -translate-x-1/2 -translate-y-1/2" style="left:{nrm}%;background:{STATUS.normal.color}" title="Normal"></div>
                <div class="absolute top-1/2 h-[14px] w-0.5 -translate-x-1/2 -translate-y-1/2" style="left:{bnj}%;background:{STATUS.awas.color}" title="M.A. Banjir"></div>
              </div>
            </button>
          {/each}
        </div>
      </section>

      <!-- CCTV: grid 2×2 berputar -->
      <WallCctvPanel />
    </aside>

  <!-- ════════ DOCK BAWAH: KPI + ticker (mengambang) ════════ -->
  <div class="overlay-in glass-strong hud-bracket absolute inset-x-3 bottom-3 z-[620] flex flex-col overflow-hidden rounded-2xl" style="animation-delay:.16s">
    <div class="glass-sheen"></div>
    <!-- KPI strip -->
    <div class="flex items-stretch divide-x divide-line/60">
      {#each kpis as k}
        <div class="flex flex-1 items-center gap-3 px-4 py-2.5">
          <div class="grid h-11 w-11 shrink-0 place-items-center rounded-lg" style="background:{k.color}1a;border:1px solid {k.color}33">
            <k.icon size={21} strokeWidth={2} style="color:{k.color}" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="truncate text-[10px] uppercase tracking-wide text-ink-muted">{k.label}</span>
              {#if k.badWhen !== 'none' && Math.abs(k.delta) > 0.001}
                <span class="font-mono text-[9.5px] {(k.delta > 0 ? 'up' : 'down') === k.badWhen ? 'text-awas' : 'text-normal'}">{signed(k.delta, k.digits)}</span>
              {/if}
            </div>
            <div class="font-mono text-[23px] font-semibold leading-tight text-ink-strong tnum">
              {k.value}<span class="ml-1 text-[11px] font-normal text-ink-muted">{k.unit}</span>
            </div>
          </div>
          {#if k.series.length}
            <div class="h-8 w-20 shrink-0 self-center">
              <Sparkline points={k.series} color={k.color} height={32} dot={false} bars={k.bars} />
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- ticker -->
    <div class="flex items-center gap-3 border-t border-line/60 px-4 py-1.5">
      <span class="flex shrink-0 items-center gap-1.5 rounded bg-awas/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-awas">
        <Siren size={12} /> Status
      </span>
      <div class="marquee-mask min-w-0 flex-1 overflow-hidden">
        <div class="marquee-track" style="--marquee-dur:{Math.max(36, tickerItems.length * 9)}s">
          {#each [0, 1] as dup (dup)}
            {#each tickerItems as item}
              <span class="mx-5 inline-flex items-center gap-2 text-[12px] text-ink" aria-hidden={dup === 1}>
                <span class="h-1.5 w-1.5 rounded-full bg-accent-bright"></span>{item}
              </span>
            {/each}
          {/each}
        </div>
      </div>
      <span class="flex shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-ink-dim">
        {$paused ? 'Dijeda' : 'Realtime'}
        <span class="h-1.5 w-1.5 rounded-full {$paused ? 'bg-waspada' : 'bg-normal'}"></span>
      </span>
    </div>
  </div>
</div>
