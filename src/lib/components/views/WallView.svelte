<script lang="ts">
  import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
  import Waves from '@lucide/svelte/icons/waves';
  import Sprout from '@lucide/svelte/icons/sprout';
  import Siren from '@lucide/svelte/icons/siren';

  import BasinMap from '../map/BasinMap.svelte';
  import MapLegend from '../map/MapLegend.svelte';
  import AlertPanel from '../panels/AlertPanel.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import DamIcon from '../icons/DamIcon.svelte';
  import { data, clock, overallStatus, statusCounts, activeAlerts } from '../../stores';
  import { irigasiRatio } from '../../data/derive';
  import { SIAGA_ORDER, STATUS } from '../../status';
  import { clockTime, fullDate, num } from '../../format';

  const agg = $derived.by(() => {
    const d = $data;
    const hujan = d.pos.reduce((s, p) => s + p.hujan, 0) / d.pos.length;
    const peak = d.pos.reduce((a, b) => (b.tma > a.tma ? b : a));
    const sumVol = d.bendungan.reduce((s, b) => s + b.volume, 0);
    const sumKap = d.bendungan.reduce((s, b) => s + b.kapasitas, 0);
    const ir = (d.irigasi.reduce((s, x) => s + irigasiRatio(x), 0) / d.irigasi.length) * 100;
    const siaga = d.pos.filter((p) => p.status !== 'normal').length;
    return { hujan, peak, tampungan: (sumVol / sumKap) * 100, ir, siaga };
  });

  const kpis = $derived([
    { label: 'Hujan rata-rata', value: num(agg.hujan, 1), unit: 'mm/jam', icon: CloudRainWind, color: '#4f9bee' },
    { label: 'TMA puncak', value: num(agg.peak.tma, 2), unit: 'm', icon: Waves, color: STATUS[agg.peak.status].color },
    { label: 'Tampungan waduk', value: num(agg.tampungan, 0), unit: '%', icon: DamIcon, color: '#4f9bee' },
    { label: 'Pemenuhan irigasi', value: num(agg.ir, 0), unit: '%', icon: Sprout, color: '#3fb27f' },
    { label: 'Pos siaga+', value: String(agg.siaga), unit: 'pos', icon: Siren, color: agg.siaga ? '#e08a3c' : '#3fb27f' },
  ]);
</script>

<div class="grid h-full grid-rows-[auto_1fr_auto] gap-3 p-4">
  <!-- banner -->
  <div class="flex items-center justify-between rounded-xl border border-line bg-surface px-5 py-3">
    <div>
      <h2 class="text-[20px] font-semibold tracking-tight text-ink-strong">
        Pusat Kendali Operasi — Wilayah Sungai
      </h2>
      <p class="text-[12px] text-ink-muted">{fullDate($clock)}</p>
    </div>
    <div class="flex items-center gap-5">
      <div class="flex items-center gap-2.5">
        <span class="text-[12px] uppercase tracking-widest text-ink-dim">Status Wilayah</span>
        <StatusBadge status={$overallStatus} pulse={$overallStatus !== 'normal'} />
      </div>
      <div class="font-mono text-4xl font-semibold leading-none text-ink-strong tnum">
        {clockTime($clock)}
      </div>
    </div>
  </div>

  <!-- map + side -->
  <div class="grid min-h-0 grid-cols-3 gap-3">
    <div class="col-span-2 overflow-hidden rounded-xl border border-line">
      <div class="relative h-full">
        <BasinMap interactive={false} zoom={10}>
          {#snippet overlay()}<MapLegend />{/snippet}
        </BasinMap>
      </div>
    </div>

    <div class="flex min-h-0 flex-col gap-3">
      <div class="grid grid-cols-2 gap-2">
        {#each SIAGA_ORDER as s}
          <div class="rounded-xl border px-3 py-2.5" style="border-color:{STATUS[s].color}33;background:{STATUS[s].color}0d">
            <div class="font-mono text-3xl font-semibold leading-none tnum" style="color:{STATUS[s].color}">{$statusCounts[s]}</div>
            <div class="mt-1 text-[11px] uppercase tracking-wide text-ink-muted">{STATUS[s].label}</div>
          </div>
        {/each}
      </div>
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-panel">
        <div class="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <span class="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">Peringatan Aktif</span>
          <span class="font-mono text-[12px] text-ink-strong">{$activeAlerts.length}</span>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-2.5">
          <AlertPanel max={20} />
        </div>
      </div>
    </div>
  </div>

  <!-- KPI band -->
  <div class="grid grid-cols-5 gap-3">
    {#each kpis as k}
      <div class="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3">
        <k.icon size={22} strokeWidth={1.8} style="color:{k.color}" />
        <div>
          <div class="text-[11px] uppercase tracking-wide text-ink-muted">{k.label}</div>
          <div class="font-mono text-2xl font-semibold leading-tight text-ink-strong tnum">
            {k.value}<span class="ml-1 text-[12px] font-normal text-ink-muted">{k.unit}</span>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
