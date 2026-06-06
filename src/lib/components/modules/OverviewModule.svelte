<script lang="ts">
  import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
  import Waves from '@lucide/svelte/icons/waves';
  import Activity from '@lucide/svelte/icons/activity';
  import Sprout from '@lucide/svelte/icons/sprout';
  import Droplet from '@lucide/svelte/icons/droplet';
  import Wrench from '@lucide/svelte/icons/wrench';
  import Map from '@lucide/svelte/icons/map';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  import Panel from '../ui/Panel.svelte';
  import KpiCard from '../ui/KpiCard.svelte';
  import Sparkline from '../ui/Sparkline.svelte';
  import Delta from '../ui/Delta.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import BasinMap from '../map/BasinMap.svelte';
  import MapLegend from '../map/MapLegend.svelte';
  import AlertPanel from '../panels/AlertPanel.svelte';
  import DamIcon from '../icons/DamIcon.svelte';

  import { data, activeModule, activeAlerts } from '../../stores';
  import { irigasiRatio } from '../../data/derive';
  import { worst, STATUS } from '../../status';
  import { avgSeries, deltaArr } from '../../series';
  import { num } from '../../format';
  import type { ModuleKey, Siaga } from '../../types';

  const agg = $derived.by(() => {
    const d = $data;
    const hujanSeries = avgSeries(d.pos.map((p) => p.historyHujan));
    const hujanAvg = d.pos.reduce((s, p) => s + p.hujan, 0) / d.pos.length;
    const peakPos = d.pos.reduce((a, b) => (b.tma > a.tma ? b : a));
    const peakDebit = Math.max(...d.pos.map((p) => p.debit));
    const sumVol = d.bendungan.reduce((s, b) => s + b.volume, 0);
    const sumKap = d.bendungan.reduce((s, b) => s + b.kapasitas, 0);
    const tampungan = sumKap > 0 ? (sumVol / sumKap) * 100 : 0;
    const irAvg =
      (d.irigasi.reduce((s, x) => s + irigasiRatio(x), 0) / d.irigasi.length) *
      100;
    const sumurSeries = avgSeries(d.sumur.map((s) => s.history));
    const sumurAvg = d.sumur.reduce((s, x) => s + x.muka, 0) / d.sumur.length;
    return {
      hujanSeries,
      hujanAvg,
      peakPos,
      peakDebit,
      sumVol,
      tampungan,
      irAvg,
      sumurSeries,
      sumurAvg,
    };
  });

  interface DivCard {
    label: string;
    icon: any;
    statuses: Siaga[];
    target: ModuleKey;
  }
  const divisi = $derived.by<DivCard[]>(() => {
    const d = $data;
    return [
      { label: 'Hidrologi', icon: Waves, statuses: d.pos.map((x) => x.status), target: 'hidrologi' },
      { label: 'Bendungan', icon: DamIcon, statuses: d.bendungan.map((x) => x.status), target: 'bendungan' },
      { label: 'Irigasi', icon: Sprout, statuses: d.irigasi.map((x) => x.status), target: 'irigasi' },
      { label: 'Air Tanah', icon: Droplet, statuses: d.sumur.map((x) => x.status), target: 'irigasi' },
      { label: 'Aset O&P', icon: Wrench, statuses: d.op.map((x) => x.status), target: 'banjir' },
    ];
  });
</script>

<div class="flex flex-col gap-3">
  <!-- KPI strip -->
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
    <KpiCard label="Hujan rata-rata" value={num(agg.hujanAvg, 1)} unit="mm/jam" icon={CloudRainWind}>
      {#snippet footer()}
        <Sparkline points={agg.hujanSeries} color="#4f9bee" height={30} />
      {/snippet}
    </KpiCard>

    <KpiCard label="TMA puncak" value={num(agg.peakPos.tma, 2)} unit="m" icon={Waves} accent>
      {#snippet footer()}
        <div class="flex items-center justify-between gap-2">
          <span class="truncate text-[10px] text-ink-dim">{agg.peakPos.name}</span>
          <Delta delta={deltaArr(agg.peakPos.historyTMA.map((p) => p.v))} unit=" m" digits={2} badWhen="up" />
        </div>
      {/snippet}
    </KpiCard>

    <KpiCard label="Debit puncak" value={num(agg.peakDebit, 0)} unit="m³/s" icon={Activity}>
      {#snippet footer()}
        <Sparkline points={agg.peakPos.historyTMA.map((p) => p.v * (agg.peakDebit / agg.peakPos.tma))} color="#4f9bee" height={30} />
      {/snippet}
    </KpiCard>

    <KpiCard label="Tampungan waduk" value={num(agg.tampungan, 0)} unit="%" icon={DamIcon}>
      {#snippet footer()}
        <span class="text-[10px] text-ink-dim">{num(agg.sumVol, 1)} juta m³ total</span>
      {/snippet}
    </KpiCard>

    <KpiCard label="Pemenuhan irigasi" value={num(agg.irAvg, 0)} unit="%" icon={Sprout}>
      {#snippet footer()}
        <Delta delta={agg.irAvg - 100} unit="% vs kebutuhan" digits={0} badWhen="down" />
      {/snippet}
    </KpiCard>

    <KpiCard label="Muka air tanah" value={num(agg.sumurAvg, 2)} unit="m" icon={Droplet}>
      {#snippet footer()}
        <Sparkline points={agg.sumurSeries} color="#c9a227" height={30} />
      {/snippet}
    </KpiCard>
  </div>

  <!-- Map + alerts -->
  <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
    <div class="lg:col-span-2">
      <Panel title="Peta Wilayah Sungai" subtitle="Status pos pemantauan · klik penanda untuk detail" icon={Map} flush>
        <div class="relative h-[440px] overflow-hidden rounded-b-xl">
          <BasinMap>
            {#snippet overlay()}
              <MapLegend />
            {/snippet}
          </BasinMap>
        </div>
      </Panel>
    </div>

    <Panel title="Peringatan Aktif" subtitle="{$activeAlerts.length} kejadian" icon={TriangleAlert} accent>
      <div class="h-[396px]">
        <AlertPanel max={12} />
      </div>
    </Panel>
  </div>

  <!-- Divisi summary -->
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {#each divisi as dv}
      {@const w = worst(dv.statuses)}
      {@const bad = dv.statuses.filter((s) => s !== 'normal').length}
      <button
        onclick={() => activeModule.set(dv.target)}
        class="group flex flex-col gap-2 rounded-xl border border-line bg-panel px-3.5 py-3 text-left transition-colors hover:border-accent/40 hover:bg-panel-2"
      >
        <div class="flex items-center gap-2">
          <dv.icon size={16} strokeWidth={2} class="text-accent-bright" />
          <span class="text-[12.5px] font-medium text-ink-strong">{dv.label}</span>
          <ChevronRight size={14} class="ml-auto text-ink-dim transition-transform group-hover:translate-x-0.5" />
        </div>
        <div class="flex items-center justify-between">
          <StatusBadge status={w} size="xs" pulse={w !== 'normal'} />
          <span class="text-[10.5px] text-ink-dim">
            {#if bad > 0}
              <span style="color:{STATUS[w].color}">{bad}</span> perlu perhatian
            {:else}
              {dv.statuses.length} normal
            {/if}
          </span>
        </div>
      </button>
    {/each}
  </div>
</div>
