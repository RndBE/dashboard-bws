// Router history ringan — memberi tiap menu URL bersih sendiri (mis. /bendungan)
// dan menyinkronkannya dua arah dengan store UI. Tanpa library tambahan.
//
// Catatan deploy: router ini memakai History API (URL tanpa "#"), sehingga
// server harus mengarahkan semua path ke index.html (SPA fallback). Di VPS
// gunakan `pm2 serve dist <port> --spa` (lihat ecosystem.config.cjs); Vite
// dev/preview sudah menangani fallback secara otomatis. Navigasi di aplikasi
// ini berlangsung lewat store (klik tab/aset), jadi router cukup memantau
// perubahan store → URL dan tombol back/forward (popstate) → store.

import { get } from 'svelte/store';
import { activeModule, hydroSection, mode, selected } from './stores';
import type { AssetKind, HydroSection, ModuleKey } from './types';

const MODULES: ModuleKey[] = [
  'ringkasan',
  'hidrologi',
  'bendungan',
  'irigasi',
  'banjir',
  'analisa',
];
const KINDS: AssetKind[] = ['pos', 'bendungan', 'irigasi', 'sumur', 'op'];
const HYDRO_SECTIONS: HydroSection[] = [
  'beranda',
  'pda',
  'debit',
  'pch',
  'kualitas',
  'mata-air',
  'cctv',
  'peta',
  'analisa',
];

const DEFAULT_MODULE: ModuleKey = 'ringkasan';

// Base path aplikasi dari Vite (mis. "/" atau "/dashboard/"), tanpa trailing
// slash agar mudah digabung dengan path internal. Default "" bila di-root.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Bentuk path internal (relatif terhadap BASE) dari state saat ini. */
function pathFromState(): string {
  if (get(mode) === 'wall') return '/wall';
  // Portal Hidrologi: sub-aplikasi dengan URL sendiri (mis. /hidro/pda)
  if (get(mode) === 'hydro') return `/hidro/${get(hydroSection)}`;
  const sel = get(selected);
  if (sel) return `/${sel.kind}/${sel.id}`;
  return `/${get(activeModule)}`;
}

/** URL penuh yang ditulis ke address bar = BASE + path internal. */
function urlFromState(): string {
  return `${BASE}${pathFromState()}`;
}

/** Segmen path internal saat ini (BASE sudah dilepas). */
function currentParts(): string[] {
  let path = location.pathname;
  if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
  return path.split('/').filter(Boolean); // mis. ["bendungan","bend-cigaru"]
}

/** Tulis URL dari state (jika berbeda), tanpa memicu loop. */
let suppress = false;
/** Sinkronisasi awal memakai replaceState agar tidak menambah entri history. */
let initialSync = true;
function writeUrl() {
  if (suppress) return;
  const target = urlFromState();
  if (location.pathname !== target) {
    if (initialSync) {
      history.replaceState(null, '', target);
    } else {
      history.pushState(null, '', target);
    }
  }
}

/** Terapkan URL ke store. */
function applyUrl() {
  const parts = currentParts();

  suppress = true;
  try {
    // /wall → mode videowall
    if (parts[0] === 'wall') {
      mode.set('wall');
      selected.set(null);
      return;
    }

    // /hidro/<section> → Portal Hidrologi
    if (parts[0] === 'hidro') {
      const sec = parts[1] as HydroSection;
      hydroSection.set(HYDRO_SECTIONS.includes(sec) ? sec : 'beranda');
      selected.set(null);
      mode.set('hydro');
      return;
    }

    // selain wall/hidro → mode dashboard
    mode.set('dashboard');

    // /<kind>/<id> → detail aset (kind harus valid & ada id)
    if (parts.length >= 2 && KINDS.includes(parts[0] as AssetKind)) {
      selected.set({ kind: parts[0] as AssetKind, id: parts.slice(1).join('/') });
      return;
    }

    // /<module> → modul (tutup detail bila terbuka)
    selected.set(null);
    const mod = parts[0] as ModuleKey;
    activeModule.set(MODULES.includes(mod) ? mod : DEFAULT_MODULE);
  } finally {
    suppress = false;
  }
}

let started = false;

/**
 * Mulai router: terapkan URL awal (atau tulis default bila kosong), lalu
 * jaga sinkronisasi dua arah antara URL dan store.
 * Mengembalikan fungsi cleanup.
 */
export function startRouter(): () => void {
  if (started) return () => {};
  started = true;

  // URL awal → state (atau tulis default bila path kosong di BASE root)
  if (currentParts().length) {
    applyUrl();
  } else {
    history.replaceState(null, '', urlFromState());
  }

  // URL berubah lewat tombol back/forward → state
  const onPop = () => applyUrl();
  window.addEventListener('popstate', onPop);

  // state berubah → URL
  // (subscribe memanggil writeUrl sekali secara sinkron di sini — masih
  //  fase initialSync sehingga memakai replaceState, tidak menambah history)
  const unsubs = [
    activeModule.subscribe(writeUrl),
    mode.subscribe(writeUrl),
    hydroSection.subscribe(writeUrl),
    selected.subscribe(writeUrl),
  ];
  // mulai sekarang navigasi nyata memakai pushState (mendukung back/forward)
  initialSync = false;

  return () => {
    window.removeEventListener('popstate', onPop);
    unsubs.forEach((u) => u());
    started = false;
  };
}
