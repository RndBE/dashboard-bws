<script lang="ts">
  import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
  import ArrowUpFromLine from '@lucide/svelte/icons/arrow-up-from-line';
  import Droplets from '@lucide/svelte/icons/droplets';

  import Panel from '../ui/Panel.svelte';
  import CctvPanel from '../cctv/CctvPanel.svelte';
  import KpiCard from '../ui/KpiCard.svelte';
  import Gauge from '../ui/Gauge.svelte';
  import LevelBar from '../ui/LevelBar.svelte';
  import Sparkline from '../ui/Sparkline.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import DamIcon from '../icons/DamIcon.svelte';
  import { data, openDetail } from '../../stores';
  import { STATUS } from '../../status';
  import { num } from '../../format';

  const d = $derived($data);
  const totVol = $derived(d.bendungan.reduce((s, b) => s + b.volume, 0));
  const totKap = $derived(d.bendungan.reduce((s, b) => s + b.kapasitas, 0));
  const totIn = $derived(d.bendungan.reduce((s, b) => s + b.inflow, 0));
  const totOut = $derived(d.bendungan.reduce((s, b) => s + b.outflow, 0));
</script>

<div class="flex flex-col gap-3">
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Tampungan total" value={num((totVol / totKap) * 100, 0)} unit="%" icon={DamIcon} accent>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{num(totVol, 1)} / {num(totKap, 0)} juta m³</span>{/snippet}
    </KpiCard>
    <KpiCard label="Inflow total" value={num(totIn, 0)} unit="m³/s" icon={ArrowDownToLine} />
    <KpiCard label="Outflow total" value={num(totOut, 0)} unit="m³/s" icon={ArrowUpFromLine} />
    <KpiCard label="Bendungan" value={String(d.bendungan.length)} unit="unit" icon={Droplets} />
  </div>

  <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
    {#each d.bendungan as b (b.id)}
      <button onclick={() => openDetail('bendungan', b.id)} class="text-left">
        <Panel title={b.name} subtitle="Sungai {b.river}" icon={DamIcon} class="h-full transition-colors hover:border-accent/40">
          {#snippet actions()}<StatusBadge status={b.status} size="xs" pulse={b.status !== 'normal'} />{/snippet}
          <div class="flex items-center gap-4">
            <Gauge value={(b.volume / b.kapasitas) * 100} label="Tampungan" sublabel="{num(b.volume, 1)} jt m³" size={92} color={STATUS[b.status].color} />
            <div class="flex-1 space-y-2.5">
              <div>
                <div class="mb-1 flex items-center justify-between text-[11px]">
                  <span class="text-ink-muted">Elevasi</span>
                  <span class="font-mono font-semibold text-ink-strong">{num(b.elevasi, 2)} mdpl</span>
                </div>
                <LevelBar
                  value={b.elevasi}
                  min={b.elevasiNormal - 3}
                  max={b.elevasiBanjir + 1}
                  color={STATUS[b.status].color}
                  markers={[
                    { value: b.elevasiNormal, color: STATUS.normal.color, label: 'Normal' },
                    { value: b.elevasiBanjir, color: STATUS.awas.color, label: 'Banjir' },
                  ]}
                />
              </div>
              <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div class="rounded-md bg-panel-2 px-2 py-1.5">
                  <div class="text-ink-dim">Inflow</div>
                  <div class="font-mono text-ink-strong">{num(b.inflow, 0)} m³/s</div>
                </div>
                <div class="rounded-md bg-panel-2 px-2 py-1.5">
                  <div class="text-ink-dim">Outflow</div>
                  <div class="font-mono text-ink-strong">{num(b.outflow, 0)} m³/s</div>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-3 border-t border-line-soft pt-2.5">
            <div class="mb-1 flex items-center justify-between text-[10px] text-ink-dim">
              <span>Elevasi 48 jam</span>
              <span>Pintu: {b.gates.filter((g) => g.opening > 0).length}/{b.gates.length} terbuka</span>
            </div>
            <Sparkline points={b.historyElevasi.map((x) => x.v)} color={STATUS[b.status].color} height={32} />
          </div>
        </Panel>
      </button>
    {/each}
  </div>

  <CctvPanel group="bendungan" />
</div>
