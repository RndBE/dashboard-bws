<script lang="ts">
  import GeoSidebar from './GeoSidebar.svelte';
  import GeoHeader from './GeoHeader.svelte';
  import GeoFooter from './GeoFooter.svelte';
  import GeoDashboard from './GeoDashboard.svelte';
  import GeoScadaPage from './pages/GeoScadaPage.svelte';
  import GeoTrendPage from './pages/GeoTrendPage.svelte';
  import GeoDataPage from './pages/GeoDataPage.svelte';
  import GeoAlarmPage from './pages/GeoAlarmPage.svelte';
  import GeoCctvPage from './pages/GeoCctvPage.svelte';
  import GeoStatusPage from './pages/GeoStatusPage.svelte';
  import GeoWellsPage from './pages/GeoWellsPage.svelte';
  import GeoPlaceholder from './pages/GeoPlaceholder.svelte';
  import { geoSection } from '../../geothermal/store';
  import { GEO_NAV, type GeoSection } from '../../config/geoNav';

  const PAGES: Record<GeoSection, any> = {
    dashboard: GeoDashboard,
    scada: GeoScadaPage,
    trend: GeoTrendPage,
    data: GeoDataPage,
    alarm: GeoAlarmPage,
    cctv: GeoCctvPage,
    status: GeoStatusPage,
    health: GeoStatusPage,       // System Health reuses the status page for now
    // Phase 2+ pages — placeholder until built:
    fieldmap: GeoPlaceholder,
    wells: GeoWellsPage,
    historian: GeoPlaceholder,
    production: GeoPlaceholder,
    instruments: GeoPlaceholder,
    maintenance: GeoPlaceholder,
    geochem: GeoPlaceholder,
    reporting: GeoPlaceholder,
    config: GeoPlaceholder,
  };

  const STUB: Partial<Record<GeoSection, { title: string; note: string }>> = {
    fieldmap: { title: 'Field Map', note: 'Peta spasial sumur, pipa, separator, dan reinjeksi. Dibangun pada Fase 2.' },
    historian: { title: 'Historian', note: 'Query data historis tag telemetri. Dibangun pada Fase 3.' },
    production: { title: 'Production', note: 'Output uap, brine, gross MW, dan capacity factor. Dibangun pada Fase 3.' },
    instruments: { title: 'Instruments', note: 'Registry tag instrumen dan status kalibrasi. Dibangun pada Fase 4.' },
    maintenance: { title: 'Maintenance', note: 'Work order dan kesehatan peralatan. Dibangun pada Fase 4.' },
    geochem: { title: 'Geochemistry', note: 'Kimia brine, indeks scaling, NCG, dan pH. Dibangun pada Fase 4.' },
    reporting: { title: 'Reporting', note: 'Laporan periodik dan kepatuhan lingkungan/ESDM. Dibangun pada Fase 5.' },
    config: { title: 'Configuration', note: 'Pengaturan tag, ambang alarm, dan pengguna. Dibangun pada Fase 5.' },
  };

  const Current = $derived(PAGES[$geoSection]);
  const active = $derived(GEO_NAV.find((n) => n.key === $geoSection) ?? GEO_NAV[0]);
  const stub = $derived(STUB[$geoSection]);
</script>

<div class="flex h-screen overflow-hidden">
  <GeoSidebar />
  <div class="flex min-w-0 flex-1 flex-col">
    <GeoHeader />
    <main class="min-h-0 flex-1 overflow-y-auto p-3">
      {#if $geoSection !== 'dashboard'}
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
          {#if stub}
            <GeoPlaceholder icon={active.icon} title={stub.title} note={stub.note} />
          {:else}
            <Current />
          {/if}
        </div>
      {/key}
    </main>
    <GeoFooter />
  </div>
</div>
