<script lang="ts">
  import Monitor from '@lucide/svelte/icons/monitor';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Button from '../ui/Button.svelte';
  import { mode } from '../../stores';
</script>

<div class="relative flex h-screen flex-col items-center justify-center overflow-hidden p-6 text-center">
  <div
    class="pointer-events-none absolute inset-0 opacity-50"
    style="background: radial-gradient(60% 50% at 50% -10%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 70%);"
  ></div>

  <div class="relative z-10 flex flex-col items-center gap-5">
    <span class="grid h-16 w-16 place-items-center rounded-2xl border border-line bg-panel-2 text-accent-bright">
      <Monitor size={30} />
    </span>
    <div class="max-w-[340px]">
      <h1 class="text-[17px] font-semibold tracking-tight text-ink-strong">Mode Layar Dinding</h1>
      <p class="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
        Tampilan Layar Dinding (videowall) dirancang untuk monitor atau layar besar dan tidak
        tersedia di perangkat mobile. Silakan buka di layar berukuran lebih lebar
        (minimal&nbsp;1024px).
      </p>
    </div>
    <Button variant="accent" onclick={() => mode.set('dashboard')}>
      <LayoutDashboard size={15} /> Buka mode Interaktif
    </Button>
  </div>
</div>
