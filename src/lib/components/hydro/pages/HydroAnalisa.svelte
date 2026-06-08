<script lang="ts">
  import { untrack } from 'svelte';
  import type { Component } from 'svelte';
  import Sliders from '@lucide/svelte/icons/sliders-horizontal';
  import Layers from '@lucide/svelte/icons/layers';
  import Ruler from '@lucide/svelte/icons/ruler';
  import Clock from '@lucide/svelte/icons/clock';
  import Sigma from '@lucide/svelte/icons/sigma';
  import LineChartIcon from '@lucide/svelte/icons/chart-spline';
  import Table from '@lucide/svelte/icons/table-2';
  import Download from '@lucide/svelte/icons/download';
  import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
  import FileText from '@lucide/svelte/icons/file-text';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import CheckSquare from '@lucide/svelte/icons/square-check-big';
  import Square from '@lucide/svelte/icons/square';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import GitCompare from '@lucide/svelte/icons/git-compare-arrows';
  import Lightbulb from '@lucide/svelte/icons/lightbulb';
  import Info from '@lucide/svelte/icons/info';

  import Panel from '../../ui/Panel.svelte';
  import Button from '../../ui/Button.svelte';
  import MultiChart from '../../ui/MultiChart.svelte';
  import Sparkline from '../../ui/Sparkline.svelte';
  import StatusBadge from '../../ui/StatusBadge.svelte';
  import Delta from '../../ui/Delta.svelte';

  import { data, openDetail } from '../../../stores';
  import { STATUS } from '../../../status';
  import { num, signed, shortDateTime } from '../../../format';
  import {
    RANGES,
    INTERVALS,
    AGG_LABEL,
    SERIES_PALETTE,
    computeStats,
    prepare,
    type AggMode,
  } from '../../../analytics';
  import {
    HYDRO_PARAMS,
    buildInsights,
    buildExcelXls,
    buildReportHtml,
    printReport,
    downloadBlob,
    type Insight,
    type InsightKind,
  } from '../../../hydroReport';

  const d = $derived($data);

  // ---------- kontrol ----------
  let paramKey = $state<string>('tma');
  let rangeKey = $state<string>('24');
  let intervalKey = $state<string>('raw');
  let agg = $state<AggMode>('avg');
  let view = $state<'tren' | 'tabel'>('tren');
  let selectedIds = $state<string[]>([]);

  const param = $derived(HYDRO_PARAMS.find((p) => p.key === paramKey) ?? HYDRO_PARAMS[0]);
  const range = $derived(RANGES.find((r) => r.key === rangeKey) ?? RANGES[2]);
  const interval = $derived(INTERVALS.find((i) => i.key === intervalKey) ?? INTERVALS[0]);

  // pos kandidat sesuai jenis parameter
  const candidates = $derived(d.pos.filter((p) => p.tipe === param.tipe));

  // grup parameter untuk pemilih (jenis pos)
  const groups = $derived.by(() => {
    const seen: string[] = [];
    for (const p of HYDRO_PARAMS) if (!seen.includes(p.group)) seen.push(p.group);
    return seen.map((g) => ({ name: g, params: HYDRO_PARAMS.filter((p) => p.group === g) }));
  });

  // saat ganti parameter → set ulang seleksi pos (hanya saat paramKey berubah)
  $effect(() => {
    paramKey;
    untrack(() => {
      const ids = candidates.map((c) => c.id);
      const keep = selectedIds.filter((id) => ids.includes(id));
      selectedIds = keep.length ? keep : ids.slice(0, Math.min(3, ids.length));
    });
  });

  function toggle(id: string) {
    selectedIds = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
  }
  const selectAll = () => (selectedIds = candidates.map((c) => c.id));
  const clearAll = () => (selectedIds = []);

  const selectedRows = $derived(candidates.filter((p) => selectedIds.includes(p.id)));
  const colorFor = (i: number) => SERIES_PALETTE[i % SERIES_PALETTE.length];

  // ---------- deret tersiapkan + statistik ----------
  const perStats = $derived(
    selectedRows.map((r, i) => {
      const prepped = prepare(param.series(r), range.hours, interval.bucket, agg);
      return {
        row: r,
        color: colorFor(i),
        prepped,
        stats: computeStats(prepped.map((p) => p.v), range.hours),
        thresholds: param.thresholds?.(r),
      };
    }),
  );

  const chartSeries = $derived(
    perStats.map((s) => ({ name: s.row.name, color: s.color, points: s.prepped })),
  );

  const allVals = $derived(chartSeries.flatMap((s) => s.points.map((p) => p.v)));
  const aggStats = $derived(computeStats(allVals, range.hours));

  const showThr = $derived(param.thresholdDir !== 'none' && selectedRows.length === 1);
  const chartThresholds = $derived.by(() => {
    if (!showThr) return [];
    const t = perStats[0]?.thresholds;
    if (!t) return [];
    return [
      { value: t.waspada, color: STATUS.waspada.color, label: 'Waspada' },
      { value: t.siaga, color: STATUS.siaga.color, label: 'Siaga' },
      { value: t.awas, color: STATUS.awas.color, label: 'Awas' },
    ];
  });

  // ---------- AI Insight ----------
  const insights = $derived<Insight[]>(
    buildInsights({
      param,
      rangeLabel: range.label,
      rows: perStats.map((s) => ({
        name: s.row.name,
        status: s.row.status,
        prepped: s.prepped,
        stats: s.stats,
        thresholds: s.thresholds,
      })),
    }),
  );

  const insightMeta: Record<InsightKind, { icon: Component<any>; label: string }> = {
    ringkasan: { icon: Info, label: 'Ringkasan' },
    tren: { icon: TrendingUp, label: 'Tren' },
    risiko: { icon: TriangleAlert, label: 'Risiko' },
    korelasi: { icon: GitCompare, label: 'Korelasi' },
    rekomendasi: { icon: Lightbulb, label: 'Rekomendasi' },
  };
  const sevTone: Record<Insight['severity'], string> = {
    info: 'text-accent-bright',
    warn: 'text-waspada',
    crit: 'text-awas',
  };
  const sevBorder: Record<Insight['severity'], string> = {
    info: 'var(--color-accent)',
    warn: '#c9a227',
    crit: '#d8635f',
  };

  // ---------- ekspor ----------
  function reportMeta() {
    return [
      { label: 'Parameter', value: `${param.label} (${param.unit})` },
      { label: 'Rentang waktu', value: range.label },
      { label: 'Interval', value: interval.label + (intervalKey !== 'raw' ? ` · ${AGG_LABEL[agg]}` : '') },
      { label: 'Jumlah pos', value: String(selectedRows.length) },
    ];
  }
  const columns = $derived(perStats.map((s) => ({ name: s.row.name, series: s.prepped })));
  const baseName = $derived(`analisa-hidrologi-${param.key}-${range.key}j`);

  function exportCsv() {
    if (!columns.length) return;
    const n = columns.reduce((m, c) => Math.max(m, c.series.length), 0);
    const head = ['waktu', ...columns.map((c) => c.name)].join(',');
    const lines = [head];
    for (let i = 0; i < n; i++) {
      const t = columns.find((c) => c.series[i])?.series[i]?.t;
      const row = [t ? new Date(t).toISOString() : ''];
      for (const c of columns) row.push(c.series[i] !== undefined ? c.series[i].v.toFixed(param.digits) : '');
      lines.push(row.join(','));
    }
    downloadBlob(`${baseName}.csv`, lines.join('\n'), 'text/csv;charset=utf-8;');
  }

  function exportExcel() {
    if (!columns.length) return;
    const xls = buildExcelXls({
      title: `Analisa ${param.label}`,
      meta: reportMeta(),
      columns,
      digits: param.digits,
      unit: param.unit,
    });
    downloadBlob(`${baseName}.xls`, xls, 'application/vnd.ms-excel');
  }

  function exportPdf() {
    if (!columns.length) return;
    const html = buildReportHtml({
      title: `Laporan Analisa ${param.label}`,
      subtitle: `${param.group} · ${range.label} · ${interval.label}${intervalKey !== 'raw' ? ' · ' + AGG_LABEL[agg] : ''}`,
      generatedAt: Date.now(),
      meta: reportMeta(),
      kpis: [
        { label: `Terkini rerata (${param.unit})`, value: num(perStats.length ? perStats.reduce((s, x) => s + x.stats.last, 0) / perStats.length : 0, param.digits) },
        { label: `Maksimum (${param.unit})`, value: num(aggStats.max, param.digits) },
        { label: `Minimum (${param.unit})`, value: num(aggStats.min, param.digits) },
        { label: `Rata-rata (${param.unit})`, value: num(aggStats.avg, param.digits) },
        { label: 'Simpangan baku (σ)', value: num(aggStats.std, param.digits) },
      ],
      insights,
      statRows: perStats.map((s) => ({
        name: s.row.name,
        status: s.row.status,
        min: num(s.stats.min, param.digits),
        max: num(s.stats.max, param.digits),
        avg: num(s.stats.avg, param.digits),
        std: num(s.stats.std, param.digits),
        rate: signed(s.stats.rate, Math.max(2, param.digits)),
      })),
      columns,
      colors: perStats.map((s) => s.color),
      unit: param.unit,
    });
    printReport(html);
  }

  const isRain = $derived(!!param.bars);

  // KPI cards data
  const kpiCards = $derived([
    { label: 'Terkini (rerata)', value: num(perStats.length ? perStats.reduce((s, x) => s + x.stats.last, 0) / perStats.length : 0, param.digits), tone: 'text-ink-strong' },
    { label: 'Maksimum', value: num(aggStats.max, param.digits), tone: 'text-awas' },
    { label: 'Minimum', value: num(aggStats.min, param.digits), tone: 'text-normal' },
    { label: 'Rata-rata', value: num(aggStats.avg, param.digits), tone: 'text-ink-strong' },
    { label: 'Simpangan baku', value: num(aggStats.std, param.digits), tone: 'text-ink' },
  ]);
</script>

<div class="flex flex-col gap-3">
  <!-- ====== TOOLBAR ====== -->
  <div class="rounded-xl border border-line bg-panel">
    <div class="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
      <Sliders size={15} class="text-accent-bright" />
      <span class="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-muted">Konfigurasi Analisa Hidrologi</span>
      <div class="ml-auto flex items-center gap-1.5">
        <Button size="sm" variant="ghost" active={view === 'tren'} onclick={() => (view = 'tren')}><LineChartIcon size={13} />Tren</Button>
        <Button size="sm" variant="ghost" active={view === 'tabel'} onclick={() => (view = 'tabel')}><Table size={13} />Tabel</Button>
      </div>
    </div>

    <!-- parameter (dikelompokkan per jenis pos) -->
    <div class="border-b border-line px-3.5 py-3">
      <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-dim">
        <Ruler size={12} />Parameter
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        {#each groups as g}
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[9.5px] uppercase tracking-wide text-ink-dim">{g.name}:</span>
            {#each g.params as p}
              <button
                onclick={() => (paramKey = p.key)}
                class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors {paramKey === p.key
                  ? 'border-accent/50 bg-accent/15 text-ink-strong'
                  : 'border-line bg-surface text-ink-muted hover:bg-panel hover:text-ink'}"
              >
                <span class="h-2 w-2 rounded-full" style="background:{p.color}"></span>{p.label}
              </button>
            {/each}
          </div>
        {/each}
      </div>
    </div>

    <div class="grid grid-cols-1 gap-x-5 gap-y-3 px-3.5 py-3 md:grid-cols-2">
      <!-- rentang -->
      <div>
        <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-dim"><Clock size={12} />Rentang Waktu</div>
        <div class="flex flex-wrap gap-1.5">
          {#each RANGES as r}
            <Button size="sm" variant="ghost" active={rangeKey === r.key} onclick={() => (rangeKey = r.key)}>{r.label}</Button>
          {/each}
        </div>
      </div>
      <!-- interval + agregasi -->
      <div>
        <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-dim"><Sigma size={12} />Interval &amp; Agregasi</div>
        <div class="flex flex-wrap gap-1.5">
          {#each INTERVALS as it}
            <Button size="sm" variant="ghost" active={intervalKey === it.key} onclick={() => (intervalKey = it.key)}>{it.label}</Button>
          {/each}
          {#if intervalKey !== 'raw'}
            <span class="mx-0.5 w-px self-stretch bg-line"></span>
            {#each ['avg', 'sum', 'max', 'min'] as const as a}
              <Button size="sm" variant="ghost" active={agg === a} onclick={() => (agg = a)}>{AGG_LABEL[a]}</Button>
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <!-- pemilih pos (nama) -->
    <div class="flex flex-wrap items-center gap-2 border-t border-line px-3.5 py-2.5">
      <span class="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-dim"><Layers size={12} />Pos dianalisa</span>
      <div class="flex flex-wrap gap-1.5">
        {#each candidates as r (r.id)}
          {@const on = selectedIds.includes(r.id)}
          <button
            onclick={() => toggle(r.id)}
            class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors {on
              ? 'border-accent/50 bg-accent/15 text-ink-strong'
              : 'border-line bg-surface text-ink-muted hover:bg-panel hover:text-ink'}"
          >
            {#if on}<CheckSquare size={12} class="text-accent-bright" />{:else}<Square size={12} />{/if}
            <span class="h-1.5 w-1.5 rounded-full" style="background:{STATUS[r.status].color}"></span>{r.name}
          </button>
        {/each}
      </div>
      <div class="ml-auto flex items-center gap-1.5">
        <span class="text-[10px] text-ink-dim">{selectedIds.length}/{candidates.length}</span>
        <Button size="sm" variant="ghost" onclick={selectAll}>Semua</Button>
        <Button size="sm" variant="ghost" onclick={clearAll}>Kosongkan</Button>
      </div>
    </div>

    <!-- ekspor -->
    <div class="flex flex-wrap items-center gap-2 border-t border-line bg-panel-2/40 px-3.5 py-2.5">
      <span class="text-[10px] font-medium uppercase tracking-wide text-ink-dim">Unduh laporan</span>
      <div class="ml-auto flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="subtle" onclick={exportCsv}><Download size={13} />CSV</Button>
        <Button size="sm" variant="subtle" onclick={exportExcel}><FileSpreadsheet size={13} />Excel</Button>
        <Button size="sm" variant="gold" onclick={exportPdf}><FileText size={13} />PDF</Button>
      </div>
    </div>
  </div>

  <!-- ====== KPI ====== -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
    {#each kpiCards as k}
      <div class="rounded-xl border border-line bg-panel-2 px-3.5 py-3">
        <div class="text-[10px] uppercase tracking-wide text-ink-dim">{k.label}</div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="font-mono text-[20px] font-semibold leading-none tnum {k.tone}">{k.value}</span>
          <span class="text-[10px] text-ink-muted">{param.unit}</span>
        </div>
      </div>
    {/each}
  </div>

  <!-- ====== KONTEN ====== -->
  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <!-- grafik / tabel -->
    <div class="flex flex-col gap-3 xl:col-span-2">
      {#if view === 'tren'}
        <Panel title="{param.label} — {param.group}" subtitle="{range.label} · {interval.label}{intervalKey !== 'raw' ? ' · ' + AGG_LABEL[agg] : ''} · {selectedRows.length} pos" icon={LineChartIcon} accent>
          {#if selectedRows.length}
            <MultiChart
              series={chartSeries}
              height={340}
              unit={param.unit}
              digits={param.digits}
              thresholds={chartThresholds}
              band={!isRain && selectedRows.length > 1}
              bars={isRain && selectedRows.length === 1}
              barMode={isRain && selectedRows.length > 1 ? 'grouped' : null}
              yMin={param.zeroBased ? 0 : undefined}
            />
            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line-soft pt-2.5">
              {#each perStats as s}
                <span class="inline-flex items-center gap-1.5 text-[11px]">
                  <span class="h-2.5 w-2.5 rounded-sm" style="background:{s.color}"></span>
                  <span class="text-ink">{s.row.name}</span>
                  <span class="font-mono text-ink-strong tnum">{num(s.stats.last, param.digits)}{param.unit}</span>
                  <Delta delta={s.stats.delta} unit={param.unit} digits={param.digits} badWhen={param.thresholdDir === 'falling' ? 'down' : param.thresholdDir === 'rising' ? 'up' : 'none'} />
                </span>
              {/each}
            </div>
          {:else}
            <div class="flex h-[340px] items-center justify-center text-center text-[12px] text-ink-dim">Pilih minimal satu pos untuk menampilkan tren.</div>
          {/if}
        </Panel>
      {:else}
        <Panel title="Tabel Data {param.label}" subtitle="{range.label} · {interval.label}" icon={Table} flush>
          <div class="max-h-[420px] overflow-auto">
            <table class="w-full text-left text-[11.5px]">
              <thead class="sticky top-0 bg-panel">
                <tr class="border-b border-line text-[10px] uppercase tracking-wide text-ink-dim">
                  <th class="px-3.5 py-2 font-medium">Waktu</th>
                  {#each perStats as s}<th class="px-2.5 py-2 text-right font-medium">{s.row.name}</th>{/each}
                </tr>
              </thead>
              <tbody>
                {#if chartSeries.length}
                  {#each chartSeries[0].points as p, i}
                    <tr class="border-b border-line-soft hover:bg-[var(--surface-hover)]">
                      <td class="px-3.5 py-1.5 font-mono text-ink-dim">{shortDateTime(p.t)}</td>
                      {#each chartSeries as s}
                        <td class="px-2.5 py-1.5 text-right font-mono text-ink tnum">{s.points[i] ? num(s.points[i].v, param.digits) : '–'}</td>
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
                <tr onclick={() => openDetail('pos', s.row.id)} class="cursor-pointer border-b border-line-soft transition-colors hover:bg-[var(--surface-hover)]">
                  <td class="px-3.5 py-2"><div class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 shrink-0 rounded-sm" style="background:{s.color}"></span><span class="font-medium text-ink-strong">{s.row.name}</span></div></td>
                  <td class="px-2 py-2"><StatusBadge status={s.row.status} size="xs" dot={false} /></td>
                  <td class="px-2 py-2 text-right font-mono text-ink tnum">{num(s.stats.min, param.digits)}</td>
                  <td class="px-2 py-2 text-right font-mono text-ink tnum">{num(s.stats.max, param.digits)}</td>
                  <td class="px-2 py-2 text-right font-mono text-ink-strong tnum">{num(s.stats.avg, param.digits)}</td>
                  <td class="px-2 py-2 text-right font-mono text-ink-dim tnum">{num(s.stats.std, param.digits)}</td>
                  <td class="px-2 py-2 text-right font-mono tnum {s.stats.rate > 0 ? 'text-awas' : s.stats.rate < 0 ? 'text-normal' : 'text-ink-dim'}">{signed(s.stats.rate, Math.max(2, param.digits))}</td>
                  <td class="hidden px-2 py-2 sm:table-cell"><div class="w-20"><Sparkline points={s.prepped.map((p) => p.v)} color={s.color} height={24} dot={false} bars={isRain} /></div></td>
                  <td class="px-3.5 py-2 text-right"><Delta delta={s.stats.delta} unit={param.unit} digits={param.digits} badWhen={param.thresholdDir === 'falling' ? 'down' : param.thresholdDir === 'rising' ? 'up' : 'none'} /></td>
                </tr>
              {:else}
                <tr><td colspan="9" class="px-3.5 py-6 text-center text-ink-dim">Pilih pos untuk melihat statistik.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>

    <!-- AI INSIGHT -->
    <div class="flex flex-col gap-3">
      <Panel icon={Sparkles} title="AI Insight" subtitle="Analisis otomatis dari data terpilih">
        {#snippet actions()}
          <span class="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent-bright">
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-bright"></span>Realtime
          </span>
        {/snippet}
        <div class="flex flex-col gap-2">
          {#each insights as ins}
            {@const m = insightMeta[ins.kind]}
            <div class="rounded-lg border border-line-soft bg-panel-2 px-2.5 py-2" style="border-left:2.5px solid {sevBorder[ins.severity]}">
              <div class="mb-0.5 flex items-center gap-1.5">
                <m.icon size={12} class={sevTone[ins.severity]} />
                <span class="text-[9.5px] font-semibold uppercase tracking-wide {sevTone[ins.severity]}">{m.label}</span>
              </div>
              <p class="text-[11.5px] leading-relaxed text-ink">{ins.text}</p>
            </div>
          {/each}
        </div>
        <div class="mt-2.5 flex items-start gap-1.5 border-t border-line-soft pt-2 text-[9.5px] leading-relaxed text-ink-dim">
          <Info size={11} class="mt-px shrink-0" />
          <span>Insight dihitung otomatis dari tren, ambang siaga, volatilitas, dan korelasi antar-pos pada rentang aktif. Perbarui pilihan untuk analisis baru.</span>
        </div>
      </Panel>

      <!-- peringkat nilai terkini -->
      <Panel title="Peringkat {param.label}" subtitle="Nilai terkini · seluruh {param.group.toLowerCase()}" icon={GitCompare}>
        <div class="space-y-2.5">
          {#each [...candidates].sort((a, b) => param.current(b) - param.current(a)) as r (r.id)}
            {@const v = param.current(r)}
            {@const mx = Math.max(1, ...candidates.map((c) => param.current(c)))}
            {@const on = selectedIds.includes(r.id)}
            <button onclick={() => toggle(r.id)} class="flex w-full items-center gap-2.5 text-left">
              <span class="w-28 shrink-0 truncate text-[11px] {on ? 'text-ink-strong' : 'text-ink-muted'}">{r.name}</span>
              <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-panel-2">
                <div class="h-full rounded-full" style="width:{(v / mx) * 100}%;background:linear-gradient(90deg,{STATUS[r.status].color}66,{STATUS[r.status].color})"></div>
              </div>
              <span class="w-16 text-right font-mono text-[11px] text-ink-strong tnum">{num(v, param.digits)}</span>
            </button>
          {/each}
        </div>
      </Panel>
    </div>
  </div>
</div>
