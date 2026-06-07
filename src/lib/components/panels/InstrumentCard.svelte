<script lang="ts">
  import type { Instrument } from '../../types';
  import { instrumentIcon, INSTRUMENT_STATUS } from '../../instruments';
  import Sparkline from '../ui/Sparkline.svelte';
  import { num, relTime } from '../../format';
  import { clock } from '../../stores';

  interface Props {
    inst: Instrument;
  }
  let { inst }: Props = $props();

  const Icon = $derived(instrumentIcon(inst.type));
  const meta = $derived(INSTRUMENT_STATUS[inst.status]);
  const offline = $derived(inst.status !== 'online');
</script>

<div
  class="flex flex-col gap-2.5 rounded-xl border border-line bg-panel-2 p-3 transition-opacity {offline
    ? 'opacity-70'
    : ''}"
>
  <div class="flex items-start gap-2.5">
    <span
      class="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-panel"
      style="color:{meta.color}"
    >
      <Icon size={16} strokeWidth={2} />
    </span>
    <div class="min-w-0 flex-1">
      <div class="truncate text-[12.5px] font-medium text-ink-strong">{inst.type}</div>
      <div class="truncate text-[10px] text-ink-dim">{inst.name}</div>
    </div>
    <span
      class="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
      style="color:{meta.color};background:{meta.color}1a;border:1px solid {meta.color}40"
    >
      <span class="h-1.5 w-1.5 rounded-full" style="background:{meta.color}"></span>
      {meta.label}
    </span>
  </div>

  <div class="flex items-end justify-between gap-2">
    <div>
      <div class="font-mono text-[19px] font-semibold leading-none text-ink-strong tnum">
        {num(inst.value, inst.valueDigits ?? 1)}
        <span class="text-[10px] font-normal text-ink-muted">{inst.unit}</span>
      </div>
      <div class="mt-1 text-[9.5px] text-ink-dim">
        {offline ? 'Terakhir ' : ''}{relTime(inst.updatedAt, $clock)}
      </div>
      {#if inst.lokasi}
        <div class="mt-1 max-w-[180px] truncate text-[9.5px] text-ink-muted">
          {inst.lokasi}
        </div>
      {/if}
    </div>
    <div class="h-9 w-24 shrink-0">
      <Sparkline
        points={inst.history.map((p) => p.v)}
        color={offline ? '#5d6f8c' : meta.color}
        height={34}
        dot={!offline}
      />
    </div>
  </div>
</div>
