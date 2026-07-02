<script lang="ts">
  import Cctv from '@lucide/svelte/icons/cctv';
  import Wifi from '@lucide/svelte/icons/wifi';
  import VideoOff from '@lucide/svelte/icons/video-off';
  import Radio from '@lucide/svelte/icons/radio';
  import Table from '@lucide/svelte/icons/table-2';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Copy from '@lucide/svelte/icons/copy';

  import Panel from '../../ui/Panel.svelte';
  import KpiCard from '../../ui/KpiCard.svelte';
  import Button from '../../ui/Button.svelte';
  import CameraTile from '../../cctv/CameraTile.svelte';

  import { CAMERAS, camStream, type Camera, type CamStream } from '../../../data/cameras';

  // Hanya kamera kelompok hidrologi.
  const cams = $derived(CAMERAS.filter((c) => c.group === 'hidrologi'));

  const total = $derived(cams.length);
  const onlineCount = $derived(cams.filter((c) => c.online).length);
  const offlineCount = $derived(total - onlineCount);

  // Filter berdasarkan jenis pos kamera.
  const filters = ['Semua', 'PDA', 'PCH', 'Mata Air', 'Kualitas'] as const;
  let filter = $state<string>('Semua');

  const filtered = $derived(
    filter === 'Semua' ? cams : cams.filter((c) => c.pos === filter),
  );

  // Kamera terpilih untuk panel "Detail Stream".
  let selId = $state<string | null>(null);
  const sel = $derived<Camera | undefined>(
    cams.find((c) => c.id === selId) ??
      cams.find((c) => c.online) ??
      cams[0],
  );
  const stream = $derived<CamStream | undefined>(sel ? camStream(sel) : undefined);

  function copyRtsp() {
    if (typeof navigator !== 'undefined' && navigator.clipboard && stream) {
      navigator.clipboard.writeText(stream.rtsp);
    }
  }

  // jumlah kamera per filter (untuk label chip)
  function countFor(key: string): number {
    return key === 'Semua' ? cams.length : cams.filter((c) => c.pos === key).length;
  }
</script>

<div class="flex flex-col gap-3">
  <p class="text-[12px] leading-relaxed text-ink-muted">
    Sistem CCTV <span class="text-ink-strong">terintegrasi web berbasis IP Publik</span>: tiap
    kamera memiliki alamat IP publik beserta stream <span class="font-mono">RTSP/HLS</span>,
    sehingga dapat diakses lintas instansi tanpa VPN untuk pemantauan visual pos hidrologi
    secara langsung.
  </p>

  <!-- KPI -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Total kamera" value={String(total)} unit="unit" icon={Cctv} accent />
    <KpiCard label="Online" value={String(onlineCount)} unit="unit" icon={Wifi}>
      {#snippet footer()}<span class="text-[10px] text-normal">streaming aktif</span>{/snippet}
    </KpiCard>
    <KpiCard label="Offline" value={String(offlineCount)} unit="unit" icon={VideoOff}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{offlineCount ? 'sinyal hilang' : 'semua aktif'}</span>{/snippet}
    </KpiCard>
    <KpiCard label="Codec" value="H.265" unit="HEVC" icon={Radio}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">1920×1080 · 25 fps</span>{/snippet}
    </KpiCard>
  </div>

  <!-- filter -->
  <div class="flex flex-wrap items-center gap-1.5">
    {#each filters as f}
      {@const on = filter === f}
      <button
        onclick={() => (filter = f)}
        class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition-colors {on
          ? 'border-accent/50 bg-accent/15 text-ink-strong'
          : 'border-line bg-surface text-ink-muted hover:bg-panel hover:text-ink'}"
      >
        {f}
        <span class="font-mono text-[9.5px] {on ? 'text-accent-bright' : 'text-ink-dim'} tnum">{countFor(f)}</span>
      </button>
    {/each}
  </div>

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <!-- grid pratinjau kamera -->
    <div class="xl:col-span-2">
      <Panel
        title="Pratinjau Kamera"
        subtitle="{filtered.length} kamera{filter === 'Semua' ? '' : ` · ${filter}`} · klik untuk detail stream"
        icon={Cctv}
        accent
      >
        {#if filtered.length === 0}
          <div class="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <VideoOff size={26} class="text-ink-dim" strokeWidth={1.6} />
            <p class="text-[12px] text-ink-muted">Tidak ada kamera untuk filter ini</p>
          </div>
        {:else}
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {#each filtered as cam (cam.id)}
              {@const active = sel?.id === cam.id}
              <button
                onclick={() => (selId = cam.id)}
                class="group block rounded-lg border text-left transition-colors {active
                  ? 'border-accent/60 ring-1 ring-accent/40'
                  : 'border-transparent hover:border-line'}"
              >
                <CameraTile {cam} />
                <div class="flex items-center justify-between gap-2 px-1.5 pb-1 pt-1.5">
                  <span class="flex items-center gap-1.5 truncate text-[10px] text-ink-muted">
                    <span class="h-1.5 w-1.5 shrink-0 rounded-full {cam.online ? 'bg-normal' : 'bg-awas'}"></span>
                    <span class="truncate">{cam.pos ?? '—'}</span>
                  </span>
                  <span class="shrink-0 font-mono text-[9.5px] text-ink-dim">{cam.ip ?? '—'}</span>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </Panel>
    </div>

    <!-- detail stream kamera terpilih -->
    <Panel title="Detail Stream" subtitle={sel ? sel.name : '—'} icon={Wifi}>
      {#if sel && stream}
        <div class="aspect-video w-full overflow-hidden rounded-lg">
          <CameraTile cam={sel} fill />
        </div>

        <dl class="mt-3 divide-y divide-line-soft text-[12px]">
          <div class="flex items-center justify-between gap-3 py-1.5">
            <dt class="text-ink-dim">Status</dt>
            <dd class="flex items-center gap-1.5 font-medium {sel.online ? 'text-normal' : 'text-awas'}">
              <span class="h-1.5 w-1.5 rounded-full {sel.online ? 'bg-normal' : 'bg-awas'}"></span>
              {sel.online ? 'Online' : 'Offline'}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-1.5">
            <dt class="text-ink-dim">Lokasi</dt>
            <dd class="flex items-center gap-1 truncate text-ink"><MapPin size={11} class="shrink-0 text-ink-dim" />{sel.area}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-1.5">
            <dt class="text-ink-dim">Vendor</dt>
            <dd class="truncate text-ink">{sel.vendor ?? '—'}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-1.5">
            <dt class="text-ink-dim">IP Publik</dt>
            <dd class="font-mono text-ink-strong">{sel.ip ?? '—'}<span class="text-ink-dim">:{stream.port}</span></dd>
          </div>
          <div class="py-1.5">
            <dt class="text-ink-dim">RTSP</dt>
            <dd class="mt-0.5 break-all font-mono text-[11px] text-accent-bright">{stream.rtsp}</dd>
          </div>
          <div class="py-1.5">
            <dt class="text-ink-dim">HLS</dt>
            <dd class="mt-0.5 break-all font-mono text-[11px] text-ink">{stream.hls}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-1.5">
            <dt class="text-ink-dim">Codec</dt>
            <dd class="font-mono text-ink">{stream.codec}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-1.5">
            <dt class="text-ink-dim">Resolusi</dt>
            <dd class="font-mono text-ink">{stream.resolution}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-1.5">
            <dt class="text-ink-dim">FPS</dt>
            <dd class="font-mono text-ink tnum">{stream.fps}</dd>
          </div>
        </dl>

        <div class="mt-3 border-t border-line-soft pt-2.5">
          <Button size="sm" variant="accent" onclick={copyRtsp} class="w-full">
            <Copy size={13} />Salin RTSP
          </Button>
        </div>
      {:else}
        <div class="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
          <VideoOff size={26} class="text-ink-dim" strokeWidth={1.6} />
          <p class="text-[12px] text-ink-muted">Pilih kamera untuk melihat stream</p>
        </div>
      {/if}
    </Panel>
  </div>

  <!-- tabel perangkat -->
  <Panel title="Daftar Perangkat CCTV" subtitle="{cams.length} kamera hidrologi · klik baris untuk detail" icon={Table} flush>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-[12px]">
        <thead>
          <tr class="border-b border-line text-[10px] uppercase tracking-wide text-ink-dim">
            <th class="px-3.5 py-2 font-medium">Kamera</th>
            <th class="px-2 py-2 font-medium">Lokasi / Area</th>
            <th class="px-2 py-2 font-medium">Pos</th>
            <th class="px-2 py-2 font-medium">IP Publik</th>
            <th class="px-2 py-2 font-medium">Vendor</th>
            <th class="px-2 py-2 font-medium">Status</th>
            <th class="px-3.5 py-2 font-medium">Stream</th>
          </tr>
        </thead>
        <tbody>
          {#each cams as cam (cam.id)}
            {@const active = sel?.id === cam.id}
            <tr
              onclick={() => (selId = cam.id)}
              class="cursor-pointer border-b border-line-soft transition-colors hover:bg-[var(--surface-hover)] {active ? 'bg-accent/8' : ''}"
            >
              <td class="px-3.5 py-2.5 font-medium text-ink-strong">{cam.name}</td>
              <td class="px-2 py-2.5 text-ink-muted">{cam.area}</td>
              <td class="px-2 py-2.5 text-[10px] text-ink-dim">{cam.pos ?? '—'}</td>
              <td class="px-2 py-2.5 font-mono text-[11px] text-ink">{cam.ip ?? '—'}</td>
              <td class="px-2 py-2.5 text-[11px] text-ink-muted">{cam.vendor ?? '—'}</td>
              <td class="px-2 py-2.5">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-medium {cam.online ? 'text-normal' : 'text-awas'}">
                  <span class="h-1.5 w-1.5 rounded-full {cam.online ? 'bg-normal' : 'bg-awas'}"></span>
                  {cam.online ? 'Online' : 'Offline'}
                </span>
              </td>
              <td class="px-3.5 py-2.5 font-mono text-[10px] text-ink-dim">RTSP · HLS</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Panel>
</div>
