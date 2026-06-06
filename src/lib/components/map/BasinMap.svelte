<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import L from 'leaflet';
  import { markers, openDetail } from '../../stores';
  import { statusColor } from '../../status';
  import { KIND_LABEL } from '../../status';
  import { MAP_CENTER, MAP_ZOOM } from '../../data/seed';
  import type { MapMarker } from '../../types';

  interface Props {
    overlay?: Snippet;
    zoom?: number;
    interactive?: boolean;
  }
  let { overlay, zoom = MAP_ZOOM, interactive = true }: Props = $props();

  let el: HTMLDivElement;
  let map: L.Map | undefined;
  const layer = L.layerGroup();
  const reg = new Map<string, { marker: L.Marker; status: string }>();

  function iconFor(m: MapMarker) {
    const color = statusColor(m.status);
    const pulse = m.status === 'normal' ? '' : 'pulse';
    return L.divIcon({
      className: '',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      html: `<div class="bws-marker ${pulse}" style="color:${color};width:22px;height:22px;position:relative;">
        <span class="ring"></span><span class="core"></span></div>`,
    });
  }

  function tipFor(m: MapMarker) {
    return `<div style="font-weight:600;color:var(--color-ink-strong)">${m.name}</div>
      <div style="color:var(--color-ink-dim);font-size:10px">${KIND_LABEL[m.kind]}</div>
      <div style="margin-top:3px"><span style="color:var(--color-ink-muted)">${m.primaryLabel}:</span>
      <span style="font-family:var(--font-mono);color:${statusColor(m.status)}">${m.primaryValue}</span></div>`;
  }

  function sync(ms: MapMarker[]) {
    if (!map) return;
    for (const m of ms) {
      const existing = reg.get(m.id);
      if (!existing) {
        const marker = L.marker([m.lat, m.lng], { icon: iconFor(m) })
          .bindTooltip(tipFor(m), {
            direction: 'top',
            offset: [0, -10],
            className: 'bws-tip',
            opacity: 1,
          })
          .on('click', () => openDetail(m.kind, m.id));
        marker.addTo(layer);
        reg.set(m.id, { marker, status: m.status });
      } else {
        if (existing.status !== m.status) {
          existing.marker.setIcon(iconFor(m));
          existing.status = m.status;
        }
        existing.marker.setTooltipContent(tipFor(m));
      }
    }
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

    return () => {
      unsub();
      map?.remove();
      map = undefined;
      reg.clear();
    };
  });
</script>

<div class="relative h-full w-full">
  <div bind:this={el} class="h-full w-full"></div>
  {#if overlay}
    <div class="pointer-events-none absolute inset-0 z-[500]">
      {@render overlay()}
    </div>
  {/if}
</div>
