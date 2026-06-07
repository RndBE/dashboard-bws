<script lang="ts">
  import type { Siaga } from '../../types';
  import { SIAGA_ORDER, STATUS } from '../../status';

  interface Props {
    counts: Record<Siaga, number>;
    size?: number;
    /** label tengah baris atas (angka) */
    centerValue: string;
    centerLabel: string;
    /** status untuk warna angka tengah */
    centerStatus: Siaga;
  }
  let { counts, size = 132, centerValue, centerLabel, centerStatus }: Props = $props();

  const sw = 11;
  const r = $derived((size - sw) / 2);
  const c = $derived(2 * Math.PI * r);
  const total = $derived(SIAGA_ORDER.reduce((s, k) => s + counts[k], 0) || 1);

  // segmen berurutan; sisakan gap kecil antar segmen
  const segs = $derived.by(() => {
    const gap = 0.012 * c;
    let offset = 0;
    return SIAGA_ORDER.filter((k) => counts[k] > 0).map((k) => {
      const frac = counts[k] / total;
      const len = Math.max(0, frac * c - gap);
      const seg = { key: k, color: STATUS[k].color, dash: len, gapDash: c - len, offset: -offset };
      offset += frac * c;
      return seg;
    });
  });
</script>

<div class="relative" style="width:{size}px;height:{size}px">
  <svg width={size} height={size} class="-rotate-90">
    <circle cx={size / 2} cy={size / 2} {r} fill="none" stroke="#16223c" stroke-width={sw} />
    {#each segs as s}
      <circle
        cx={size / 2}
        cy={size / 2}
        {r}
        fill="none"
        stroke={s.color}
        stroke-width={sw}
        stroke-linecap="butt"
        stroke-dasharray="{s.dash} {s.gapDash}"
        stroke-dashoffset={s.offset}
        style="transition:stroke-dasharray .6s cubic-bezier(.22,1,.36,1)"
      />
    {/each}
  </svg>
  <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
    <span class="font-mono text-[34px] font-semibold leading-none tnum" style="color:{STATUS[centerStatus].color}">
      {centerValue}
    </span>
    <span class="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-dim">{centerLabel}</span>
  </div>
</div>
