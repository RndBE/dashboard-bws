// Daftar kamera CCTV (dummy untuk prototipe).
// Gambar disimpan lokal di public/cctv/<id>.jpg (foto infrastruktur air yang
// relevan, lisensi bebas dari Wikimedia Commons) — jelas & tanpa ketergantungan
// sumber acak/eksternal saat runtime.
//
// Sistem CCTV ini dirancang terintegrasi web & berbasis IP Publik: tiap kamera
// punya alamat IP publik + stream RTSP/HLS sehingga dapat diakses lintas
// instansi tanpa VPN. Metadata stream disintesis dari `ip` (lihat camStream).
export type CameraGroup = 'bendungan' | 'hidrologi' | 'irigasi' | 'banjir' | 'geothermal';

export interface Camera {
  id: string;
  /** lokasi kamera */
  name: string;
  /** sub-label (sungai/area) */
  area: string;
  /** solusi/modul tempat kamera disisipkan */
  group: CameraGroup;
  online: boolean;
  /** id gambar yang dipakai bila berbeda dari id kamera (berbagi aset gambar) */
  img?: string;
  /** alamat IP publik kamera (integrasi web berbasis IP Publik) */
  ip?: string;
  /** merek/vendor perangkat */
  vendor?: string;
  /** jenis pos hidrologi tempat kamera terpasang (untuk pelabelan) */
  pos?: 'PDA' | 'PCH' | 'Mata Air' | 'Kualitas' | 'Bendungan' | 'Irigasi';
}

export const CAMERAS: Camera[] = [
  // Bendungan
  { id: 'cam-cigaru-spillway', name: 'Bendungan Cigaru — Spillway', area: 'S. Cigaru', group: 'bendungan', online: true, ip: '103.94.124.11', vendor: 'Hikvision DS-2DE7', pos: 'Bendungan' },
  { id: 'cam-cigaru-puncak', name: 'Bendungan Cigaru — Puncak', area: 'S. Cigaru', group: 'bendungan', online: true, ip: '103.94.124.12', vendor: 'Hikvision DS-2CD2', pos: 'Bendungan' },
  { id: 'cam-sindangheula', name: 'Bendungan Sindangheula — Intake', area: 'S. Cibanten', group: 'bendungan', online: true, ip: '103.94.124.13', vendor: 'Dahua SD6AL', pos: 'Bendungan' },
  // Hidrologi — Pos Duga Air (PDA)
  { id: 'cam-hilir', name: 'Pos Duga Air Hilir', area: 'S. Cigaru', group: 'hidrologi', online: true, ip: '103.94.124.21', vendor: 'Hikvision DS-2DE4', pos: 'PDA' },
  { id: 'cam-tengah', name: 'Pos Cigaru Tengah', area: 'S. Cigaru', group: 'hidrologi', online: true, ip: '103.94.124.22', vendor: 'Dahua IPC-HFW5', pos: 'PDA' },
  { id: 'cam-pda-citarik', name: 'Pos Duga Air Citarik', area: 'S. Citarik', group: 'hidrologi', online: true, img: 'cam-citarik-pintu', ip: '103.94.124.23', vendor: 'Hikvision DS-2CD2', pos: 'PDA' },
  { id: 'cam-pda-cikawung', name: 'Pos Duga Air Cikawung', area: 'S. Cikawung', group: 'hidrologi', online: false, img: 'cam-cikawung', ip: '103.94.124.24', vendor: 'Dahua IPC-HFW2', pos: 'PDA' },
  // Hidrologi — Stasiun Klimatologi / Pos Curah Hujan (PCH)
  { id: 'cam-klimat', name: 'Stasiun Klimatologi Balai', area: 'Kantor Balai', group: 'hidrologi', online: true, ip: '103.94.124.25', vendor: 'Hikvision DS-2CD2', pos: 'PCH' },
  { id: 'cam-pch-cidurian', name: 'Pos Curah Hujan Cidurian', area: 'S. Cidurian', group: 'hidrologi', online: true, img: 'cam-tengah', ip: '103.94.124.26', vendor: 'Dahua IPC-HFW2', pos: 'PCH' },
  // Hidrologi — Mata Air
  { id: 'cam-ma-cikoromoy', name: 'Mata Air Cikoromoy', area: 'Cadasari', group: 'hidrologi', online: true, img: 'cam-di-cikawung', ip: '103.94.124.31', vendor: 'Hikvision DS-2CD2', pos: 'Mata Air' },
  { id: 'cam-ma-cisuren', name: 'Mata Air Cisuren', area: 'Pandeglang', group: 'hidrologi', online: true, img: 'cam-hilir', ip: '103.94.124.32', vendor: 'Dahua IPC-HFW5', pos: 'Mata Air' },
  // Hidrologi — Kualitas Air
  { id: 'cam-awqr-cigaru', name: 'Pos Kualitas Air Cigaru', area: 'S. Cigaru', group: 'hidrologi', online: true, img: 'cam-hilir', ip: '103.94.124.41', vendor: 'Hikvision DS-2CD2', pos: 'Kualitas' },
  // Irigasi
  { id: 'cam-citarik-pintu', name: 'Pintu Air Citarik', area: 'S. Citarik', group: 'irigasi', online: true, ip: '103.94.124.51', vendor: 'Hikvision DS-2DE4', pos: 'Irigasi' },
  { id: 'cam-cikawung', name: 'Bendung Cikawung', area: 'S. Cikawung', group: 'irigasi', online: false, ip: '103.94.124.52', vendor: 'Dahua IPC-HFW2', pos: 'Irigasi' },
  { id: 'cam-di-cikawung', name: 'DI Cikawung — Saluran Induk', area: 'D.I. Cikawung', group: 'irigasi', online: true, ip: '103.94.124.53', vendor: 'Hikvision DS-2CD2', pos: 'Irigasi' },
  // Banjir / O&P
  { id: 'cam-pompa-muara', name: 'Pompa Banjir Muara', area: 'Muara', group: 'banjir', online: true, ip: '103.94.124.61', vendor: 'Hikvision DS-2DE7' },
  { id: 'cam-tanggul', name: 'Tanggul Ciujung', area: 'S. Ciujung', group: 'banjir', online: true, ip: '103.94.124.62', vendor: 'Dahua SD6AL' },
];

/** path gambar lokal untuk sebuah kamera (di public/cctv/) */
export function camImage(cam: Camera): string {
  return `${import.meta.env.BASE_URL}cctv/${cam.img ?? cam.id}.jpg`;
}

/** Metadata stream IP publik (RTSP/HLS) — disintesis dari alamat IP kamera. */
export interface CamStream {
  ip: string;
  rtsp: string;
  hls: string;
  codec: string;
  resolution: string;
  fps: number;
  port: number;
}

export function camStream(cam: Camera): CamStream {
  const ip = cam.ip ?? '0.0.0.0';
  return {
    ip,
    port: 554,
    rtsp: `rtsp://${ip}:554/Streaming/Channels/101`,
    hls: `https://cctv.bws-c3.go.id/hls/${cam.id}/index.m3u8`,
    codec: 'H.265/HEVC',
    resolution: '1920×1080',
    fps: 25,
  };
}
