<script lang="ts">
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import { INSTRUMENT_STATUS } from '../../instruments';
  import type { Bendungan, Instrument } from '../../types';

  interface Props {
    bendungan: Bendungan;
    /** id instrumen yang sedang disorot (hover di daftar) */
    activeId?: string | null;
    onselect?: (id: string) => void;
    height?: number;
  }
  let { bendungan, activeId = null, onselect, height = 300 }: Props = $props();

  const GOOGLE_SATELLITE = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';

  let el: HTMLDivElement;
  let map: L.Map | undefined;
  let tileLayer: L.TileLayer | undefined;
  const layer = L.layerGroup();
  const reg = new Map<string, L.Marker>();
  let geoLayer: L.GeoJSON | undefined;

  /** instrumen yang punya koordinat */
  const placed = $derived(bendungan.instruments.filter((i) => i.lat != null && i.lng != null));

  function iconFor(it: Instrument, active: boolean) {
    const color = INSTRUMENT_STATUS[it.status].color;
    const size = active ? 30 : 24;
    const ring = active ? '<span class="ring"></span>' : '';
    return L.divIcon({
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: `<div class="bws-inst-marker ${active ? 'active' : ''}" style="color:${color};width:${size}px;height:${size}px">
        ${ring}<span class="core"></span></div>`,
    });
  }

  function tip(it: Instrument) {
    const c = INSTRUMENT_STATUS[it.status].color;
    return `<div style="font-weight:600;color:var(--color-ink-strong)">${it.type}</div>
      <div style="color:var(--color-ink-dim);font-size:10px;max-width:180px">${it.name}</div>
      ${it.lokasi ? `<div style="color:var(--color-ink-muted);font-size:10px;margin-top:2px">📍 ${it.lokasi}</div>` : ''}
      <div style="margin-top:3px"><span style="color:var(--color-ink-muted)">Nilai:</span>
      <span style="font-family:var(--font-mono);color:${c}">${it.value} ${it.unit}</span></div>`;
  }

  function applyTiles() {
    if (!map) return;
    if (tileLayer) tileLayer.remove();
    tileLayer = L.tileLayer(GOOGLE_SATELLITE, {
      attribution: 'Imagery &copy; Google',
      subdomains: ['0', '1', '2', '3'],
      maxNativeZoom: 20,
      maxZoom: 21,
    }).addTo(map);
  }

  function featureStyle(feature?: GeoJSON.Feature): L.PathOptions {
    const kind = feature?.properties?.kind;
    if (kind === 'reservoir') {
      return {
        color: '#4f9bee',
        weight: 1.2,
        opacity: 0.75,
        fillColor: '#4f9bee',
        fillOpacity: 0.16,
      };
    }
    if (kind === 'dam') {
      return {
        color: '#f0b429',
        weight: 2.5,
        opacity: 0.95,
        fillColor: '#f0b429',
        fillOpacity: 0.18,
      };
    }
    return {
      color: '#c3cdde',
      weight: 1.5,
      opacity: 0.7,
      dashArray: '4 4',
      fillOpacity: 0.05,
    };
  }

  function renderGeoJson() {
    if (!map) return;
    if (geoLayer) {
      layer.removeLayer(geoLayer);
      geoLayer = undefined;
    }
    if (!bendungan.geojson) return;
    geoLayer = L.geoJSON(bendungan.geojson as GeoJSON.GeoJsonObject, {
      style: featureStyle,
      onEachFeature(feature, featureLayer) {
        const name = feature.properties?.name;
        if (name) {
          featureLayer.bindTooltip(String(name), {
            direction: 'center',
            className: 'bws-tip',
            opacity: 0.95,
          });
        }
      },
    });
    geoLayer.addTo(layer);
  }

  function fitToContent() {
    if (!map) return;
    const bounds = L.latLngBounds([]);
    if (geoLayer) bounds.extend(geoLayer.getBounds());
    for (const it of placed) bounds.extend([it.lat!, it.lng!]);
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.22), { animate: false });
    else map.setView([bendungan.lat, bendungan.lng], 16);
  }

  function sync() {
    if (!map) return;
    const seen = new Set<string>();
    for (const it of placed) {
      seen.add(it.id);
      const active = it.id === activeId;
      const existing = reg.get(it.id);
      if (!existing) {
        const m = L.marker([it.lat!, it.lng!], { icon: iconFor(it, active) })
          .bindTooltip(tip(it), { direction: 'top', offset: [0, -12], className: 'bws-tip', opacity: 1 })
          .on('click', () => onselect?.(it.id));
        m.addTo(layer);
        reg.set(it.id, m);
      } else {
        existing.setIcon(iconFor(it, active));
        existing.setTooltipContent(tip(it));
      }
    }
    // buang yang tak ada lagi
    for (const [id, m] of reg) {
      if (!seen.has(id)) {
        m.remove();
        reg.delete(id);
      }
    }
  }

  // perbarui saat data / sorotan berubah
  $effect(() => {
    void activeId;
    void placed;
    sync();
  });

  onMount(() => {
    map = L.map(el, {
      center: [bendungan.lat, bendungan.lng],
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    applyTiles();
    layer.addTo(map);
    renderGeoJson();

    // penanda tubuh bendungan (lingkaran halus)
    L.circle([bendungan.lat, bendungan.lng], {
      radius: 60,
      color: '#4f9bee',
      weight: 1,
      opacity: 0.5,
      fillColor: '#4f9bee',
      fillOpacity: 0.06,
    }).addTo(layer);

    sync();
    fitToContent();
    setTimeout(() => map?.invalidateSize(), 60);

    const ro = new ResizeObserver(() => map?.invalidateSize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      map?.remove();
      map = undefined;
      reg.clear();
    };
  });
</script>

<div class="bws-dam-map-tilt relative w-full overflow-hidden rounded-lg" style="height:{height}px">
  <div bind:this={el} class="h-full w-full"></div>
</div>
