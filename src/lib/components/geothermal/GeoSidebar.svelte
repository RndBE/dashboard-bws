<script lang="ts">
  import CloudRain from '@lucide/svelte/icons/cloud-rain';
  import Logo from '../layout/Logo.svelte';
  import { num } from '../../format';
  import { SITE, WEATHER } from '../../geothermal/seed.js';
  import { geoSection } from '../../geothermal/store';
  import { GEO_NAV, type GeoSection } from '../../config/geoNav';

  function go(key: GeoSection) {
    geoSection.set(key);
  }
</script>

<aside class="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
  <div class="flex items-center gap-2 border-b border-line px-4 py-3">
    <Logo height={24} />
    <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-pu-bright">Geothermal</div>
  </div>

  <nav class="flex flex-col gap-0.5 p-2">
    {#each GEO_NAV as item}
      {@const on = $geoSection === item.key}
      <button
        onclick={() => go(item.key)}
        class="group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[12px] font-medium transition-colors
          {on ? 'bg-accent/15 text-accent-bright' : 'text-ink-muted hover:bg-[var(--surface-hover)] hover:text-ink'}"
      >
        {#if on}
          <span class="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent"></span>
        {/if}
        <item.icon size={15} /> {item.label}
      </button>
    {/each}
  </nav>

  <div class="mt-auto space-y-3 border-t border-line p-4 text-[11px]">
    <div>
      <div class="mb-1 text-[9px] font-semibold uppercase tracking-widest text-ink-dim">Site Information</div>
      <div class="font-semibold text-ink-strong">{SITE.name}</div>
      <dl class="mt-1 space-y-0.5 text-ink-muted">
        <div class="flex justify-between"><dt>Field Area</dt><dd class="text-ink">{SITE.field}</dd></div>
        <div class="flex justify-between"><dt>Latitude</dt><dd class="text-ink tnum">{SITE.lat}</dd></div>
        <div class="flex justify-between"><dt>Longitude</dt><dd class="text-ink tnum">{SITE.lng}</dd></div>
        <div class="flex justify-between"><dt>Altitude</dt><dd class="text-ink tnum">{SITE.altitude} m</dd></div>
      </dl>
    </div>
    <div class="border-t border-line pt-3">
      <div class="flex items-center gap-2">
        <CloudRain size={22} class="text-accent" />
        <div>
          <div class="text-[18px] font-semibold text-ink-strong tnum">{num(WEATHER.temp, 1)} °C</div>
          <div class="text-ink-muted">{WEATHER.cond}</div>
        </div>
      </div>
      <div class="mt-1 flex justify-between text-ink-muted">
        <span>Wind {WEATHER.wind} km/h</span><span>Hum {WEATHER.humidity}%</span>
      </div>
    </div>
  </div>
</aside>
