<script lang="ts">
  import { geoActiveAlarmCount } from '../../geothermal/store';
  import { geoAlarms } from '../../geothermal/store';
</script>

<div class="rounded-xl border border-line bg-panel p-3">
  <div class="mb-2 flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-awas">Alarm Summary</div>
    <span class="rounded-full bg-awas/15 px-2 py-0.5 text-[10px] font-semibold text-awas">{$geoActiveAlarmCount} Active</span>
  </div>
  <table class="w-full text-[11px]">
    <thead class="text-ink-dim"><tr><th class="text-left font-medium">Time</th><th class="text-left font-medium">Alarm</th><th class="text-right font-medium">Status</th></tr></thead>
    <tbody>
      {#each $geoAlarms as a}
        <tr class="border-t border-line/60">
          <td class="py-1 tnum text-ink-muted">{a.time}</td>
          <td class="py-1 text-ink">{a.label}</td>
          <td class="py-1 text-right font-semibold {a.status === 'active' ? 'text-awas' : 'text-normal'}">{a.status === 'active' ? 'ACTIVE' : 'CLEARED'}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <button class="mt-2 w-full rounded-md border border-line py-1.5 text-[11px] text-ink-muted hover:bg-panel-2">View All Alarms</button>
</div>
