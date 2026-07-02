<script lang="ts">
  import CameraTile from '../cctv/CameraTile.svelte';
  import { GEO_CAMERAS } from '../../geothermal/seed.js';
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">CCTV Monitoring</div>
    <span class="flex items-center gap-1 text-[10px] font-semibold text-normal"><span class="h-1.5 w-1.5 rounded-full bg-normal"></span>Live</span>
  </div>
  <div class="grid grid-cols-2 gap-2">
    {#each GEO_CAMERAS as cam (cam.id)}<CameraTile {cam} compact />{/each}
  </div>
</div>
