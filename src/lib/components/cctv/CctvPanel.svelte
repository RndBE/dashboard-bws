<script lang="ts">
  import Cctv from '@lucide/svelte/icons/cctv';
  import Panel from '../ui/Panel.svelte';
  import CameraTile from './CameraTile.svelte';
  import { CAMERAS, type CameraGroup } from '../../data/cameras';

  interface Props {
    /** filter kamera per solusi/modul; kosong = semua */
    group?: CameraGroup;
    /** batasi jumlah kamera yang ditampilkan */
    max?: number;
    title?: string;
  }
  let { group, max, title = 'CCTV' }: Props = $props();

  const cams = $derived.by(() => {
    const list = group ? CAMERAS.filter((c) => c.group === group) : CAMERAS;
    return max ? list.slice(0, max) : list;
  });
  const online = $derived(cams.filter((c) => c.online).length);
</script>

{#if cams.length}
  <Panel {title} subtitle="{cams.length} kamera · {online} online" icon={Cctv}>
    <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
      {#each cams as cam (cam.id)}
        <CameraTile {cam} />
      {/each}
    </div>
  </Panel>
{/if}
