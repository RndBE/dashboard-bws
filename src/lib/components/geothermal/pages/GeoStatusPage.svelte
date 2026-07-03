<script lang="ts">
  import SystemStatusPanel from '../SystemStatusPanel.svelte';
  import PowerPanel from '../PowerPanel.svelte';
  import CommsPanel from '../CommsPanel.svelte';
</script>

<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
  <SystemStatusPanel />
  <PowerPanel />
  <CommsPanel />
</div>
