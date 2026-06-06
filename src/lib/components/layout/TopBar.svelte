<script lang="ts">
  import Pause from '@lucide/svelte/icons/pause';
  import Play from '@lucide/svelte/icons/play';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Emblem from './Emblem.svelte';
  import Clock from '../ui/Clock.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { mode, paused, overallStatus, activeAlerts } from '../../stores';
  import { BALAI_NAME, WS_NAME } from '../../data/seed';
</script>

<header
  class="flex items-center gap-4 border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur"
>
  <div class="flex items-center gap-3">
    <Emblem />
    <div class="leading-tight">
      <h1 class="text-[14px] font-semibold tracking-tight text-ink-strong">
        Pusat Kendali <span class="text-accent-bright">·</span>
        {BALAI_NAME}
      </h1>
      <p class="text-[11px] text-ink-muted">{WS_NAME}</p>
    </div>
  </div>

  <div class="ml-2 hidden items-center gap-2 md:flex">
    <StatusBadge status={$overallStatus} pulse={$overallStatus !== 'normal'} />
    <span class="text-[11px] text-ink-dim">
      {$activeAlerts.length} peringatan aktif
    </span>
  </div>

  <div class="ml-auto flex items-center gap-3">
    <span class="hidden items-center gap-1.5 lg:flex">
      <span class="relative flex h-2 w-2">
        <span
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-normal opacity-75"
        ></span>
        <span class="relative inline-flex h-2 w-2 rounded-full bg-normal"></span>
      </span>
      <span class="text-[10px] font-semibold uppercase tracking-widest text-normal"
        >Live</span
      >
    </span>

    <Clock variant="full" />

    <button
      onclick={() => paused.update((p) => !p)}
      title={$paused ? 'Lanjutkan simulasi' : 'Jeda simulasi'}
      class="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-panel hover:text-ink-strong"
    >
      {#if $paused}<Play size={14} />{:else}<Pause size={14} />{/if}
    </button>

    <!-- Mode toggle -->
    <div class="flex items-center rounded-lg border border-line bg-panel-2 p-0.5">
      <button
        onclick={() => mode.set('dashboard')}
        class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors {$mode ===
        'dashboard'
          ? 'bg-accent/20 text-accent-bright'
          : 'text-ink-muted hover:text-ink'}"
      >
        <LayoutDashboard size={13} /> Interaktif
      </button>
      <button
        onclick={() => mode.set('wall')}
        class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors {$mode ===
        'wall'
          ? 'bg-accent/20 text-accent-bright'
          : 'text-ink-muted hover:text-ink'}"
      >
        <Monitor size={13} /> Layar Dinding
      </button>
    </div>
  </div>
</header>
