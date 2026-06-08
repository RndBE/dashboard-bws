<script lang="ts">
  import Waves from '@lucide/svelte/icons/waves';
  import Gauge from '@lucide/svelte/icons/gauge';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Table from '@lucide/svelte/icons/table-2';
  import ChartSpline from '@lucide/svelte/icons/chart-spline';
  import Radio from '@lucide/svelte/icons/radio';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import MapPin from '@lucide/svelte/icons/map-pin';

  import Panel from '../../ui/Panel.svelte';
  import KpiCard from '../../ui/KpiCard.svelte';
  import Button from '../../ui/Button.svelte';
  import MiniChart from '../../ui/MiniChart.svelte';
  import LevelBar from '../../ui/LevelBar.svelte';
  import StatusBadge from '../../ui/StatusBadge.svelte';
  import Sparkline from '../../ui/Sparkline.svelte';
  import Delta from '../../ui/Delta.svelte';

  import { pdaList, openDetail, clock } from '../../../stores';
  import { STATUS } from '../../../status';
  import { num, relTime } from '../../../format';
  import { stats, shortDelta } from '../../../series';

  const pos = $derived($pdaList);

  // pos terpilih untuk panel profil (default: paling gawat / pertama)
  let selId = $state<string | null>(null);
  const sel = $derived(
    pos.find((p) => p.id === selId) ??
      [...pos].sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight)[0],
  );

  const tmaMax = $derived(pos.length ? Math.max(...pos.map((p) => p.param.value)) : 0);
  const debitTotal = $derived(pos.reduce((s, p) => s + (p.debit ?? 0), 0));
  const siagaCount = $derived(pos.filter((p) => p.status !== 'normal').length);

  const selStats = $derived(sel ? stats(sel.history.map((h) => h.v)) : { min: 0, max: 0, avg: 0 });
  const selDelta = $derived(sel ? shortDelta(sel.history) : 0);

  const rows = $derived(
    [...pos].sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight),
  );
</script>

<div class="flex flex-col gap-3">
  <p class="text-[12px] leading-relaxed text-ink-muted">
    Pemantauan <span class="text-ink-strong">tinggi muka air (TMA) sungai real-time</span> dari
    Pencatat Muka Air Otomatis (AWLR) di tiap Pos Duga Air. Nilai dibandingkan terhadap
    ambang Waspada–Siaga–Awas untuk peringatan dini banjir.
  </p>

  <!-- KPI -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Pos Duga Air" value={String(pos.length)} unit="pos" icon={Radio} />
    <KpiCard label="TMA tertinggi" value={num(tmaMax, 2)} unit="m" icon={Waves} accent />
    <KpiCard label="Debit sungai total" value={num(debitTotal, 0)} unit="m³/s" icon={Gauge} />
    <KpiCard label="Pos siaga+" value={String(siagaCount)} unit="pos" icon={TriangleAlert}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{siagaCount ? 'perlu perhatian' : 'semua normal'}</span>{/snippet}
    </KpiCard>
  </div>

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <!-- profil pos terpilih -->
    <div class="xl:col-span-2">
      <Panel title="Profil Pos Duga Air" subtitle={sel ? `${sel.name} · ${sel.river ?? '—'}` : '—'} icon={ChartSpline} accent>
        {#snippet actions()}
          {#if sel}<StatusBadge status={sel.status} pulse={sel.status !== 'normal'} />{/if}
        {/snippet}

        <!-- pemilih pos -->
        <div class="mb-3 flex flex-wrap gap-1.5">
          {#each pos as p}
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
            color={STATUS[sel.status].color}
            unit="m"
            digits={2}
            thresholds={sel.thresholds
              ? [
                  { value: sel.thresholds.waspada, color: STATUS.waspada.color, label: 'Waspada' },
                  { value: sel.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
                  { value: sel.thresholds.awas, color: STATUS.awas.color, label: 'Awas' },
                ]
              : []}
          />

          <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {#each [
              { label: 'TMA terkini', value: `${num(sel.param.value, 2)} m`, tone: 'text-ink-strong' },
              { label: 'Debit (rating)', value: `${num(sel.debit ?? 0, 0)} m³/s`, tone: 'text-accent-bright' },
              { label: 'Maks 48 jam', value: `${num(selStats.max, 2)} m`, tone: 'text-awas' },
              { label: 'Minimum', value: `${num(selStats.min, 2)} m`, tone: 'text-normal' },
            ] as s}
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
              <span>Tren: <Delta delta={selDelta} unit=" m" digits={2} badWhen="up" /></span>
            </span>
            <Button size="sm" variant="accent" onclick={() => sel && openDetail('pos', sel.id)}>
              <ArrowUpRight size={13} />Detail lengkap &amp; instrumen
            </Button>
          </div>
        {/if}
      </Panel>
    </div>

    <!-- daftar pos -->
    <Panel title="Daftar Pos Duga Air" subtitle="Klik untuk memuat profil" icon={Table} flush>
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
              <div class="text-[10px] text-ink-dim">{p.river ?? '—'} · {relTime(p.updatedAt, $clock)}</div>
            </div>
            <div class="hidden w-16 shrink-0 sm:block"><Sparkline points={p.history.map((x) => x.v)} color={STATUS[p.status].color} height={22} dot={false} /></div>
            <div class="shrink-0 text-right">
              <div class="font-mono text-[13px] font-semibold tnum" style="color:{STATUS[p.status].color}">{num(p.param.value, 2)}<span class="text-[9px] text-ink-muted"> m</span></div>
              <div class="font-mono text-[9px] text-ink-dim tnum">Q {num(p.debit ?? 0, 0)}</div>
            </div>
          </button>
        {/each}
      </div>
    </Panel>
  </div>

  <!-- status TMA vs ambang per pos -->
  <Panel title="Status Tinggi Muka Air terhadap Ambang Siaga" subtitle="Posisi TMA terkini pada rentang Waspada–Siaga–Awas" icon={Waves}>
    <div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
      {#each rows as p (p.id)}
        <button onclick={() => openDetail('pos', p.id)} class="text-left">
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <span class="flex items-center gap-2 truncate text-[12px] text-ink">
              <span class="h-2 w-2 rounded-full" style="background:{STATUS[p.status].color}"></span>
              <span class="truncate font-medium text-ink-strong">{p.name}</span>
              <span class="truncate text-[10px] text-ink-dim">{p.river ?? ''}</span>
            </span>
            <span class="shrink-0 font-mono text-[12px] font-semibold tnum" style="color:{STATUS[p.status].color}">{num(p.param.value, 2)} m</span>
          </div>
          <LevelBar
            value={p.param.value}
            min={0}
            max={p.thresholds ? p.thresholds.awas * 1.15 : 5}
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
  </Panel>
</div>
