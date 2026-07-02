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
npm start         # serve dist/ + endpoint /api/chat di :4781
npm run preview   # preview hasil build
npm test          # unit test helper chatbot
npm run check     # type-check (svelte-check + tsc)
```

### Chatbot GPT

Chatbot GPT di Layar Dinding memakai endpoint server-side `POST /api/chat`, jadi
secret OpenAI tidak pernah dikirim ke browser. Set environment berikut sebelum
menjalankan server:

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-5.5"   # opsional
npm run build
npm start
```

Untuk development dengan Vite, jalankan API server dan Vite di dua terminal:

```bash
OPENAI_API_KEY="sk-..." npm run dev:api
npm run dev
```

Di videowall, aktifkan tombol mic satu kali agar browser meminta izin mikrofon.
Setelah voice standby, chat dapat dipanggil dengan frasa seperti
`STESY buka chat` dan disembunyikan dengan `STESY tutup chat`.

## Deploy (VPS + pm2)

Routing memakai **History API** → URL bersih (mis. `/bendungan/bend-cigaru`,
tanpa `#`). `server/index.js` mengarahkan path non-file ke `index.html`
(SPA fallback) dan menyediakan endpoint `/api/chat`.

```bash
export OPENAI_API_KEY="sk-..."
npm run build                 # → dist/
pm2 start ecosystem.config.cjs # serve dist/ + /api/chat di :4781
# atau manual:  OPENAI_API_KEY="sk-..." npm start
```

nginx tinggal reverse-proxy ke port tersebut — **tanpa aturan rewrite khusus**:

```nginx
location / {
    proxy_pass http://localhost:4781;
    proxy_set_header Host $host;
}
```

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
