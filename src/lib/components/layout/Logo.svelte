<script lang="ts">
  // Logo Beacon Engineering versi monokrom putih — dibuat dengan CSS mask
  // dari PNG aslinya, sehingga seluruh bentuk (ikon + teks) jadi putih solid
  // dan menyatu dengan latar command-center yang gelap (tanpa plate).
  interface Props {
    /** tinggi logo dalam px; lebar mengikuti rasio asli */
    height?: number;
    /** warna isi (default putih) */
    color?: string;
  }
  let { height = 38, color = '#ffffff' }: Props = $props();

  // rasio intrinsik logo 499×148 ≈ 3.37
  const ratio = 499 / 148;
</script>

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
