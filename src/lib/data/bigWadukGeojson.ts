import type {
  BendunganGeoJson,
  BendunganGeoJsonGeometry,
  GeoJsonPosition,
} from '../types';

import rawRiamKanan from '../../../geojson_bendungan_kalimantan_besar/waduk_riam_kanan.geojson?raw';
import rawTapin from '../../../geojson_bendungan_kalimantan_besar/bendungan_tapin.geojson?raw';
import rawSepakuSemoi from '../../../geojson_bendungan_kalimantan_besar/bendungan_sepaku_semoi.geojson?raw';
import rawManggar from '../../../geojson_bendungan_kalimantan_besar/bendungan_manggar.geojson?raw';
import rawBenanga from '../../../geojson_bendungan_kalimantan_besar/bendungan_benanga.geojson?raw';
import rawTeritip from '../../../geojson_bendungan_kalimantan_besar/bendungan_teritip.geojson?raw';

type RawGeometry = {
  type: string;
  coordinates: unknown;
};

export interface WadukBigSeed {
  id: string;
  name: string;
  river: string;
  lat: number;
  lng: number;
  geojson: BendunganGeoJson;
  source: string;
}

function normalizePosition(value: unknown): GeoJsonPosition {
  const arr = value as number[];
  return [arr[0], arr[1]];
}

function normalizeCoordinates(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  if (typeof value[0] === 'number') return normalizePosition(value);
  return value.map(normalizeCoordinates);
}

function normalizeGeometry(geometry: RawGeometry): BendunganGeoJsonGeometry {
  return {
    type: geometry.type,
    coordinates: normalizeCoordinates(geometry.coordinates),
  } as BendunganGeoJsonGeometry;
}

function buildFeature(raw: string): BendunganGeoJson {
  const parsed = JSON.parse(raw);
  return {
    type: 'FeatureCollection',
    features: parsed.features.map((feature: any) => ({
      type: 'Feature',
      properties: {
        name: feature.properties?.name ?? parsed.name,
        kind: feature.properties?.kind ?? 'reservoir',
        source: feature.properties?.source ?? 'GeoJSON eksternal',
      },
      geometry: normalizeGeometry(feature.geometry),
    })),
  };
}

export const WADUK_BIG: WadukBigSeed[] = [
  {
    id: 'bend-riam-kanan',
    name: 'Waduk Riam Kanan',
    river: 'S. Riam Kanan',
    lat: -3.516065965867721,
    lng: 115.06643751000006,
    geojson: buildFeature(rawRiamKanan),
    source: 'BIG RBI layer 876 · Danau (area) · Riamkanan',
  },
  {
    id: 'bend-tapin',
    name: 'Bendungan Tapin',
    river: 'S. Tapin',
    lat: -2.949664710747667,
    lng: 115.35257260654203,
    geojson: buildFeature(rawTapin),
    source: 'OpenStreetMap · Waduk Tapin + Bendungan Tapin',
  },
  {
    id: 'bend-sepaku-semoi',
    name: 'Bendungan Sepaku Semoi',
    river: 'S. Sepaku / S. Semoi',
    lat: -0.9020437286902285,
    lng: 116.85155340738051,
    geojson: buildFeature(rawSepakuSemoi),
    source: 'OpenStreetMap · Waduk Sepaku Semoi + Bendungan Sepaku Semoi',
  },
  {
    id: 'bend-manggar',
    name: 'Bendungan Manggar',
    river: 'S. Manggar',
    lat: -1.1560435212463671,
    lng: 116.90849800804003,
    geojson: buildFeature(rawManggar),
    source: 'OpenStreetMap · Waduk Manggar + Bendungan Manggar',
  },
  {
    id: 'bend-benanga',
    name: 'Bendungan Benanga',
    river: 'S. Karang Mumus',
    lat: -0.408087055228758,
    lng: 117.19418829150322,
    geojson: buildFeature(rawBenanga),
    source: 'OpenStreetMap · Waduk Benanga',
  },
  {
    id: 'bend-teritip',
    name: 'Bendungan Teritip',
    river: 'S. Teritip',
    lat: -1.1490366986486487,
    lng: 116.9751672481982,
    geojson: buildFeature(rawTeritip),
    source: 'OpenStreetMap · Waduk Teritip + Bendungan Teritip',
  },
];
