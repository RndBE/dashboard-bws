<script lang="ts">
  import { statusCounts } from '../../stores';
  import { SIAGA_ORDER, STATUS } from '../../status';
</script>

<div
  class="pointer-events-auto absolute bottom-3 left-3 rounded-lg border border-line bg-surface/90 px-3 py-2 backdrop-blur"
>
  <div class="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-ink-dim">
    Status Pos
  </div>
  <div class="flex flex-col gap-1">
    {#each SIAGA_ORDER as s}
      <div class="flex items-center gap-2">
        <span
          class="h-2 w-2 rounded-full"
          style="background:{STATUS[s].color}"
        ></span>
        <span class="text-[10.5px] text-ink-muted">{STATUS[s].label}</span>
        <span class="ml-auto font-mono text-[10.5px] text-ink-strong tnum">
          {$statusCounts[s]}
        </span>
      </div>
    {/each}
  </div>
</div>
