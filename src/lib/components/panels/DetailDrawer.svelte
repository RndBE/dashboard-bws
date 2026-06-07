<script lang="ts">
  import X from '@lucide/svelte/icons/x';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import type { Snippet } from 'svelte';
  import Panel from '../ui/Panel.svelte';
  import MiniChart from '../ui/MiniChart.svelte';
  import Gauge from '../ui/Gauge.svelte';
  import LevelBar from '../ui/LevelBar.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { data, selected, closeDetail, clock } from '../../stores';
  import { KIND_LABEL, POS_TIPE_LABEL, STATUS } from '../../status';
  import { irigasiRatio } from '../../data/derive';
  import { num, relTime, shortDateTime } from '../../format';
  import type {
    AsetOP,
    Bendungan,
    DaerahIrigasi,
    PosHidrologi,
    SumurPantau,
  } from '../../types';

  const asset = $derived.by(() => {
    const ref = $selected;
    if (!ref) return null;
    const d = $data;
    const found =
      ref.kind === 'pos'
        ? d.pos.find((x) => x.id === ref.id)
        : ref.kind === 'bendungan'
          ? d.bendungan.find((x) => x.id === ref.id)
          : ref.kind === 'irigasi'
            ? d.irigasi.find((x) => x.id === ref.id)
            : ref.kind === 'sumur'
              ? d.sumur.find((x) => x.id === ref.id)
              : d.op.find((x) => x.id === ref.id);
    return found ? { kind: ref.kind, item: found } : null;
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') closeDetail();
  }
</script>

<svelte:window onkeydown={onKey} />

{#snippet metric(label: string, value: string, unit = '')}
  <div class="rounded-lg border border-line bg-panel-2 px-3 py-2">
    <div class="text-[10px] uppercase tracking-wide text-ink-dim">{label}</div>
    <div class="mt-1 font-mono text-[16px] font-semibold text-ink-strong tnum">
      {value}<span class="ml-0.5 text-[10px] font-normal text-ink-muted">{unit}</span>
    </div>
  </div>
{/snippet}

{#if asset}
  {@const a = asset}
  <!-- backdrop -->
  <button
    class="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[2px]"
    onclick={closeDetail}
    aria-label="Tutup"
  ></button>

  <aside
    class="fixed inset-y-0 right-0 z-[1001] flex w-full max-w-[480px] flex-col border-l border-line bg-surface shadow-2xl"
    style="animation:bws-fade-up .3s cubic-bezier(.22,1,.36,1)"
  >
    <!-- header -->
    <header class="flex items-start gap-3 border-b border-line px-4 py-3.5">
      <div class="min-w-0 flex-1">
        <div class="text-[10px] font-semibold uppercase tracking-widest text-accent-bright">
          {KIND_LABEL[a.kind]}
        </div>
        <h2 class="mt-0.5 truncate text-[17px] font-semibold text-ink-strong">
          {a.item.name}
        </h2>
        <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-dim">
          <span class="flex items-center gap-1">
            <MapPin size={11} />
            {num(a.item.lat, 3)}, {num(a.item.lng, 3)}
          </span>
          <span
            >Pembaruan {relTime(
              'updatedAt' in a.item ? a.item.updatedAt : a.item.inspeksi,
              $clock,
            )}</span
          >
        </div>
      </div>
      <StatusBadge status={a.item.status} pulse={a.item.status !== 'normal'} />
      <button
        onclick={closeDetail}
        class="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-ink-muted hover:bg-panel hover:text-ink-strong"
      >
        <X size={16} />
      </button>
    </header>

    <div class="flex-1 space-y-3 overflow-y-auto p-4">
      {#if a.kind === 'pos'}
        {@const p = a.item as PosHidrologi}
        {@const extra = p.instruments.filter((i) => i.category !== 'health' && !i.primary)}
        <div class="grid grid-cols-3 gap-2">
          {@render metric(p.param.label, num(p.param.value, p.param.digits), p.param.unit)}
          {#if p.debit !== undefined}{@render metric('Debit', num(p.debit, 0), 'm³/s')}{/if}
          {#each extra.slice(0, p.debit !== undefined ? 1 : 2) as it (it.id)}
            {@render metric(it.type, num(it.value, it.valueDigits ?? 1), it.unit)}
          {/each}
        </div>
        <Panel title="{p.param.label} · 48 jam" subtitle={p.river ?? POS_TIPE_LABEL[p.tipe]}>
          <MiniChart
            points={p.history}
            color={p.tipe === 'hujan' ? '#c9a227' : '#4f9bee'}
            unit={p.param.unit}
            digits={p.param.digits}
            bars={p.tipe === 'hujan'}
            yMin={p.tipe === 'hujan' ? 0 : undefined}
            thresholds={p.thresholds
              ? [
                  { value: p.thresholds.waspada, color: STATUS.waspada.color, label: 'Waspada' },
                  { value: p.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
                  { value: p.thresholds.awas, color: STATUS.awas.color, label: 'Awas' },
                ]
              : []}
          />
        </Panel>
      {:else if a.kind === 'bendungan'}
        {@const b = a.item as Bendungan}
        <div class="grid grid-cols-3 gap-2">
          {@render metric('Elevasi', num(b.elevasi, 2), 'mdpl')}
          {@render metric('Inflow', num(b.inflow, 0), 'm³/s')}
          {@render metric('Outflow', num(b.outflow, 0), 'm³/s')}
        </div>
        <Panel title="Tampungan & Elevasi">
          <div class="flex items-center gap-4">
            <Gauge value={(b.volume / b.kapasitas) * 100} label="Tampungan" sublabel="{num(b.volume, 1)} jt m³" color="#4f9bee" />
            <div class="flex-1">
              <div class="mb-1 flex justify-between text-[11px]">
                <span class="text-ink-muted">Elevasi waduk</span>
                <span class="font-mono text-ink-strong">{num(b.elevasi, 2)} mdpl</span>
              </div>
              <LevelBar
                value={b.elevasi}
                min={b.elevasiNormal - 3}
                max={b.elevasiBanjir + 1}
                color={STATUS[b.status].color}
                markers={[
                  { value: b.elevasiNormal, color: STATUS.normal.color, label: 'Normal' },
                  { value: b.elevasiBanjir, color: STATUS.awas.color, label: 'M.A. Banjir' },
                ]}
              />
            </div>
          </div>
        </Panel>
        <Panel title="Elevasi Muka Air · 48 jam">
          <MiniChart
            points={b.historyElevasi}
            color="#4f9bee"
            unit="m"
            digits={2}
            thresholds={[
              { value: b.elevasiNormal, color: STATUS.normal.color, label: 'Normal' },
              { value: b.elevasiBanjir, color: STATUS.awas.color, label: 'M.A.B' },
            ]}
          />
        </Panel>
        <Panel title="Pintu Spillway">
          <div class="flex flex-wrap gap-2">
            {#each b.gates as g}
              <div class="flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-3 py-1.5">
                <span class="text-[11px] text-ink-muted">{g.id}</span>
                <span class="font-mono text-[13px] font-semibold {g.opening > 0 ? 'text-siaga' : 'text-ink-strong'}">{num(g.opening, 0)}%</span>
              </div>
            {/each}
          </div>
        </Panel>
      {:else if a.kind === 'irigasi'}
        {@const d = a.item as DaerahIrigasi}
        <div class="grid grid-cols-3 gap-2">
          {@render metric('Debit', num(d.debit, 1), 'm³/s')}
          {@render metric('Kebutuhan', num(d.kebutuhan, 1), 'm³/s')}
          {@render metric('Layanan', num(d.layanan, 0), 'ha')}
        </div>
        <Panel title="Pemenuhan Air & Layanan">
          <div class="flex items-center gap-4">
            <Gauge value={irigasiRatio(d) * 100} label="Pemenuhan" color={STATUS[d.status].color} />
            <div class="flex-1 space-y-2">
              <div>
                <div class="mb-1 flex justify-between text-[11px]"><span class="text-ink-muted">Luas terlayani</span><span class="font-mono text-ink-strong">{num((d.layanan / d.luas) * 100, 0)}%</span></div>
                <LevelBar value={d.layanan} min={0} max={d.luas} color="#3fb27f" />
              </div>
              <div class="text-[11px] text-ink-muted">Pola tanam: <span class="text-ink">{d.polaTanam}</span></div>
            </div>
          </div>
        </Panel>
        <Panel title="Debit Saluran · 48 jam">
          <MiniChart
            points={d.historyDebit}
            color="#4f9bee"
            unit="m³/s"
            digits={1}
            thresholds={[{ value: d.kebutuhan, color: STATUS.waspada.color, label: 'Kebutuhan' }]}
          />
        </Panel>
        <Panel title="Pintu Air">
          <div class="flex flex-wrap gap-2">
            {#each d.pintu as g}
              <div class="flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-3 py-1.5">
                <span class="text-[11px] text-ink-muted">{g.id}</span>
                <span class="font-mono text-[13px] font-semibold text-ink-strong">{num(g.opening, 0)}%</span>
              </div>
            {/each}
          </div>
        </Panel>
      {:else if a.kind === 'sumur'}
        {@const s = a.item as SumurPantau}
        <div class="grid grid-cols-3 gap-2">
          {@render metric('Muka air', num(s.muka, 2), 'm')}
          {@render metric('Baseline', num(s.baseline, 2), 'm')}
          {@render metric('Penurunan', num(s.muka - s.baseline, 2), 'm')}
        </div>
        <Panel title="Muka Air Tanah · 48 jam" subtitle="Kedalaman dari permukaan (m)">
          <MiniChart
            points={s.history}
            color="#c9a227"
            unit="m"
            digits={2}
            thresholds={[
              { value: s.baseline, color: STATUS.normal.color, label: 'Baseline' },
              { value: s.baseline + s.thresholds.siaga, color: STATUS.siaga.color, label: 'Siaga' },
              { value: s.baseline + s.thresholds.awas, color: STATUS.awas.color, label: 'Awas' },
            ]}
          />
        </Panel>
      {:else if a.kind === 'op'}
        {@const o = a.item as AsetOP}
        <div class="grid grid-cols-2 gap-2">
          {@render metric('Jenis', o.jenis)}
          {@render metric('Inspeksi terakhir', shortDateTime(o.inspeksi))}
        </div>
        <Panel title="Kondisi & Pemeliharaan">
          <div class="flex items-center gap-4">
            <Gauge value={o.kondisi} label="Kondisi" color={STATUS[o.status].color} />
            <div class="flex-1 space-y-1.5">
              <div class="flex justify-between text-[11px]"><span class="text-ink-muted">Progres pemeliharaan</span><span class="font-mono text-ink-strong">{num(o.progres, 0)}%</span></div>
              <LevelBar value={o.progres} min={0} max={100} color="#4f9bee" />
            </div>
          </div>
        </Panel>
      {/if}
    </div>
  </aside>
{/if}
