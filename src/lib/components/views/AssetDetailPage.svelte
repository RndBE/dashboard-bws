<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Cpu from '@lucide/svelte/icons/cpu';
  import ChartColumn from '@lucide/svelte/icons/chart-column';
  import TableProperties from '@lucide/svelte/icons/table-properties';

  import Panel from '../ui/Panel.svelte';
  import Button from '../ui/Button.svelte';
  import MiniChart from '../ui/MiniChart.svelte';
  import Gauge from '../ui/Gauge.svelte';
  import LevelBar from '../ui/LevelBar.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import InstrumentCard from '../panels/InstrumentCard.svelte';

  import { data, selected, closeDetail, clock } from '../../stores';
  import { KIND_LABEL, STATUS } from '../../status';
  import { instrumentIcon, INSTRUMENT_STATUS } from '../../instruments';
  import { irigasiRatio } from '../../data/derive';
  import { num, relTime, hhmm, fullDate } from '../../format';
  import { lastN, stats } from '../../series';
  import type {
    AsetOP,
    Bendungan,
    DaerahIrigasi,
    PosHidrologi,
    SumurPantau,
  } from '../../types';

  let period = $state(48);
  const periods = [
    { h: 6, label: '6 jam' },
    { h: 24, label: '24 jam' },
    { h: 48, label: '48 jam' },
  ];

  const asset = $derived.by(() => {
    const ref = $selected;
    if (!ref) return null;
    const d = $data;
    const found =
      ref.kind === 'pos'
        ? d.pos.find((x) => x.id === ref.id)
        : ref.kind === 'bendungan'
          ? d.bendungan.find((x) => x.id === ref.id)
          : ref.kind === 'irigasi'
            ? d.irigasi.find((x) => x.id === ref.id)
            : ref.kind === 'sumur'
              ? d.sumur.find((x) => x.id === ref.id)
              : d.op.find((x) => x.id === ref.id);
    return found ? { kind: ref.kind, item: found } : null;
  });

  const primary = $derived(
    asset ? (asset.item.instruments.find((i) => i.primary) ?? asset.item.instruments[0]) : null,
  );
  const series = $derived(primary ? lastN(primary.history, period) : []);
  const st = $derived(stats(series.map((p) => p.v)));
  const readings = $derived([...series].slice(-12).reverse());

  const online = $derived(asset ? asset.item.instruments.filter((i) => i.status === 'online').length : 0);
</script>

{#if asset && primary}
  {@const a = asset}
  <div class="flex flex-col gap-3">
    <!-- header -->
    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      <Button variant="ghost" size="sm" onclick={closeDetail}>
        <ArrowLeft size={15} /> Kembali
      </Button>
      <div class="h-6 w-px bg-line"></div>
      <div class="min-w-0">
        <div class="text-[10px] font-semibold uppercase tracking-widest text-accent-bright">
          {KIND_LABEL[a.kind]}
        </div>
        <h2 class="truncate text-[18px] font-semibold leading-tight text-ink-strong">
          {a.item.name}
        </h2>
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-dim">
        <span class="flex items-center gap-1">
          <MapPin size={12} />{num(a.item.lat, 3)}, {num(a.item.lng, 3)}
        </span>
        <span class="flex items-center gap-1">
          <Cpu size={12} />{online}/{a.item.instruments.length} alat online
        </span>
        <span>Pembaruan {relTime('updatedAt' in a.item ? a.item.updatedAt : a.item.inspeksi, $clock)}</span>
        <StatusBadge status={a.item.status} pulse={a.item.status !== 'normal'} />
      </div>
    </div>

    <!-- toolbar -->
    <div class="flex items-center gap-2">
      <span class="text-[11px] text-ink-dim">Periode analisa:</span>
      {#each periods as p}
        <Button size="sm" variant="ghost" active={period === p.h} onclick={() => (period = p.h)}>
          {p.label}
        </Button>
      {/each}
      <span class="ml-auto text-[11px] text-ink-dim">{fullDate($clock)}</span>
    </div>

    <!-- charts + stats -->
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div class="lg:col-span-2">
        {#if a.kind === 'pos'}
          {@const p = a.item as PosHidrologi}
          <Panel title="Tinggi Muka Air" subtitle="Sungai {p.river} · {period} jam" icon={ChartColumn} accent>
            <MiniChart
              points={lastN(p.historyTMA, period)}
              height={230}
              color="#4f9bee"
              unit="m"
              digits={2}
              thresholds={[
                { value: p.thresholds.waspada, color: STATUS.waspada.color, label: 'Waspada' },
                { value: p.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
                { value: p.thresholds.awas, color: STATUS.awas.color, label: 'Awas' },
              ]}
            />
          </Panel>
        {:else if a.kind === 'bendungan'}
          {@const b = a.item as Bendungan}
          <Panel title="Elevasi Muka Air Waduk" subtitle="{period} jam" icon={ChartColumn} accent>
            <MiniChart
              points={lastN(b.historyElevasi, period)}
              height={230}
              color="#4f9bee"
              unit="mdpl"
              digits={2}
              thresholds={[
                { value: b.elevasiNormal, color: STATUS.normal.color, label: 'Normal' },
                { value: b.elevasiBanjir, color: STATUS.awas.color, label: 'M.A. Banjir' },
              ]}
            />
          </Panel>
        {:else if a.kind === 'irigasi'}
          {@const di = a.item as DaerahIrigasi}
          <Panel title="Debit Saluran" subtitle="{period} jam" icon={ChartColumn} accent>
            <MiniChart
              points={lastN(di.historyDebit, period)}
              height={230}
              color="#4f9bee"
              unit="m³/s"
              digits={1}
              thresholds={[{ value: di.kebutuhan, color: STATUS.waspada.color, label: 'Kebutuhan' }]}
            />
          </Panel>
        {:else if a.kind === 'sumur'}
          {@const s = a.item as SumurPantau}
          <Panel title="Muka Air Tanah" subtitle="Kedalaman dari permukaan · {period} jam" icon={ChartColumn} accent>
            <MiniChart
              points={lastN(s.history, period)}
              height={230}
              color="#c9a227"
              unit="m"
              digits={2}
              thresholds={[
                { value: s.baseline, color: STATUS.normal.color, label: 'Baseline' },
                { value: s.baseline + s.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
              ]}
            />
          </Panel>
        {:else}
          <Panel title="{primary.type} — {primary.name}" subtitle="{period} jam" icon={ChartColumn} accent>
            <MiniChart points={series} height={230} color="#4f9bee" unit={primary.unit} digits={primary.valueDigits ?? 1} />
          </Panel>
        {/if}
      </div>

      <Panel title="Statistik Periode" subtitle="{primary.type} · {period} jam">
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-[10px] uppercase tracking-wide text-ink-dim">Terkini</div>
            <div class="font-mono text-[18px] font-semibold text-ink-strong tnum">{num(primary.value, primary.valueDigits ?? 1)}<span class="text-[10px] text-ink-muted"> {primary.unit}</span></div>
          </div>
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-[10px] uppercase tracking-wide text-ink-dim">Rata-rata</div>
            <div class="font-mono text-[18px] font-semibold text-ink-strong tnum">{num(st.avg, primary.valueDigits ?? 1)}</div>
          </div>
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-[10px] uppercase tracking-wide text-ink-dim">Maksimum</div>
            <div class="font-mono text-[18px] font-semibold text-awas tnum">{num(st.max, primary.valueDigits ?? 1)}</div>
          </div>
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-[10px] uppercase tracking-wide text-ink-dim">Minimum</div>
            <div class="font-mono text-[18px] font-semibold text-normal tnum">{num(st.min, primary.valueDigits ?? 1)}</div>
          </div>
        </div>

        {#if a.kind === 'bendungan'}
          {@const b = a.item as Bendungan}
          <div class="mt-3 flex items-center gap-3 border-t border-line-soft pt-3">
            <Gauge value={(b.volume / b.kapasitas) * 100} label="Tampungan" sublabel="{num(b.volume, 1)} jt m³" size={88} color="#4f9bee" />
            <div class="flex-1">
              <div class="mb-1 flex justify-between text-[11px]"><span class="text-ink-muted">Elevasi</span><span class="font-mono text-ink-strong">{num(b.elevasi, 2)} mdpl</span></div>
              <LevelBar value={b.elevasi} min={b.elevasiNormal - 3} max={b.elevasiBanjir + 1} color={STATUS[b.status].color}
                markers={[{ value: b.elevasiNormal, color: STATUS.normal.color, label: 'Normal' }, { value: b.elevasiBanjir, color: STATUS.awas.color, label: 'Banjir' }]} />
            </div>
          </div>
        {:else if a.kind === 'irigasi'}
          {@const di = a.item as DaerahIrigasi}
          <div class="mt-3 flex items-center gap-3 border-t border-line-soft pt-3">
            <Gauge value={irigasiRatio(di) * 100} label="Pemenuhan" size={88} color={STATUS[di.status].color} />
            <div class="flex-1 space-y-1.5 text-[11px]">
              <div class="flex justify-between"><span class="text-ink-muted">Layanan</span><span class="font-mono text-ink-strong">{num(di.layanan, 0)} / {num(di.luas, 0)} ha</span></div>
              <LevelBar value={di.layanan} min={0} max={di.luas} color="#3fb27f" height={6} />
              <div class="text-ink-dim">Pola tanam: <span class="text-ink">{di.polaTanam}</span></div>
            </div>
          </div>
        {:else if a.kind === 'op'}
          {@const o = a.item as AsetOP}
          <div class="mt-3 flex items-center gap-3 border-t border-line-soft pt-3">
            <Gauge value={o.kondisi} label="Kondisi" size={88} color={STATUS[o.status].color} />
            <div class="flex-1 space-y-1.5 text-[11px]">
              <div class="flex justify-between"><span class="text-ink-muted">Progres O&P</span><span class="font-mono text-ink-strong">{num(o.progres, 0)}%</span></div>
              <LevelBar value={o.progres} min={0} max={100} color="#4f9bee" height={6} />
              <div class="text-ink-dim">Jenis: <span class="text-ink">{o.jenis}</span></div>
            </div>
          </div>
        {/if}
      </Panel>
    </div>

    <!-- secondary chart for pos (rainfall) -->
    {#if a.kind === 'pos'}
      {@const p = a.item as PosHidrologi}
      <Panel title="Curah Hujan" subtitle="{period} jam" icon={ChartColumn}>
        <MiniChart points={lastN(p.historyHujan, period)} height={150} color="#c9a227" unit="mm" digits={0} yMin={0} bars />
      </Panel>
    {/if}

    <!-- INSTRUMENTS -->
    <Panel title="Instrumen Terpasang" subtitle="{a.item.instruments.length} alat · {online} online" icon={Cpu} accent>
      <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {#each a.item.instruments as it (it.id)}
          <InstrumentCard inst={it} />
        {/each}
      </div>
    </Panel>

    <!-- readings table + gates/pintu -->
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <Panel title="Pembacaan Terkini" subtitle="{primary.type} ({primary.unit})" icon={TableProperties} flush>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[12px]">
              <thead>
                <tr class="border-b border-line text-[10px] uppercase tracking-wide text-ink-dim">
                  <th class="px-3.5 py-2 font-medium">Waktu</th>
                  <th class="px-3.5 py-2 text-right font-medium">Nilai ({primary.unit})</th>
                  <th class="px-3.5 py-2 text-right font-medium">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {#each readings as r, i (r.t)}
                  {@const prev = readings[i + 1]?.v}
                  {@const diff = prev !== undefined ? r.v - prev : 0}
                  <tr class="border-b border-line-soft">
                    <td class="px-3.5 py-2 font-mono text-ink tnum">{hhmm(r.t)}</td>
                    <td class="px-3.5 py-2 text-right font-mono font-medium text-ink-strong tnum">{num(r.v, primary.valueDigits ?? 1)}</td>
                    <td class="px-3.5 py-2 text-right font-mono tnum" style="color:{diff > 0 ? STATUS.awas.color : diff < 0 ? STATUS.normal.color : 'var(--color-ink-dim)'}">
                      {diff > 0 ? '+' : diff < 0 ? '−' : ''}{num(Math.abs(diff), primary.valueDigits ?? 1)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Status Alat" icon={Cpu}>
        <div class="space-y-2">
          {#each a.item.instruments as it (it.id)}
            {@const Icon = instrumentIcon(it.type)}
            {@const meta = INSTRUMENT_STATUS[it.status]}
            <div class="flex items-center gap-2.5">
              <Icon size={14} class="shrink-0 text-ink-dim" />
              <span class="min-w-0 flex-1 truncate text-[12px] text-ink">{it.type}</span>
              <span class="flex items-center gap-1 text-[10px] font-medium" style="color:{meta.color}">
                <span class="h-1.5 w-1.5 rounded-full" style="background:{meta.color}"></span>{meta.label}
              </span>
            </div>
          {/each}
        </div>
      </Panel>
    </div>
  </div>
{/if}
