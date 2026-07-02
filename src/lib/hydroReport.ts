// Mesin Analisa & Pelaporan Hidrologi
// — katalog parameter lintas-jenis pos, generator "AI Insight" berbasis aturan
//   (menghitung tren/ambang/anomali/korelasi dari data nyata), serta pembuat
//   berkas Excel (.xls) & laporan PDF (via cetak) tanpa dependensi tambahan.

import type { PosHidrologi, PosTipe, SeriesPoint, Siaga } from './types';
import type { SeriesStats } from './analytics';
import { splinePath } from './series';
import { STATUS } from './status';
import { num } from './format';

// ---------------------------------------------------------------------------
// Katalog parameter yang bisa dianalisa (tiap parameter tahu pos & cara ambil deret)
// ---------------------------------------------------------------------------
export interface HydroParam {
  key: string;
  label: string;
  /** grup tampilan (jenis pos) */
  group: string;
  unit: string;
  digits: number;
  color: string;
  tipe: PosTipe;
  /** render batang (curah hujan) */
  bars?: boolean;
  zeroBased?: boolean;
  /** arah ambang: rising = besar makin gawat · falling = kecil makin gawat */
  thresholdDir: 'rising' | 'falling' | 'none';
  /** deret histori parameter pada sebuah pos */
  series: (p: PosHidrologi) => SeriesPoint[];
  /** nilai terkini parameter pada sebuah pos */
  current: (p: PosHidrologi) => number;
  /** ambang siaga (bila ada) */
  thresholds?: (p: PosHidrologi) => { waspada: number; siaga: number; awas: number } | undefined;
}

const histOf = (type: string) => (p: PosHidrologi): SeriesPoint[] =>
  p.instruments.find((i) => i.type === type)?.history ?? [];
const valOf = (type: string) => (p: PosHidrologi): number =>
  p.instruments.find((i) => i.type === type)?.value ?? 0;

export const HYDRO_PARAMS: HydroParam[] = [
  { key: 'tma', label: 'Tinggi Muka Air', group: 'Pos Duga Air', unit: 'm', digits: 2, color: '#4f9bee', tipe: 'duga-air', thresholdDir: 'rising', series: (p) => p.history, current: (p) => p.param.value, thresholds: (p) => p.thresholds },
  { key: 'debit', label: 'Debit Sungai (Flowmeter)', group: 'Pos Duga Air', unit: 'm³/s', digits: 1, color: '#38bdf8', tipe: 'duga-air', zeroBased: true, thresholdDir: 'none', series: histOf('AFMR'), current: valOf('AFMR') },
  { key: 'kecepatan', label: 'Kecepatan Aliran', group: 'Pos Duga Air', unit: 'm/s', digits: 2, color: '#22d3ee', tipe: 'duga-air', zeroBased: true, thresholdDir: 'none', series: histOf('Kecepatan Aliran'), current: valOf('Kecepatan Aliran') },
  { key: 'hujan', label: 'Curah Hujan', group: 'Pos Curah Hujan', unit: 'mm', digits: 1, color: '#c9a227', tipe: 'hujan', bars: true, zeroBased: true, thresholdDir: 'rising', series: (p) => p.history, current: (p) => p.param.value, thresholds: (p) => p.thresholds },
  { key: 'ph', label: 'pH Air Sungai', group: 'Kualitas Air', unit: 'pH', digits: 2, color: '#a78bfa', tipe: 'kualitas', thresholdDir: 'none', series: (p) => p.history, current: (p) => p.param.value },
  { key: 'do', label: 'Oksigen Terlarut (DO)', group: 'Kualitas Air', unit: 'mg/L', digits: 1, color: '#4f9bee', tipe: 'kualitas', zeroBased: true, thresholdDir: 'none', series: histOf('DO'), current: valOf('DO') },
  { key: 'kekeruhan', label: 'Kekeruhan', group: 'Kualitas Air', unit: 'NTU', digits: 0, color: '#e0a33c', tipe: 'kualitas', zeroBased: true, thresholdDir: 'none', series: histOf('Kekeruhan'), current: valOf('Kekeruhan') },
  { key: 'debit-ma', label: 'Debit Mata Air', group: 'Mata Air', unit: 'l/dt', digits: 1, color: '#3fb27f', tipe: 'mata-air', zeroBased: true, thresholdDir: 'falling', series: (p) => p.history, current: (p) => p.param.value, thresholds: (p) => p.thresholds },
  { key: 'ma-ph', label: 'pH Mata Air (AWQR)', group: 'Mata Air', unit: 'pH', digits: 2, color: '#7c5cff', tipe: 'mata-air', thresholdDir: 'none', series: histOf('pH'), current: valOf('pH') },
  { key: 'ma-do', label: 'DO Mata Air (AWQR)', group: 'Mata Air', unit: 'mg/L', digits: 1, color: '#34d399', tipe: 'mata-air', zeroBased: true, thresholdDir: 'none', series: histOf('DO'), current: valOf('DO') },
];

// ---------------------------------------------------------------------------
// AI Insight — analisis otomatis berbasis aturan atas data terpilih
// ---------------------------------------------------------------------------
export type InsightKind = 'ringkasan' | 'tren' | 'risiko' | 'korelasi' | 'rekomendasi';
export interface Insight {
  kind: InsightKind;
  text: string;
  severity: 'info' | 'warn' | 'crit';
}
export interface InsightRow {
  name: string;
  status: Siaga;
  prepped: SeriesPoint[];
  stats: SeriesStats;
  thresholds?: { waspada: number; siaga: number; awas: number };
}

/** Pearson antara dua deret (dipotong ke panjang terpendek). */
function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb; da += xa * xa; db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

export function buildInsights(opts: {
  param: HydroParam;
  rangeLabel: string;
  rows: InsightRow[];
}): Insight[] {
  const { param, rangeLabel, rows } = opts;
  const u = param.unit;
  const d = param.digits;
  const out: Insight[] = [];
  if (!rows.length) {
    return [{ kind: 'ringkasan', text: 'Belum ada pos terpilih. Pilih minimal satu pos untuk memulai analisis.', severity: 'info' }];
  }

  // ---- Ringkasan ----
  const avgNet = rows.reduce((s, r) => s + r.stats.avg, 0) / rows.length;
  const hi = [...rows].sort((a, b) => b.stats.max - a.stats.max)[0];
  const lo = [...rows].sort((a, b) => a.stats.min - b.stats.min)[0];
  out.push({
    kind: 'ringkasan',
    text: `Menganalisis ${rows.length} pos untuk parameter ${param.label} selama ${rangeLabel}. Rata-rata jaringan ${num(avgNet, d)} ${u}; nilai tertinggi tercatat di ${hi.name} (${num(hi.stats.max, d)} ${u}), terendah di ${lo.name} (${num(lo.stats.min, d)} ${u}).`,
    severity: 'info',
  });

  // ---- Tren ----
  const steep = [...rows].sort((a, b) => Math.abs(b.stats.rate) - Math.abs(a.stats.rate))[0];
  const naik = rows.filter((r) => r.stats.rate > 0.0005).length;
  const turun = rows.filter((r) => r.stats.rate < -0.0005).length;
  const arah = steep.stats.rate > 0 ? 'naik' : steep.stats.rate < 0 ? 'turun' : 'stabil';
  out.push({
    kind: 'tren',
    text: `Pergerakan paling tajam di ${steep.name}: ${arah} ${num(Math.abs(steep.stats.rate), Math.max(2, d))} ${u}/jam (Δ ${num(steep.stats.delta, d)} ${u} sepanjang ${rangeLabel}). Secara jaringan ${naik} pos cenderung naik dan ${turun} pos menurun.`,
    severity: Math.abs(steep.stats.rate) > 0 && param.thresholdDir !== 'none' ? 'warn' : 'info',
  });

  // ---- Risiko ambang ----
  if (param.thresholdDir !== 'none') {
    const atRisk = rows
      .filter((r) => r.thresholds)
      .map((r) => {
        const t = r.thresholds!;
        const v = r.stats.last;
        let level: Siaga = 'normal';
        if (param.thresholdDir === 'rising') {
          level = v >= t.awas ? 'awas' : v >= t.siaga ? 'siaga' : v >= t.waspada ? 'waspada' : 'normal';
        } else {
          level = v <= t.awas ? 'awas' : v <= t.siaga ? 'siaga' : v <= t.waspada ? 'waspada' : 'normal';
        }
        return { r, level, v };
      })
      .filter((x) => x.level !== 'normal')
      .sort((a, b) => STATUS[b.level].weight - STATUS[a.level].weight);

    if (atRisk.length) {
      const worst = atRisk[0];
      const sev = worst.level === 'awas' ? 'crit' : worst.level === 'siaga' ? 'crit' : 'warn';
      const arahKata = param.thresholdDir === 'falling' ? 'turun mendekati/menembus' : 'naik mendekati/menembus';
      out.push({
        kind: 'risiko',
        text: `${atRisk.length} pos berada di atas status normal. Tertinggi: ${worst.r.name} pada level ${STATUS[worst.level].label} (${num(worst.v, d)} ${u}) — nilai ${arahKata} ambang. ${atRisk.length > 1 ? 'Pos lain: ' + atRisk.slice(1).map((x) => `${x.r.name} (${STATUS[x.level].label})`).join(', ') + '.' : ''}`,
        severity: sev,
      });
    } else {
      out.push({ kind: 'risiko', text: `Seluruh pos terpilih berada dalam rentang aman terhadap ambang ${param.label}.`, severity: 'info' });
    }
  }

  // ---- Anomali / volatilitas ----
  const vol = [...rows]
    .map((r) => ({ r, cv: r.stats.avg !== 0 ? r.stats.std / Math.abs(r.stats.avg) : r.stats.std }))
    .sort((a, b) => b.cv - a.cv)[0];
  if (vol && vol.cv > 0.18) {
    out.push({
      kind: 'risiko',
      text: `${vol.r.name} menunjukkan pola paling fluktuatif (simpangan baku ${num(vol.r.stats.std, Math.max(2, d))} ${u}; rentang ${num(vol.r.stats.min, d)}–${num(vol.r.stats.max, d)} ${u}) — perlu pengecekan sensor / kejadian lapangan.`,
      severity: 'warn',
    });
  }

  // ---- Korelasi antar-pos ----
  if (rows.length >= 2) {
    const r = pearson(rows[0].prepped.map((p) => p.v), rows[1].prepped.map((p) => p.v));
    const kuat = Math.abs(r) > 0.7 ? 'kuat' : Math.abs(r) > 0.4 ? 'sedang' : 'lemah';
    const tanda = r >= 0 ? 'searah' : 'berlawanan arah';
    out.push({
      kind: 'korelasi',
      text: `Korelasi ${rows[0].name} ↔ ${rows[1].name}: r = ${num(r, 2)} (${kuat}, ${tanda}). ${Math.abs(r) > 0.7 ? 'Pergerakan kedua pos sangat selaras — indikasi pengaruh hidrologis bersama (mis. hujan di hulu yang sama).' : 'Keterkaitan langsung antar-pos relatif terbatas.'}`,
      severity: 'info',
    });
  }

  // ---- Rekomendasi ----
  const worstStatus = rows.reduce<Siaga>((acc, r) => (STATUS[r.status].weight > STATUS[acc].weight ? r.status : acc), 'normal');
  let rec: string;
  let sev: Insight['severity'] = 'info';
  if (worstStatus === 'awas') { rec = 'Aktifkan protokol tanggap darurat & verifikasi lapangan pada pos berstatus Awas; tingkatkan frekuensi pelaporan ke piket.'; sev = 'crit'; }
  else if (worstStatus === 'siaga') { rec = 'Naikkan kewaspadaan dan siapkan koordinasi dini; pantau pos siaga tiap jam dan periksa prakiraan hujan hulu.'; sev = 'warn'; }
  else if (worstStatus === 'waspada') { rec = 'Pertahankan pemantauan ketat pada pos berstatus Waspada; pastikan catu daya & komunikasi telemetri normal.'; sev = 'warn'; }
  else if (param.thresholdDir === 'falling') { rec = 'Debit sumber terjaga. Lanjutkan pemantauan rutin dan jadwalkan kalibrasi flowmeter & AWQR berkala.'; }
  else { rec = 'Seluruh parameter dalam rentang aman. Lanjutkan pemantauan rutin dan ekspor laporan periodik untuk arsip.'; }
  out.push({ kind: 'rekomendasi', text: rec, severity: sev });

  return out;
}

// ---------------------------------------------------------------------------
// Ekspor berkas
// ---------------------------------------------------------------------------
export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const dtCell = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
});

export interface ReportColumn {
  name: string;
  series: SeriesPoint[];
}

export interface ReportMeta {
  label: string;
  value: string;
}

/** Excel (.xls) — HTML-spreadsheet yang dibuka native oleh Excel/LibreOffice. */
export function buildExcelXls(opts: {
  title: string;
  meta: ReportMeta[];
  columns: ReportColumn[];
  digits: number;
  unit: string;
}): string {
  const { title, meta, columns, digits, unit } = opts;
  const n = columns.reduce((m, c) => Math.max(m, c.series.length), 0);
  const metaRows = meta
    .map((m) => `<tr><td class="k">${esc(m.label)}</td><td colspan="${columns.length}">${esc(m.value)}</td></tr>`)
    .join('');
  const head = `<tr><th>Waktu</th>${columns.map((c) => `<th>${esc(c.name)} (${esc(unit)})</th>`).join('')}</tr>`;
  let body = '';
  for (let i = 0; i < n; i++) {
    const t = columns.find((c) => c.series[i])?.series[i]?.t;
    const tStr = t ? dtCell.format(t) : '';
    const cells = columns
      .map((c) => `<td class="num">${c.series[i] !== undefined ? c.series[i].v.toFixed(digits) : ''}</td>`)
      .join('');
    body += `<tr><td>${tStr}</td>${cells}</tr>`;
  }
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${esc(title).slice(0, 28)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}td,th{border:1px solid #c9d2e0;padding:4px 9px}th{background:#1d6fd6;color:#fff;font-weight:600}td.k{font-weight:700;background:#eef3fb}td.num{text-align:right;mso-number-format:"0.00"}h3{font-family:Calibri,Arial;color:#0f1b2e}</style></head>
<body><h3>${esc(title)}</h3><table>${metaRows}</table><br/><table>${head}${body}</table></body></html>`;
}

/** SVG multi-garis sederhana untuk disisipkan ke laporan PDF. */
function reportChartSvg(columns: ReportColumn[], colors: string[], w = 720, h = 240): string {
  const padL = 44, padR = 14, padT = 12, padB = 22;
  const all = columns.flatMap((c) => c.series.map((p) => p.v));
  if (!all.length) return '';
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 1e-6) hi = lo + 1;
  const margin = (hi - lo) * 0.12; lo -= margin; hi += margin;
  const maxLen = columns.reduce((m, c) => Math.max(m, c.series.length), 0);
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const x = (i: number) => padL + (i / Math.max(1, maxLen - 1)) * innerW;
  const y = (v: number) => padT + innerH - ((v - lo) / (hi - lo)) * innerH;
  const grid = [0, 0.5, 1]
    .map((f) => {
      const yy = padT + innerH - f * innerH;
      const val = lo + f * (hi - lo);
      return `<line x1="${padL}" y1="${yy}" x2="${w - padR}" y2="${yy}" stroke="#d7dfeb" stroke-width="1"/><text x="${padL - 6}" y="${yy + 3}" text-anchor="end" font-size="9" fill="#7a879c">${num(val, 2)}</text>`;
    })
    .join('');
  const paths = columns
    .map((c, ci) => {
      const xy = c.series.map((p, i) => [x(i), y(p.v)] as [number, number]);
      return `<path d="${splinePath(xy)}" fill="none" stroke="${colors[ci % colors.length]}" stroke-width="1.8" stroke-linejoin="round"/>`;
    })
    .join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${grid}${paths}</svg>`;
}

/** Bangun HTML laporan siap cetak (Save as PDF). */
export function buildReportHtml(opts: {
  title: string;
  subtitle: string;
  generatedAt: number;
  meta: ReportMeta[];
  kpis: { label: string; value: string }[];
  insights: Insight[];
  statRows: { name: string; status: Siaga; min: string; max: string; avg: string; std: string; rate: string }[];
  columns: ReportColumn[];
  colors: string[];
  unit: string;
}): string {
  const { title, subtitle, generatedAt, meta, kpis, insights, statRows, columns, colors, unit } = opts;
  const sevColor: Record<Insight['severity'], string> = { info: '#1d6fd6', warn: '#c9821f', crit: '#c0322e' };
  const genStr = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(generatedAt);

  const kpiHtml = kpis
    .map((k) => `<div class="kpi"><div class="kl">${esc(k.label)}</div><div class="kv">${esc(k.value)}</div></div>`)
    .join('');
  const insightHtml = insights
    .map((i) => `<li><span class="ib" style="background:${sevColor[i.severity]}">${i.kind.toUpperCase()}</span> ${esc(i.text)}</li>`)
    .join('');
  const legendHtml = columns
    .map((c, i) => `<span class="lg"><span class="dot" style="background:${colors[i % colors.length]}"></span>${esc(c.name)}</span>`)
    .join('');
  const statHtml = statRows
    .map((s) => `<tr><td>${esc(s.name)}</td><td><span class="badge" style="background:${STATUS[s.status].color}1f;color:${STATUS[s.status].color}">${STATUS[s.status].label}</span></td><td class="r">${s.min}</td><td class="r">${s.max}</td><td class="r">${s.avg}</td><td class="r">${s.std}</td><td class="r">${s.rate}</td></tr>`)
    .join('');
  const metaHtml = meta.map((m) => `<span><b>${esc(m.label)}:</b> ${esc(m.value)}</span>`).join('');

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1a2336;margin:0;padding:28px 30px;font-size:12px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d6fd6;padding-bottom:12px;margin-bottom:14px}
  .brand{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#1d6fd6;font-weight:700}
  h1{font-size:18px;margin:2px 0 2px}
  .sub{color:#5a6a86;font-size:12px}
  .gen{text-align:right;font-size:10px;color:#7a879c}
  .meta{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:11px;color:#41506c;margin:10px 0 16px}
  .kpis{display:flex;gap:10px;margin-bottom:16px}
  .kpi{flex:1;border:1px solid #d7dfeb;border-radius:8px;padding:8px 10px;background:#f7fafe}
  .kl{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#7a879c}
  .kv{font-size:16px;font-weight:700;color:#0f1b2e;margin-top:2px}
  h2{font-size:13px;margin:18px 0 8px;color:#0f1b2e;border-left:3px solid #1d6fd6;padding-left:8px}
  .chartbox{border:1px solid #e2e8f2;border-radius:8px;padding:8px;background:#fff}
  .legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px;font-size:10px;color:#41506c}
  .lg{display:inline-flex;align-items:center;gap:5px}.dot{width:9px;height:9px;border-radius:50%}
  ul.ins{list-style:none;padding:0;margin:0}
  ul.ins li{margin:0 0 7px;line-height:1.5;padding:7px 9px;border:1px solid #e8edf6;border-radius:7px;background:#fbfcff}
  .ib{display:inline-block;color:#fff;font-size:8px;font-weight:700;letter-spacing:.4px;border-radius:4px;padding:1px 6px;margin-right:6px;vertical-align:middle}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border:1px solid #e2e8f2;padding:5px 8px;text-align:left}
  th{background:#eef3fb;color:#41506c;font-size:10px;text-transform:uppercase;letter-spacing:.4px}
  td.r{text-align:right;font-variant-numeric:tabular-nums}
  .badge{font-size:9px;font-weight:700;border-radius:10px;padding:1px 7px}
  .foot{margin-top:22px;border-top:1px solid #e2e8f2;padding-top:8px;font-size:9px;color:#9aa6ba;display:flex;justify-content:space-between}
  @media print{body{padding:0}@page{margin:14mm}}
</style></head>
<body>
  <div class="head">
    <div><div class="brand">Portal Hidrologi · Laporan Telemetri</div><h1>${esc(title)}</h1><div class="sub">${esc(subtitle)}</div></div>
    <div class="gen">Dibuat<br/>${esc(genStr)}</div>
  </div>
  <div class="meta">${metaHtml}</div>
  <div class="kpis">${kpiHtml}</div>

  <h2>Grafik Tren</h2>
  <div class="chartbox">${reportChartSvg(columns, colors)}<div class="legend">${legendHtml}</div></div>

  <h2>AI Insight — Analisis Otomatis</h2>
  <ul class="ins">${insightHtml}</ul>

  <h2>Statistik Ringkas per Pos (${esc(unit)})</h2>
  <table><thead><tr><th>Pos</th><th>Status</th><th>Min</th><th>Maks</th><th>Rata²</th><th>Std (σ)</th><th>Laju/jam</th></tr></thead><tbody>${statHtml}</tbody></table>

  <div class="foot"><span>Balai Wilayah Sungai — Sistem Telemetri Hidrologi</span><span>Dokumen dihasilkan otomatis oleh Portal Hidrologi</span></div>
</body></html>`;
}

/** Cetak laporan lewat iframe tersembunyi → pengguna pilih "Simpan sebagai PDF". */
export function printReport(html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => setTimeout(() => iframe.remove(), 800);
  win.onafterprint = cleanup;
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
    }
  }, 350);
}
