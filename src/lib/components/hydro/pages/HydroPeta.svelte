<script lang="ts">
  import Map from '@lucide/svelte/icons/map';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Radio from '@lucide/svelte/icons/radio';
  import Waves from '@lucide/svelte/icons/waves';
  import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
  import Wind from '@lucide/svelte/icons/wind';
  import FlaskConical from '@lucide/svelte/icons/flask-conical';
  import Droplet from '@lucide/svelte/icons/droplet';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Layers from '@lucide/svelte/icons/layers';

  import Panel from '../../ui/Panel.svelte';
  import KpiCard from '../../ui/KpiCard.svelte';
  import BasinMap from '../../map/BasinMap.svelte';

  import { markers, statusCounts, openDetail } from '../../../stores';
  import { STATUS, SIAGA_ORDER } from '../../../status';
  import { theme } from '../../../theme';
  import type { Component } from 'svelte';
  import type { MapMarker, Siaga } from '../../../types';

  // ---------- filter layer (jenis logger) ----------
  interface LayerDef {
    type: string;
    label: string;
    sub: string;
    icon: Component<any>;
    color: string;
  }
  const layers: LayerDef[] = [
    { type: 'AWLR', label: 'Duga Air', sub: 'AWLR', icon: Waves, color: '#4f9bee' },
    { type: 'ARR', label: 'Curah Hujan', sub: 'ARR', icon: CloudRainWind, color: '#c9a227' },
    { type: 'AWS', label: 'Klimatologi', sub: 'AWS', icon: Wind, color: '#38bdf8' },
    { type: 'AWQR', label: 'Kualitas Air', sub: 'AWQR', icon: FlaskConical, color: '#a78bfa' },
    { type: 'ASDR', label: 'Mata Air', sub: 'ASDR', icon: Droplet, color: '#3fb27f' },
  ];

  let hidden = $state<string[]>([]);

  function toggle(type: string) {
    hidden = hidden.includes(type)
      ? hidden.filter((t) => t !== type)
      : [...hidden, type];
  }

  // ---------- data ----------
  const counts = $derived($statusCounts);

  /** apakah penanda lolos filter instrumen aktif */
  function passInstr(m: MapMarker): boolean {
    if (!hidden.length) return true;
    return m.instrumentTypes.some((t) => !hidden.includes(t));
  }

  // hanya pos hidrologi yang lolos filter, diurut menurut keparahan lalu nama
  const posMarkers = $derived(
    $markers
      .filter((m) => m.kind === 'pos' && passInstr(m))
      .sort(
        (a, b) =>
          STATUS[b.status].weight - STATUS[a.status].weight ||
          a.name.localeCompare(b.name),
      ),
  );

  const totalPos = $derived($markers.filter((m) => m.kind === 'pos').length);
  const tampil = $derived(posMarkers.length);

  const kpis: { status: Siaga; icon: Component<any> }[] = [
    { status: 'normal', icon: Radio },
    { status: 'waspada', icon: TriangleAlert },
    { status: 'siaga', icon: TriangleAlert },
    { status: 'awas', icon: TriangleAlert },
  ];
</script>

<div class="flex flex-col gap-3">
  <p class="text-[12px] leading-relaxed text-ink-muted">
    Sebaran geografis <span class="text-ink-strong">seluruh stasiun telemetri hidrologi</span> —
    Pos Duga Air (AWLR), Curah Hujan (ARR), Klimatologi (AWS), Kualitas Air (AWQR), dan Mata Air
    (ASDR). Gunakan filter lapisan untuk menampilkan jenis logger tertentu; klik penanda atau baris
    untuk membuka detail stasiun.
  </p>

  <!-- KPI: rekap status -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {#each kpis as k}
      {@const meta = STATUS[k.status]}
      <KpiCard label={meta.label} value={String(counts[k.status])} unit="stasiun" icon={k.icon}>
        {#snippet footer()}
          <span class="flex items-center gap-1.5 text-[10px] text-ink-dim">
            <span class="h-1.5 w-1.5 rounded-full" style="background:{meta.color}"></span>
            {k.status === 'normal' ? 'beroperasi normal' : `level ${meta.label.toLowerCase()}`}
          </span>
        {/snippet}
      </KpiCard>
    {/each}
  </div>

  <!-- MAIN: peta + daftar -->
  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <!-- peta -->
    <div class="xl:col-span-2">
      <Panel title="Peta Sebaran Stasiun" subtitle="Klik penanda untuk membuka detail stasiun" icon={Map} flush>
        {#snippet actions()}
          <span class="hidden items-center gap-1.5 text-[10px] text-ink-dim sm:flex">
            <Layers size={12} />{tampil} tampil
          </span>
        {/snippet}

        <!-- filter lapisan -->
        <div class="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2.5">
          <span class="mr-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-dim">Lapisan</span>
          {#each layers as ly}
            {@const on = !hidden.includes(ly.type)}
            <button
              onclick={() => toggle(ly.type)}
              class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors {on
                ? 'border-line bg-surface text-ink-strong'
                : 'border-line-soft bg-transparent text-ink-dim line-through opacity-60 hover:opacity-90'}"
              title={ly.sub}
            >
              <span
                class="grid h-4 w-4 place-items-center rounded"
                style={on ? `color:${ly.color};background:${ly.color}1f` : 'color:var(--color-ink-dim)'}
              >
                <ly.icon size={11} strokeWidth={2} />
              </span>
              {ly.label}
            </button>
          {/each}
        </div>

        <!-- kontainer peta tinggi tetap -->
        <div class="h-[60vh] min-h-[460px] w-full overflow-hidden rounded-b-xl">
          <BasinMap
            hiddenKinds={['bendungan', 'irigasi', 'sumur', 'op']}
            hiddenInstruments={hidden}
            light={$theme === 'light'}
          />
        </div>
      </Panel>
    </div>

    <!-- daftar stasiun -->
    <Panel title="Daftar Stasiun" subtitle="{tampil} dari {totalPos} pos · diurut menurut status" icon={Radio} flush>
      <div class="max-h-[60vh] min-h-[460px] overflow-y-auto">
        {#if posMarkers.length === 0}
          <div class="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center">
            <Layers size={26} class="text-ink-dim" strokeWidth={1.6} />
            <p class="text-[12px] text-ink-muted">Tidak ada stasiun pada lapisan aktif</p>
            <p class="text-[10.5px] text-ink-dim">Aktifkan kembali lapisan di atas peta</p>
          </div>
        {:else}
          {#each posMarkers as m (m.id)}
            <button
              onclick={() => openDetail('pos', m.id)}
              class="flex w-full items-center gap-2.5 border-b border-line-soft px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
            >
              <span class="relative flex h-2 w-2 shrink-0">
                {#if m.status !== 'normal'}
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style="background:{STATUS[m.status].color}"></span>
                {/if}
                <span class="relative inline-flex h-2 w-2 rounded-full" style="background:{STATUS[m.status].color}"></span>
              </span>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[12px] font-medium text-ink-strong">{m.name}</div>
                <div class="flex items-center gap-1.5 text-[10px] text-ink-dim">
                  <span class="rounded bg-panel-2 px-1 py-px font-mono text-[9px] text-ink-muted">{m.instrumentTypes.join(' · ')}</span>
                  <span class="truncate">{m.primaryLabel}</span>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <div class="font-mono text-[12.5px] font-semibold tnum" style="color:{STATUS[m.status].color}">{m.primaryValue}</div>
                <div class="font-mono text-[9px] uppercase tracking-wide text-ink-dim">{STATUS[m.status].label}</div>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </Panel>
  </div>

  <!-- legenda + koordinat sebaran -->
  <Panel title="Legenda Status & Cakupan Jaringan" subtitle="Warna penanda mengikuti tingkat siaga stasiun" icon={MapPin}>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
        {#each SIAGA_ORDER as s}
          {@const meta = STATUS[s]}
          <span class="flex items-center gap-2 text-[11px] text-ink">
            <span class="h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ring-offset-panel" style="background:{meta.color};--tw-ring-color:{meta.color}55"></span>
            <span class="font-medium" style="color:{meta.color}">{meta.label}</span>
            <span class="font-mono text-[10px] text-ink-dim tnum">{counts[s]}</span>
          </span>
        {/each}
      </div>
      <div class="flex items-center gap-4 text-[11px] text-ink-muted">
        <span class="flex items-center gap-1.5"><Radio size={12} class="text-accent-bright" />{totalPos} pos hidrologi</span>
        <span class="flex items-center gap-1.5"><Layers size={12} class="text-accent-bright" />{layers.length - hidden.length}/{layers.length} lapisan aktif</span>
      </div>
    </div>
  </Panel>
</div>
