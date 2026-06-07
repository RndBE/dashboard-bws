<script lang="ts">
  import Pause from '@lucide/svelte/icons/pause';
  import Play from '@lucide/svelte/icons/play';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Monitor from '@lucide/svelte/icons/monitor';
  import UserRound from '@lucide/svelte/icons/user-round';
  import LogOut from '@lucide/svelte/icons/log-out';
  import Logo from './Logo.svelte';
  import Clock from '../ui/Clock.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { mode, paused, overallStatus, activeAlerts } from '../../stores';
  import { auth, requestLogout } from '../../auth';
  import { BALAI_NAME } from '../../data/seed';
</script>

<header class="border-b border-line bg-surface/90 backdrop-blur">
  <div
    class="mx-auto flex w-full max-w-[1700px] items-center gap-4 px-3 py-2.5 sm:px-4"
  >
  <div class="flex items-center gap-3">
    <Logo height={26} />
    <div class="leading-tight">
      <div class="text-[9px] font-semibold uppercase tracking-[0.26em] text-pu-bright">
        Pusat Kendali Operasi
      </div>
      <h1 class="text-[15px] font-semibold tracking-tight text-ink-strong">{BALAI_NAME}</h1>
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

    <!-- Identitas pengguna + keluar -->
    <div class="flex items-center gap-2 border-l border-line pl-3">
      <div class="hidden text-right leading-tight sm:block">
        <div class="text-[11.5px] font-medium text-ink-strong">{$auth?.name ?? ''}</div>
        <div class="text-[9.5px] text-ink-dim">{$auth?.role ?? ''}</div>
      </div>
      <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-panel-2 text-ink-muted">
        <UserRound size={15} />
      </span>
      <button
        onclick={requestLogout}
        title="Keluar"
        class="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:border-awas/50 hover:bg-awas/10 hover:text-awas"
      >
        <LogOut size={14} />
      </button>
    </div>
  </div>
  </div>
</header>
