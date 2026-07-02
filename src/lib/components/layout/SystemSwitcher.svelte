<script lang="ts">
  import Waves from '@lucide/svelte/icons/waves';
  import Flame from '@lucide/svelte/icons/flame';
  import { system } from '../../stores';
</script>

<div class="flex items-center rounded-lg border border-line bg-panel-2 p-0.5">
  <button
    onclick={() => system.set('stesy')}
    class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors {$system === 'stesy' ? 'bg-accent/20 text-accent-bright' : 'text-ink-muted hover:text-ink'}"
  >
    <Waves size={13} /> <span class="hidden sm:inline">Sungai</span>
  </button>
  <button
    onclick={() => system.set('geothermal')}
    class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors {$system === 'geothermal' ? 'bg-accent/20 text-accent-bright' : 'text-ink-muted hover:text-ink'}"
  >
    <Flame size={13} /> <span class="hidden sm:inline">Geothermal</span>
  </button>
</div>
