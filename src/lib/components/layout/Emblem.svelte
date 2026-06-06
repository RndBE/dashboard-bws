<script lang="ts">
  import Waves from '@lucide/svelte/icons/waves';
  interface Props {
    size?: number;
  }
  let { size = 34 }: Props = $props();
</script>

<span
  class="grid shrink-0 place-items-center rounded-lg border border-accent/40 bg-gradient-to-br from-accent/30 to-accent/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
  style="width:{size}px;height:{size}px"
>
  <Waves size={size * 0.52} strokeWidth={2.1} class="text-gold" />
</span>
