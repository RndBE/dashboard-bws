<script lang="ts">
  import { NAV } from '../../config/nav';
  import { activeModule } from '../../stores';
</script>

<nav class="flex items-center gap-1 overflow-x-auto border-b border-line bg-surface/60 px-3">
  {#each NAV as item}
    {@const active = $activeModule === item.key}
    <button
      onclick={() => activeModule.set(item.key)}
      class="group relative flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-[12.5px] font-medium transition-colors {active
        ? 'text-accent-bright'
        : 'text-ink-muted hover:text-ink'}"
    >
      <item.icon
        size={15}
        strokeWidth={2}
        class={active ? 'text-gold' : 'text-ink-dim group-hover:text-ink-muted'}
      />
      {item.label}
      {#if active}
        <span
          class="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
        ></span>
      {/if}
    </button>
  {/each}
</nav>
