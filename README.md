# Pusat Kendali — Dashboard Monitoring Balai Wilayah Sungai

Command center terpusat untuk monitoring Balai Wilayah Sungai (BWS): hidrologi,
bendungan, irigasi (termasuk sumur pantau muka air tanah), serta banjir & O&P.
Prototipe UI dengan **data dummy realistis** dan **simulasi realtime** — siap
di-wire ke API/backend sungguhan pada tahap berikutnya.

> Wilayah & aset bersifat fiktif (koordinat area Banten–Jabar agar peta nyata).

## Fitur

- **Dua mode tampilan**
  - _Interaktif_ — navigasi tab per divisi + drill-down detail per pos/aset.
  - _Layar Dinding_ — tampilan besar untuk videotron/command room (tanpa navigasi).
- **Peta Leaflet** (tile gelap CARTO) dengan penanda berwarna sesuai status,
  tooltip, dan klik → halaman detail.
- **Halaman detail aset** — klik pos/bendungan/DI/sumur/aset → halaman analisa
  penuh: grafik per periode (6/24/48 jam), statistik (min/maks/rata-rata), tabel
  pembacaan terkini, dan **daftar instrumen terpasang** (AWLR, ARR, piezometer,
  V-notch, inklinometer, CCTV, dll) lengkap dengan status online/offline, nilai
  terkini, dan grafik mini per alat.
- **Status siaga berjenjang**: Normal / Waspada / Siaga / Awas, dengan panel
  peringatan aktif & ambang per pos.
- **Modul divisi**
  - Hidrologi — pos duga air (TMA, debit, curah hujan) + grafik 48 jam.
  - Bendungan — elevasi vs MAB, tampungan, inflow/outflow, pintu spillway.
  - Irigasi & Air Tanah — daerah irigasi (pemenuhan air, pintu) + sumur pantau.
  - Banjir & O&P — EWS banjir + kondisi/progres pemeliharaan aset.
  - Analisa Data — tren, korelasi hujan–TMA, perbandingan antar pos/bendungan.
- **Simulasi live** — nilai, status, dan peringatan ter-update otomatis tiap 4 dtk
  (tombol jeda di header).

## Stack

- Svelte 5 + Vite + TypeScript
- Tailwind CSS v4 (plugin `@tailwindcss/vite`)
- Leaflet (peta)
- Geist Sans / Geist Mono (`@fontsource`)
- Lucide (`@lucide/svelte`) — ikon line

## Bahasa desain

Tema gelap _mission-control_ (slate-navy). Aksen **palet logo PU**: biru azur
`#1D6FD6` untuk elemen interaktif, kuning-emas `#F0B429` tipis untuk highlight.
Warna status diredam agar terbaca jelas. Tombol bergaya _soft/tinted_.

## Menjalankan

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build produksi → dist/
npm run preview   # preview hasil build
npm run check     # type-check (svelte-check + tsc)
```

## Deploy (VPS + pm2)

Routing memakai **History API** → URL bersih (mis. `/bendungan/bend-cigaru`,
tanpa `#`). Konsekuensinya server harus mengarahkan semua path ke `index.html`
(SPA fallback), kalau tidak refresh/buka-link-langsung akan 404. pm2 sudah
menyediakannya lewat opsi `--spa`:

```bash
npm run build                 # → dist/
pm2 start ecosystem.config.cjs    # serve dist/ di :8080 dengan SPA fallback
# atau manual:  pm2 serve dist 8080 --spa
```

nginx tinggal reverse-proxy ke port tersebut — **tanpa aturan rewrite khusus**:

```nginx
location / {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
}
```

> Alternatif tanpa pm2: serve `dist/` langsung dari nginx dan tambahkan
> `try_files $uri /index.html;` di blok `location /`.

## Struktur

```
src/
  app.css                     # tema, token warna (Tailwind @theme), Geist, Leaflet
  App.svelte                  # shell: TopBar + tab/mode + drawer
  lib/
    types.ts                  # model domain
    status.ts                 # konfigurasi status siaga + helper
    format.ts                 # format angka/tanggal (id-ID)
    series.ts                 # util deret waktu
    stores.ts                 # store global + mesin simulasi live
    config/nav.ts             # definisi tab/modul
    data/
      seed.ts                 # dataset awal (region fiktif)
      derive.ts               # turunan status per jenis aset
    components/
      ui/                     # Panel, Button, KpiCard, Gauge, LevelBar, charts…
      layout/                 # TopBar, TabNav, Emblem
      map/                    # BasinMap (Leaflet), MapLegend
      panels/                 # AlertPanel, DetailDrawer
      modules/                # Overview, Hidrologi, Bendungan, Irigasi, Banjir, Analisa
      views/                  # WallView (mode layar dinding)
      icons/                  # DamIcon
```

## Wiring data asli (nanti)

Ganti `src/lib/data/seed.ts` + mesin di `src/lib/stores.ts` dengan pemanggilan
API. Komponen UI hanya bergantung pada store (`data`, `markers`, `activeAlerts`,
dst.), jadi tampilan tidak perlu diubah.
