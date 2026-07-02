<script lang="ts">
  import { geoOverallStatus } from '../../geothermal/store';
  import { STATUS } from '../../status';
</script>

<footer class="flex items-center justify-between border-t border-line bg-surface px-4 py-1.5 text-[10px] text-ink-dim">
  <span class="flex items-center gap-1.5 font-semibold" style="color:{STATUS[$geoOverallStatus].color}">
    <span class="h-1.5 w-1.5 rounded-full" style="background:{STATUS[$geoOverallStatus].color}"></span>
    {$geoOverallStatus === 'normal' ? 'System Normal' : STATUS[$geoOverallStatus].label}
  </span>
  <span>Geothermal Well Pad Testing Monitoring System · Data is refreshed every 5 seconds</span>
  <span>v1.0.0</span>
</footer>
