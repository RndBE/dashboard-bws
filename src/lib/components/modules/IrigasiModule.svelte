<script lang="ts">
  import Sprout from '@lucide/svelte/icons/sprout';
  import Droplet from '@lucide/svelte/icons/droplet';
  import LandPlot from '@lucide/svelte/icons/land-plot';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

  import Panel from '../ui/Panel.svelte';
  import KpiCard from '../ui/KpiCard.svelte';
  import Gauge from '../ui/Gauge.svelte';
  import LevelBar from '../ui/LevelBar.svelte';
  import Sparkline from '../ui/Sparkline.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { data, openDetail } from '../../stores';
  import { irigasiRatio } from '../../data/derive';
  import { STATUS } from '../../status';
  import { num } from '../../format';

  const d = $derived($data);
  const luasTotal = $derived(d.irigasi.reduce((s, x) => s + x.luas, 0));
  const layananTotal = $derived(d.irigasi.reduce((s, x) => s + x.layanan, 0));
  const pemenuhan = $derived(
    (d.irigasi.reduce((s, x) => s + irigasiRatio(x), 0) / d.irigasi.length) * 100,
  );
  const sumurKritis = $derived(d.sumur.filter((s) => s.status !== 'normal').length);
</script>

<div class="flex flex-col gap-3">
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Luas baku" value={num(luasTotal, 0)} unit="ha" icon={LandPlot} />
    <KpiCard label="Terlayani" value={num((layananTotal / luasTotal) * 100, 0)} unit="%" icon={Sprout} accent>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{num(layananTotal, 0)} ha</span>{/snippet}
    </KpiCard>
    <KpiCard label="Pemenuhan air" value={num(pemenuhan, 0)} unit="%" icon={Droplet} />
    <KpiCard label="Sumur kritis" value={String(sumurKritis)} unit="dari {d.sumur.length}" icon={TriangleAlert} />
  </div>

  <Panel title="Daerah Irigasi" subtitle="{d.irigasi.length} DI · klik untuk detail" icon={Sprout} flush>
    <div class="grid grid-cols-1 gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
      {#each d.irigasi as di (di.id)}
        <button onclick={() => openDetail('irigasi', di.id)} class="bg-panel p-3.5 text-left transition-colors hover:bg-panel-2">
          <div class="mb-2 flex items-center justify-between">
            <span class="font-medium text-ink-strong">{di.name}</span>
            <StatusBadge status={di.status} size="xs" />
          </div>
          <div class="flex items-center gap-3">
            <Gauge value={irigasiRatio(di) * 100} label="Pemenuhan" size={84} color={STATUS[di.status].color} />
            <div class="flex-1 space-y-2 text-[11px]">
              <div class="flex justify-between"><span class="text-ink-dim">Debit</span><span class="font-mono text-ink-strong">{num(di.debit, 1)} / {num(di.kebutuhan, 1)} m³/s</span></div>
              <div>
                <div class="mb-1 flex justify-between"><span class="text-ink-dim">Layanan</span><span class="font-mono text-ink">{num((di.layanan / di.luas) * 100, 0)}%</span></div>
                <LevelBar value={di.layanan} min={0} max={di.luas} color="#3fb27f" height={6} />
              </div>
              <div class="text-ink-dim">Pola: <span class="text-ink">{di.polaTanam}</span></div>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </Panel>

  <Panel title="Sumur Pantau — Muka Air Tanah" subtitle="{d.sumur.length} sumur" icon={Droplet} flush>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-[12px]">
        <thead>
          <tr class="border-b border-line text-[10px] uppercase tracking-wide text-ink-dim">
            <th class="px-3.5 py-2 font-medium">Sumur</th>
            <th class="px-2 py-2 font-medium">Status</th>
            <th class="px-2 py-2 text-right font-medium">Muka air (m)</th>
            <th class="px-2 py-2 text-right font-medium">Baseline</th>
            <th class="px-2 py-2 text-right font-medium">Penurunan</th>
            <th class="hidden px-3.5 py-2 sm:table-cell">Tren</th>
          </tr>
        </thead>
        <tbody>
          {#each d.sumur as s (s.id)}
            {@const draw = s.muka - s.baseline}
            <tr onclick={() => openDetail('sumur', s.id)} class="cursor-pointer border-b border-line-soft transition-colors hover:bg-white/[0.03]">
              <td class="px-3.5 py-2.5 font-medium text-ink-strong">{s.name}</td>
              <td class="px-2 py-2.5"><StatusBadge status={s.status} size="xs" dot={false} /></td>
              <td class="px-2 py-2.5 text-right font-mono font-semibold tnum" style="color:{STATUS[s.status].color}">{num(s.muka, 2)}</td>
              <td class="px-2 py-2.5 text-right font-mono text-ink-muted tnum">{num(s.baseline, 2)}</td>
              <td class="px-2 py-2.5 text-right font-mono tnum" style="color:{draw > 1.5 ? STATUS.siaga.color : 'var(--color-ink)'}">−{num(draw, 2)}</td>
              <td class="hidden px-3.5 py-2.5 sm:table-cell"><div class="w-24"><Sparkline points={s.history.map((x) => x.v)} color={STATUS[s.status].color} height={24} dot={false} /></div></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Panel>
</div>
