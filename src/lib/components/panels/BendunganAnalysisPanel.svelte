<script lang="ts">
  import Activity from '@lucide/svelte/icons/activity';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Clock3 from '@lucide/svelte/icons/clock-3';
  import Database from '@lucide/svelte/icons/database';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import TableProperties from '@lucide/svelte/icons/table-properties';

  import Panel from '../ui/Panel.svelte';
  import MiniChart from '../ui/MiniChart.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { INSTRUMENT_STATUS, instrumentIcon } from '../../instruments';
  import { clock } from '../../stores';
  import { STATUS } from '../../status';
  import { fullDate, hhmm, num, relTime, shortDateTime } from '../../format';
  import { lastN, stats } from '../../series';
  import type { Bendungan, Instrument, SeriesPoint } from '../../types';

  type ParameterKey = 'semua' | 'muka-air' | 'debit' | 'hujan-cuaca' | 'kualitas' | 'geoteknik' | 'operasi';
  type DataMode = 'rentang' | 'harian' | 'jam';

  interface Props {
    bendungan: Bendungan;
    activeId: string | null;
    onselect?: (id: string) => void;
  }
  let { bendungan, activeId, onselect }: Props = $props();

  let parameter = $state<ParameterKey>('semua');
  let interval = $state(24);
  let mode = $state<DataMode>('jam');

  const parameters: Array<{ key: ParameterKey; label: string; types: string[] }> = [
    { key: 'semua', label: 'Semua parameter', types: [] },
    { key: 'muka-air', label: 'Muka air', types: ['AWLR'] },
    { key: 'debit', label: 'Debit', types: ['AFMR'] },
    { key: 'hujan-cuaca', label: 'Hujan & cuaca', types: ['ARR', 'AWS'] },
    { key: 'kualitas', label: 'Kualitas air', types: ['AWQR'] },
    { key: 'geoteknik', label: 'Geoteknik', types: ['AVWR', 'ADR'] },
    { key: 'operasi', label: 'Operasi', types: ['AWGC', 'EWS', 'APLR', 'CCTV'] },
  ];
  const intervals = [
    { value: 6, label: '6 jam' },
    { value: 12, label: '12 jam' },
    { value: 24, label: '24 jam' },
    { value: 48, label: '48 jam' },
  ];
  const modes: Array<{ key: DataMode; label: string; icon: any }> = [
    { key: 'jam', label: 'Jam-jaman', icon: Clock3 },
    { key: 'harian', label: 'Harian', icon: CalendarDays },
    { key: 'rentang', label: 'Rentang', icon: SlidersHorizontal },
  ];

  function parameterTypes(key: ParameterKey): string[] {
    return parameters.find((p) => p.key === key)?.types ?? [];
  }

  const sensors = $derived(bendungan.instruments.filter((i) => i.category !== 'health'));
  const filtered = $derived.by(() => {
    const types = parameterTypes(parameter);
    if (!types.length) return sensors;
    return sensors.filter((i) => types.includes(i.type));
  });

  const selected = $derived.by<Instrument | null>(() => {
    const pool = filtered.length ? filtered : sensors;
    if (activeId && pool.some((i) => i.id === activeId)) {
      return pool.find((i) => i.id === activeId) ?? null;
    }
    return pool.find((i) => i.primary) ?? pool[0] ?? null;
  });

  $effect(() => {
    if (selected && selected.id !== activeId) onselect?.(selected.id);
  });

  const rawSeries = $derived(selected ? lastN(selected.history, interval) : []);
  const chartSeries = $derived.by(() => {
    if (mode === 'harian') return aggregateDaily(rawSeries);
    return rawSeries;
  });
  const displayStats = $derived(stats(chartSeries.map((p) => p.v)));
  const previewRows = $derived([...chartSeries].slice(-10).reverse());
  const latest = $derived(chartSeries[chartSeries.length - 1] ?? null);
  const trend = $derived(chartSeries.length > 1 && latest ? latest.v - chartSeries[0].v : 0);
  const bars = $derived(selected?.type === 'ARR' || mode === 'harian');

  function aggregateDaily(points: SeriesPoint[]): SeriesPoint[] {
    const buckets = new Map<string, { t: number; sum: number; count: number }>();
    for (const p of points) {
      const d = new Date(p.t);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const existing = buckets.get(key);
      const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
      if (!existing) buckets.set(key, { t: noon, sum: p.v, count: 1 });
      else {
        existing.sum += p.v;
        existing.count += 1;
      }
    }
    return [...buckets.values()].map((b) => ({ t: b.t, v: b.sum / b.count }));
  }

  function rowLabel(t: number) {
    return mode === 'harian' ? fullDate(t) : shortDateTime(t);
  }

  function choose(id: string) {
    onselect?.(id);
  }
</script>

{#if selected}
  {@const Icon = instrumentIcon(selected.type)}
  {@const meta = INSTRUMENT_STATUS[selected.status]}
  <Panel title="Analisa Data Bendungan" subtitle="{selected.type} · {mode === 'harian' ? 'agregasi harian' : intervals.find((x) => x.value === interval)?.label}" icon={Database} accent>
    {#snippet actions()}
      <StatusBadge status={bendungan.status} size="xs" pulse={bendungan.status !== 'normal'} />
    {/snippet}

    <div class="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,0.55fr)_minmax(0,1.45fr)]">
      <div class="space-y-3">
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <label class="space-y-1">
            <span class="block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Parameter</span>
            <select
              bind:value={parameter}
              class="h-9 w-full rounded-lg border border-line bg-panel-2 px-2.5 text-[12px] text-ink-strong outline-none focus:border-accent/60"
            >
              {#each parameters as p}
                <option value={p.key}>{p.label}</option>
              {/each}
            </select>
          </label>

          <label class="space-y-1">
            <span class="block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Pos</span>
            <select
              value={selected.id}
              onchange={(e) => choose(e.currentTarget.value)}
              class="h-9 w-full rounded-lg border border-line bg-panel-2 px-2.5 text-[12px] text-ink-strong outline-none focus:border-accent/60"
            >
              {#each filtered as it}
                <option value={it.id}>{it.type} · {it.lokasi ?? it.name}</option>
              {/each}
            </select>
          </label>

          <label class="space-y-1">
            <span class="block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Interval</span>
            <select
              bind:value={interval}
              class="h-9 w-full rounded-lg border border-line bg-panel-2 px-2.5 text-[12px] text-ink-strong outline-none focus:border-accent/60"
            >
              {#each intervals as it}
                <option value={it.value}>{it.label}</option>
              {/each}
            </select>
          </label>
        </div>

        <div>
          <div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Jenis data</div>
          <div class="grid grid-cols-3 gap-1.5">
            {#each modes as m}
              {@const ModeIcon = m.icon}
              <button
                type="button"
                onclick={() => (mode = m.key)}
                class="flex h-[54px] flex-col items-center justify-center gap-1 rounded-lg border text-[10px] font-medium transition-colors {mode === m.key
                  ? 'border-accent/60 bg-accent/14 text-accent-bright'
                  : 'border-line bg-panel-2 text-ink-dim hover:bg-[var(--surface-hover)] hover:text-ink'}"
              >
                <ModeIcon size={15} />
                <span>{m.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="rounded-lg border border-line bg-panel-2 p-3">
          <div class="mb-2 flex items-start gap-2.5">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-panel" style="color:{meta.color}">
              <Icon size={15} />
            </span>
            <div class="min-w-0">
              <div class="truncate text-[12px] font-semibold text-ink-strong">{selected.name}</div>
              <div class="truncate text-[10px] text-ink-muted">{selected.lokasi ?? 'Pos bendungan'}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">Nilai</div>
              <div class="font-mono text-[18px] font-semibold text-ink-strong tnum">
                {num(selected.value, selected.valueDigits ?? 1)}
                <span class="text-[9px] text-ink-muted">{selected.unit}</span>
              </div>
            </div>
            <div>
              <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">Status</div>
              <div class="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style="color:{meta.color};background:{meta.color}1a">
                <span class="h-1.5 w-1.5 rounded-full" style="background:{meta.color}"></span>{meta.label}
              </div>
            </div>
          </div>
          <div class="mt-2 border-t border-line-soft pt-2 text-[10px] text-ink-dim">
            Update {relTime(selected.updatedAt, $clock)} · {hhmm(selected.updatedAt)}
          </div>
        </div>
      </div>

      <div class="min-w-0 space-y-3">
        <MiniChart
          points={chartSeries}
          height={250}
          color={meta.color}
          unit={selected.unit}
          digits={selected.valueDigits ?? 1}
          bars={bars}
          yMin={selected.type === 'ARR' ? 0 : undefined}
          thresholds={selected.type === 'AWLR'
            ? [
                { value: bendungan.elevasiNormal, color: STATUS.normal.color, label: 'Normal' },
                { value: bendungan.elevasiBanjir, color: STATUS.awas.color, label: 'M.A. Banjir' },
              ]
            : []}
        />

        <div class="grid grid-cols-2 gap-2 md:grid-cols-5">
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">Terkini</div>
            <div class="font-mono text-[15px] font-semibold text-ink-strong tnum">{num(latest?.v ?? 0, selected.valueDigits ?? 1)}</div>
          </div>
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">Rata-rata</div>
            <div class="font-mono text-[15px] font-semibold text-ink-strong tnum">{num(displayStats.avg, selected.valueDigits ?? 1)}</div>
          </div>
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">Maks</div>
            <div class="font-mono text-[15px] font-semibold text-awas tnum">{num(displayStats.max, selected.valueDigits ?? 1)}</div>
          </div>
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">Min</div>
            <div class="font-mono text-[15px] font-semibold text-normal tnum">{num(displayStats.min, selected.valueDigits ?? 1)}</div>
          </div>
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-[9.5px] uppercase tracking-wide text-ink-dim">Tren</div>
            <div class="font-mono text-[15px] font-semibold tnum" style="color:{trend >= 0 ? STATUS.awas.color : STATUS.normal.color}">
              {trend > 0 ? '+' : trend < 0 ? '−' : ''}{num(Math.abs(trend), selected.valueDigits ?? 1)}
            </div>
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border border-line">
          <div class="flex items-center gap-2 border-b border-line bg-panel-2 px-3 py-2">
            <TableProperties size={14} class="text-ink-dim" />
            <span class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Preview Data</span>
            <span class="ml-auto text-[10px] text-ink-dim">{previewRows.length} baris</span>
          </div>
          <div class="max-h-[214px] overflow-auto">
            <table class="w-full text-left text-[12px]">
              <thead>
                <tr class="border-b border-line-soft text-[10px] uppercase tracking-wide text-ink-dim">
                  <th class="px-3 py-2 font-medium">{mode === 'harian' ? 'Tanggal' : 'Waktu'}</th>
                  <th class="px-3 py-2 text-right font-medium">Nilai ({selected.unit})</th>
                  <th class="px-3 py-2 text-right font-medium">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {#each previewRows as r, i (r.t)}
                  {@const prev = previewRows[i + 1]?.v}
                  {@const diff = prev !== undefined ? r.v - prev : 0}
                  <tr class="border-b border-line-soft">
                    <td class="px-3 py-2 font-mono text-ink tnum">{rowLabel(r.t)}</td>
                    <td class="px-3 py-2 text-right font-mono font-semibold text-ink-strong tnum">{num(r.v, selected.valueDigits ?? 1)}</td>
                    <td class="px-3 py-2 text-right font-mono tnum" style="color:{diff > 0 ? STATUS.awas.color : diff < 0 ? STATUS.normal.color : 'var(--color-ink-dim)'}">
                      {diff > 0 ? '+' : diff < 0 ? '−' : ''}{num(Math.abs(diff), selected.valueDigits ?? 1)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </Panel>
{/if}
