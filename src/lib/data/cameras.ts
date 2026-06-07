// Daftar kamera CCTV (dummy untuk prototipe).
// Gambar disimpan lokal di public/cctv/<id>.jpg (foto infrastruktur air yang
// relevan, lisensi bebas dari Wikimedia Commons) — jelas & tanpa ketergantungan
// sumber acak/eksternal saat runtime.
export type CameraGroup = 'bendungan' | 'hidrologi' | 'irigasi' | 'banjir';

export interface Camera {
  id: string;
  /** lokasi kamera */
  name: string;
  /** sub-label (sungai/area) */
  area: string;
  /** solusi/modul tempat kamera disisipkan */
  group: CameraGroup;
  online: boolean;
}

export const CAMERAS: Camera[] = [
  // Bendungan
  { id: 'cam-cigaru-spillway', name: 'Bendungan Cigaru — Spillway', area: 'S. Cigaru', group: 'bendungan', online: true },
  { id: 'cam-cigaru-puncak', name: 'Bendungan Cigaru — Puncak', area: 'S. Cigaru', group: 'bendungan', online: true },
  { id: 'cam-sindangheula', name: 'Bendungan Sindangheula — Intake', area: 'S. Cibanten', group: 'bendungan', online: true },
  // Hidrologi
  { id: 'cam-hilir', name: 'Pos Duga Air Hilir', area: 'S. Cigaru', group: 'hidrologi', online: true },
  { id: 'cam-tengah', name: 'Pos Cigaru Tengah', area: 'S. Cigaru', group: 'hidrologi', online: true },
  { id: 'cam-klimat', name: 'Stasiun Klimatologi Balai', area: 'Kantor Balai', group: 'hidrologi', online: true },
  // Irigasi
  { id: 'cam-citarik-pintu', name: 'Pintu Air Citarik', area: 'S. Citarik', group: 'irigasi', online: true },
  { id: 'cam-cikawung', name: 'Bendung Cikawung', area: 'S. Cikawung', group: 'irigasi', online: false },
  { id: 'cam-di-cikawung', name: 'DI Cikawung — Saluran Induk', area: 'D.I. Cikawung', group: 'irigasi', online: true },
  // Banjir / O&P
  { id: 'cam-pompa-muara', name: 'Pompa Banjir Muara', area: 'Muara', group: 'banjir', online: true },
  { id: 'cam-tanggul', name: 'Tanggul Ciujung', area: 'S. Ciujung', group: 'banjir', online: true },
];

/** path gambar lokal untuk sebuah kamera (di public/cctv/) */
export function camImage(cam: Camera): string {
  return `${import.meta.env.BASE_URL}cctv/${cam.id}.jpg`;
}
