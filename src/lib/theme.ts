// Tema tampilan interaktif (dark/light). Disimpan di localStorage.
// Catatan: hanya memengaruhi tampilan interaktif — Layar Dinding selalu gelap
// (lihat penerapan class .theme-light di App.svelte).
import { writable } from 'svelte/store';

export type Theme = 'dark' | 'light';

const KEY = 'bws-theme';

function load(): Theme {
  if (typeof localStorage === 'undefined') return 'dark';
  return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
}

export const theme = writable<Theme>(load());

export function toggleTheme() {
  theme.update((t) => {
    const next: Theme = t === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // abaikan
    }
    return next;
  });
}
