<script lang="ts">
  import GeoSidebar from './GeoSidebar.svelte';
  import GeoHeader from './GeoHeader.svelte';
</script>

<div class="flex h-screen overflow-hidden">
  <GeoSidebar />
  <div class="flex min-w-0 flex-1 flex-col">
    <GeoHeader />
    <main class="min-h-0 flex-1 overflow-y-auto p-3">
      <div class="grid h-full place-items-center text-ink-dim">Dashboard panels — coming in next tasks</div>
    </main>
  </div>
</div>
