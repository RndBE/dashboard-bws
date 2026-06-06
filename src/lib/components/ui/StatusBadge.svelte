<script lang="ts">
  import type { Siaga } from '../../types';
  import { STATUS } from '../../status';

  interface Props {
    status: Siaga;
    size?: 'xs' | 'sm';
    dot?: boolean;
    pulse?: boolean;
    label?: string;
  }
  let { status, size = 'sm', dot = true, pulse = false, label }: Props = $props();

  const chip: Record<Siaga, string> = {
    normal: 'bg-normal/12 text-normal border-normal/30',
    waspada: 'bg-waspada/12 text-waspada border-waspada/30',
    siaga: 'bg-siaga/12 text-siaga border-siaga/30',
    awas: 'bg-awas/12 text-awas border-awas/30',
  };
  const dotc: Record<Siaga, string> = {
    normal: 'bg-normal',
    waspada: 'bg-waspada',
    siaga: 'bg-siaga',
    awas: 'bg-awas',
  };
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide {chip[
    status
  ]} {size === 'xs'
    ? 'px-1.5 py-0.5 text-[9px]'
    : 'px-2 py-0.5 text-[10px]'}"
>
  {#if dot}
    <span class="relative flex h-1.5 w-1.5">
      {#if pulse}
        <span
          class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 {dotc[
            status
          ]}"
        ></span>
      {/if}
      <span class="relative inline-flex h-1.5 w-1.5 rounded-full {dotc[status]}"></span>
    </span>
  {/if}
  {label ?? STATUS[status].label}
</span>
