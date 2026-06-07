// Autentikasi prototipe — sepenuhnya di sisi klien (tanpa backend).
// Satu akun demo, sesi disimpan di localStorage hingga logout.
import { writable } from 'svelte/store';

export interface AuthUser {
  username: string;
  name: string;
  role: string;
  loginAt: number;
}

// Akun demo (hardcoded untuk prototipe)
const DEMO = {
  username: 'admin',
  password: 'bws2026',
  name: 'Administrator',
  role: 'Administrator BWS',
};

/** hint kredensial yang ditampilkan di layar login */
export const DEMO_HINT = `${DEMO.username} / ${DEMO.password}`;

const STORAGE_KEY = 'bws-auth';

function load(): AuthUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as AuthUser;
    if (u && typeof u.username === 'string') return u;
  } catch {
    // abaikan data rusak
  }
  return null;
}

export const auth = writable<AuthUser | null>(load());

/** kontrol modal konfirmasi logout (dipakai TopBar & WallView) */
export const logoutPrompt = writable(false);
export function requestLogout() {
  logoutPrompt.set(true);
}
export function cancelLogout() {
  logoutPrompt.set(false);
}

/** validasi kredensial demo; true bila berhasil */
export function login(username: string, password: string): boolean {
  if (username.trim().toLowerCase() === DEMO.username && password === DEMO.password) {
    const user: AuthUser = {
      username: DEMO.username,
      name: DEMO.name,
      role: DEMO.role,
      loginAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // localStorage tak tersedia — tetap login untuk sesi ini
    }
    auth.set(user);
    return true;
  }
  return false;
}

export function logout() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // abaikan
  }
  logoutPrompt.set(false);
  auth.set(null);
}
