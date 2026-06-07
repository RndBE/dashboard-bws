<script lang="ts">
  import type { Component, Snippet } from 'svelte';

  interface Props {
    label: string;
    value: string;
    unit?: string;
    icon?: Component<any>;
    /** garis aksen emas (highlight) */
    accent?: boolean;
    onclick?: () => void;
    footer?: Snippet;
    class?: string;
  }
  let {
    label,
    value,
    unit,
    icon: Icon,
    accent = false,
    onclick,
    footer,
    class: klass = '',
  }: Props = $props();
</script>

<svelte:element
  this={onclick ? 'button' : 'div'}
  {onclick}
  role={onclick ? 'button' : undefined}
  tabindex={onclick ? 0 : undefined}
  class="relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition-colors {onclick
    ? 'cursor-pointer hover:border-accent/40 hover:bg-panel'
    : ''} {klass}"
>
  {#if accent}
    <span class="absolute inset-y-2.5 left-0 w-[2px] rounded-full bg-gold"></span>
  {/if}
  <div class="flex items-center gap-1.5 text-ink-muted">
    {#if Icon}
      <Icon size={13} strokeWidth={2} class="text-accent-bright" />
    {/if}
    <span class="text-[10px] font-medium uppercase tracking-[0.05em]">{label}</span>
  </div>
  <div class="mt-1.5 flex items-baseline gap-1">
    <span class="font-mono text-[22px] font-semibold leading-none text-ink-strong tnum">
      {value}
    </span>
    {#if unit}<span class="text-[11px] text-ink-muted">{unit}</span>{/if}
  </div>
  {#if footer}
    <div class="mt-2">{@render footer()}</div>
  {/if}
</svelte:element>
