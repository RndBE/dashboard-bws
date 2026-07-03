<script lang="ts">
  import GeoSidebar from './GeoSidebar.svelte';
  import GeoHeader from './GeoHeader.svelte';
  import GeoFooter from './GeoFooter.svelte';
  import GeoDashboard from './GeoDashboard.svelte';
  import GeoScadaPage from './pages/GeoScadaPage.svelte';
  import GeoTrendsPage from './pages/GeoTrendsPage.svelte';
  import GeoDataPage from './pages/GeoDataPage.svelte';
  import GeoAlarmPage from './pages/GeoAlarmPage.svelte';
  import GeoCctvPage from './pages/GeoCctvPage.svelte';
  import GeoStatusPage from './pages/GeoStatusPage.svelte';
  import GeoWellsPage from './pages/GeoWellsPage.svelte';
  import GeoFieldMapPage from './pages/GeoFieldMapPage.svelte';
  import GeoHistorianPage from './pages/GeoHistorianPage.svelte';
  import GeoProductionPage from './pages/GeoProductionPage.svelte';
  import GeoInstrumentsPage from './pages/GeoInstrumentsPage.svelte';
  import GeoMaintenancePage from './pages/GeoMaintenancePage.svelte';
  import GeoGeochemPage from './pages/GeoGeochemPage.svelte';
  import GeoReportingPage from './pages/GeoReportingPage.svelte';
  import GeoConfigPage from './pages/GeoConfigPage.svelte';
  import GeoHealthPage from './pages/GeoHealthPage.svelte';
  import { geoSection } from '../../geothermal/store';
  import { GEO_NAV, type GeoSection } from '../../config/geoNav';

  const PAGES: Record<GeoSection, any> = {
    dashboard: GeoDashboard,
    scada: GeoScadaPage,
    trend: GeoTrendsPage,
    data: GeoDataPage,
    alarm: GeoAlarmPage,
    cctv: GeoCctvPage,
    status: GeoStatusPage,       // legacy key — retained for back-compat
    health: GeoHealthPage,
    fieldmap: GeoFieldMapPage,
    wells: GeoWellsPage,
    historian: GeoHistorianPage,
    production: GeoProductionPage,
    instruments: GeoInstrumentsPage,
    maintenance: GeoMaintenancePage,
    geochem: GeoGeochemPage,
    reporting: GeoReportingPage,
    config: GeoConfigPage,
  };

  const Current = $derived(PAGES[$geoSection]);
  const active = $derived(GEO_NAV.find((n) => n.key === $geoSection) ?? GEO_NAV[0]);
</script>

<div class="flex h-screen overflow-hidden">
  <GeoSidebar />
  <div class="flex min-w-0 flex-1 flex-col">
    <GeoHeader />
    <main class="min-h-0 flex-1 overflow-y-auto {$geoSection === 'cctv' ? 'p-0' : 'p-3'}">
      {#if $geoSection !== 'dashboard' && $geoSection !== 'cctv'}
        <div class="mb-3 flex items-center gap-2.5">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-panel text-accent-bright">
            <active.icon size={16} />
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 text-[10px] text-ink-dim">
              <span>Geothermal</span><span>/</span><span class="text-ink-muted">{active.label}</span>
            </div>
            <h2 class="truncate text-[15px] font-semibold tracking-tight text-ink-strong">{active.desc}</h2>
          </div>
        </div>
      {/if}

      {#key $geoSection}
        <div class="fade-up">
          <Current />
        </div>
      {/key}
    </main>
    <GeoFooter />
  </div>
</div>
