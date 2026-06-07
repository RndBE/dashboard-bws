// Router hash ringan — memberi tiap menu URL sendiri (mis. #/bendungan)
// dan menyinkronkannya dua arah dengan store UI. Tanpa library tambahan;
// hash routing aman untuk SPA Vite (tanpa konfigurasi server) dan mendukung
// tombol back/forward serta tautan yang bisa di-bookmark/-bagikan.

import { get } from 'svelte/store';
import { activeModule, mode, selected } from './stores';
import type { AssetKind, ModuleKey } from './types';

const MODULES: ModuleKey[] = [
  'ringkasan',
  'hidrologi',
  'bendungan',
  'irigasi',
  'banjir',
  'analisa',
];
const KINDS: AssetKind[] = ['pos', 'bendungan', 'irigasi', 'sumur', 'op'];

const DEFAULT_MODULE: ModuleKey = 'ringkasan';

/** Bentuk path dari state saat ini. */
function pathFromState(): string {
  if (get(mode) === 'wall') return '/wall';
  const sel = get(selected);
  if (sel) return `/${sel.kind}/${sel.id}`;
  return `/${get(activeModule)}`;
}

/** Tulis hash dari state (jika berbeda), tanpa memicu loop. */
let suppress = false;
/** Sinkronisasi awal memakai replaceState agar tidak menambah entri history. */
let initialSync = true;
function writeHash() {
  if (suppress) return;
  const path = pathFromState();
  const target = `#${path}`;
  if (location.hash !== target) {
    if (initialSync) {
      history.replaceState(null, '', target);
    } else {
      history.pushState(null, '', target);
    }
  }
}

/** Terapkan hash ke store. Mengembalikan true bila hash valid dikenali. */
function applyHash() {
  const raw = location.hash.replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean); // mis. ["bendungan","bend-cigaru"]

  suppress = true;
  try {
    // /wall → mode videowall
    if (parts[0] === 'wall') {
      mode.set('wall');
      selected.set(null);
      return;
    }

    // selain wall → mode dashboard
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
 * Mulai router: terapkan hash awal (atau set default bila kosong), lalu
 * jaga sinkronisasi dua arah antara URL dan store.
 * Mengembalikan fungsi cleanup.
 */
export function startRouter(): () => void {
  if (started) return () => {};
  started = true;

  // hash awal → state (atau tulis default bila belum ada hash)
  if (location.hash.replace(/^#\/?/, '')) {
    applyHash();
  } else {
    history.replaceState(null, '', `#${pathFromState()}`);
  }

  // URL berubah (back/forward, edit manual) → state
  const onHash = () => applyHash();
  window.addEventListener('hashchange', onHash);
  window.addEventListener('popstate', onHash);

  // state berubah → URL
  // (subscribe memanggil writeHash sekali secara sinkron di sini — masih
  //  fase initialSync sehingga memakai replaceState, tidak menambah history)
  const unsubs = [
    activeModule.subscribe(writeHash),
    mode.subscribe(writeHash),
    selected.subscribe(writeHash),
  ];
  // mulai sekarang navigasi nyata memakai pushState (mendukung back/forward)
  initialSync = false;

  return () => {
    window.removeEventListener('hashchange', onHash);
    window.removeEventListener('popstate', onHash);
    unsubs.forEach((u) => u());
    started = false;
  };
}
