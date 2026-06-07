<script lang="ts">
  import Layers from '@lucide/svelte/icons/layers';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import { SIAGA_ORDER, STATUS, KIND_LABEL } from '../../status';
  import type { AssetKind, MapMarker } from '../../types';

  interface Props {
    markers: MapMarker[];
    hiddenKinds: AssetKind[];
    hiddenInstruments: string[];
    toggleKind: (k: AssetKind) => void;
    toggleInstrument: (t: string) => void;
    reset: () => void;
  }
  let {
    markers,
    hiddenKinds,
    hiddenInstruments,
    toggleKind,
    toggleInstrument,
    reset,
  }: Props = $props();

  let open = $state(false);

  const KIND_ORDER: AssetKind[] = ['pos', 'bendungan', 'irigasi', 'sumur', 'op'];
  // urutan tampil instrumen (yang tak terdaftar menyusul, alfabetis)
  const INSTR_ORDER = [
    'AWLR',
    'ARR',
    'AWS',
    'AWQR',
    'Piezometer',
    'V-Notch',
    'Inklinometer',
    'Sensor Pintu',
    'Sensor Kondisi',
    'CCTV',
  ];

  const kindRows = $derived(
    KIND_ORDER.map((k) => ({
      key: k,
      label: KIND_LABEL[k],
      count: markers.filter((m) => m.kind === k).length,
    })).filter((r) => r.count > 0),
  );

  const instrRows = $derived.by(() => {
    const types = new Set<string>();
    for (const m of markers) for (const t of m.instrumentTypes) types.add(t);
    return [...types]
      .sort((a, b) => {
        const ia = INSTR_ORDER.indexOf(a);
        const ib = INSTR_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
      })
      .map((t) => ({
        type: t,
        count: markers.filter((m) => m.instrumentTypes.includes(t)).length,
      }));
  });

  const filterCount = $derived(hiddenKinds.length + hiddenInstruments.length);
</script>

<div class="pointer-events-auto absolute left-[324px] top-[88px] z-[615]">
  {#if !open}
    <button
      onclick={() => (open = true)}
      title="Buka legenda & kontrol layer"
      class="glass flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium text-ink-muted shadow-lg transition-colors hover:text-ink-strong"
    >
      <Layers size={14} class="text-accent-bright" strokeWidth={2} />
      Layer & Legenda
      {#if filterCount > 0}
        <span
          class="rounded-full bg-accent/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-accent-bright tnum"
          >{filterCount} filter</span
        >
      {/if}
    </button>
  {:else}
    <div class="glass-strong hud-bracket w-[280px] overflow-hidden rounded-xl shadow-xl">
      <div class="glass-sheen"></div>

      <!-- header -->
      <div class="flex items-center gap-2 border-b border-line/50 px-3 py-2">
        <Layers size={13} class="text-accent-bright" strokeWidth={2} />
        <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted"
          >Layer & Legenda</span
        >
        <div class="ml-auto flex items-center gap-1">
          {#if filterCount > 0}
            <button
              onclick={reset}
              title="Tampilkan semua"
              class="grid h-6 w-6 place-items-center rounded-md text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink-strong"
            >
              <RotateCcw size={12} />
            </button>
          {/if}
          <button
            onclick={() => (open = false)}
            title="Tutup"
            class="grid h-6 w-6 place-items-center rounded-md text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink-strong"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div class="max-h-[58vh] space-y-3 overflow-y-auto p-3">
        <!-- legenda status -->
        <section>
          <div class="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-dim">
            Status
          </div>
          <div class="grid grid-cols-2 gap-x-3 gap-y-1">
            {#each SIAGA_ORDER as s}
              <div class="flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full" style="background:{STATUS[s].color}"></span>
                <span class="text-[11px] text-ink-muted">{STATUS[s].label}</span>
              </div>
            {/each}
          </div>
        </section>

        <!-- layer: jenis aset -->
        <section>
          <div class="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-dim">
            Jenis Aset
          </div>
          <div class="flex flex-col gap-0.5">
            {#each kindRows as row (row.key)}
              {@const on = !hiddenKinds.includes(row.key)}
              <button
                onclick={() => toggleKind(row.key)}
                class="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.05]"
              >
                <span
                  class="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] border transition-colors {on
                    ? 'border-accent bg-accent/25 text-accent-bright'
                    : 'border-line text-transparent'}"
                >
                  <Check size={10} strokeWidth={3} />
                </span>
                <span
                  class="flex-1 text-left text-[11.5px] {on
                    ? 'text-ink'
                    : 'text-ink-dim line-through'}">{row.label}</span
                >
                <span
                  class="font-mono text-[10px] tnum {on ? 'text-ink-muted' : 'text-ink-dim'}"
                  >{row.count}</span
                >
              </button>
            {/each}
          </div>
        </section>

        <!-- filter: instrumen / alat -->
        <section>
          <div class="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-dim">
            Instrumen / Alat
          </div>
          <div class="flex flex-col gap-0.5">
            {#each instrRows as row (row.type)}
              {@const on = !hiddenInstruments.includes(row.type)}
              <button
                onclick={() => toggleInstrument(row.type)}
                class="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.05]"
              >
                <span
                  class="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] border transition-colors {on
                    ? 'border-accent bg-accent/25 text-accent-bright'
                    : 'border-line text-transparent'}"
                >
                  <Check size={10} strokeWidth={3} />
                </span>
                <span
                  class="flex-1 text-left text-[11.5px] {on
                    ? 'text-ink'
                    : 'text-ink-dim line-through'}">{row.type}</span
                >
                <span
                  class="font-mono text-[10px] tnum {on ? 'text-ink-muted' : 'text-ink-dim'}"
                  >{row.count}</span
                >
              </button>
            {/each}
          </div>
        </section>
      </div>
    </div>
  {/if}
</div>
