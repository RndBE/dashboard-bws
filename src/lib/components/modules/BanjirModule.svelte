<script lang="ts">
  import Siren from '@lucide/svelte/icons/siren';
  import Activity from '@lucide/svelte/icons/activity';
  import Wrench from '@lucide/svelte/icons/wrench';
  import HardHat from '@lucide/svelte/icons/hard-hat';
  import Waves from '@lucide/svelte/icons/waves';

  import Panel from '../ui/Panel.svelte';
  import KpiCard from '../ui/KpiCard.svelte';
  import Gauge from '../ui/Gauge.svelte';
  import LevelBar from '../ui/LevelBar.svelte';
  import Sparkline from '../ui/Sparkline.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import Delta from '../ui/Delta.svelte';
  import { data, openDetail } from '../../stores';
  import { STATUS } from '../../status';
  import { num, shortDateTime } from '../../format';
  import { shortDelta } from '../../series';

  const d = $derived($data);
  const ews = $derived(
    [...d.pos].sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight),
  );
  const siagaCount = $derived(d.pos.filter((p) => p.status !== 'normal').length);
  const debitPeak = $derived(Math.max(...d.pos.map((p) => p.debit)));
  const perbaikan = $derived(d.op.filter((a) => a.kondisi < 70).length);
  const progresAvg = $derived(d.op.reduce((s, a) => s + a.progres, 0) / d.op.length);
</script>

<div class="flex flex-col gap-3">
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Pos siaga+" value={String(siagaCount)} unit="dari {d.pos.length}" icon={Siren} accent />
    <KpiCard label="Debit puncak" value={num(debitPeak, 0)} unit="m³/s" icon={Activity} />
    <KpiCard label="Aset perlu perbaikan" value={String(perbaikan)} unit="aset" icon={HardHat} />
    <KpiCard label="Progres O&P" value={num(progresAvg, 0)} unit="%" icon={Wrench} />
  </div>

  <Panel title="Sistem Peringatan Dini Banjir (EWS)" subtitle="TMA terhadap ambang siaga" icon={Siren} flush>
    <div class="divide-y divide-line-soft">
      {#each ews as p (p.id)}
        <button onclick={() => openDetail('pos', p.id)} class="flex w-full items-center gap-4 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.03]">
          <Waves size={16} class="shrink-0 text-ink-dim" />
          <div class="w-40 shrink-0">
            <div class="truncate text-[12.5px] font-medium text-ink-strong">{p.name}</div>
            <div class="text-[10px] text-ink-dim">{p.river}</div>
          </div>
          <div class="flex-1">
            <LevelBar
              value={p.tma}
              min={0}
              max={p.thresholds.awas + 0.6}
              color={STATUS[p.status].color}
              height={8}
              markers={[
                { value: p.thresholds.waspada, color: STATUS.waspada.color, label: 'Waspada' },
                { value: p.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
                { value: p.thresholds.awas, color: STATUS.awas.color, label: 'Awas' },
              ]}
            />
          </div>
          <div class="w-16 text-right">
            <div class="font-mono text-[14px] font-semibold tnum" style="color:{STATUS[p.status].color}">{num(p.tma, 2)}</div>
            <div class="text-[9px] text-ink-dim">m</div>
          </div>
          <div class="hidden w-20 justify-end sm:flex">
            <Delta delta={shortDelta(p.historyTMA)} unit=" m" digits={2} badWhen="up" />
          </div>
          <StatusBadge status={p.status} size="xs" dot={false} />
        </button>
      {/each}
    </div>
  </Panel>

  <Panel title="Operasi & Pemeliharaan Aset" subtitle="{d.op.length} aset infrastruktur" icon={Wrench} flush>
    <div class="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
      {#each d.op as a (a.id)}
        <button onclick={() => openDetail('op', a.id)} class="flex flex-col gap-2 bg-panel p-3.5 text-left transition-colors hover:bg-panel-2">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[12.5px] font-medium text-ink-strong">{a.name}</div>
              <div class="text-[10px] text-ink-dim">{a.jenis}</div>
            </div>
            <StatusBadge status={a.status} size="xs" />
          </div>
          <div class="flex items-center gap-3">
            <Gauge value={a.kondisi} label="Kondisi" size={74} color={STATUS[a.status].color} />
            <div class="flex-1 space-y-1.5 text-[11px]">
              <div class="flex justify-between"><span class="text-ink-dim">Progres</span><span class="font-mono text-ink-strong">{num(a.progres, 0)}%</span></div>
              <LevelBar value={a.progres} min={0} max={100} color="#4f9bee" height={6} />
              <div class="text-[10px] text-ink-dim">Inspeksi: {shortDateTime(a.inspeksi)}</div>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </Panel>
</div>
