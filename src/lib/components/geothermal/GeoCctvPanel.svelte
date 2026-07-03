<script lang="ts">
  import Maximize2 from '@lucide/svelte/icons/maximize-2';
  import VideoOff from '@lucide/svelte/icons/video-off';
  import { camImage } from '../../data/cameras';
  import { GEO_CAMERAS } from '../../geothermal/seed.js';
</script>

<div class="flex h-full flex-col rounded-xl border border-line bg-panel p-2.5">
  <div class="mb-2 flex items-center justify-between px-0.5">
    <div class="text-[10px] font-bold uppercase tracking-wide text-ink-strong">CCTV Monitoring</div>
    <span class="flex items-center gap-1 text-[9px] font-semibold text-normal"><span class="h-1.5 w-1.5 rounded-full bg-normal"></span>Live</span>
  </div>
  <div class="flex min-h-0 flex-1 flex-col gap-2">
    {#each GEO_CAMERAS as cam (cam.id)}
      <div class="group relative min-h-0 flex-1 overflow-hidden rounded-md border border-line/80 bg-black">
        {#if cam.online}
          <img
            src={camImage(cam)}
            alt={cam.name}
            loading="lazy"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            style="filter:contrast(1.08) saturate(0.9) brightness(0.92)"
          />
          <div
            class="pointer-events-none absolute inset-0"
            style="background:repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.08) 2px 3px); box-shadow:inset 0 0 46px rgba(0,0,0,0.52)"
          ></div>
          <div class="absolute left-1.5 top-1.5 max-w-[calc(100%-38px)] rounded bg-black/70 px-1.5 py-1 text-[8.5px] font-bold uppercase leading-none tracking-wide text-white/90">
            {cam.name.replace(/\s+\u2014\s+/, ' - ')}
          </div>
          <button class="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded bg-black/70 text-white/85 transition-colors hover:bg-black hover:text-white" aria-label={`Open ${cam.name}`}>
            <Maximize2 size={12} strokeWidth={2.2} />
          </button>
        {:else}
          <div class="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink-dim">
            <VideoOff size={18} strokeWidth={1.8} />
            <span class="text-[9px] font-semibold uppercase tracking-wide">Signal lost</span>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
