<script lang="ts">
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { activeAlerts, openDetail } from '../../stores';
  import { STATUS } from '../../status';
  import { relTime } from '../../format';
  import { clock } from '../../stores';

  interface Props {
    max?: number;
  }
  let { max = 8 }: Props = $props();
</script>

<div class="flex h-full flex-col gap-1.5 overflow-y-auto">
  {#if $activeAlerts.length === 0}
    <div
      class="flex h-full flex-col items-center justify-center gap-2 py-8 text-center"
    >
      <ShieldCheck size={28} class="text-normal" strokeWidth={1.6} />
      <p class="text-[12px] text-ink-muted">Tidak ada peringatan aktif</p>
      <p class="text-[10.5px] text-ink-dim">Seluruh pos dalam status normal</p>
    </div>
  {:else}
    {#each $activeAlerts.slice(0, max) as a (a.id)}
      <button
        onclick={() => openDetail(a.kind, a.assetId)}
        class="group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors hover:bg-white/[0.03]"
        style="border-color:{STATUS[a.level].color}44;background:{STATUS[a.level]
          .color}0f"
      >
        <TriangleAlert
          size={15}
          strokeWidth={2}
          style="color:{STATUS[a.level].color}"
          class="shrink-0"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-[12px] text-ink">{a.message}</p>
          <p class="text-[10px] text-ink-dim">{relTime(a.at, $clock)}</p>
        </div>
        <span
          class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
          style="background:{STATUS[a.level].color};color:#0a0f1c"
        >
          {STATUS[a.level].label}
        </span>
        <ChevronRight
          size={14}
          class="shrink-0 text-ink-dim transition-transform group-hover:translate-x-0.5"
        />
      </button>
    {/each}
  {/if}
</div>
