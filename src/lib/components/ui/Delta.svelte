<script lang="ts">
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TrendingDown from '@lucide/svelte/icons/trending-down';
  import Minus from '@lucide/svelte/icons/minus';
  import { signed } from '../../format';

  interface Props {
    delta: number;
    unit?: string;
    digits?: number;
    /** arah yang dianggap "buruk" untuk pewarnaan */
    badWhen?: 'up' | 'down' | 'none';
    suffix?: string;
  }
  let { delta, unit = '', digits = 1, badWhen = 'up', suffix }: Props = $props();

  const eps = 0.0001;
  const dir = $derived(delta > eps ? 'up' : delta < -eps ? 'down' : 'flat');
  const tone = $derived(
    dir === 'flat' || badWhen === 'none'
      ? 'text-ink-muted'
      : dir === badWhen
        ? 'text-awas'
        : 'text-normal',
  );
</script>

<span class="inline-flex items-center gap-1 font-mono text-[11px] {tone}">
  {#if dir === 'up'}
    <TrendingUp size={12} strokeWidth={2.4} />
  {:else if dir === 'down'}
    <TrendingDown size={12} strokeWidth={2.4} />
  {:else}
    <Minus size={12} strokeWidth={2.4} />
  {/if}
  {suffix ?? `${signed(delta, digits)}${unit}`}
</span>
