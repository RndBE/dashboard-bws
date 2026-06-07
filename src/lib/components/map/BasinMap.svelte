<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import L from 'leaflet';
  import { get } from 'svelte/store';
  import { markers, openDetail, paused } from '../../stores';
  import { statusColor, STATUS } from '../../status';
  import { KIND_LABEL } from '../../status';
  import { MAP_CENTER, MAP_ZOOM } from '../../data/seed';
  import type { AssetKind, MapMarker } from '../../types';

  interface Props {
    overlay?: Snippet;
    zoom?: number;
    interactive?: boolean;
    /** auto-tour: sorot pos-pos (prioritas siaga+) secara berkala — untuk videowall */
    autoTour?: boolean;
    /** kelas tambahan utk styling khusus dinding (mis. sembunyikan kontrol) */
    wall?: boolean;
    /** jenis aset yang disembunyikan dari peta (filter layer) */
    hiddenKinds?: AssetKind[];
    /** jenis instrumen yang dimatikan — aset tampil bila punya ≥1 instrumen aktif */
    hiddenInstruments?: string[];
  }
  let {
    overlay,
    zoom = MAP_ZOOM,
    interactive = true,
    autoTour = false,
    wall = false,
    hiddenKinds = [],
    hiddenInstruments = [],
  }: Props = $props();

  /** lolos filter bila kategori aset aktif & punya ≥1 instrumen aktif */
  function pass(m: MapMarker): boolean {
    if (hiddenKinds.includes(m.kind)) return false;
    if (hiddenInstruments.length) {
      const types = m.instrumentTypes ?? [];
      if (!types.some((t) => !hiddenInstruments.includes(t))) return false;
    }
    return true;
  }

  let el: HTMLDivElement;
  let map: L.Map | undefined;
  const layer = L.layerGroup();
  const reg = new Map<string, { marker: L.Marker; status: string; focused: boolean }>();
  let focusedId: string | null = null;

  function iconFor(m: MapMarker, focused = false) {
    const color = statusColor(m.status);
    const pulse = m.status === 'normal' ? '' : 'pulse';
    const focusCls = focused ? 'focus' : '';
    const size = focused ? 30 : 22;
    return L.divIcon({
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: `<div class="bws-marker ${pulse} ${focusCls}" style="color:${color};width:${size}px;height:${size}px;position:relative;">
        <span class="ring"></span><span class="core"></span></div>`,
    });
  }

  function tipFor(m: MapMarker) {
    return `<div style="font-weight:600;color:var(--color-ink-strong)">${m.name}</div>
      <div style="color:var(--color-ink-dim);font-size:10px">${KIND_LABEL[m.kind]}</div>
      <div style="margin-top:3px"><span style="color:var(--color-ink-muted)">${m.primaryLabel}:</span>
      <span style="font-family:var(--font-mono);color:${statusColor(m.status)}">${m.primaryValue}</span></div>`;
  }

  let latest: MapMarker[] = [];

  function sync(ms: MapMarker[]) {
    latest = ms;
    if (!map) return;
    for (const m of ms) {
      const existing = reg.get(m.id);
      const focused = focusedId === m.id;
      // filter: sembunyikan marker yang tak lolos (kategori / instrumen)
      if (!pass(m)) {
        if (existing) {
          layer.removeLayer(existing.marker);
          reg.delete(m.id);
        }
        continue;
      }
      if (!existing) {
        const marker = L.marker([m.lat, m.lng], { icon: iconFor(m, focused) })
          .bindTooltip(tipFor(m), {
            direction: 'top',
            offset: [0, -10],
            className: 'bws-tip',
            opacity: 1,
          })
          .on('click', () => openDetail(m.kind, m.id));
        marker.addTo(layer);
        reg.set(m.id, { marker, status: m.status, focused });
      } else {
        if (existing.status !== m.status || existing.focused !== focused) {
          existing.marker.setIcon(iconFor(m, focused));
          existing.status = m.status;
          existing.focused = focused;
        }
        existing.marker.setTooltipContent(tipFor(m));
      }
    }
  }

  /** urutan tur: pos siaga+ dulu (terburuk lebih dulu), lalu sisanya — hanya yang tampil */
  function tourOrder(ms: MapMarker[]): MapMarker[] {
    const vis = ms.filter(pass);
    const sev = (m: MapMarker) => STATUS[m.status].weight;
    const critical = vis.filter((m) => m.status !== 'normal').sort((a, b) => sev(b) - sev(a));
    const rest = vis.filter((m) => m.status === 'normal');
    return critical.length ? [...critical, ...rest.slice(0, 3)] : vis;
  }

  onMount(() => {
    map = L.map(el, {
      center: MAP_CENTER,
      zoom,
      zoomControl: interactive,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      touchZoom: interactive,
    });
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      },
    ).addTo(map);
    layer.addTo(map);

    const unsub = markers.subscribe((ms) => sync(ms));
    setTimeout(() => map?.invalidateSize(), 60);

    // jaga ukuran peta tetap sesuai kontainer (mis. saat grid menyempit setelah mount)
    let roTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(roTimer);
      roTimer = setTimeout(() => map?.invalidateSize(), 80);
    });
    ro.observe(el);

    // ---- auto-tour untuk videowall ----
    let tourTimer: ReturnType<typeof setInterval> | undefined;
    let tourStart: ReturnType<typeof setTimeout> | undefined;
    if (autoTour) {
      let idx = 0;
      const baseZoom = zoom;
      const step = () => {
        if (!map || get(paused)) return;
        const order = tourOrder(latest);
        if (!order.length) return;
        const m = order[idx % order.length];
        idx++;
        focusedId = m.id;
        sync(latest); // perbarui ikon fokus
        map.flyTo([m.lat, m.lng], baseZoom + 1.6, { duration: 2.4, easeLinearity: 0.18 });
      };
      // mulai setelah peta settle, lalu ulang berkala
      tourStart = setTimeout(step, 3500);
      tourTimer = setInterval(step, 7000);
    }

    return () => {
      unsub();
      ro.disconnect();
      clearTimeout(roTimer);
      if (tourTimer) clearInterval(tourTimer);
      if (tourStart) clearTimeout(tourStart);
      map?.remove();
      map = undefined;
      reg.clear();
    };
  });

  // re-filter marker saat prop visibilitas berubah (toggle layer / instrumen)
  $effect(() => {
    void hiddenKinds;
    void hiddenInstruments;
    if (map) sync(latest);
  });
</script>

<div class="relative h-full w-full">
  <div bind:this={el} class="h-full w-full {wall ? 'wall-map' : ''}"></div>
  {#if overlay}
    <div class="pointer-events-none absolute inset-0 z-[500]">
      {@render overlay()}
    </div>
  {/if}
</div>
