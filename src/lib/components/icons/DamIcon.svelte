<script lang="ts">
  // Ikon bendungan bergaya garis (senada Lucide)
  interface Props {
    size?: number;
    strokeWidth?: number;
    class?: string;
  }
  let { size = 16, strokeWidth = 2, class: klass = '' }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={klass}
>
  <path d="M3 21V9l4-2 4 2 4-2 4 2v12" />
  <path d="M3 13h18" />
  <path d="M3 17h18" />
  <path d="M12 9v12" />
</svg>
