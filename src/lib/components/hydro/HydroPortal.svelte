<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Pause from '@lucide/svelte/icons/pause';
  import Play from '@lucide/svelte/icons/play';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import Droplets from '@lucide/svelte/icons/droplets';
  import Radio from '@lucide/svelte/icons/radio';

  import Clock from '../ui/Clock.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import AssetDetailPage from '../views/AssetDetailPage.svelte';
  import { HYDRO_NAV } from '../../config/hydroNav';
  import {
    hydroSection,
    exitHydro,
    paused,
    overallStatus,
    statusCounts,
    hydroAlerts,
    selected,
    data,
  } from '../../stores';
  import { theme, toggleTheme } from '../../theme';
  import type { HydroSection } from '../../types';

  import HydroBeranda from './pages/HydroBeranda.svelte';
  import HydroPda from './pages/HydroPda.svelte';
  import HydroDebit from './pages/HydroDebit.svelte';
  import HydroPch from './pages/HydroPch.svelte';
  import HydroKualitas from './pages/HydroKualitas.svelte';
  import HydroMataAir from './pages/HydroMataAir.svelte';
  import HydroCctv from './pages/HydroCctv.svelte';
  import HydroPeta from './pages/HydroPeta.svelte';
  import HydroAnalisa from './pages/HydroAnalisa.svelte';

  const PAGES: Record<HydroSection, any> = {
    beranda: HydroBeranda,
    pda: HydroPda,
    debit: HydroDebit,
    pch: HydroPch,
    kualitas: HydroKualitas,
    'mata-air': HydroMataAir,
    cctv: HydroCctv,
    peta: HydroPeta,
    analisa: HydroAnalisa,
  };

  const Current = $derived(PAGES[$hydroSection]);
  const active = $derived(HYDRO_NAV.find((n) => n.key === $hydroSection) ?? HYDRO_NAV[0]);
  const posCount = $derived($data.pos.length);

  function go(key: HydroSection) {
    hydroSection.set(key);
  }
</script>

<div
  class="flex h-screen flex-col overflow-hidden {$theme === 'light' ? 'theme-light' : ''}"
>
  <!-- ============ HEADER PORTAL ============ -->
  <header class="z-20 border-b border-line bg-surface/95 backdrop-blur">
    <div class="flex items-center gap-3 px-3 py-2.5 sm:px-4">
      <button
        onclick={exitHydro}
        class="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink-muted transition-colors hover:border-accent/40 hover:bg-panel hover:text-ink-strong"
        title="Kembali ke Pusat Kendali"
      >
        <ArrowLeft size={14} /><span class="hidden sm:inline">Dashboard</span>
      </button>

      <div class="flex min-w-0 items-center gap-2.5">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent-bright">
          <Droplets size={18} />
        </span>
        <div class="min-w-0 leading-tight">
          <div class="hidden truncate text-[9px] font-semibold uppercase tracking-[0.24em] text-accent-bright sm:block">
            Portal Hidrologi &amp; Telemetri
          </div>
          <h1 class="truncate text-[13.5px] font-semibold tracking-tight text-ink-strong sm:text-[15px]">
            Sub-Sistem Pemantauan Sumber Daya Air
          </h1>
        </div>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <div class="hidden items-center gap-2 md:flex">
          <StatusBadge status={$overallStatus} pulse={$overallStatus !== 'normal'} />
          <span class="text-[11px] text-ink-dim">
            {$hydroAlerts.length} peringatan · {posCount} stasiun
          </span>
        </div>

        <span class="hidden items-center gap-1.5 lg:flex">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-normal opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-normal"></span>
          </span>
          <span class="text-[10px] font-semibold uppercase tracking-widest text-normal">Live</span>
        </span>

        <div class="hidden md:block"><Clock variant="full" /></div>

        <button
          onclick={() => paused.update((p) => !p)}
          title={$paused ? 'Lanjutkan' : 'Jeda'}
          class="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-panel hover:text-ink-strong"
        >
          {#if $paused}<Play size={14} />{:else}<Pause size={14} />{/if}
        </button>
        <button
          onclick={toggleTheme}
          title={$theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
          class="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-panel hover:text-ink-strong"
        >
          {#if $theme === 'dark'}<Sun size={14} />{:else}<Moon size={14} />{/if}
        </button>
      </div>
    </div>

    <!-- Nav horizontal (mobile / tablet) -->
    <nav class="flex gap-1 overflow-x-auto border-t border-line px-2 py-1.5 lg:hidden">
      {#each HYDRO_NAV as item}
        {@const on = $hydroSection === item.key}
        <button
          onclick={() => go(item.key)}
          class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors {on
            ? 'bg-accent/15 text-accent-bright'
            : 'text-ink-muted hover:text-ink'}"
        >
          <item.icon size={14} />{item.label}
        </button>
      {/each}
    </nav>
  </header>

  <div class="flex min-h-0 flex-1">
    <!-- ============ SIDEBAR (desktop) ============ -->
    <aside class="hidden w-60 shrink-0 flex-col border-r border-line bg-surface/60 lg:flex">
      <div class="flex-1 overflow-y-auto px-2.5 py-3">
        <div class="mb-2 px-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-dim">
          Menu Telemetri
        </div>
        <div class="flex flex-col gap-0.5">
          {#each HYDRO_NAV as item}
            {@const on = $hydroSection === item.key}
            <button
              onclick={() => go(item.key)}
              class="group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors {on
                ? 'bg-accent/10 text-ink-strong'
                : 'text-ink-muted hover:bg-[var(--surface-hover)] hover:text-ink'}"
            >
              {#if on}
                <span class="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent"></span>
              {/if}
              <item.icon
                size={17}
                class={on ? 'text-accent-bright' : 'text-ink-dim group-hover:text-ink-muted'}
                strokeWidth={2}
              />
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-1.5">
                  <span class="truncate text-[12.5px] font-medium">{item.label}</span>
                  <span class="shrink-0 rounded bg-panel-2 px-1 py-px font-mono text-[8px] tracking-wide text-ink-dim">{item.tag}</span>
                </span>
                <span class="block truncate text-[10px] text-ink-dim">{item.desc}</span>
              </span>
            </button>
          {/each}
        </div>
      </div>

      <!-- ringkas status di kaki sidebar -->
      <div class="border-t border-line px-3 py-3">
        <div class="mb-2 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-dim">
          <Radio size={11} />Status Jaringan
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          {#each [
            { k: 'normal', label: 'Normal', c: 'text-normal' },
            { k: 'waspada', label: 'Waspada', c: 'text-waspada' },
            { k: 'siaga', label: 'Siaga', c: 'text-siaga' },
            { k: 'awas', label: 'Awas', c: 'text-awas' },
          ] as s}
            <div class="flex items-center justify-between rounded-md border border-line-soft bg-panel-2 px-2 py-1">
              <span class="text-[10px] text-ink-dim">{s.label}</span>
              <span class="font-mono text-[12px] font-semibold {s.c} tnum">{$statusCounts[s.k as keyof typeof $statusCounts]}</span>
            </div>
          {/each}
        </div>
      </div>
    </aside>

    <!-- ============ KONTEN ============ -->
    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-[1700px] p-3 sm:p-4">
        {#if $selected}
          <!-- drill-down detail stasiun, tetap di dalam portal -->
          {#key $selected.kind + $selected.id}
            <div class="fade-up"><AssetDetailPage /></div>
          {/key}
        {:else}
          <!-- breadcrumb / judul halaman -->
          <div class="mb-3 flex items-center gap-2.5">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-panel text-accent-bright">
              <active.icon size={16} />
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 text-[10px] text-ink-dim">
                <span>Portal Hidrologi</span><span>/</span><span class="text-ink-muted">{active.label}</span>
              </div>
              <h2 class="truncate text-[15px] font-semibold tracking-tight text-ink-strong">{active.label}</h2>
            </div>
          </div>

          {#key $hydroSection}
            <div class="fade-up">
              <Current />
            </div>
          {/key}
        {/if}
      </div>
    </main>
  </div>
</div>
