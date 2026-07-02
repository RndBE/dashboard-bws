<script lang="ts">
  import GeoSidebar from './GeoSidebar.svelte';
  import GeoHeader from './GeoHeader.svelte';
  import GeoDashboard from './GeoDashboard.svelte';
  import GeoFooter from './GeoFooter.svelte';
</script>

<div class="flex h-screen overflow-hidden">
  <GeoSidebar />
  <div class="flex min-w-0 flex-1 flex-col">
    <GeoHeader />
    <main class="min-h-0 flex-1 overflow-y-auto p-3">
      <GeoDashboard />
    </main>
    <GeoFooter />
  </div>
</div>
