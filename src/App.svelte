<script lang="ts">
  import { onMount } from 'svelte';
  import TopBar from './lib/components/layout/TopBar.svelte';
  import TabNav from './lib/components/layout/TabNav.svelte';
  import DetailDrawer from './lib/components/panels/DetailDrawer.svelte';
  import WallView from './lib/components/views/WallView.svelte';
  import WallUnavailable from './lib/components/views/WallUnavailable.svelte';
  import AssetDetailPage from './lib/components/views/AssetDetailPage.svelte';
  import LoginView from './lib/components/views/LoginView.svelte';
  import LogoutModal from './lib/components/ui/LogoutModal.svelte';

  import OverviewModule from './lib/components/modules/OverviewModule.svelte';
  import HidrologiModule from './lib/components/modules/HidrologiModule.svelte';
  import BendunganModule from './lib/components/modules/BendunganModule.svelte';
  import IrigasiModule from './lib/components/modules/IrigasiModule.svelte';
  import BanjirModule from './lib/components/modules/BanjirModule.svelte';
  import AnalisaModule from './lib/components/modules/AnalisaModule.svelte';

  import { mode, activeModule, selected, startSimulation } from './lib/stores';
  import { startRouter } from './lib/router';
  import { auth } from './lib/auth';
  import { theme } from './lib/theme';
  import type { ModuleKey } from './lib/types';

  const MODULES: Record<ModuleKey, any> = {
    ringkasan: OverviewModule,
    hidrologi: HidrologiModule,
    bendungan: BendunganModule,
    irigasi: IrigasiModule,
    banjir: BanjirModule,
    analisa: AnalisaModule,
  };

  const Current = $derived(MODULES[$activeModule]);

  // Mode Layar Dinding hanya untuk layar besar (≥ 1024px)
  const LARGE_MQ = '(min-width: 1024px)';
  let isLargeScreen = $state(
    typeof window !== 'undefined' ? window.matchMedia(LARGE_MQ).matches : true,
  );

  onMount(() => {
    const stopRouter = startRouter();
    const stopSim = startSimulation();
    const mq = window.matchMedia(LARGE_MQ);
    isLargeScreen = mq.matches;
    const onMq = (e: MediaQueryListEvent) => (isLargeScreen = e.matches);
    mq.addEventListener('change', onMq);
    return () => {
      stopRouter();
      stopSim();
      mq.removeEventListener('change', onMq);
    };
  });
</script>

{#if !$auth}
  <LoginView />
{:else}
  <div
    class="flex h-screen flex-col overflow-hidden {$theme === 'light' && $mode !== 'wall'
      ? 'theme-light'
      : ''}"
  >
    {#if $mode === 'wall'}
      <!-- Mode Layar Dinding: videowall full-screen tanpa TopBar -->
      {#if isLargeScreen}
        <main class="min-h-0 flex-1 overflow-hidden">
          <WallView />
        </main>
        <DetailDrawer />
      {:else}
        <WallUnavailable />
      {/if}
    {:else if $selected}
      <TopBar />
      <main class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto max-w-[1700px] p-3 sm:p-4">
          {#key $selected.kind + $selected.id}
            <div class="fade-up">
              <AssetDetailPage />
            </div>
          {/key}
        </div>
      </main>
    {:else}
      <TopBar />
      <TabNav />
      <main class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto max-w-[1700px] p-3 sm:p-4">
          {#key $activeModule}
            <div class="fade-up">
              <Current />
            </div>
          {/key}
        </div>
      </main>
    {/if}
    <LogoutModal />
  </div>
{/if}
