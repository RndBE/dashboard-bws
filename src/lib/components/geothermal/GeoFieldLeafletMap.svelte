<script lang="ts">
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import { num } from '../../format';
  import { statusColor } from '../../status';
  import type { Well } from '../../geothermal/types';

  interface Props {
    wells: Well[];
    selectedId: string;
    onselect?: (id: string) => void;
    height?: number;
  }

  let { wells, selectedId, onselect, height = 520 }: Props = $props();

  const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  let el: HTMLDivElement;
  let map: L.Map | undefined;
  let tileLayer: L.TileLayer | undefined;
  const pipeLayer = L.layerGroup();
  const nodeLayer = L.layerGroup();
  const wellLayer = L.layerGroup();
  let fitted = false;

  function avg(items: number[]): number {
    return items.length ? items.reduce((s, v) => s + v, 0) / items.length : 0;
  }

  function fieldCenter(): L.LatLngTuple {
    if (!wells.length) return [-7.252, 109.107];
    return [avg(wells.map((w) => w.lat)), avg(wells.map((w) => w.lng))];
  }

  function fieldNodes() {
    if (!wells.length) {
      const center = fieldCenter();
      return { separator: center, reinjectionHub: center };
    }

    const prod = wells.filter((w) => w.type === 'production');
    const reinj = wells.filter((w) => w.type === 'reinjection');
    const lats = wells.map((w) => w.lat);
    const lngs = wells.map((w) => w.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const spanLat = Math.max(0.006, maxLat - minLat);
    const centerLng = avg(lngs);

    const separatorLng = prod.length ? avg(prod.map((w) => w.lng)) : centerLng;
    const reinjLng = reinj.length ? avg(reinj.map((w) => w.lng)) : centerLng;

    return {
      separator: [maxLat + spanLat * 0.22, separatorLng] as L.LatLngTuple,
      reinjectionHub: [minLat - spanLat * 0.18, reinjLng] as L.LatLngTuple,
    };
  }

  function applyTiles(): void {
    if (!map) return;
    if (tileLayer) tileLayer.remove();
    tileLayer = L.tileLayer(TILE_DARK, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  }

  function wellIcon(well: Well, selected: boolean): L.DivIcon {
    const color = statusColor(well.status);
    const size = selected ? 34 : 28;
    const pulse = well.status === 'normal' ? '' : 'pulse';
    return L.divIcon({
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: `<div class="geo-well-marker ${well.type} ${pulse} ${selected ? 'selected' : ''}" style="color:${color};width:${size}px;height:${size}px">
        <span class="halo"></span><span class="core"></span><span class="label">${well.id}</span>
      </div>`,
    });
  }

  function nodeIcon(label: string, kind: 'separator' | 'reinjection'): L.DivIcon {
    return L.divIcon({
      className: '',
      iconSize: kind === 'separator' ? [64, 28] : [82, 28],
      iconAnchor: kind === 'separator' ? [32, 14] : [41, 14],
      html: `<div class="geo-field-node ${kind}">${label}</div>`,
    });
  }

  function wellTip(well: Well): string {
    const c = statusColor(well.status);
    return `<div style="font-weight:700;color:var(--color-ink-strong)">${well.name}</div>
      <div style="margin-top:1px;color:var(--color-ink-dim);font-size:10px;text-transform:capitalize">${well.type} well · ${well.id}</div>
      <div style="margin-top:5px;display:grid;grid-template-columns:auto auto;column-gap:10px;row-gap:2px">
        <span style="color:var(--color-ink-muted)">Status</span><span style="font-weight:700;color:${c};text-transform:uppercase">${well.status}</span>
        <span style="color:var(--color-ink-muted)">WHP</span><span style="font-family:var(--font-mono);color:var(--color-ink-strong)">${num(well.telemetry.wellPressure, 1)} bar</span>
        <span style="color:var(--color-ink-muted)">Flow</span><span style="font-family:var(--font-mono);color:var(--color-ink-strong)">${num(well.telemetry.flowM3h, 1)} m³/h</span>
        <span style="color:var(--color-ink-muted)">Gross MW</span><span style="font-family:var(--font-mono);color:var(--color-ink-strong)">${num(well.output.mw, 1)}</span>
      </div>`;
  }

  function addPipe(from: L.LatLngExpression, to: L.LatLngExpression, color: string, dashArray?: string): void {
    L.polyline([from, to], {
      color: '#07101c',
      weight: 7,
      opacity: 0.72,
      interactive: false,
    }).addTo(pipeLayer);
    L.polyline([from, to], {
      color,
      weight: 2.5,
      opacity: 0.78,
      dashArray,
      interactive: false,
    }).addTo(pipeLayer);
  }

  function fitToField(): void {
    if (!map || fitted || !wells.length) return;
    const nodes = fieldNodes();
    const bounds = L.latLngBounds([]);
    for (const w of wells) bounds.extend([w.lat, w.lng]);
    bounds.extend(nodes.separator);
    bounds.extend(nodes.reinjectionHub);
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.22), { animate: false, maxZoom: 15 });
      fitted = true;
    }
  }

  function sync(): void {
    if (!map) return;
    pipeLayer.clearLayers();
    nodeLayer.clearLayers();
    wellLayer.clearLayers();

    const nodes = fieldNodes();
    const production = wells.filter((w) => w.type === 'production');
    const reinjection = wells.filter((w) => w.type === 'reinjection');

    for (const w of production) addPipe([w.lat, w.lng], nodes.separator, '#3fb27f');
    addPipe(nodes.separator, nodes.reinjectionHub, '#4f9bee', '8 6');
    for (const w of reinjection) addPipe(nodes.reinjectionHub, [w.lat, w.lng], '#22b8e0', '4 5');

    L.marker(nodes.separator, { icon: nodeIcon('SEP', 'separator'), interactive: false })
      .bindTooltip('Separator manifold', { direction: 'top', offset: [0, -12], className: 'bws-tip', opacity: 1 })
      .addTo(nodeLayer);
    L.marker(nodes.reinjectionHub, { icon: nodeIcon('RI HUB', 'reinjection'), interactive: false })
      .bindTooltip('Reinjection hub', { direction: 'bottom', offset: [0, 12], className: 'bws-tip', opacity: 1 })
      .addTo(nodeLayer);

    for (const w of wells) {
      const marker = L.marker([w.lat, w.lng], { icon: wellIcon(w, w.id === selectedId) })
        .bindTooltip(wellTip(w), { direction: 'top', offset: [0, -16], className: 'bws-tip', opacity: 1 })
        .on('click', () => onselect?.(w.id));
      marker.addTo(wellLayer);
    }

    fitToField();
  }

  onMount(() => {
    map = L.map(el, {
      center: fieldCenter(),
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });
    applyTiles();
    pipeLayer.addTo(map);
    nodeLayer.addTo(map);
    wellLayer.addTo(map);
    sync();

    setTimeout(() => map?.invalidateSize(), 80);
    const ro = new ResizeObserver(() => map?.invalidateSize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      map?.remove();
      map = undefined;
      pipeLayer.clearLayers();
      nodeLayer.clearLayers();
      wellLayer.clearLayers();
    };
  });

  $effect(() => {
    void wells;
    void selectedId;
    sync();
  });
</script>

<div class="geo-field-map relative w-full overflow-hidden rounded-lg border border-line bg-[#07101c]" style="height:{height}px">
  <div bind:this={el} class="h-full w-full"></div>
</div>

<style>
  :global(.geo-well-marker) {
    position: relative;
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  :global(.geo-well-marker .halo) {
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    border: 1.5px solid currentColor;
    opacity: 0.42;
  }
  :global(.geo-well-marker .core) {
    width: 13px;
    height: 13px;
    border-radius: 9999px;
    background: currentColor;
    border: 2px solid rgba(7, 16, 28, 0.9);
    box-shadow: 0 0 0 3px rgba(7, 16, 28, 0.74);
  }
  :global(.geo-well-marker.reinjection .core) {
    border-radius: 2px;
    transform: rotate(45deg);
  }
  :global(.geo-well-marker.selected .core) {
    width: 16px;
    height: 16px;
    box-shadow:
      0 0 0 4px rgba(7, 16, 28, 0.72),
      0 0 16px 4px currentColor;
  }
  :global(.geo-well-marker.selected .halo),
  :global(.geo-well-marker.pulse .halo) {
    animation: bws-pulse 1.8s ease-out infinite;
    opacity: 0.7;
  }
  :global(.geo-well-marker .label) {
    position: absolute;
    left: 50%;
    top: -18px;
    transform: translateX(-50%);
    padding: 1px 4px;
    border: 1px solid rgba(79, 155, 238, 0.22);
    border-radius: 4px;
    background: rgba(7, 16, 28, 0.86);
    color: var(--color-ink-strong);
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
  }
  :global(.geo-field-node) {
    display: grid;
    height: 28px;
    place-items: center;
    border: 1px solid rgba(79, 155, 238, 0.42);
    border-radius: 7px;
    background: rgba(10, 17, 32, 0.9);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.36);
    color: var(--color-ink-strong);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0;
  }
  :global(.geo-field-node.reinjection) {
    border-color: rgba(34, 184, 224, 0.42);
  }
</style>
