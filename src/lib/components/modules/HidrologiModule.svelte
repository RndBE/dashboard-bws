<script lang="ts">
  import Waves from '@lucide/svelte/icons/waves';
  import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
  import Activity from '@lucide/svelte/icons/activity';
  import Gauge from '@lucide/svelte/icons/gauge';
  import Table from '@lucide/svelte/icons/table-2';

  import Panel from '../ui/Panel.svelte';
  import KpiCard from '../ui/KpiCard.svelte';
  import Sparkline from '../ui/Sparkline.svelte';
  import MiniChart from '../ui/MiniChart.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { data, openDetail } from '../../stores';
  import { STATUS } from '../../status';
  import { num, relTime } from '../../format';
  import { clock } from '../../stores';

  const d = $derived($data);
  const rows = $derived(
    [...d.pos].sort(
      (a, b) => STATUS[b.status].weight - STATUS[a.status].weight,
    ),
  );
  const peak = $derived(rows[0]);
  const hujanMax = $derived(Math.max(...d.pos.map((p) => p.hujan)));
  const debitTotal = $derived(d.pos.reduce((s, p) => s + p.debit, 0));
  const aktif = $derived(d.pos.filter((p) => p.status !== 'normal').length);
</script>

<div class="flex flex-col gap-3">
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Pos dipantau" value={String(d.pos.length)} unit="pos" icon={Gauge}>
      {#snippet footer()}
        <span class="text-[10px] text-ink-dim">
          {#if aktif}<span class="text-siaga">{aktif}</span> di atas normal{:else}semua normal{/if}
        </span>
      {/snippet}
    </KpiCard>
    <KpiCard label="TMA tertinggi" value={num(peak.tma, 2)} unit="m" icon={Waves} accent>
      {#snippet footer()}<span class="truncate text-[10px] text-ink-dim">{peak.name}</span>{/snippet}
    </KpiCard>
    <KpiCard label="Hujan tertinggi" value={num(hujanMax, 1)} unit="mm/jam" icon={CloudRainWind} />
    <KpiCard label="Debit total" value={num(debitTotal, 0)} unit="m³/s" icon={Activity} />
  </div>

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <div class="xl:col-span-2">
      <Panel title="Pos Duga Air" subtitle="{d.pos.length} stasiun · klik baris untuk detail" icon={Table} flush>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[12px]">
            <thead>
              <tr class="border-b border-line text-[10px] uppercase tracking-wide text-ink-dim">
                <th class="px-3.5 py-2 font-medium">Pos / Sungai</th>
                <th class="px-2 py-2 font-medium">Status</th>
                <th class="px-2 py-2 text-right font-medium">TMA (m)</th>
                <th class="hidden px-2 py-2 sm:table-cell">Tren</th>
                <th class="px-2 py-2 text-right font-medium">Debit</th>
                <th class="px-2 py-2 text-right font-medium">Hujan</th>
                <th class="px-3.5 py-2 text-right font-medium">Update</th>
              </tr>
            </thead>
            <tbody>
              {#each rows as p (p.id)}
                <tr
                  onclick={() => openDetail('pos', p.id)}
                  class="cursor-pointer border-b border-line-soft transition-colors hover:bg-white/[0.03]"
                >
                  <td class="px-3.5 py-2.5">
                    <div class="font-medium text-ink-strong">{p.name}</div>
                    <div class="text-[10px] text-ink-dim">{p.river}</div>
                  </td>
                  <td class="px-2 py-2.5"><StatusBadge status={p.status} size="xs" dot={false} /></td>
                  <td class="px-2 py-2.5 text-right font-mono font-semibold tnum" style="color:{STATUS[p.status].color}">{num(p.tma, 2)}</td>
                  <td class="hidden px-2 py-2.5 sm:table-cell">
                    <div class="w-20"><Sparkline points={p.historyTMA.map((x) => x.v)} color={STATUS[p.status].color} height={24} dot={false} /></div>
                  </td>
                  <td class="px-2 py-2.5 text-right font-mono text-ink tnum">{num(p.debit, 0)}</td>
                  <td class="px-2 py-2.5 text-right font-mono text-ink tnum">{num(p.hujan, 1)}</td>
                  <td class="px-3.5 py-2.5 text-right text-[10px] text-ink-dim">{relTime(p.updatedAt, $clock)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>

    <div class="flex flex-col gap-3">
      <Panel title="TMA · {peak.name}" subtitle="48 jam terakhir" accent>
        <MiniChart
          points={peak.historyTMA}
          height={170}
          color={STATUS[peak.status].color}
          unit="m"
          digits={2}
          thresholds={[
            { value: peak.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
            { value: peak.thresholds.awas, color: STATUS.awas.color, label: 'Awas' },
          ]}
        />
      </Panel>
      <Panel title="Curah Hujan · {peak.name}">
        <MiniChart points={peak.historyHujan} height={140} color="#c9a227" unit="mm" digits={0} yMin={0} />
      </Panel>
    </div>
  </div>
</div>
