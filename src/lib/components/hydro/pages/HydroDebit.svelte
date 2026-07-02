<script lang="ts">
  import Gauge from '@lucide/svelte/icons/gauge';
  import Waves from '@lucide/svelte/icons/waves';
  import Wind from '@lucide/svelte/icons/wind';
  import Radio from '@lucide/svelte/icons/radio';
  import ChartSpline from '@lucide/svelte/icons/chart-spline';
  import Table from '@lucide/svelte/icons/table-2';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import MapPin from '@lucide/svelte/icons/map-pin';

  import Panel from '../../ui/Panel.svelte';
  import KpiCard from '../../ui/KpiCard.svelte';
  import Button from '../../ui/Button.svelte';
  import MiniChart from '../../ui/MiniChart.svelte';
  import StatusBadge from '../../ui/StatusBadge.svelte';
  import Sparkline from '../../ui/Sparkline.svelte';
  import Delta from '../../ui/Delta.svelte';

  import { pdaList, openDetail, clock } from '../../../stores';
  import { STATUS } from '../../../status';
  import { num, relTime } from '../../../format';
  import { shortDelta } from '../../../series';
  import type { PosHidrologi, SeriesPoint } from '../../../types';

  const ACCENT = '#38bdf8';

  const pos = $derived($pdaList);

  // ---------- helper akses instrumen ----------
  function afmrHistory(p: PosHidrologi): SeriesPoint[] {
    return p.instruments.find((i) => i.type === 'AFMR')?.history ?? [];
  }
  function afmrValue(p: PosHidrologi): number {
    return p.instruments.find((i) => i.type === 'AFMR')?.value ?? 0;
  }
  function velocityValue(p: PosHidrologi): number {
    return p.instruments.find((i) => i.type === 'Kecepatan Aliran')?.value ?? 0;
  }
  function velocityHistory(p: PosHidrologi): SeriesPoint[] {
    return p.instruments.find((i) => i.type === 'Kecepatan Aliran')?.history ?? [];
  }

  // ---------- pos terpilih ----------
  let selId = $state<string | null>(null);
  const sel = $derived(
    pos.find((p) => p.id === selId) ??
      [...pos].sort((a, b) => (b.debit ?? 0) - (a.debit ?? 0))[0],
  );

  const selFlow = $derived(sel ? afmrValue(sel) : 0);
  const selRating = $derived(sel?.debit ?? 0);
  const selDeviasi = $derived(Math.abs(selFlow - selRating));
  const selVel = $derived(sel ? velocityValue(sel) : 0);
  const selFlowDelta = $derived(sel ? shortDelta(afmrHistory(sel)) : 0);

  // ---------- KPI ----------
  const debitTotal = $derived(pos.reduce((s, p) => s + (p.debit ?? 0), 0));
  const debitPuncak = $derived(pos.length ? Math.max(...pos.map((p) => p.debit ?? 0)) : 0);
  const velAvg = $derived(
    pos.length ? pos.reduce((s, p) => s + velocityValue(p), 0) / pos.length : 0,
  );

  // ---------- daftar & peringkat ----------
  const rows = $derived([...pos].sort((a, b) => (b.debit ?? 0) - (a.debit ?? 0)));
  const maxDebit = $derived(debitPuncak || 1);
</script>

<div class="flex flex-col gap-3">
  <p class="text-[12px] leading-relaxed text-ink-muted">
    Pengukuran <span class="text-ink-strong">debit sungai real-time</span> di tiap Pos Duga Air —
    dipantau lewat <span class="text-ink-strong">flowmeter ultrasonik non-kontak (AFMR)</span> yang
    mengukur kecepatan permukaan tanpa menyentuh air, diperkuat estimasi
    <span class="text-ink-strong">rating curve</span> dari tinggi muka air. Selisih kedua metode
    dipantau untuk menjaga keandalan pengukuran aliran.
  </p>

  <!-- KPI -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Debit sungai total" value={num(debitTotal, 0)} unit="m³/s" icon={Gauge} accent>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">agregat seluruh pos duga air</span>{/snippet}
    </KpiCard>
    <KpiCard label="Debit puncak" value={num(debitPuncak, 0)} unit="m³/s" icon={Waves} />
    <KpiCard label="Kecepatan rata-rata" value={num(velAvg, 2)} unit="m/s" icon={Wind} />
    <KpiCard label="Pos terpantau" value={String(pos.length)} unit="pos" icon={Radio} />
  </div>

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <!-- profil debit pos terpilih -->
    <div class="xl:col-span-2">
      <Panel
        title="Profil Debit Pos Duga Air"
        subtitle={sel ? `${sel.name} · ${sel.river ?? '—'}` : '—'}
        icon={ChartSpline}
        accent
      >
        {#snippet actions()}
          {#if sel}<StatusBadge status={sel.status} pulse={sel.status !== 'normal'} />{/if}
        {/snippet}

        <!-- pemilih pos -->
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
          <MiniChart points={afmrHistory(sel)} height={260} color={ACCENT} unit="m³/s" digits={1} />

          <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {#each [
              { label: 'Debit flowmeter', value: `${num(selFlow, 1)} m³/s`, tone: 'text-accent-bright' },
              { label: 'Debit rating-curve', value: `${num(selRating, 0)} m³/s`, tone: 'text-ink-strong' },
              { label: 'Selisih / deviasi', value: `${num(selDeviasi, 1)} m³/s`, tone: 'text-gold' },
              { label: 'Kecepatan aliran', value: `${num(selVel, 2)} m/s`, tone: 'text-ink-strong' },
            ] as s (s.label)}
              <div class="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">{s.label}</div>
                <div class="mt-0.5 font-mono text-[14px] font-semibold {s.tone} tnum">{s.value}</div>
              </div>
            {/each}
          </div>

          <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2.5">
            <span class="flex items-center gap-2 text-[11px] text-ink-muted">
              <span class="flex items-center gap-1"><MapPin size={11} />{num(sel.lat, 3)}, {num(sel.lng, 3)}</span>
              <span class="text-ink-dim">·</span>
              <span>Tren debit: <Delta delta={selFlowDelta} unit=" m³/s" digits={1} badWhen="up" /></span>
            </span>
            <Button size="sm" variant="accent" onclick={() => sel && openDetail('pos', sel.id)}>
              <ArrowUpRight size={13} />Detail lengkap
            </Button>
          </div>
        {/if}
      </Panel>
    </div>

    <!-- daftar pos -->
    <Panel title="Debit per Pos Duga Air" subtitle="Flowmeter ultrasonik · klik untuk profil" icon={Table} flush>
      <div class="max-h-[520px] overflow-y-auto">
        {#each rows as p (p.id)}
          {@const on = sel?.id === p.id}
          <button
            onclick={() => (selId = p.id)}
            class="flex w-full items-center gap-2.5 border-b border-line-soft px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)] {on ? 'bg-accent/8' : ''}"
          >
            <span class="h-2 w-2 shrink-0 rounded-full" style="background:{STATUS[p.status].color}"></span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-[12px] font-medium text-ink-strong">{p.name}</div>
              <div class="text-[10px] text-ink-dim">
                {num(velocityValue(p), 2)} m/s · {relTime(p.updatedAt, $clock)}
              </div>
            </div>
            <div class="hidden w-16 shrink-0 sm:block">
              <Sparkline points={afmrHistory(p).map((x) => x.v)} color={ACCENT} height={22} dot={false} />
            </div>
            <div class="shrink-0 text-right">
              <div class="font-mono text-[13px] font-semibold tnum" style="color:{ACCENT}">
                {num(afmrValue(p), 1)}<span class="text-[9px] text-ink-muted"> m³/s</span>
              </div>
              <div class="font-mono text-[9px] text-ink-dim tnum">rating {num(p.debit ?? 0, 0)}</div>
            </div>
          </button>
        {/each}
      </div>
    </Panel>
  </div>

  <!-- peringkat debit -->
  <Panel title="Peringkat Debit Sungai" subtitle="Debit flowmeter terhadap debit terbesar jaringan" icon={Gauge}>
    <div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
      {#each rows as p (p.id)}
        {@const flow = afmrValue(p)}
        <button onclick={() => openDetail('pos', p.id)} class="text-left">
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <span class="flex items-center gap-2 truncate text-[12px] text-ink">
              <span class="h-2 w-2 rounded-full" style="background:{STATUS[p.status].color}"></span>
              <span class="truncate font-medium text-ink-strong">{p.name}</span>
              <span class="truncate text-[10px] text-ink-dim">{p.river ?? ''}</span>
            </span>
            <span class="shrink-0 font-mono text-[12px] font-semibold tnum" style="color:{ACCENT}">
              {num(flow, 1)} m³/s
            </span>
          </div>
          <div class="relative h-2.5 w-full overflow-hidden rounded-full bg-panel-2 ring-1 ring-line">
            <div
              class="absolute inset-y-0 left-0 rounded-full"
              style="width:{Math.max(0, Math.min(100, (flow / (maxDebit * 1.1)) * 100))}%;background:linear-gradient(90deg,{ACCENT}55,{ACCENT});transition:width 0.6s cubic-bezier(0.22,1,0.36,1)"
            ></div>
          </div>
          <div class="mt-1 flex items-center justify-between text-[9.5px] text-ink-dim">
            <span>rating {num(p.debit ?? 0, 0)} m³/s · v {num(velocityValue(p), 2)} m/s</span>
            <span class="hidden w-14 sm:block">
              <Sparkline points={velocityHistory(p).map((x) => x.v)} color={STATUS[p.status].color} height={16} area={false} dot={false} />
            </span>
          </div>
        </button>
      {/each}
    </div>
  </Panel>
</div>
