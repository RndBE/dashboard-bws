<script lang="ts">
  import Waves from '@lucide/svelte/icons/waves';
  import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
  import Activity from '@lucide/svelte/icons/activity';
  import Gauge from '@lucide/svelte/icons/gauge';
  import Table from '@lucide/svelte/icons/table-2';

  import Droplets from '@lucide/svelte/icons/droplets';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  import Panel from '../ui/Panel.svelte';
  import CctvPanel from '../cctv/CctvPanel.svelte';
  import KpiCard from '../ui/KpiCard.svelte';
  import Sparkline from '../ui/Sparkline.svelte';
  import MiniChart from '../ui/MiniChart.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { data, openDetail, openHydro } from '../../stores';
  import { STATUS, POS_TIPE_LABEL } from '../../status';
  import { num, relTime } from '../../format';
  import { clock } from '../../stores';

  const d = $derived($data);
  const rows = $derived(
    [...d.pos].sort(
      (a, b) => STATUS[b.status].weight - STATUS[a.status].weight,
    ),
  );
  const peak = $derived(rows[0]);
  const dugaAir = $derived(d.pos.filter((p) => p.tipe === 'duga-air'));
  const hujanPos = $derived(d.pos.filter((p) => p.tipe === 'hujan'));
  const hujanPeak = $derived(
    [...hujanPos].sort((a, b) => b.param.value - a.param.value)[0] ?? null,
  );
  const tmaMax = $derived(dugaAir.length ? Math.max(...dugaAir.map((p) => p.param.value)) : 0);
  const hujanMax = $derived(hujanPos.length ? Math.max(...hujanPos.map((p) => p.param.value)) : 0);
  const debitTotal = $derived(dugaAir.reduce((s, p) => s + (p.debit ?? 0), 0));
  const aktif = $derived(d.pos.filter((p) => p.status !== 'normal').length);
</script>

<div class="flex flex-col gap-3">
  <!-- Toggle: buka Portal Hidrologi (sub-aplikasi telemetri lengkap) -->
  <button
    onclick={() => openHydro()}
    class="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-r from-accent/12 via-accent/6 to-transparent px-4 py-3 text-left transition-colors hover:border-accent/55 hover:from-accent/20"
  >
    <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/40 bg-accent/15 text-accent-bright">
      <Droplets size={22} />
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="text-[13.5px] font-semibold text-ink-strong">Portal Hidrologi &amp; Telemetri</span>
        <span class="rounded-full border border-accent/40 bg-accent/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-accent-bright">Sub-sistem</span>
      </div>
      <p class="truncate text-[11px] text-ink-muted">
        Halaman khusus: Pos Duga Air, Debit &amp; Flowmeter, Curah Hujan, Kualitas Air, Mata Air, dan CCTV IP Publik terintegrasi.
      </p>
    </div>
    <span class="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-[12px] font-medium text-accent-bright transition-transform group-hover:translate-x-0.5">
      Buka Portal <ArrowRight size={15} />
    </span>
  </button>

  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Pos dipantau" value={String(d.pos.length)} unit="pos" icon={Gauge}>
      {#snippet footer()}
        <span class="text-[10px] text-ink-dim">
          {#if aktif}<span class="text-siaga">{aktif}</span> di atas normal{:else}semua normal{/if}
        </span>
      {/snippet}
    </KpiCard>
    <KpiCard label="TMA tertinggi" value={num(tmaMax, 2)} unit="m" icon={Waves} accent>
      {#snippet footer()}<span class="truncate text-[10px] text-ink-dim">{dugaAir.length} pos duga air</span>{/snippet}
    </KpiCard>
    <KpiCard label="Hujan tertinggi" value={num(hujanMax, 1)} unit="mm" icon={CloudRainWind}>
      {#snippet footer()}<span class="truncate text-[10px] text-ink-dim">{hujanPos.length} pos hujan</span>{/snippet}
    </KpiCard>
    <KpiCard label="Debit total" value={num(debitTotal, 0)} unit="m³/s" icon={Activity} />
  </div>

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <div class="xl:col-span-2">
      <Panel title="Pos & Stasiun Telemetri" subtitle="{d.pos.length} stasiun · klik baris untuk detail" icon={Table} flush>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[12px]">
            <thead>
              <tr class="border-b border-line text-[10px] uppercase tracking-wide text-ink-dim">
                <th class="px-3.5 py-2 font-medium">Pos / Sungai</th>
                <th class="px-2 py-2 font-medium">Tipe</th>
                <th class="px-2 py-2 font-medium">Status</th>
                <th class="px-2 py-2 text-right font-medium">Parameter utama</th>
                <th class="hidden px-2 py-2 sm:table-cell">Tren</th>
                <th class="px-3.5 py-2 text-right font-medium">Update</th>
              </tr>
            </thead>
            <tbody>
              {#each rows as p (p.id)}
                <tr
                  onclick={() => openDetail('pos', p.id)}
                  class="cursor-pointer border-b border-line-soft transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <td class="px-3.5 py-2.5">
                    <div class="font-medium text-ink-strong">{p.name}</div>
                    <div class="text-[10px] text-ink-dim">{p.river ?? '—'}</div>
                  </td>
                  <td class="px-2 py-2.5 text-[10px] text-ink-dim">{POS_TIPE_LABEL[p.tipe]}</td>
                  <td class="px-2 py-2.5"><StatusBadge status={p.status} size="xs" dot={false} /></td>
                  <td class="px-2 py-2.5 text-right font-mono font-semibold tnum" style="color:{STATUS[p.status].color}">
                    {num(p.param.value, p.param.digits)}<span class="text-[9px] font-normal text-ink-muted"> {p.param.unit}</span>
                    {#if p.debit !== undefined}<div class="text-[9px] font-normal text-ink-dim">Q {num(p.debit, 0)} m³/s</div>{/if}
                  </td>
                  <td class="hidden px-2 py-2.5 sm:table-cell">
                    <div class="w-20"><Sparkline points={p.history.map((x) => x.v)} color={STATUS[p.status].color} height={24} dot={false} /></div>
                  </td>
                  <td class="px-3.5 py-2.5 text-right text-[10px] text-ink-dim">{relTime(p.updatedAt, $clock)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>

    <div class="flex flex-col gap-3">
      <Panel title="{peak.param.label} · {peak.name}" subtitle="48 jam terakhir" accent>
        <MiniChart
          points={peak.history}
          height={170}
          color={STATUS[peak.status].color}
          unit={peak.param.unit}
          digits={peak.param.digits}
          thresholds={peak.thresholds
            ? [
                { value: peak.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
                { value: peak.thresholds.awas, color: STATUS.awas.color, label: 'Awas' },
              ]
            : []}
        />
      </Panel>
      {#if hujanPeak}
        <Panel title="Curah Hujan · {hujanPeak.name}">
          <MiniChart points={hujanPeak.history} height={140} color="#c9a227" unit="mm" digits={0} yMin={0} bars />
        </Panel>
      {/if}
    </div>
  </div>

  <CctvPanel group="hidrologi" />
</div>
