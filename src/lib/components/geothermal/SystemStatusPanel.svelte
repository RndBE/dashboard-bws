<script lang="ts">
  import type { GeoStatus } from '../../geothermal/types';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { SYSTEM_ROWS } from '../../geothermal/seed.js';
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">System Status</div>
  <ul class="space-y-1.5">
    {#each SYSTEM_ROWS as row}
      <li class="flex items-center justify-between text-[12px]">
        <span class="text-ink">{row.label}</span>
        <StatusBadge status={row.state as GeoStatus} label={row.value} size="xs" />
      </li>
    {/each}
  </ul>
</div>
