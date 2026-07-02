<script lang="ts">
  import FlaskConical from '@lucide/svelte/icons/flask-conical';
  import Droplet from '@lucide/svelte/icons/droplet';
  import GlassWater from '@lucide/svelte/icons/glass-water';
  import TestTube from '@lucide/svelte/icons/test-tube';
  import Thermometer from '@lucide/svelte/icons/thermometer';
  import Zap from '@lucide/svelte/icons/zap';
  import Waves from '@lucide/svelte/icons/waves';
  import Radio from '@lucide/svelte/icons/radio';
  import Table from '@lucide/svelte/icons/table-2';
  import ChartSpline from '@lucide/svelte/icons/chart-spline';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';

  import type { Component } from 'svelte';

  import Panel from '../../ui/Panel.svelte';
  import KpiCard from '../../ui/KpiCard.svelte';
  import Button from '../../ui/Button.svelte';
  import MiniChart from '../../ui/MiniChart.svelte';
  import StatusBadge from '../../ui/StatusBadge.svelte';
  import Sparkline from '../../ui/Sparkline.svelte';

  import { kualitasList, openDetail, clock } from '../../../stores';
  import { STATUS } from '../../../status';
  import { num, relTime } from '../../../format';
  import type { PosHidrologi, SeriesPoint } from '../../../types';

  const pos = $derived($kualitasList);

  // ----- util pembacaan instrumen mutu air -----
  function instr(p: PosHidrologi, type: string) {
    return p.instruments.find((i) => i.type === type && i.category !== 'health');
  }
  function instrValue(p: PosHidrologi, type: string): number | undefined {
    return instr(p, type)?.value;
  }
  function instrHistory(p: PosHidrologi, type: string): SeriesPoint[] {
    return instr(p, type)?.history ?? [];
  }

  // ----- pos terpilih untuk panel profil (default: paling gawat / pertama) -----
  let selId = $state<string | null>(null);
  const sel = $derived(
    pos.find((p) => p.id === selId) ??
      [...pos].sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight)[0],
  );

  // ----- KPI -----
  const phAvg = $derived(
    pos.length ? pos.reduce((s, p) => s + p.param.value, 0) / pos.length : 0,
  );
  const doMin = $derived.by(() => {
    const vals = pos
      .map((p) => instrValue(p, 'DO'))
      .filter((v): v is number => v !== undefined);
    return vals.length ? Math.min(...vals) : 0;
  });
  const turbMax = $derived.by(() => {
    const vals = pos
      .map((p) => instrValue(p, 'Kekeruhan'))
      .filter((v): v is number => v !== undefined);
    return vals.length ? Math.max(...vals) : 0;
  });

  // ----- definisi parameter mutu air (urutan tampilan + ambang baik) -----
  interface ParamDef {
    type: string;
    label: string;
    icon: Component<any>;
    color: string;
    digits: number;
    /** kembalikan true bila nilai tergolong baik */
    baik: (v: number) => boolean;
  }
  const PARAMS: ParamDef[] = [
    { type: 'pH', label: 'pH', icon: FlaskConical, color: '#a78bfa', digits: 1, baik: (v) => v >= 6 && v <= 9 },
    { type: 'DO', label: 'Oksigen Terlarut', icon: Droplet, color: '#4f9bee', digits: 1, baik: (v) => v >= 4 },
    { type: 'Kekeruhan', label: 'Kekeruhan', icon: GlassWater, color: '#c9a227', digits: 0, baik: (v) => v <= 25 },
    { type: 'TDS', label: 'Zat Padat Terlarut', icon: TestTube, color: '#38bdf8', digits: 0, baik: (v) => v <= 500 },
    { type: 'Suhu Air', label: 'Suhu Air', icon: Thermometer, color: '#e08a3c', digits: 1, baik: (v) => v >= 20 && v <= 32 },
    { type: 'DHL', label: 'Daya Hantar Listrik', icon: Zap, color: '#3fb27f', digits: 0, baik: (v) => v <= 1000 },
  ];

  // kartu parameter untuk pos terpilih
  const selCards = $derived.by(() => {
    const p = sel;
    if (!p) return [];
    return PARAMS.map((d) => {
      const it = instr(p, d.type);
      return {
        def: d,
        value: it?.value,
        unit: it?.unit ?? '',
        history: it?.history ?? [],
        online: (it?.status ?? 'offline') === 'online',
        ok: it ? d.baik(it.value) : false,
      };
    }).filter((c) => c.value !== undefined);
  });

  const selPhHistory = $derived(sel ? instrHistory(sel, 'pH') : []);

  // ----- tabel ringkas -----
  const rows = $derived(
    [...pos].sort((a, b) => STATUS[b.status].weight - STATUS[a.status].weight),
  );
</script>

<div class="flex flex-col gap-3">
  <p class="text-[12px] leading-relaxed text-ink-muted">
    Pemantauan <span class="text-ink-strong">mutu air real-time di Pos Duga Air sungai</span> melalui
    Pencatat Kualitas Air Otomatis (AWQR). Parameter pH, oksigen terlarut, kekeruhan, TDS, suhu, dan
    daya hantar listrik dipantau berkelanjutan untuk deteksi dini pencemaran dan layak-tidaknya air baku.
  </p>

  <!-- KPI -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <KpiCard label="Pos kualitas air" value={String(pos.length)} unit="pos" icon={Radio} />
    <KpiCard label="Rerata pH" value={num(phAvg, 1)} unit="pH" icon={FlaskConical} accent>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{phAvg >= 6 && phAvg <= 9 ? 'rentang baik' : 'perlu perhatian'}</span>{/snippet}
    </KpiCard>
    <KpiCard label="DO terendah" value={num(doMin, 1)} unit="mg/L" icon={Droplet}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{doMin >= 4 ? 'cukup oksigen' : 'oksigen rendah'}</span>{/snippet}
    </KpiCard>
    <KpiCard label="Kekeruhan tertinggi" value={num(turbMax, 0)} unit="NTU" icon={GlassWater}>
      {#snippet footer()}<span class="text-[10px] text-ink-dim">{turbMax <= 25 ? 'air jernih' : 'air keruh'}</span>{/snippet}
    </KpiCard>
  </div>

  <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <!-- profil pos terpilih -->
    <div class="xl:col-span-2">
      <Panel
        title="Profil Mutu Air"
        subtitle={sel ? `${sel.name} · ${sel.river ?? '—'}` : '—'}
        icon={FlaskConical}
        accent
      >
        {#snippet actions()}
          {#if sel}<StatusBadge status={sel.status} pulse={sel.status !== 'normal'} />{/if}
        {/snippet}

        <!-- pemilih pos -->
        <div class="mb-3 flex flex-wrap gap-1.5">
          {#each pos as p}
            {@const on = sel?.id === p.id}
            <button
              onclick={() => (selId = p.id)}
              class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors {on
                ? 'border-accent/50 bg-accent/15 text-ink-strong'
                : 'border-line bg-surface text-ink-muted hover:bg-panel hover:text-ink'}"
            >
              <span class="h-1.5 w-1.5 rounded-full" style="background:{STATUS[p.status].color}"></span>
              {p.name}
            </button>
          {/each}
        </div>

        {#if sel}
          <!-- kartu parameter mutu air -->
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {#each selCards as c (c.def.type)}
              <div class="rounded-lg border border-line bg-panel-2 px-2.5 py-2.5">
                <div class="flex items-center gap-1.5 text-ink-muted">
                  <c.def.icon size={13} strokeWidth={2} style="color:{c.def.color}" />
                  <span class="truncate text-[10px] font-medium uppercase tracking-[0.04em]">{c.def.label}</span>
                </div>
                <div class="mt-1 flex items-baseline gap-1">
                  <span class="font-mono text-[19px] font-semibold leading-none text-ink-strong tnum">{num(c.value ?? 0, c.def.digits)}</span>
                  <span class="text-[10px] text-ink-muted">{c.unit}</span>
                </div>
                <div class="mt-1.5 h-[26px]">
                  <Sparkline points={c.history.map((h) => h.v)} color={c.def.color} height={26} dot={false} />
                </div>
                <div class="mt-1 flex items-center gap-1 text-[9.5px] {c.ok ? 'text-normal' : 'text-waspada'}">
                  <span class="h-1.5 w-1.5 rounded-full {c.ok ? 'bg-normal' : 'bg-waspada'}"></span>
                  {c.online ? (c.ok ? 'Baik' : 'Perlu perhatian') : 'Sensor nonaktif'}
                </div>
              </div>
            {/each}
          </div>

          <!-- tren pH -->
          <div class="mt-3 border-t border-line-soft pt-3">
            <div class="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-dim">
              <ChartSpline size={12} />Tren pH 48 jam
            </div>
            <MiniChart points={selPhHistory} height={200} color="#a78bfa" unit="pH" digits={1} />
          </div>

          <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2.5">
            <span class="flex items-center gap-2 text-[11px] text-ink-muted">
              <span class="flex items-center gap-1"><MapPin size={11} />{num(sel.lat, 3)}, {num(sel.lng, 3)}</span>
              <span class="text-ink-dim">·</span>
              <span>Pembaruan {relTime(sel.updatedAt, $clock)}</span>
            </span>
            <Button size="sm" variant="accent" onclick={() => sel && openDetail('pos', sel.id)}>
              <ArrowUpRight size={13} />Detail lengkap &amp; instrumen
            </Button>
          </div>
        {/if}
      </Panel>
    </div>

    <!-- daftar pos -->
    <Panel title="Daftar Pos Kualitas" subtitle="Klik untuk memuat profil" icon={Table} flush>
      <div class="max-h-[560px] overflow-y-auto">
        {#each rows as p (p.id)}
          {@const on = sel?.id === p.id}
          {@const doVal = instrValue(p, 'DO')}
          {@const turbVal = instrValue(p, 'Kekeruhan')}
          <button
            onclick={() => (selId = p.id)}
            class="flex w-full items-start gap-2.5 border-b border-line-soft px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)] {on ? 'bg-accent/8' : ''}"
          >
            <span class="mt-1 h-2 w-2 shrink-0 rounded-full" style="background:{STATUS[p.status].color}"></span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="truncate text-[12px] font-medium text-ink-strong">{p.name}</span>
              </div>
              <div class="truncate text-[10px] text-ink-dim">{p.river ?? '—'} · {relTime(p.updatedAt, $clock)}</div>
              <div class="mt-1 flex items-center gap-2 font-mono text-[10px] text-ink-muted tnum">
                <span>DO {doVal !== undefined ? num(doVal, 1) : '–'} <span class="text-ink-dim">mg/L</span></span>
                <span class="text-ink-dim">·</span>
                <span>Keruh {turbVal !== undefined ? num(turbVal, 0) : '–'} <span class="text-ink-dim">NTU</span></span>
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <div class="font-mono text-[14px] font-semibold tnum" style="color:{STATUS[p.status].color}">{num(p.param.value, 1)}<span class="text-[9px] text-ink-muted"> pH</span></div>
              <StatusBadge status={p.status} size="xs" dot={false} />
            </div>
          </button>
        {/each}
      </div>
    </Panel>
  </div>

  <!-- ringkasan mutu air per pos -->
  <Panel title="Ringkasan Mutu Air per Pos" subtitle="{rows.length} pos · klik baris untuk detail instrumen" icon={Waves} flush>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-[12px]">
        <thead>
          <tr class="border-b border-line text-[10px] uppercase tracking-wide text-ink-dim">
            <th class="px-3.5 py-2 font-medium">Pos / Sungai</th>
            <th class="px-2 py-2 font-medium">Status</th>
            <th class="px-2 py-2 text-right font-medium">pH</th>
            <th class="px-2 py-2 text-right font-medium">DO <span class="font-normal normal-case">(mg/L)</span></th>
            <th class="px-2 py-2 text-right font-medium">Kekeruhan <span class="font-normal normal-case">(NTU)</span></th>
            <th class="px-2 py-2 text-right font-medium">TDS <span class="font-normal normal-case">(mg/L)</span></th>
            <th class="px-2 py-2 text-right font-medium">Suhu <span class="font-normal normal-case">(°C)</span></th>
            <th class="px-3.5 py-2 text-right font-medium">DHL <span class="font-normal normal-case">(µS/cm)</span></th>
          </tr>
        </thead>
        <tbody>
          {#each rows as p (p.id)}
            {@const doVal = instrValue(p, 'DO')}
            {@const turbVal = instrValue(p, 'Kekeruhan')}
            {@const tdsVal = instrValue(p, 'TDS')}
            {@const suhuVal = instrValue(p, 'Suhu Air')}
            {@const dhlVal = instrValue(p, 'DHL')}
            <tr
              onclick={() => openDetail('pos', p.id)}
              class="cursor-pointer border-b border-line-soft transition-colors hover:bg-[var(--surface-hover)]"
            >
              <td class="px-3.5 py-2.5">
                <div class="font-medium text-ink-strong">{p.name}</div>
                <div class="text-[10px] text-ink-dim">{p.river ?? '—'}</div>
              </td>
              <td class="px-2 py-2.5"><StatusBadge status={p.status} size="xs" dot={false} /></td>
              <td class="px-2 py-2.5 text-right font-mono font-semibold tnum" style="color:{STATUS[p.status].color}">{num(p.param.value, 1)}</td>
              <td class="px-2 py-2.5 text-right font-mono text-ink tnum">{doVal !== undefined ? num(doVal, 1) : '–'}</td>
              <td class="px-2 py-2.5 text-right font-mono text-ink tnum">{turbVal !== undefined ? num(turbVal, 0) : '–'}</td>
              <td class="px-2 py-2.5 text-right font-mono text-ink tnum">{tdsVal !== undefined ? num(tdsVal, 0) : '–'}</td>
              <td class="px-2 py-2.5 text-right font-mono text-ink tnum">{suhuVal !== undefined ? num(suhuVal, 1) : '–'}</td>
              <td class="px-3.5 py-2.5 text-right font-mono text-ink tnum">{dhlVal !== undefined ? num(dhlVal, 0) : '–'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Panel>
</div>
