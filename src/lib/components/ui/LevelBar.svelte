<script lang="ts">
  interface Marker {
    value: number;
    color: string;
    label: string;
  }
  interface Props {
    value: number;
    min: number;
    max: number;
    color?: string;
    markers?: Marker[];
    height?: number;
  }
  let {
    value,
    min,
    max,
    color = '#4f9bee',
    markers = [],
    height = 10,
  }: Props = $props();

  const pos = (v: number) =>
    `${Math.max(0, Math.min(100, ((v - min) / (max - min || 1)) * 100))}%`;
</script>

<div class="w-full">
  <div
    class="relative w-full overflow-visible rounded-full bg-panel-2 ring-1 ring-line"
    style="height:{height}px"
  >
    <div
      class="absolute inset-y-0 left-0 rounded-full"
      style="width:{pos(value)};background:linear-gradient(90deg,{color}55,{color});transition:width 0.6s cubic-bezier(0.22,1,0.36,1)"
    ></div>
    {#each markers as m}
      <div
        class="absolute top-1/2 -translate-y-1/2"
        style="left:{pos(m.value)}"
        title={m.label}
      >
        <div class="h-[14px] w-0.5 -translate-x-1/2" style="background:{m.color}"></div>
      </div>
    {/each}
  </div>
  {#if markers.length}
    <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
      {#each markers as m}
        <span class="flex items-center gap-1 text-[9px] text-ink-dim">
          <span class="h-2 w-0.5" style="background:{m.color}"></span>{m.label}
        </span>
      {/each}
    </div>
  {/if}
</div>
