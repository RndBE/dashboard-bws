<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'accent' | 'ghost' | 'gold' | 'subtle';
    size?: 'sm' | 'md';
    active?: boolean;
    title?: string;
    type?: 'button' | 'submit';
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
    class?: string;
  }

  let {
    variant = 'accent',
    size = 'md',
    active = false,
    title,
    type = 'button',
    onclick,
    children,
    class: klass = '',
  }: Props = $props();

  // Soft / tinted — fill transparan, border & teks cerah (bukan solid penuh)
  const variants: Record<string, string> = {
    accent:
      'bg-accent/10 text-accent-bright border-accent/35 hover:bg-accent/20 hover:border-accent/60',
    gold: 'bg-gold/10 text-gold border-gold/35 hover:bg-gold/20 hover:border-gold/60',
    ghost:
      'bg-transparent text-ink-muted border-line hover:bg-[var(--surface-hover)] hover:text-ink-strong',
    subtle:
      'bg-surface text-ink border-line hover:bg-panel hover:text-ink-strong',
  };
  const sizes: Record<string, string> = {
    sm: 'h-7 px-2.5 text-[11px] gap-1.5 rounded-md',
    md: 'h-9 px-3.5 text-[12.5px] gap-2 rounded-lg',
  };
</script>

<button
  {type}
  {title}
  {onclick}
  class="inline-flex items-center justify-center border font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 {sizes[
    size
  ]} {active
    ? 'bg-accent/20 text-accent-bright border-accent/60'
    : variants[variant]} {klass}"
>
  {@render children()}
</button>
