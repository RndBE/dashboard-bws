<script lang="ts">
  import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
  import Waves from '@lucide/svelte/icons/waves';
  import Activity from '@lucide/svelte/icons/activity';
  import GitCompare from '@lucide/svelte/icons/git-compare-arrows';

  import Panel from '../ui/Panel.svelte';
  import Button from '../ui/Button.svelte';
  import MiniChart from '../ui/MiniChart.svelte';
  import Delta from '../ui/Delta.svelte';
  import { data } from '../../stores';
  import { STATUS } from '../../status';
  import { avgSeries, deltaArr } from '../../series';
  import { num } from '../../format';

  const periods = [
    { h: 6, label: '6 jam' },
    { h: 24, label: '24 jam' },
    { h: 48, label: '48 jam' },
  ];
  let period = $state(24);

  const d = $derived($data);
  const peak = $derived(
    [...d.pos].sort((a, b) => b.tma - a.tma)[0],
  );

  function sliceN<T>(arr: T[], n: number): T[] {
    return arr.slice(-n);
  }

  const hujanSeries = $derived(
    sliceN(
      avgSeries(d.pos.map((p) => p.historyHujan)).map((v, i) => ({ t: i, v })),
      period,
    ),
  );
  const tmaSeries = $derived(sliceN(peak.historyTMA, period));
  const hujanDelta = $derived(deltaArr(hujanSeries.map((p) => p.v)));
  const tmaDelta = $derived(deltaArr(tmaSeries.map((p) => p.v)));

  const debitMax = $derived(Math.max(...d.pos.map((p) => p.debit)));
  const posByDebit = $derived([...d.pos].sort((a, b) => b.debit - a.debit));
</script>

<div class="flex flex-col gap-3">
  <!-- toolbar -->
  <div class="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel px-3.5 py-2.5">
    <div class="flex items-center gap-2 text-[12px] text-ink-muted">
      <GitCompare size={15} class="text-accent-bright" />
      Analisa tren & perbandingan
    </div>
    <div class="ml-auto flex items-center gap-1.5">
      <span class="text-[11px] text-ink-dim">Periode:</span>
      {#each periods as p}
        <Button size="sm" variant="ghost" active={period === p.h} onclick={() => (period = p.h)}>
          {p.label}
        </Button>
      {/each}
    </div>
  </div>

  <!-- korelasi hujan vs TMA -->
  <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
    <Panel title="Curah Hujan Wilayah" subtitle="Rata-rata seluruh pos" icon={CloudRainWind}>
      {#snippet actions()}<Delta delta={hujanDelta} unit=" mm" digits={1} badWhen="up" />{/snippet}
      <MiniChart points={hujanSeries} height={190} color="#c9a227" unit="mm" digits={0} yMin={0} />
    </Panel>
    <Panel title="TMA — {peak.name}" subtitle="Respons muka air terhadap hujan" icon={Waves} accent>
      {#snippet actions()}<Delta delta={tmaDelta} unit=" m" digits={2} badWhen="up" />{/snippet}
      <MiniChart
        points={tmaSeries}
        height={190}
        color="#4f9bee"
        unit="m"
        digits={2}
        thresholds={[
          { value: peak.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
          { value: peak.thresholds.awas, color: STATUS.awas.color, label: 'Awas' },
        ]}
      />
    </Panel>
  </div>

  <!-- perbandingan -->
  <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
    <Panel title="Perbandingan Debit Antar Pos" icon={Activity}>
      <div class="space-y-2.5">
        {#each posByDebit as p (p.id)}
          <div class="flex items-center gap-3">
            <span class="w-36 shrink-0 truncate text-[11.5px] text-ink">{p.name}</span>
            <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-panel-2">
              <div
                class="h-full rounded-full"
                style="width:{(p.debit / debitMax) * 100}%;background:linear-gradient(90deg,{STATUS[p.status].color}66,{STATUS[p.status].color})"
              ></div>
            </div>
            <span class="w-16 text-right font-mono text-[11.5px] text-ink-strong tnum">{num(p.debit, 0)} m³/s</span>
          </div>
        {/each}
      </div>
    </Panel>

    <Panel title="Tampungan Bendungan" subtitle="% terhadap kapasitas" icon={GitCompare}>
      <div class="space-y-2.5">
        {#each d.bendungan as b (b.id)}
          {@const fill = (b.volume / b.kapasitas) * 100}
          <div class="flex items-center gap-3">
            <span class="w-36 shrink-0 truncate text-[11.5px] text-ink">{b.name}</span>
            <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-panel-2">
              <div class="h-full rounded-full" style="width:{fill}%;background:linear-gradient(90deg,#1d6fd6aa,#4f9bee)"></div>
            </div>
            <span class="w-16 text-right font-mono text-[11.5px] text-ink-strong tnum">{num(fill, 0)}%</span>
          </div>
        {/each}
      </div>
      <p class="mt-3 border-t border-line-soft pt-2.5 text-[10.5px] text-ink-dim">
        Data prototipe — simulasi realtime. Ekspor & integrasi API dapat ditambahkan pada tahap berikutnya.
      </p>
    </Panel>
  </div>
</div>
