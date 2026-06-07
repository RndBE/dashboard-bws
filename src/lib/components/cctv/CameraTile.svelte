<script lang="ts">
  import VideoOff from '@lucide/svelte/icons/video-off';
  import { clock } from '../../stores';
  import { clockTime } from '../../format';
  import { camImage, type Camera } from '../../data/cameras';

  interface Props {
    cam: Camera;
    /** ukuran ringkas untuk videowall */
    compact?: boolean;
    /** isi penuh sel induk (alih-alih memaksa rasio 16:9) — utk grid wall */
    fill?: boolean;
  }
  let { cam, compact = false, fill = false }: Props = $props();
</script>

<div class="group relative overflow-hidden rounded-lg border border-line bg-black {fill ? 'h-full w-full' : 'aspect-video'}">
  {#if cam.online}
    <img
      src={camImage(cam)}
      alt={cam.name}
      loading="lazy"
      class="h-full w-full object-cover"
      style="filter:contrast(1.06) saturate(0.9) brightness(0.95)"
    />
    <!-- scanline + vignette -->
    <div
      class="pointer-events-none absolute inset-0"
      style="background:repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.07) 2px 3px); box-shadow:inset 0 0 60px rgba(0,0,0,0.55)"
    ></div>

    <!-- bar atas: nama + REC -->
    <div class="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent px-2 {compact ? 'py-1' : 'py-1.5'}">
      <span class="truncate {compact ? 'text-[9.5px]' : 'text-[10.5px]'} font-medium text-white/90">{cam.name}</span>
      <span class="flex shrink-0 items-center gap-1 text-[9px] font-semibold text-red-400">
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"></span>REC
      </span>
    </div>

    <!-- bar bawah: area + jam -->
    <div class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-2 {compact ? 'py-1' : 'py-1.5'} font-mono text-[9px] text-white/80 tnum">
      <span class="truncate">{cam.area}</span>
      <span class="shrink-0">{clockTime($clock)}</span>
    </div>
  {:else}
    <!-- layar mati / sinyal hilang -->
    <div
      class="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink-dim"
      style="background:#0b0f17; background-image:repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 6px, transparent 6px 12px)"
    >
      <VideoOff size={compact ? 16 : 22} strokeWidth={1.8} />
      <span class="text-[10px] font-semibold uppercase tracking-wide">Sinyal hilang</span>
      {#if !compact}<span class="px-2 text-center text-[9px] text-ink-dim/70">{cam.name}</span>{/if}
    </div>
  {/if}
</div>
