<script lang="ts">
  import { untrack } from 'svelte';
  import Activity from '@lucide/svelte/icons/activity';
  import LineChart from '@lucide/svelte/icons/chart-spline';
  import GitCompare from '@lucide/svelte/icons/git-compare-arrows';
  import Table from '@lucide/svelte/icons/table-2';
  import Layers from '@lucide/svelte/icons/layers';
  import Sliders from '@lucide/svelte/icons/sliders-horizontal';
  import Download from '@lucide/svelte/icons/download';
  import Info from '@lucide/svelte/icons/info';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Ruler from '@lucide/svelte/icons/ruler';
  import Sigma from '@lucide/svelte/icons/sigma';
  import Clock from '@lucide/svelte/icons/clock';
  import Radio from '@lucide/svelte/icons/radio';
  import ScatterIcon from '@lucide/svelte/icons/chart-scatter';
  import CheckSquare from '@lucide/svelte/icons/square-check-big';
  import Square from '@lucide/svelte/icons/square';

  import Panel from '../ui/Panel.svelte';
  import Button from '../ui/Button.svelte';
  import MultiChart from '../ui/MultiChart.svelte';
  import ScatterPlot from '../ui/ScatterPlot.svelte';
  import Sparkline from '../ui/Sparkline.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import Delta from '../ui/Delta.svelte';

  import { data, clock, openDetail } from '../../stores';
  import { STATUS } from '../../status';
  import { num, signed, relTime } from '../../format';
  import type { SeriesPoint, Siaga } from '../../types';
  import {
    PARAMS,
    RANGES,
    INTERVALS,
    AGG_LABEL,
    CATEGORY_LABEL,
    SERIES_PALETTE,
    prepare,
    computeStats,
    correlation,
    takeRange,
    toCSV,
    downloadCSV,
    type CategoryKey,
    type AggMode,
  } from '../../analytics';

  // ---------- generic asset shape untuk analisa ----------
  interface Row {
    id: string;
    name: string;
    sub: string;
    status: Siaga;
    lat: number;
    lng: number;
    updatedAt: number;
    /** nilai terkini per kunci parameter */
    current: Record<string, number>;
    /** deret histori per kunci parameter */
    history: Record<string, SeriesPoint[]>;
    /** ambang siaga utk parameter utama (opsional) */
    thresholds?: { waspada: number; siaga: number; awas: number };
    instruments: { name: string; type: string; status: string; value: number; unit: string; updatedAt: number }[];
    /** metrik tambahan utk panel info */
    extra: { label: string; value: string }[];
  }

  const d = $derived($data);

  // ---------- state kontrol ----------
  let category = $state<CategoryKey>('pos');
  let paramKey = $state<string>('tma');
  let rangeKey = $state<string>('24');
  let intervalKey = $state<string>('raw');
  let agg = $state<AggMode>('avg');
  let view = $state<'tren' | 'tabel' | 'korelasi'>('tren');
  let selectedIds = $state<string[]>([]);
  let band = $state(true);
  /** mode batang curah hujan untuk banyak pos: dijejer atau bertumpuk */
  let rainBarMode = $state<'grouped' | 'stacked'>('grouped');

  const cats: CategoryKey[] = ['pos', 'bendungan', 'irigasi', 'sumur'];
  const params = $derived(PARAMS[category]);
  const param = $derived(params.find((p) => p.key === paramKey) ?? params[0]);
  const range = $derived(RANGES.find((r) => r.key === rangeKey) ?? RANGES[2]);
  const interval = $derived(INTERVALS.find((i) => i.key === intervalKey) ?? INTERVALS[0]);

  // ---------- bangun baris generik per kategori ----------
  const rows = $derived.by<Row[]>(() => {
    if (category === 'pos') {
      return d.pos.map((p) => ({
        id: p.id,
        name: p.name,
        sub: p.river,
        status: p.status,
        lat: p.lat,
        lng: p.lng,
        updatedAt: p.updatedAt,
        current: { tma: p.tma, hujan: p.hujan, debit: p.debit },
        history: { tma: p.historyTMA, hujan: p.historyHujan },
        thresholds: p.thresholds,
        instruments: p.instruments,
        extra: [
          { label: 'Debit', value: `${num(p.debit, 0)} m³/s` },
          { label: 'Hujan 1 jam', value: `${num(p.hujan, 1)} mm` },
        ],
      }));
    }
    if (category === 'bendungan') {
      return d.bendungan.map((b) => ({
        id: b.id,
        name: b.name,
        sub: b.river,
        status: b.status,
        lat: b.lat,
        lng: b.lng,
        updatedAt: b.updatedAt,
        current: { elevasi: b.elevasi, inflow: b.inflow, outflow: b.outflow },
        history: { elevasi: b.historyElevasi, inflow: b.historyInflow },
        thresholds: { waspada: b.elevasiNormal, siaga: (b.elevasiNormal + b.elevasiBanjir) / 2, awas: b.elevasiBanjir },
        instruments: b.instruments,
        extra: [
          { label: 'Tampungan', value: `${num((b.volume / b.kapasitas) * 100, 0)}%` },
          { label: 'Inflow / Outflow', value: `${num(b.inflow, 0)} / ${num(b.outflow, 0)} m³/s` },
        ],
      }));
    }
    if (category === 'irigasi') {
      return d.irigasi.map((x) => ({
        id: x.id,
        name: x.name,
        sub: x.polaTanam,
        status: x.status,
        lat: x.lat,
        lng: x.lng,
        updatedAt: x.updatedAt,
        current: { debit: x.debit },
        history: { debit: x.historyDebit },
        thresholds: { waspada: x.kebutuhan * 0.9, siaga: x.kebutuhan * 0.75, awas: x.kebutuhan * 0.6 },
        instruments: x.instruments,
        extra: [
          { label: 'Kebutuhan', value: `${num(x.kebutuhan, 1)} m³/s` },
          { label: 'Luas layanan', value: `${num(x.layanan, 0)} ha` },
        ],
      }));
    }
    // sumur
    return d.sumur.map((s) => ({
      id: s.id,
      name: s.name,
      sub: 'Sumur pantau',
      status: s.status,
      lat: s.lat,
      lng: s.lng,
      updatedAt: s.updatedAt,
      current: { muka: s.muka },
      history: { muka: s.history },
      thresholds: { waspada: s.baseline + s.thresholds.waspada, siaga: s.baseline + s.thresholds.siaga, awas: s.baseline + s.thresholds.awas },
      instruments: s.instruments,
      extra: [
        { label: 'Baseline', value: `${num(s.baseline, 2)} m` },
        { label: 'Penurunan', value: `${signed(s.muka - s.baseline, 2)} m` },
      ],
    }));
  });

  // saat ganti kategori: validasi parameter & atur ulang seleksi pos.
  // Hanya bereaksi pada perubahan `category` (bukan tiap tick simulasi),
  // sehingga seleksi manual pengguna tidak ditimpa berulang.
  $effect(() => {
    const cat = category; // satu-satunya dependensi yang dilacak
    untrack(() => {
      if (!PARAMS[cat].some((p) => p.key === paramKey)) {
        paramKey = PARAMS[cat][0].key;
      }
      const ids = rows.map((r) => r.id);
      const keep = selectedIds.filter((id) => ids.includes(id));
      selectedIds = keep.length ? keep : ids.slice(0, Math.min(3, ids.length));
    });
  });

  function toggle(id: string) {
    selectedIds = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
  }
  function selectAll() {
    selectedIds = rows.map((r) => r.id);
  }
  function clearAll() {
    selectedIds = [];
  }

  const selectedRows = $derived(rows.filter((r) => selectedIds.includes(r.id)));

  // ---------- deret tersiapkan utk grafik ----------
  function colorFor(idx: number) {
    return SERIES_PALETTE[idx % SERIES_PALETTE.length];
  }

  const chartSeries = $derived(
    selectedRows.map((r, i) => ({
      name: r.name,
      color: colorFor(i),
      points: prepare(r.history[paramKey] ?? [], range.hours, interval.bucket, agg),
    })),
  );

  // curah hujan dirender sebagai batang; banyak pos → dijejer / bertumpuk
  const isRain = $derived(paramKey === 'hujan');
  const chartBarMode = $derived<'grouped' | 'stacked' | null>(
    isRain && selectedRows.length > 1 ? rainBarMode : null,
  );

  // statistik per pos terpilih
  const perStats = $derived(
    selectedRows.map((r, i) => {
      const prepped = prepare(r.history[paramKey] ?? [], range.hours, interval.bucket, agg);
      return {
        row: r,
        color: colorFor(i),
        prepped,
        stats: computeStats(prepped.map((p) => p.v), range.hours),
      };
    }),
  );

  // KPI gabungan (seluruh seri terpilih)
  const allVals = $derived(chartSeries.flatMap((s) => s.points.map((p) => p.v)));
  const aggStats = $derived(computeStats(allVals, range.hours));
  const peakStat = $derived(
    perStats.length
      ? [...perStats].sort((a, b) => b.stats.max - a.stats.max)[0]
      : null,
  );

  // ambang utk grafik (hanya bila parameter = parameter utama berlevel)
  const showThresholds = $derived(
    (category === 'pos' && paramKey === 'tma') ||
      (category === 'bendungan' && paramKey === 'elevasi') ||
      (category === 'sumur' && paramKey === 'muka') ||
      (category === 'irigasi' && paramKey === 'debit'),
  );
  const thresholds = $derived.by(() => {
    if (!showThresholds || selectedRows.length !== 1) return [];
    const t = selectedRows[0].thresholds;
    if (!t) return [];
    return [
      { value: t.waspada, color: STATUS.waspada.color, label: 'Waspada' },
      { value: t.siaga, color: STATUS.siaga.color, label: 'Siaga' },
      { value: t.awas, color: STATUS.awas.color, label: 'Awas' },
    ];
  });

  // ---------- korelasi (pos: Hujan vs TMA; lainnya: antar pos) ----------
  const corrScatter = $derived.by(() => {
    if (category !== 'pos' || selectedRows.length === 0) return null;
    const pts: { x: number; y: number; color: string }[] = [];
    selectedRows.forEach((r, i) => {
      const tma = takeRange(r.history.tma ?? [], range.hours);
      const hujan = takeRange(r.history.hujan ?? [], range.hours);
      const n = Math.min(tma.length, hujan.length);
      for (let k = 0; k < n; k++) pts.push({ x: hujan[k].v, y: tma[k].v, color: colorFor(i) });
    });
    const r = correlation(pts.map((p) => p.x), pts.map((p) => p.y));
    return { pts, r };
  });

  // ranking nilai terkini (semua pos kategori)
  const ranking = $derived(
    [...rows].sort((a, b) => (b.current[paramKey] ?? 0) - (a.current[paramKey] ?? 0)),
  );
  const rankMax = $derived(Math.max(1, ...ranking.map((r) => r.current[paramKey] ?? 0)));

  // ---------- ekspor ----------
  function exportCSV() {
    const cols = selectedRows.map((r) => ({
      name: r.name,
      series: prepare(r.history[paramKey] ?? [], range.hours, interval.bucket, agg),
    }));
    if (!cols.length) return;
    const csv = toCSV(cols, param.digits);
    downloadCSV(`analisa-${category}-${paramKey}-${range.key}j.csv`, csv);
  }

  const views = [
    { key: 'tren', label: 'Tren', icon: LineChart },
    { key: 'korelasi', label: 'Korelasi', icon: ScatterIcon },
    { key: 'tabel', label: 'Tabel', icon: Table },
  ] as const;
</script>

<div class="flex flex-col gap-3">
  <!-- ====== TOOLBAR KONTROL ====== -->
  <div class="rounded-xl border border-line bg-panel">
    <div class="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
      <Sliders size={15} class="text-accent-bright" />
      <span class="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-muted">Konfigurasi Analisa</span>
      <div class="ml-auto flex items-center gap-1.5">
        {#each views as v}
          <Button size="sm" variant="ghost" active={view === v.key} onclick={() => (view = v.key)}>
            <v.icon size={13} />{v.label}
          </Button>
        {/each}
      </div>
    </div>

    <div class="grid grid-cols-1 gap-x-5 gap-y-3 px-3.5 py-3 md:grid-cols-2 xl:grid-cols-4">
      <!-- kategori -->
      <div>
        <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-dim">
          <Layers size={12} />Kategori Pos
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each cats as c}
            <Button size="sm" variant="subtle" active={category === c} onclick={() => (category = c)}>
              {CATEGORY_LABEL[c]}
            </Button>
          {/each}
        </div>
      </div>

      <!-- parameter -->
      <div>
        <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-dim">
          <Ruler size={12} />Parameter
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each params as p}
            <Button size="sm" variant="subtle" active={paramKey === p.key} onclick={() => (paramKey = p.key)}>
              <span class="h-2 w-2 rounded-full" style="background:{p.color}"></span>{p.label}
            </Button>
          {/each}
        </div>
      </div>

      <!-- rentang waktu -->
      <div>
        <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-dim">
          <Clock size={12} />Rentang Waktu
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each RANGES as r}
            <Button size="sm" variant="ghost" active={rangeKey === r.key} onclick={() => (rangeKey = r.key)}>{r.label}</Button>
          {/each}
        </div>
      </div>

      <!-- interval + agregasi -->
      <div>
        <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-dim">
          <Sigma size={12} />Interval &amp; Agregasi
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each INTERVALS as it}
            <Button size="sm" variant="ghost" active={intervalKey === it.key} onclick={() => (intervalKey = it.key)}>{it.label}</Button>
          {/each}
        </div>
        {#if intervalKey !== 'raw'}
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            {#each ['avg', 'sum', 'max', 'min'] as const as a}
              <Button size="sm" variant="ghost" active={agg === a} onclick={() => (agg = a)}>{AGG_LABEL[a]}</Button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- pemilih pos -->
    <div class="flex flex-wrap items-center gap-2 border-t border-line px-3.5 py-2.5">
      <span class="text-[10px] font-medium uppercase tracking-wide text-ink-dim">Pos dianalisa</span>
      <div class="flex flex-wrap gap-1.5">
        {#each rows as r}
          {@const on = selectedIds.includes(r.id)}
          <button
            onclick={() => toggle(r.id)}
            class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors {on
              ? 'border-accent/50 bg-accent/15 text-ink-strong'
              : 'border-line bg-surface text-ink-muted hover:bg-panel hover:text-ink'}"
          >
            {#if on}<CheckSquare size={12} class="text-accent-bright" />{:else}<Square size={12} />{/if}
            <span class="h-1.5 w-1.5 rounded-full" style="background:{STATUS[r.status].color}"></span>
            {r.name}
          </button>
        {/each}
      </div>
      <div class="ml-auto flex items-center gap-1.5">
        <span class="text-[10px] text-ink-dim">{selectedIds.length}/{rows.length}</span>
        <Button size="sm" variant="ghost" onclick={selectAll}>Semua</Button>
        <Button size="sm" variant="ghost" onclick={clearAll}>Kosongkan</Button>
        <Button size="sm" variant="gold" onclick={exportCSV}><Download size={13} />CSV</Button>
      </div>
    </div>
  </div>

  <!-- ====== KPI STRIP ====== -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
    {#each [
      { label: 'Terkini (rerata)', value: num(perStats.length ? perStats.reduce((s, x) => s + x.stats.last, 0) / perStats.length : 0, param.digits), tone: 'text-ink-strong' },
      { label: 'Maksimum', value: num(aggStats.max, param.digits), tone: 'text-awas' },
      { label: 'Minimum', value: num(aggStats.min, param.digits), tone: 'text-normal' },
      { label: 'Rata-rata', value: num(aggStats.avg, param.digits), tone: 'text-ink-strong' },
      { label: 'Simpangan baku', value: num(aggStats.std, param.digits), tone: 'text-ink' },
    ] as k}
      <div class="rounded-xl border border-line bg-panel-2 px-3.5 py-3">
        <div class="text-[10px] uppercase tracking-wide text-ink-dim">{k.label}</div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="font-mono text-[20px] font-semibold leading-none tnum {k.tone}">{k.value}</span>
          <span class="text-[10px] text-ink-muted">{param.unit}</span>
        </div>
      </div>
    {/each}
  </div>

  <!-- ====== KONTEN UTAMA ====== -->
  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <!-- panel grafik (2 kolom) -->
    <div class="flex flex-col gap-3 xl:col-span-2">
      {#if view === 'tren'}
        <Panel
          title="{param.label} — {CATEGORY_LABEL[category]}"
          subtitle="{range.label} · {interval.label}{intervalKey !== 'raw' ? ' · ' + AGG_LABEL[agg] : ''} · {selectedRows.length} pos"
          icon={LineChart}
          accent
        >
          {#snippet actions()}
            {#if isRain && selectedRows.length > 1}
              <!-- toggle model batang hujan: dijejer / bertumpuk -->
              <div class="inline-flex overflow-hidden rounded-md border border-line text-[10px]">
                <button
                  onclick={() => (rainBarMode = 'grouped')}
                  class="px-2 py-0.5 {rainBarMode === 'grouped' ? 'bg-accent/20 text-accent-bright' : 'text-ink-dim hover:text-ink'}"
                >Dijejer</button>
                <button
                  onclick={() => (rainBarMode = 'stacked')}
                  class="border-l border-line px-2 py-0.5 {rainBarMode === 'stacked' ? 'bg-accent/20 text-accent-bright' : 'text-ink-dim hover:text-ink'}"
                >Bertumpuk</button>
              </div>
            {:else if !isRain && selectedRows.length > 1}
              <button
                onclick={() => (band = !band)}
                class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] {band ? 'border-accent/50 bg-accent/15 text-accent-bright' : 'border-line text-ink-dim'}"
              >Selubung min–max</button>
            {/if}
          {/snippet}
          <MultiChart
            series={chartSeries}
            height={340}
            unit={param.unit}
            digits={param.digits}
            thresholds={thresholds}
            band={band}
            bars={isRain && selectedRows.length === 1}
            barMode={chartBarMode}
            yMin={param.zeroBased ? 0 : undefined}
          />
          <!-- legenda -->
          {#if selectedRows.length}
            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line-soft pt-2.5">
              {#each perStats as s}
                <span class="inline-flex items-center gap-1.5 text-[11px]">
                  <span class="h-2.5 w-2.5 rounded-sm" style="background:{s.color}"></span>
                  <span class="text-ink">{s.row.name}</span>
                  <span class="font-mono text-ink-strong tnum">{num(s.stats.last, param.digits)}{param.unit}</span>
                  <Delta delta={s.stats.delta} unit={param.unit} digits={param.digits} badWhen={param.badWhen} />
                </span>
              {/each}
            </div>
          {/if}
        </Panel>
      {:else if view === 'korelasi'}
        <Panel title="Korelasi {category === 'pos' ? 'Hujan ↔ TMA' : 'Antar Pos'}" subtitle="Sebaran titik {range.label}" icon={ScatterIcon} accent>
          {#if category === 'pos' && corrScatter}
            <div class="mb-2 flex items-center gap-2 text-[11px] text-ink-muted">
              Koefisien korelasi (Pearson):
              <span class="font-mono font-semibold {Math.abs(corrScatter.r) > 0.5 ? 'text-gold' : 'text-ink-strong'}">{num(corrScatter.r, 2)}</span>
              <span class="text-ink-dim">
                {Math.abs(corrScatter.r) > 0.7 ? '— korelasi kuat' : Math.abs(corrScatter.r) > 0.4 ? '— korelasi sedang' : '— korelasi lemah'}
              </span>
            </div>
            <ScatterPlot points={corrScatter.pts} height={320} xLabel="Curah hujan (mm)" yLabel="TMA (m)" />
          {:else}
            <div class="flex h-[320px] items-center justify-center text-[12px] text-ink-dim">
              Analisa korelasi Hujan–TMA tersedia untuk kategori Pos Duga Air.
            </div>
          {/if}
        </Panel>
      {:else}
        <!-- tabel data tersiapkan -->
        <Panel title="Tabel Data {param.label}" subtitle="{range.label} · {interval.label}" icon={Table} flush>
          <div class="max-h-[420px] overflow-auto">
            <table class="w-full text-left text-[11.5px]">
              <thead class="sticky top-0 bg-panel">
                <tr class="border-b border-line text-[10px] uppercase tracking-wide text-ink-dim">
                  <th class="px-3.5 py-2 font-medium">Waktu</th>
                  {#each selectedRows as r}
                    <th class="px-2.5 py-2 text-right font-medium">{r.name}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#if chartSeries.length}
                  {#each chartSeries[0].points as p, i}
                    <tr class="border-b border-line-soft hover:bg-white/[0.03]">
                      <td class="px-3.5 py-1.5 font-mono text-ink-dim">{new Date(p.t).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      {#each chartSeries as s, si}
                        <td class="px-2.5 py-1.5 text-right font-mono text-ink tnum" style={si === 0 ? '' : ''}>
                          {s.points[i] ? num(s.points[i].v, param.digits) : '–'}
                        </td>
                      {/each}
                    </tr>
                  {/each}
                {:else}
                  <tr><td class="px-3.5 py-6 text-center text-ink-dim">Pilih minimal satu pos.</td></tr>
                {/if}
              </tbody>
            </table>
          </div>
        </Panel>
      {/if}

      <!-- statistik per pos -->
      <Panel title="Statistik Ringkas per Pos" subtitle="Berdasarkan rentang & interval aktif" icon={Sigma} flush>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[11.5px]">
            <thead>
              <tr class="border-b border-line text-[10px] uppercase tracking-wide text-ink-dim">
                <th class="px-3.5 py-2 font-medium">Pos</th>
                <th class="px-2 py-2 font-medium">Status</th>
                <th class="px-2 py-2 text-right font-medium">Min</th>
                <th class="px-2 py-2 text-right font-medium">Maks</th>
                <th class="px-2 py-2 text-right font-medium">Rata²</th>
                <th class="px-2 py-2 text-right font-medium">σ</th>
                <th class="px-2 py-2 text-right font-medium">Laju/jam</th>
                <th class="hidden px-2 py-2 sm:table-cell">Tren</th>
                <th class="px-3.5 py-2 text-right font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              {#each perStats as s (s.row.id)}
                <tr onclick={() => openDetail(category, s.row.id)} class="cursor-pointer border-b border-line-soft transition-colors hover:bg-white/[0.03]">
                  <td class="px-3.5 py-2">
                    <div class="flex items-center gap-1.5">
                      <span class="h-2.5 w-2.5 shrink-0 rounded-sm" style="background:{s.color}"></span>
                      <span class="font-medium text-ink-strong">{s.row.name}</span>
                    </div>
                  </td>
                  <td class="px-2 py-2"><StatusBadge status={s.row.status} size="xs" dot={false} /></td>
                  <td class="px-2 py-2 text-right font-mono text-ink tnum">{num(s.stats.min, param.digits)}</td>
                  <td class="px-2 py-2 text-right font-mono text-ink tnum">{num(s.stats.max, param.digits)}</td>
                  <td class="px-2 py-2 text-right font-mono text-ink-strong tnum">{num(s.stats.avg, param.digits)}</td>
                  <td class="px-2 py-2 text-right font-mono text-ink-dim tnum">{num(s.stats.std, param.digits)}</td>
                  <td class="px-2 py-2 text-right font-mono tnum {s.stats.rate > 0 ? 'text-awas' : s.stats.rate < 0 ? 'text-normal' : 'text-ink-dim'}">{signed(s.stats.rate, param.digits)}</td>
                  <td class="hidden px-2 py-2 sm:table-cell"><div class="w-20"><Sparkline points={s.prepped.map((p) => p.v)} color={s.color} height={24} dot={false} /></div></td>
                  <td class="px-3.5 py-2 text-right"><Delta delta={s.stats.delta} unit={param.unit} digits={param.digits} badWhen={param.badWhen} /></td>
                </tr>
              {:else}
                <tr><td colspan="9" class="px-3.5 py-6 text-center text-ink-dim">Pilih pos untuk melihat statistik.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>

    <!-- kolom kanan: info pos + ranking -->
    <div class="flex flex-col gap-3">
      <!-- ranking nilai terkini -->
      <Panel title="Peringkat {param.label}" subtitle="Nilai terkini · seluruh {CATEGORY_LABEL[category].toLowerCase()}" icon={GitCompare}>
        <div class="space-y-2.5">
          {#each ranking as r (r.id)}
            {@const v = r.current[paramKey] ?? 0}
            {@const on = selectedIds.includes(r.id)}
            <button onclick={() => toggle(r.id)} class="flex w-full items-center gap-2.5 text-left">
              <span class="w-28 shrink-0 truncate text-[11px] {on ? 'text-ink-strong' : 'text-ink-muted'}">{r.name}</span>
              <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-panel-2">
                <div class="h-full rounded-full" style="width:{(v / rankMax) * 100}%;background:linear-gradient(90deg,{STATUS[r.status].color}66,{STATUS[r.status].color})"></div>
              </div>
              <span class="w-16 text-right font-mono text-[11px] text-ink-strong tnum">{num(v, param.digits)}</span>
            </button>
          {/each}
        </div>
      </Panel>

      <!-- info pos terpilih -->
      <Panel title="Informasi Pos" subtitle={selectedRows.length === 1 ? selectedRows[0].name : `${selectedRows.length} pos terpilih`} icon={Info}>
        {#if selectedRows.length === 1}
          {@const r = selectedRows[0]}
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <StatusBadge status={r.status} pulse={r.status !== 'normal'} />
              <span class="flex items-center gap-1 text-[10.5px] text-ink-dim"><Clock size={11} />{relTime(r.updatedAt, $clock)}</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-lg border border-line bg-panel-2 px-2.5 py-1.5">
                <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">Identitas</div>
                <div class="mt-0.5 text-[11.5px] text-ink-strong">{r.sub}</div>
              </div>
              <div class="rounded-lg border border-line bg-panel-2 px-2.5 py-1.5">
                <div class="flex items-center gap-1 text-[9.5px] uppercase tracking-wide text-ink-dim"><MapPin size={10} />Koordinat</div>
                <div class="mt-0.5 font-mono text-[11px] text-ink">{num(r.lat, 3)}, {num(r.lng, 3)}</div>
              </div>
              {#each r.extra as e}
                <div class="rounded-lg border border-line bg-panel-2 px-2.5 py-1.5">
                  <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">{e.label}</div>
                  <div class="mt-0.5 font-mono text-[12px] text-ink-strong">{e.value}</div>
                </div>
              {/each}
            </div>

            {#if r.thresholds && showThresholds}
              <div class="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <div class="mb-1.5 text-[9.5px] uppercase tracking-wide text-ink-dim">Ambang {param.label}</div>
                <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full" style="background:{STATUS.waspada.color}"></span>Waspada {num(r.thresholds.waspada, param.digits)}</span>
                  <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full" style="background:{STATUS.siaga.color}"></span>Siaga {num(r.thresholds.siaga, param.digits)}</span>
                  <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full" style="background:{STATUS.awas.color}"></span>Awas {num(r.thresholds.awas, param.digits)}</span>
                </div>
              </div>
            {/if}

            <!-- instrumen -->
            <div>
              <div class="mb-1.5 flex items-center gap-1.5 text-[9.5px] uppercase tracking-wide text-ink-dim"><Radio size={11} />Instrumen Terpasang ({r.instruments.length})</div>
              <div class="space-y-1.5">
                {#each r.instruments as it}
                  <div class="flex items-center gap-2 rounded-lg border border-line-soft bg-surface px-2.5 py-1.5">
                    <span class="h-1.5 w-1.5 shrink-0 rounded-full {it.status === 'online' ? 'bg-normal' : it.status === 'maintenance' ? 'bg-waspada' : 'bg-awas'}"></span>
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-[11px] text-ink">{it.name}</div>
                      <div class="text-[9.5px] text-ink-dim">{it.type} · {it.status === 'online' ? 'aktif' : it.status === 'maintenance' ? 'perawatan' : 'mati'}</div>
                    </div>
                    <span class="shrink-0 font-mono text-[11px] text-ink-strong tnum">{num(it.value, 1)}<span class="ml-0.5 text-[9px] text-ink-muted">{it.unit}</span></span>
                  </div>
                {/each}
              </div>
            </div>

            <Button size="sm" variant="accent" class="w-full" onclick={() => openDetail(category, r.id)}>
              <Activity size={13} />Buka detail lengkap
            </Button>
          </div>
        {:else if selectedRows.length === 0}
          <div class="flex h-32 items-center justify-center text-center text-[12px] text-ink-dim">
            Pilih satu pos untuk melihat informasi lengkap, ambang siaga, dan instrumen terpasang.
          </div>
        {:else}
          <div class="space-y-2">
            <p class="text-[11.5px] text-ink-muted">{selectedRows.length} pos sedang dibandingkan. Pilih satu pos saja untuk melihat detail informasi & instrumen.</p>
            <div class="space-y-1.5">
              {#each selectedRows as r, i}
                <button onclick={() => (selectedIds = [r.id])} class="flex w-full items-center justify-between rounded-lg border border-line-soft bg-surface px-2.5 py-1.5 text-left hover:bg-panel">
                  <span class="flex items-center gap-2 text-[11.5px] text-ink">
                    <span class="h-2.5 w-2.5 rounded-sm" style="background:{colorFor(i)}"></span>{r.name}
                  </span>
                  <span class="font-mono text-[11px] text-ink-strong tnum">{num(r.current[paramKey] ?? 0, param.digits)} {param.unit}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </Panel>
    </div>
  </div>
</div>
