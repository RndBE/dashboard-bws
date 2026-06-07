<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Cctv from '@lucide/svelte/icons/cctv';
  import { paused } from '../../stores';
  import { CAMERAS } from '../../data/cameras';
  import CameraTile from './CameraTile.svelte';

  const PER_PAGE = 4;
  let idx = $state(0);

  // jendela 4 kamera, berputar (wrap-around) tiap 8 detik
  const view = $derived(
    Array.from({ length: PER_PAGE }, (_, i) => CAMERAS[(idx + i) % CAMERAS.length]),
  );
  const onlineCount = CAMERAS.filter((c) => c.online).length;

  onMount(() => {
    const t = setInterval(() => {
      if (!get(paused)) idx = (idx + PER_PAGE) % CAMERAS.length;
    }, 8000);
    return () => clearInterval(t);
  });
</script>

<section class="glass hud-bracket flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
  <div class="flex items-center gap-2 border-b border-line/50 px-3 py-2">
    <Cctv size={13} class="text-accent-bright" strokeWidth={2} />
    <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">CCTV</span>
    <span class="ml-auto flex items-center gap-1.5 text-[9.5px] font-medium text-normal">
      <span class="h-1.5 w-1.5 rounded-full bg-normal"></span>{onlineCount}/{CAMERAS.length} online
    </span>
  </div>
  <div class="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5 p-2">
    {#each view as cam (cam.id)}
      <CameraTile {cam} compact fill />
    {/each}
  </div>
</section>
