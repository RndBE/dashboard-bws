import json
import math
import re
from pathlib import Path

import requests


OUT_DIR = Path("geojson_bendungan_kalimantan_besar")
OUT_DIR.mkdir(exist_ok=True)

UA = {"User-Agent": "dashboard-bws-demo/1.0"}


def safe_slug(value):
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", value).strip("_").lower()


def normalize_position(pos):
    return [pos[0], pos[1]]


def normalize_coords(value):
    if isinstance(value, list) and value and isinstance(value[0], (int, float)):
        return normalize_position(value)
    if isinstance(value, list):
        return [normalize_coords(v) for v in value]
    return value


def normalize_geometry(geometry):
    return {
        "type": geometry["type"],
        "coordinates": normalize_coords(geometry["coordinates"]),
    }


def iter_xy(geometry):
    coords = geometry.get("coordinates", [])
    if geometry.get("type") == "Polygon":
        for ring in coords:
            for x, y, *_ in ring:
                yield x, y
    elif geometry.get("type") == "MultiPolygon":
        for poly in coords:
            for ring in poly:
                for x, y, *_ in ring:
                    yield x, y
    elif geometry.get("type") == "LineString":
        for x, y, *_ in coords:
            yield x, y


def signed_ring_area(ring):
    if len(ring) < 4:
        return 0
    return sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:])) / 2


def area_km2(geometry):
    if geometry.get("type") == "Polygon":
        polygons = [geometry["coordinates"]]
    elif geometry.get("type") == "MultiPolygon":
        polygons = geometry["coordinates"]
    else:
        return 0

    total_deg2 = 0
    points = list(iter_xy(geometry))
    lat = sum(y for _, y in points) / len(points)
    for poly in polygons:
        for idx, ring in enumerate(poly):
            ring2 = [(p[0], p[1]) for p in ring]
            area = abs(signed_ring_area(ring2))
            total_deg2 += area if idx == 0 else -area
    return abs(total_deg2) * (111.32**2) * math.cos(math.radians(lat))


def centroid(geometry):
    points = list(iter_xy(geometry))
    return {
        "lat": sum(y for _, y in points) / len(points),
        "lng": sum(x for x, _ in points) / len(points),
    }


def big_riam_kanan():
    url = (
        "https://geoservices.big.go.id/rbi/rest/services/"
        "BASEMAP/Rupabumi_Indonesia/MapServer/876/query"
    )
    params = {
        "where": "UPPER(NAMOBJ) LIKE '%RIAMKANAN%'",
        "outFields": "*",
        "returnGeometry": "true",
        "outSR": "4326",
        "resultRecordCount": "10",
        "f": "geojson",
    }
    data = requests.get(url, params=params, timeout=60).json()
    features = data.get("features", [])
    if not features:
        raise RuntimeError("BIG layer 876 tidak mengembalikan Riamkanan")
    feature = max(features, key=lambda ft: area_km2(ft["geometry"]))
    feature["geometry"] = normalize_geometry(feature["geometry"])
    feature["properties"] = {
        **feature.get("properties", {}),
        "name": "Waduk Riam Kanan",
        "kind": "reservoir",
        "source": "BIG RBI layer 876 Danau (area)",
    }
    return [feature]


def nominatim_feature(query, kind, display_name):
    data = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={
            "q": query,
            "format": "jsonv2",
            "polygon_geojson": 1,
            "limit": 1,
        },
        headers=UA,
        timeout=60,
    ).json()
    if not data or "geojson" not in data[0]:
        raise RuntimeError(f"Nominatim tidak menemukan polygon untuk {query}")
    item = data[0]
    return {
        "type": "Feature",
        "properties": {
            "name": display_name,
            "kind": kind,
            "source": f"OpenStreetMap {item['osm_type']} {item['osm_id']}",
        },
        "geometry": normalize_geometry(item["geojson"]),
    }


TARGETS = [
    {
        "id": "bend-riam-kanan",
        "name": "Waduk Riam Kanan",
        "river": "S. Riam Kanan",
        "features": big_riam_kanan,
        "notes": "Reservoir besar PLTA Ir. P.M. Noor dari BIG.",
    },
    {
        "id": "bend-tapin",
        "name": "Bendungan Tapin",
        "river": "S. Tapin",
        "features": lambda: [
            nominatim_feature("Waduk Tapin", "reservoir", "Waduk Tapin"),
            nominatim_feature("Bendungan Tapin", "dam", "Bendungan Tapin"),
        ],
        "notes": "Bendungan multiguna Kalimantan Selatan; polygon OSM lebih mutakhir daripada RBI.",
    },
    {
        "id": "bend-sepaku-semoi",
        "name": "Bendungan Sepaku Semoi",
        "river": "S. Sepaku / S. Semoi",
        "features": lambda: [
            nominatim_feature("Waduk Sepaku Semoi", "reservoir", "Waduk Sepaku Semoi"),
            nominatim_feature("Bendungan Sepaku Semoi", "dam", "Bendungan Sepaku Semoi"),
        ],
        "notes": "Bendungan air baku IKN; polygon OSM dipakai karena proyek baru.",
    },
    {
        "id": "bend-manggar",
        "name": "Bendungan Manggar",
        "river": "S. Manggar",
        "features": lambda: [
            nominatim_feature("Waduk Manggar Balikpapan", "reservoir", "Waduk Manggar"),
            nominatim_feature("Bendungan Manggar Balikpapan", "dam", "Bendungan Manggar"),
        ],
        "notes": "Sumber air baku utama Balikpapan; polygon waduk dan tubuh bendungan dari OSM.",
    },
    {
        "id": "bend-benanga",
        "name": "Bendungan Benanga",
        "river": "S. Karang Mumus",
        "features": lambda: [
            nominatim_feature("Waduk Benanga Samarinda", "reservoir", "Waduk Benanga"),
        ],
        "notes": "Bendungan/waduk pengendali aliran Karang Mumus di Samarinda; OSM menyediakan polygon waduk.",
    },
    {
        "id": "bend-teritip",
        "name": "Bendungan Teritip",
        "river": "S. Teritip",
        "features": lambda: [
            nominatim_feature("Waduk Teritip Balikpapan", "reservoir", "Waduk Teritip"),
            nominatim_feature("Bendungan Teritip Balikpapan", "dam", "Bendungan Teritip"),
        ],
        "notes": "Bendungan air baku Balikpapan Timur; polygon waduk dan bendungan dari OSM.",
    },
]


summary = []
for target in TARGETS:
    features = target["features"]()
    fc = {
        "type": "FeatureCollection",
        "name": target["name"],
        "features": features,
    }
    reservoir = next((f for f in features if f["properties"]["kind"] == "reservoir"), features[0])
    center = centroid(reservoir["geometry"])
    total_area = sum(area_km2(f["geometry"]) for f in features if f["properties"]["kind"] == "reservoir")
    filename = OUT_DIR / f"{safe_slug(target['name'])}.geojson"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False)
    summary.append(
        {
            "id": target["id"],
            "name": target["name"],
            "river": target["river"],
            "lat": center["lat"],
            "lng": center["lng"],
            "areaKm2": round(total_area, 2),
            "file": str(filename),
            "notes": target["notes"],
        }
    )

with open(OUT_DIR / "summary.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)

print("HASIL EKSTRAK BENDUNGAN/WADUK BESAR KALIMANTAN")
for item in summary:
    print(
        f"- {item['name']} | {item['areaKm2']} km2 | "
        f"{item['lat']:.6f}, {item['lng']:.6f} | {item['file']}"
    )
