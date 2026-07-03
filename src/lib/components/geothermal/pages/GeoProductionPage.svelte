<script lang="ts">
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
  import Droplets from '@lucide/svelte/icons/droplets';
  import Gauge from '@lucide/svelte/icons/gauge';
  import TrendingDown from '@lucide/svelte/icons/trending-down';
  import Wind from '@lucide/svelte/icons/wind';
  import Zap from '@lucide/svelte/icons/zap';
  import MultiChart from '../../ui/MultiChart.svelte';
  import { num } from '../../../format';
  import { geoField, geoWells } from '../../../geothermal/store';
  import type { Well } from '../../../geothermal/types';

  const FIELD_NAMEPLATE_MW = 20;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const productionWells = $derived($geoWells.filter((w) => w.type === 'production'));
  const capacityFactor = $derived(($geoField.grossMw / FIELD_NAMEPLATE_MW) * 100);
  const utilizationPct = $derived(Math.min(100, Math.max(0, capacityFactor)));
  const maxWellMw = $derived(Math.max(1, ...productionWells.map((w) => w.output.mw)));

  const kpis = $derived([
    { icon: Zap, label: 'Gross Power', value: num($geoField.grossMw, 1), unit: 'MW' },
    { icon: Wind, label: 'Steam Flow', value: num($geoField.steamTh, 1), unit: 't/h' },
    { icon: Droplets, label: 'Brine Flow', value: num($geoField.brineM3h, 1), unit: 'm³/h' },
    { icon: Gauge, label: 'Capacity Factor', value: num(capacityFactor, 1), unit: '%' },
  ]);

  const declineSeries = $derived.by(() => {
    const now = Date.now();
    return [{
      name: 'Gross MW',
      color: '#4f9bee',
      points: Array.from({ length: 30 }, (_, i) => ({
        t: now + i * DAY_MS,
        v: Math.max(0, $geoField.grossMw * (1 - 0.004 * i)),
      })),
    }];
  });

  const contributionRows = $derived($geoWells.map((w) => ({
    well: w,
    share: $geoField.grossMw > 0 ? (w.output.mw / $geoField.grossMw) * 100 : 0,
  })));

  function barWidth(well: Well): string {
    return `${Math.max(2, (well.output.mw / maxWellMw) * 100)}%`;
  }

  function pctWidth(value: number): string {
    return `${Math.min(100, Math.max(0, value))}%`;
  }
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

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="mb-2 flex items-center justify-between gap-2">
        <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Nameplate Utilization</div>
        <span class="rounded-md border border-line bg-panel-2 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
          {FIELD_NAMEPLATE_MW} MW
        </span>
      </div>

      <div class="mt-4">
        <div class="flex items-end justify-between gap-3">
          <div>
            <div class="text-[28px] font-semibold leading-none text-ink-strong tnum">{num($geoField.grossMw, 1)}</div>
            <div class="mt-1 text-[11px] text-ink-muted">MW gross output</div>
          </div>
          <div class="text-right">
            <div class="text-[20px] font-semibold leading-none text-accent-bright tnum">{num(capacityFactor, 1)}%</div>
            <div class="mt-1 text-[11px] text-ink-muted">capacity factor</div>
          </div>
        </div>

        <div class="mt-5">
          <div class="mb-1.5 flex justify-between font-mono text-[10px] text-ink-dim">
            <span>0</span>
            <span>10 MW</span>
            <span>20 MW</span>
          </div>
          <div class="h-3 overflow-hidden rounded-full border border-line bg-panel-2">
            <div class="h-full rounded-full bg-accent-bright shadow-[0_0_18px_rgba(79,155,238,0.45)]" style="width:{pctWidth(utilizationPct)}"></div>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-2 text-[11px]">
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-ink-dim">Remaining headroom</div>
            <div class="mt-1 font-mono text-[14px] font-semibold text-ink-strong">{num(Math.max(0, FIELD_NAMEPLATE_MW - $geoField.grossMw), 1)} MW</div>
          </div>
          <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div class="text-ink-dim">Nameplate</div>
            <div class="mt-1 font-mono text-[14px] font-semibold text-ink-strong">{FIELD_NAMEPLATE_MW} MW</div>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        <BarChart3 size={14} class="text-accent" /> Output by Production Well
      </div>
      <div class="space-y-3">
        {#each productionWells as w (w.id)}
          <div class="grid gap-1.5">
            <div class="flex items-center justify-between gap-3 text-[12px]">
              <div class="min-w-0">
                <span class="font-mono text-[11px] text-accent-bright">{w.id}</span>
                <span class="ml-2 text-ink-muted">{w.name}</span>
              </div>
              <div class="shrink-0 font-semibold text-ink-strong tnum">{num(w.output.mw, 1)} MW</div>
            </div>
            <div class="h-2.5 overflow-hidden rounded-full bg-panel-2">
              <div class="h-full rounded-full bg-accent-bright" style="width:{barWidth(w)}"></div>
            </div>
            <div class="flex justify-between text-[10px] text-ink-dim">
              <span>{num(w.output.steamTh, 1)} t/h steam</span>
              <span>{num(w.output.brineM3h, 1)} m³/h brine</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        <TrendingDown size={14} class="text-accent" /> 30-day production trend (indicative)
      </div>
      <MultiChart series={declineSeries} height={280} unit=" MW" digits={1} yMin={0} />
    </div>

    <div class="rounded-xl border border-line bg-panel p-3">
      <div class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Per-well Contribution</div>
      <div class="overflow-x-auto">
        <table class="w-full text-[12px]">
          <thead class="text-ink-dim">
            <tr class="border-b border-line">
              <th class="px-2 py-1.5 text-left font-medium">Well</th>
              <th class="px-2 py-1.5 text-left font-medium">Type</th>
              <th class="px-2 py-1.5 text-right font-medium">Steam t/h</th>
              <th class="px-2 py-1.5 text-right font-medium">MW</th>
              <th class="px-2 py-1.5 text-right font-medium">% Field MW</th>
            </tr>
          </thead>
          <tbody>
            {#each contributionRows as row (row.well.id)}
              <tr class="border-b border-line/60 hover:bg-panel-2/60">
                <td class="px-2 py-1.5">
                  <div class="font-mono text-[11px] text-accent-bright">{row.well.id}</div>
                  <div class="text-[10px] text-ink-dim">{row.well.name}</div>
                </td>
                <td class="px-2 py-1.5">
                  <span class="rounded-md border border-line bg-panel-2 px-2 py-0.5 text-[10px] font-semibold capitalize text-ink-muted">
                    {row.well.type}
                  </span>
                </td>
                <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(row.well.output.steamTh, 1)}</td>
                <td class="px-2 py-1.5 text-right font-semibold text-ink-strong tnum">{num(row.well.output.mw, 1)}</td>
                <td class="px-2 py-1.5 text-right font-semibold text-ink-muted tnum">{num(row.share, 1)}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
