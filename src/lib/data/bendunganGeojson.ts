import type { BendunganGeoJson, GeoJsonPosition } from '../types';

const OSM_SOURCE = 'OpenStreetMap / ODbL (disederhanakan untuk prototype)';
const MOCK_SOURCE = 'Footprint sintetis prototype';

export const SINDANG_HEULA_GEOJSON: BendunganGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Waduk Sindang Heula',
        kind: 'reservoir',
        source: OSM_SOURCE,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [106.0952952, -6.1711237],
            [106.096735, -6.17274],
            [106.100064, -6.174144],
            [106.104392, -6.175524],
            [106.107248, -6.179957],
            [106.102606, -6.184683],
            [106.100868, -6.18688],
            [106.104781, -6.182136],
            [106.109864, -6.185498],
            [106.11319, -6.183151],
            [106.1127471, -6.1822018],
            [106.112759, -6.180449],
            [106.1105555, -6.1787257],
            [106.104502, -6.17537],
            [106.102999, -6.172002],
            [106.0956064, -6.1708943],
            [106.0952952, -6.1711237],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Bendungan Sindang Heula',
        kind: 'dam',
        source: 'OpenStreetMap way 913441130 / ODbL',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [106.112759, -6.180449],
            [106.1128449, -6.1803262],
            [106.1129427, -6.1803174],
            [106.113022, -6.1803102],
            [106.1135423, -6.1806996],
            [106.1136281, -6.1809876],
            [106.1137837, -6.1812649],
            [106.1139929, -6.1814676],
            [106.114009, -6.1816062],
            [106.1137462, -6.1819795],
            [106.1131561, -6.1822835],
            [106.1129657, -6.1823054],
            [106.1128771, -6.1823155],
            [106.1127471, -6.1822018],
            [106.112759, -6.180449],
          ],
        ],
      },
    },
  ],
};

export function syntheticBendunganGeoJson(b: {
  name: string;
  lat: number;
  lng: number;
}): BendunganGeoJson {
  const u = 0.001;
  const reservoir: GeoJsonPosition[] = [
    [b.lng - 2.8 * u, b.lat + 1.4 * u],
    [b.lng - 1.8 * u, b.lat + 2.2 * u],
    [b.lng - 0.4 * u, b.lat + 2.0 * u],
    [b.lng + 0.8 * u, b.lat + 1.3 * u],
    [b.lng + 2.2 * u, b.lat + 0.7 * u],
    [b.lng + 1.8 * u, b.lat - 0.2 * u],
    [b.lng + 0.4 * u, b.lat - 0.8 * u],
    [b.lng - 1.3 * u, b.lat - 0.5 * u],
    [b.lng - 2.6 * u, b.lat + 0.4 * u],
    [b.lng - 2.8 * u, b.lat + 1.4 * u],
  ];
  const dam: GeoJsonPosition[] = [
    [b.lng - 1.4 * u, b.lat - 0.6 * u],
    [b.lng - 0.4 * u, b.lat - 0.78 * u],
    [b.lng + 0.7 * u, b.lat - 0.7 * u],
    [b.lng + 1.5 * u, b.lat - 0.38 * u],
  ];

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: `Area genangan ${b.name}`,
          kind: 'reservoir',
          source: MOCK_SOURCE,
        },
        geometry: { type: 'Polygon', coordinates: [reservoir] },
      },
      {
        type: 'Feature',
        properties: {
          name: `Tubuh ${b.name}`,
          kind: 'dam',
          source: MOCK_SOURCE,
        },
        geometry: { type: 'LineString', coordinates: dam },
      },
    ],
  };
}
