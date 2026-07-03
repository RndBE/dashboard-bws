<script lang="ts">
  import FlaskConical from '@lucide/svelte/icons/flask-conical';
  import Droplets from '@lucide/svelte/icons/droplets';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import Wind from '@lucide/svelte/icons/wind';
  import { num } from '../../../format';
  import { makeGeochem, geochemKpis } from '../../../geothermal/geochem.js';
  import SeverityChip from '../SeverityChip.svelte';

  const rows = makeGeochem();
  const kpi = geochemKpis(rows);

  const types = ['all', 'production', 'reinjection'];
  let type = $state('all');

  const filtered = $derived(rows.filter((r) => type === 'all' || r.type === type));

  const kpis = [
    { icon: Droplets, label: 'Avg pH', value: num(kpi.avgPh, 2), unit: '' },
    { icon: FlaskConical, label: 'Avg SiO₂', value: num(kpi.avgSio2, 0), unit: 'ppm' },
    { icon: AlertTriangle, label: 'Scaling Risk', value: kpi.riskWells, unit: 'sumur' },
    { icon: Wind, label: 'Avg NCG', value: num(kpi.avgNcg, 2), unit: '%wt' },
  ];
</script>

<div class="space-y-3">
  <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
    {#each kpis as k}
      <div class="rounded-xl border border-line bg-panel p-3">
        <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-dim">
          <k.icon size={13} class="text-accent" /> {k.label}
        </div>
        <div class="mt-1.5 flex items-baseline gap-1">
          <span class="text-[22px] font-semibold text-ink-strong tnum">{k.value}</span>
          <span class="text-[11px] text-ink-muted">{k.unit}</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="rounded-xl border border-line bg-panel p-3">
    <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Brine Chemistry</div>
      <div class="flex flex-wrap items-center gap-1.5">
        {#each types as t}
          <button
            onclick={() => (type = t)}
            class="rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize transition-colors {type === t
              ? 'border-accent/60 bg-accent/15 text-accent-bright'
              : 'border-line bg-panel-2 text-ink-muted hover:text-ink'}"
          >{t === 'all' ? 'Semua' : t}</button>
        {/each}
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-[12px]">
        <thead class="text-ink-dim">
          <tr class="border-b border-line">
            <th class="px-2 py-1.5 text-left font-medium">Well</th>
            <th class="px-2 py-1.5 text-left font-medium">Type</th>
            <th class="px-2 py-1.5 text-right font-medium">pH</th>
            <th class="px-2 py-1.5 text-right font-medium">SiO₂ ppm</th>
            <th class="px-2 py-1.5 text-right font-medium">Cl ppm</th>
            <th class="px-2 py-1.5 text-right font-medium">TDS ppm</th>
            <th class="px-2 py-1.5 text-right font-medium">NCG %wt</th>
            <th class="px-2 py-1.5 text-right font-medium">SI</th>
            <th class="px-2 py-1.5 text-left font-medium">Scaling Risk</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as r (r.well)}
            <tr class="border-b border-line/60 hover:bg-panel-2/60">
              <td class="px-2 py-1.5">
                <div class="font-mono text-[11px] text-accent-bright">{r.well}</div>
                <div class="text-[10px] text-ink-dim">{r.wellName}</div>
              </td>
              <td class="px-2 py-1.5">
                <span class="rounded-md border border-line bg-panel-2 px-2 py-0.5 text-[10px] font-semibold capitalize text-ink-muted">{r.type}</span>
              </td>
              <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(r.ph, 2)}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tnum">{num(r.sio2, 0)}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tnum">{num(r.cl, 0)}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tnum">{num(r.tds, 0)}</td>
              <td class="px-2 py-1.5 text-right text-ink-muted tnum">{num(r.ncg, 2)}</td>
              <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(r.si, 2)}</td>
              <td class="px-2 py-1.5"><SeverityChip severity={r.risk} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
