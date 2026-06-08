<script lang="ts">
  import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
  import Droplet from '@lucide/svelte/icons/droplet';
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
  import StatusBadge from '../../ui/StatusBadge.svelte';
  import Sparkline from '../../ui/Sparkline.svelte';

  import { pchList, openDetail, clock } from '../../../stores';
  import { STATUS } from '../../../status';
  import { num, relTime } from '../../../format';
  import type { PosHidrologi } from '../../../types';

  const GOLD = '#c9a227';

  const pos = $derived($pchList);

  // pos terpilih untuk panel profil (default: paling gawat / pertama)
  let selId = $state<string | null>(null);
  const sel = $derived(
    pos.find((p) => p.id === selId) ??
      [...pos].sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight)[0],
  );

  /** intensitas hujan (mm/jam) terkini sebuah pos */
  function intensitas(p: PosHidrologi): number {
    return p.instruments.find((i) => i.type === 'Intensitas')?.value ?? 0;
  }
  /** akumulasi curah hujan sepanjang histori (mm) */
  function akumulasi(p: PosHidrologi): number {
    return p.history.reduce((s, h) => s + h.v, 0);
  }

  const hujanMax = $derived(pos.length ? Math.max(...pos.map((p) => p.param.value)) : 0);
  const intensMax = $derived(pos.length ? Math.max(...pos.map((p) => intensitas(p))) : 0);
  const lebatCount = $derived(
    pos.filter((p) => p.thresholds && p.param.value >= p.thresholds.siaga).length,
  );

  const selIntens = $derived(sel ? intensitas(sel) : 0);
  const selAkum = $derived(sel ? akumulasi(sel) : 0);

  const rows = $derived(
    [...pos].sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight),
  );
</script>

<div class="flex flex-col gap-3">
  <p class="text-[12px] leading-relaxed text-ink-muted">
    Pemantauan <span class="text-ink-strong">curah hujan real-time</span> dari Penakar Hujan
    Otomatis (ARR) di tiap Pos Curah Hujan. Intensitas dan akumulasi hujan dibandingkan terhadap
    ambang Waspada–Siaga–Awas untuk peringatan dini banjir.
  </p>

  <!-- KPI -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Pos Curah Hujan" value={String(pos.length)} unit="pos" icon={Radio} />
    <KpiCard label="Hujan tertinggi" value={num(hujanMax, 1)} unit="mm" icon={CloudRainWind} accent />
    <KpiCard label="Intensitas maks" value={num(intensMax, 1)} unit="mm/jam" icon={Gauge} />
    <KpiCard label="Pos hujan lebat" value={String(lebatCount)} unit="pos" icon={TriangleAlert}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{lebatCount ? 'siaga+ terlampaui' : 'tidak ada hujan lebat'}</span>{/snippet}
    </KpiCard>
  </div>

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <!-- profil pos terpilih -->
    <div class="xl:col-span-2">
      <Panel title="Profil Pos Curah Hujan" subtitle={sel ? `${sel.name} · ${sel.river ?? '—'}` : '—'} icon={ChartSpline} accent>
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
            color={GOLD}
            unit="mm"
            digits={1}
            bars
            yMin={0}
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
              { label: 'Curah hujan terkini', value: `${num(sel.param.value, 1)} mm`, tone: 'text-gold' },
              { label: 'Intensitas', value: `${num(selIntens, 1)} mm/jam`, tone: 'text-accent-bright' },
              { label: 'Akumulasi 48 jam', value: `${num(selAkum, 0)} mm`, tone: 'text-ink-strong' },
              { label: 'Status', value: STATUS[sel.status].label, tone: STATUS[sel.status].text },
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
              <span>Pembaruan {relTime(sel.updatedAt, $clock)}</span>
            </span>
            <Button size="sm" variant="gold" onclick={() => sel && openDetail('pos', sel.id)}>
              <ArrowUpRight size={13} />Detail lengkap &amp; instrumen
            </Button>
          </div>
        {/if}
      </Panel>
    </div>

    <!-- daftar pos -->
    <Panel title="Daftar Pos Curah Hujan" subtitle="Klik untuk memuat profil" icon={Table} flush>
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
            <div class="hidden w-16 shrink-0 sm:block"><Sparkline points={p.history.map((x) => x.v)} color={GOLD} height={22} bars /></div>
            <div class="shrink-0 text-right">
              <div class="font-mono text-[13px] font-semibold tnum" style="color:{STATUS[p.status].color}">{num(p.param.value, 1)}<span class="text-[9px] text-ink-muted"> mm</span></div>
              <div class="font-mono text-[9px] text-ink-dim tnum">{num(intensitas(p), 1)} mm/jam</div>
            </div>
          </button>
        {/each}
      </div>
    </Panel>
  </div>

  <!-- curah hujan antar-pos -->
  <Panel title="Curah Hujan Antar-Pos" subtitle="Sebaran curah hujan & intensitas terkini · klik untuk detail" icon={CloudRainWind}>
    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
      {#each rows as p (p.id)}
        <button
          onclick={() => openDetail('pos', p.id)}
          class="group rounded-lg border border-line-soft bg-surface px-3 py-2.5 text-left transition-colors hover:border-gold/40 hover:bg-panel"
        >
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <span class="flex min-w-0 items-center gap-2 text-[12px]">
              <span class="h-2 w-2 shrink-0 rounded-full" style="background:{STATUS[p.status].color}"></span>
              <span class="truncate font-medium text-ink-strong">{p.name}</span>
            </span>
            <StatusBadge status={p.status} size="xs" dot={false} />
          </div>
          <Sparkline points={p.history.map((x) => x.v)} color={GOLD} height={34} bars />
          <div class="mt-1.5 flex items-center justify-between gap-2">
            <span class="flex items-center gap-1 text-[10px] text-ink-dim">
              <Droplet size={11} class="text-gold" />{p.river ?? '—'}
            </span>
            <span class="font-mono text-[12px] font-semibold tnum" style="color:{STATUS[p.status].color}">
              {num(p.param.value, 1)} mm
              <span class="text-[9px] font-normal text-ink-dim"> · {num(intensitas(p), 1)} mm/jam</span>
            </span>
          </div>
        </button>
      {/each}
    </div>
  </Panel>
</div>
