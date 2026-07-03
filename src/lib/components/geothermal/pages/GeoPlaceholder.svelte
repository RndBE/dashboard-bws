<script lang="ts">
  import type { Component } from 'svelte';
  import Construction from '@lucide/svelte/icons/construction';

  let { icon = Construction, title, note }: { icon?: Component<any>; title: string; note: string } = $props();
  const Icon = $derived(icon);
</script>

<div class="grid min-h-[calc(100vh-220px)] place-items-center rounded-xl border border-dashed border-line bg-panel/40">
  <div class="max-w-sm text-center">
    <span class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-line bg-panel text-accent-bright">
      <Icon size={22} />
    </span>
    <div class="text-[14px] font-semibold text-ink-strong">{title}</div>
    <p class="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{note}</p>
  </div>
</div>
