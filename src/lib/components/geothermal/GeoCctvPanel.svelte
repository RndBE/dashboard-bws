<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import Copy from '@lucide/svelte/icons/copy';
  import Grid2X2 from '@lucide/svelte/icons/grid-2x2';
import Maximize2 from '@lucide/svelte/icons/maximize-2';
import MonitorPlay from '@lucide/svelte/icons/monitor-play';
import Play from '@lucide/svelte/icons/play';
import Radio from '@lucide/svelte/icons/radio';
import Search from '@lucide/svelte/icons/search';
import Settings from '@lucide/svelte/icons/settings';
import SkipBack from '@lucide/svelte/icons/skip-back';
import Square from '@lucide/svelte/icons/square';
import VideoOff from '@lucide/svelte/icons/video-off';
  import Wifi from '@lucide/svelte/icons/wifi';
  import CameraTile from '../cctv/CameraTile.svelte';
  import { camStream, type Camera, type CamStream } from '../../data/cameras';
  import { GEO_CAMERAS } from '../../geothermal/seed.js';

  interface Props {
    expanded?: boolean;
  }

  let { expanded = false }: Props = $props();

  const cams = GEO_CAMERAS as Camera[];
  const total = cams.length;
  const onlineCount = cams.filter((c) => c.online).length;
  const offlineCount = total - onlineCount;
  const timelineBlocks = Array.from({ length: 36 }, (_, i) => i);
  const nvrEvents = [
    { time: '13:08:21', level: 'motion', label: 'Motion detected near separator', cam: 'CAM 2' },
    { time: '13:05:44', level: 'system', label: 'Bitrate stabilized at 4.2 Mbps', cam: 'CAM 1' },
    { time: '13:02:17', level: 'record', label: 'Archive segment closed', cam: 'CAM 4' },
    { time: '12:58:03', level: 'operator', label: 'Operator opened V-Notch view', cam: 'CAM 3' },
  ];

  let selectedId = $state<string>(cams.find((c) => c.online)?.id ?? cams[0]?.id ?? '');

  const selected = $derived<Camera | undefined>(
    cams.find((c) => c.id === selectedId) ?? cams.find((c) => c.online) ?? cams[0],
  );
  const stream = $derived<CamStream | undefined>(selected ? camStream(selected) : undefined);

  function select(cam: Camera): void {
    selectedId = cam.id;
  }

  function copyRtsp(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard && stream) {
      navigator.clipboard.writeText(stream.rtsp);
    }
  }
</script>

{#if expanded}
  <div class="flex h-full min-h-[640px] flex-col overflow-hidden bg-[#05070c] text-[12px] text-ink">
    <header class="flex h-12 shrink-0 items-center justify-between border-b border-[#20283a] bg-[#101722] px-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded border border-[#2c3f5d] bg-[#162234] text-accent-bright">
          <MonitorPlay size={16} />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[12px] font-semibold uppercase tracking-wide text-ink-strong">Geothermal NVR</span>
            <span class="rounded border border-normal/35 bg-normal/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-normal">Recording</span>
          </div>
          <div class="truncate font-mono text-[10px] text-ink-dim">WELLPAD-NVR-01 · Live View · {total} channel · H.265 main stream</div>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <button class="hidden h-7 items-center gap-1 rounded border border-[#263247] bg-[#141c2a] px-2 text-[10px] font-semibold text-ink-muted md:flex">
          <Grid2X2 size={12} /> 2x2
        </button>
        <button class="hidden h-7 items-center gap-1 rounded border border-[#263247] bg-[#141c2a] px-2 text-[10px] font-semibold text-ink-muted md:flex">
          <CircleDot size={12} /> Patrol
        </button>
        <button class="grid h-7 w-7 place-items-center rounded border border-[#263247] bg-[#141c2a] text-ink-muted">
          <Settings size={13} />
        </button>
      </div>
    </header>

    <div class="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[230px_minmax(0,1fr)_320px]">
      <aside class="hidden min-h-0 border-r border-[#20283a] bg-[#0c121d] xl:flex xl:flex-col">
        <div class="border-b border-[#20283a] p-2">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Device Tree</span>
            <span class="font-mono text-[10px] text-normal">{onlineCount}/{total}</span>
          </div>
          <div class="flex h-7 items-center gap-1.5 rounded border border-[#263247] bg-[#080d15] px-2 text-ink-dim">
            <Search size={12} />
            <span class="text-[10px]">Search camera</span>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <div class="mb-1 flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
            <ChevronDown size={13} /> Well Pad Group
          </div>
          <div class="space-y-1">
            {#each cams as cam, i (cam.id)}
              {@const active = selected?.id === cam.id}
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors {active
                  ? 'bg-accent/15 text-ink-strong'
                  : 'text-ink-muted hover:bg-[#141c2a] hover:text-ink'}"
                onclick={() => select(cam)}
              >
                <span class="grid h-5 w-5 shrink-0 place-items-center rounded border border-[#263247] bg-[#111827] font-mono text-[9px] text-accent-bright">{i + 1}</span>
                <span class="min-w-0 flex-1 truncate text-[11px]">{cam.name.replace(/\s+\u2014\s+/, ' - ')}</span>
                <span class="h-1.5 w-1.5 shrink-0 rounded-full {cam.online ? 'bg-normal' : 'bg-awas'}"></span>
              </button>
            {/each}
          </div>
        </div>

        <div class="border-t border-[#20283a] p-2">
          <div class="grid grid-cols-2 gap-1.5">
            <div class="rounded border border-[#263247] bg-[#111827] p-2">
              <div class="text-[9px] uppercase text-ink-dim">Online</div>
              <div class="mt-1 font-mono text-[18px] font-semibold text-normal">{onlineCount}</div>
            </div>
            <div class="rounded border border-[#263247] bg-[#111827] p-2">
              <div class="text-[9px] uppercase text-ink-dim">Lost</div>
              <div class="mt-1 font-mono text-[18px] font-semibold {offlineCount ? 'text-awas' : 'text-ink-strong'}">{offlineCount}</div>
            </div>
          </div>
        </div>
      </aside>

      <section class="flex min-h-0 flex-col bg-[#05070c]">
        <div class="flex h-9 shrink-0 items-center justify-between border-b border-[#20283a] bg-[#0b1018] px-2">
          <div class="flex items-center gap-1.5">
            <span class="rounded border border-accent/35 bg-accent/12 px-2 py-1 text-[10px] font-semibold text-accent-bright">Live View</span>
            <span class="hidden rounded border border-[#263247] bg-[#111827] px-2 py-1 text-[10px] font-semibold text-ink-muted sm:inline">Playback</span>
            <span class="hidden rounded border border-[#263247] bg-[#111827] px-2 py-1 text-[10px] font-semibold text-ink-muted sm:inline">Event Search</span>
          </div>
          <div class="flex items-center gap-2 font-mono text-[10px] text-ink-dim">
            <span class="hidden sm:inline">2026-07-03 13:21:00</span>
            <span class="text-normal">REC</span>
          </div>
        </div>

        <div class="grid min-h-0 flex-1 grid-cols-1 gap-[3px] bg-[#101722] p-[3px] md:grid-cols-2 md:grid-rows-2">
          {#each cams as cam, i (cam.id)}
            {@const active = selected?.id === cam.id}
            <button
              type="button"
              class="group relative min-h-[200px] overflow-hidden bg-black text-left outline-none transition-colors md:min-h-0 {active
                ? 'ring-2 ring-accent'
                : 'ring-1 ring-[#1d2636] hover:ring-accent/55'}"
              onclick={() => select(cam)}
              aria-label={`Select ${cam.name}`}
            >
              <CameraTile {cam} fill />

              <div class="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
                <span class="rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white/90">CH{i + 1}</span>
                <span class="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase {cam.online ? 'text-normal' : 'text-awas'}">
                  {cam.online ? 'Live' : 'Video Lost'}
                </span>
              </div>

              <div class="pointer-events-none absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <span class="grid h-6 w-6 place-items-center rounded bg-black/70 text-white/85">
                  <Maximize2 size={13} strokeWidth={2.2} />
                </span>
              </div>

              <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 via-black/46 to-transparent px-2 pb-2 pt-8">
                <div class="flex items-end justify-between gap-2">
                  <div class="min-w-0">
                    <div class="truncate text-[12px] font-semibold text-white/95">{cam.name}</div>
                    <div class="mt-0.5 truncate text-[10px] text-white/60">{cam.area} · {cam.ip ?? '0.0.0.0'}</div>
                  </div>
                  {#if active}
                    <span class="rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#06101e]">Selected</span>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>

        <div class="shrink-0 border-t border-[#20283a] bg-[#0b1018]">
          <div class="flex h-9 items-center justify-between px-2">
            <div class="flex items-center gap-1.5">
              <button class="grid h-6 w-6 place-items-center rounded border border-[#263247] bg-[#141c2a] text-ink-muted" aria-label="Previous segment">
                <SkipBack size={12} />
              </button>
              <button class="grid h-6 w-6 place-items-center rounded border border-[#263247] bg-[#141c2a] text-ink-muted" aria-label="Play">
                <Play size={12} />
              </button>
              <button class="grid h-6 w-6 place-items-center rounded border border-[#263247] bg-[#141c2a] text-ink-muted" aria-label="Stop">
                <Square size={11} />
              </button>
              <span class="ml-1 font-mono text-[10px] text-ink-dim">Live timeline</span>
            </div>
            <div class="hidden items-center gap-2 font-mono text-[10px] text-ink-dim sm:flex">
              <span>12:00</span><span>13:00</span><span>14:00</span>
            </div>
          </div>
          <div class="grid h-7 grid-cols-[repeat(36,minmax(0,1fr))] gap-px border-t border-[#20283a] bg-[#05070c] px-2 py-1">
            {#each timelineBlocks as block}
              <div class="rounded-sm {block % 9 === 0 ? 'bg-waspada/80' : block % 5 === 0 ? 'bg-accent/80' : 'bg-normal/55'}"></div>
            {/each}
          </div>
        </div>
      </section>

      <aside class="hidden min-h-0 border-l border-[#20283a] bg-[#0c121d] xl:flex xl:flex-col">
        <div class="border-b border-[#20283a] p-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Channel Inspector</div>
            <span class="inline-flex items-center gap-1 text-[10px] font-semibold {selected?.online ? 'text-normal' : 'text-awas'}">
              <span class="h-1.5 w-1.5 rounded-full {selected?.online ? 'bg-normal' : 'bg-awas'}"></span>
              {selected?.online ? 'Online' : 'Offline'}
            </span>
          </div>
          {#if selected && stream}
            <div class="aspect-video overflow-hidden rounded border border-[#263247] bg-black">
              <CameraTile cam={selected} compact fill />
            </div>
            <dl class="mt-3 grid gap-2 text-[11px]">
              <div class="flex items-center justify-between gap-2">
                <dt class="text-ink-dim">Name</dt>
                <dd class="truncate font-semibold text-ink-strong">{selected.name}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-ink-dim">Area</dt>
                <dd class="truncate text-ink-muted">{selected.area}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-ink-dim">IP</dt>
                <dd class="font-mono text-ink-strong">{stream.ip}<span class="text-ink-dim">:{stream.port}</span></dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-ink-dim">Codec</dt>
                <dd class="font-mono text-ink-muted">{stream.codec}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-ink-dim">Vendor</dt>
                <dd class="truncate text-ink-muted">{selected.vendor ?? '—'}</dd>
              </div>
            </dl>
            <button
              type="button"
              class="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-accent/30 bg-accent/15 px-3 py-2 text-[11px] font-semibold text-accent-bright transition-colors hover:bg-accent/25"
              onclick={copyRtsp}
            >
              <Copy size={13} /> Copy RTSP
            </button>
          {/if}
        </div>

        <div class="grid grid-cols-2 gap-2 border-b border-[#20283a] p-3">
          <div class="rounded border border-[#263247] bg-[#111827] p-2">
            <div class="flex items-center gap-1 text-[9px] uppercase text-ink-dim"><Wifi size={11} /> Network</div>
            <div class="mt-1 font-mono text-[18px] font-semibold text-normal">98%</div>
          </div>
          <div class="rounded border border-[#263247] bg-[#111827] p-2">
            <div class="flex items-center gap-1 text-[9px] uppercase text-ink-dim"><Radio size={11} /> Archive</div>
            <div class="mt-1 font-mono text-[18px] font-semibold text-ink-strong">18d</div>
          </div>
        </div>

        {#if stream}
          <div class="border-b border-[#20283a] p-3">
            <div class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Stream URL</div>
            <div class="break-all rounded border border-[#263247] bg-[#080d15] px-2 py-1.5 font-mono text-[10px] text-accent-bright">{stream.rtsp}</div>
            <div class="mt-2 break-all rounded border border-[#263247] bg-[#080d15] px-2 py-1.5 font-mono text-[10px] text-ink-muted">{stream.hls}</div>
          </div>
        {/if}

        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <div class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Event List</div>
          <div class="space-y-2">
            {#each nvrEvents as item}
              <div class="rounded border border-[#263247] bg-[#111827] px-2 py-1.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-[10px] text-ink-dim">{item.time}</span>
                  <span class="font-mono text-[9px] text-accent-bright">{item.cam}</span>
                </div>
                <div class="mt-0.5 truncate text-[11px] text-ink-muted">{item.label}</div>
              </div>
            {/each}
          </div>
        </div>
      </aside>
    </div>
  </div>
{:else}
  <div class="flex h-full flex-col rounded-xl border border-line bg-panel p-2.5">
    <div class="mb-2 flex items-center justify-between px-0.5">
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wide text-ink-strong">CCTV Monitoring</div>
        <div class="text-[9px] text-ink-dim">{onlineCount}/{total} cameras online</div>
      </div>
      <span class="flex items-center gap-1 text-[9px] font-semibold text-normal"><span class="h-1.5 w-1.5 animate-pulse rounded-full bg-normal"></span>Live</span>
    </div>
    <div class="flex min-h-0 flex-1 flex-col gap-2">
      {#each cams as cam (cam.id)}
        {@const active = selected?.id === cam.id}
        <button
          type="button"
          class="group relative min-h-[86px] flex-1 overflow-hidden rounded-lg border bg-black text-left transition-colors {active
            ? 'border-accent/60 ring-1 ring-accent/30'
            : 'border-line/80 hover:border-accent/35'}"
          onclick={() => select(cam)}
          aria-label={`Select ${cam.name}`}
        >
          <CameraTile {cam} compact fill />
          <div class="pointer-events-none absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded bg-black/70 text-white/85 opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 size={12} strokeWidth={2.2} />
          </div>
          {#if active}
            <div class="pointer-events-none absolute left-1.5 top-1.5 rounded bg-accent/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#06101e]">
              Active
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
{/if}
