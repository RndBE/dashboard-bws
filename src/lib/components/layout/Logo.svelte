<script lang="ts">
  // Logo Beacon Engineering.
  //  - default (mono): CSS mask → siluet 1 warna (putih) untuk latar gelap.
  //  - colored: PNG asli berwarna (merah + navy) untuk latar terang (light mode).
  interface Props {
    /** tinggi logo dalam px; lebar mengikuti rasio asli */
    height?: number;
    /** warna isi untuk varian mono (default putih) */
    color?: string;
    /** tampilkan logo berwarna asli (mis. saat light mode) */
    colored?: boolean;
  }
  let { height = 38, color = '#ffffff', colored = false }: Props = $props();

  // rasio intrinsik logo 499×148 ≈ 3.37
  const ratio = 499 / 148;
</script>

{#if colored}
  <span
    class="block shrink-0 select-none"
    role="img"
    aria-label="Beacon Engineering"
    style="
      height:{height}px;
      width:{height * ratio}px;
      background:url(/logo_beacon.png) center / contain no-repeat;
    "
  ></span>
{:else}
  <span
    class="block shrink-0 select-none"
    role="img"
    aria-label="Beacon Engineering"
    style="
      height:{height}px;
      width:{height * ratio}px;
      background-color:{color};
      -webkit-mask:url(/logo_beacon.png) center / contain no-repeat;
      mask:url(/logo_beacon.png) center / contain no-repeat;
    "
  ></span>
{/if}
