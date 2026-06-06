<script lang="ts">
  import Clock3 from '@lucide/svelte/icons/clock-3';
  import { clock } from '../../stores';
  import { clockTime, fullDate } from '../../format';

  interface Props {
    variant?: 'full' | 'big';
  }
  let { variant = 'full' }: Props = $props();
</script>

{#if variant === 'big'}
  <div class="text-right">
    <div class="font-mono text-2xl font-semibold leading-none text-ink-strong tnum">
      {clockTime($clock)}
    </div>
    <div class="mt-1 text-[11px] text-ink-muted">{fullDate($clock)}</div>
  </div>
{:else}
  <div class="flex items-center gap-2 text-[12px] text-ink-muted">
    <Clock3 size={13} strokeWidth={2} class="text-ink-dim" />
    <span>{fullDate($clock)}</span>
    <span class="text-ink-dim">·</span>
    <span class="font-mono font-medium text-ink tnum">{clockTime($clock)}</span>
  </div>
{/if}
