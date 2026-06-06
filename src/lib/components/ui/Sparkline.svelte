<script lang="ts">
  interface Props {
    points: number[];
    color?: string;
    height?: number;
    area?: boolean;
    strokeWidth?: number;
    /** tampilkan titik terakhir */
    dot?: boolean;
  }
  let {
    points,
    color = '#4f9bee',
    height = 38,
    area = true,
    strokeWidth = 1.6,
    dot = true,
  }: Props = $props();

  const W = 100;
  const uid = `sl-${Math.round(Math.random() * 1e9).toString(36)}`;

  const geom = $derived.by(() => {
    const pts = points.length ? points : [0, 0];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const pad = 3;
    const h = height - pad * 2;
    const stepX = W / Math.max(1, pts.length - 1);
    const xy = pts.map((v, i) => {
      const x = i * stepX;
      const y = pad + h - ((v - min) / span) * h;
      return [x, y] as const;
    });
    const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const fill = `${line} L${W} ${height} L0 ${height} Z`;
    const last = xy[xy.length - 1];
    return { line, fill, last };
  });
</script>

<svg
  viewBox="0 0 {W} {height}"
  preserveAspectRatio="none"
  class="block w-full"
  style="height:{height}px"
>
  <defs>
    <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color={color} stop-opacity="0.28" />
      <stop offset="100%" stop-color={color} stop-opacity="0" />
    </linearGradient>
  </defs>
  {#if area}
    <path d={geom.fill} fill="url(#{uid})" />
  {/if}
  <path
    d={geom.line}
    fill="none"
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linejoin="round"
    stroke-linecap="round"
    vector-effect="non-scaling-stroke"
  />
  {#if dot && geom.last}
    <circle
      cx={geom.last[0]}
      cy={geom.last[1]}
      r="2"
      fill={color}
      vector-effect="non-scaling-stroke"
    />
  {/if}
</svg>
