// Formatting helpers (locale id-ID)

const nf = (digits: number) =>
  new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const f0 = nf(0);
const f1 = nf(1);
const f2 = nf(2);

export function num(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '–';
  if (digits === 0) return f0.format(value);
  if (digits === 2) return f2.format(value);
  return f1.format(value);
}

/** angka dengan tanda +/- eksplisit */
export function signed(value: number, digits = 1): string {
  const s = num(Math.abs(value), digits);
  if (value > 0) return `+${s}`;
  if (value < 0) return `−${s}`;
  return s;
}

const dtWeekday = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dtTime = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dtClock = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dtShort = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function fullDate(t: number | Date): string {
  return dtWeekday.format(t);
}

export function clockTime(t: number | Date): string {
  return dtTime.format(t);
}

export function hhmm(t: number | Date): string {
  return dtClock.format(t);
}

export function shortDateTime(t: number | Date): string {
  return dtShort.format(t);
}

/** "baru saja", "3 mnt lalu", "2 jam lalu" */
export function relTime(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 10) return 'baru saja';
  if (s < 60) return `${s} dtk lalu`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  return `${d} hr lalu`;
}

export function pct(value: number, digits = 0): string {
  return `${num(value, digits)}%`;
}
