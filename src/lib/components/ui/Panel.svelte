<script lang="ts">
  import type { Component, Snippet } from 'svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    icon?: Component<any>;
    actions?: Snippet;
    children: Snippet;
    class?: string;
    bodyClass?: string;
    /** garis aksen emas tipis di kepala panel */
    accent?: boolean;
    /** hilangkan padding body */
    flush?: boolean;
  }

  let {
    title,
    subtitle,
    icon: Icon,
    actions,
    children,
    class: klass = '',
    bodyClass = '',
    accent = false,
    flush = false,
  }: Props = $props();
</script>

<section
  class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] {klass}"
>
  {#if title || actions}
    <header
      class="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5 {accent
        ? 'border-l-2 border-l-gold'
        : ''}"
    >
      {#if Icon}
        <Icon size={15} class="shrink-0 text-ink-dim" strokeWidth={2} />
      {/if}
      {#if title}
        <div class="min-w-0">
          <h3
            class="truncate text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-muted"
          >
            {title}
          </h3>
          {#if subtitle}
            <p class="truncate text-[10.5px] text-ink-dim">{subtitle}</p>
          {/if}
        </div>
      {/if}
      {#if actions}
        <div class="ml-auto flex items-center gap-1.5">{@render actions()}</div>
      {/if}
    </header>
  {/if}
  <div class="min-h-0 flex-1 {flush ? '' : 'p-3.5'} {bodyClass}">
    {@render children()}
  </div>
</section>
