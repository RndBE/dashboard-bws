<script lang="ts">
  import type { GeoStatus } from '../../geothermal/types';

  let { severity }: { severity: GeoStatus } = $props();

  const LABEL: Record<GeoStatus, string> = {
    normal: 'NORMAL',
    waspada: 'WASPADA',
    siaga: 'SIAGA',
    awas: 'AWAS',
  };

  // Explicit class map — Tailwind purges interpolated `text-{severity}` /
  // `bg-{severity}/15` forms, so every combination must appear as a literal.
  const CLS: Record<GeoStatus, string> = {
    normal: 'text-normal bg-normal/15',
    waspada: 'text-waspada bg-waspada/15',
    siaga: 'text-siaga bg-siaga/15',
    awas: 'text-awas bg-awas/15',
  };
</script>

<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {CLS[severity]}">
  {LABEL[severity]}
</span>
