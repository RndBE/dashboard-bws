<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import LogOut from '@lucide/svelte/icons/log-out';
  import { logoutPrompt, logout, cancelLogout } from '../../auth';
  import { BALAI_NAME } from '../../data/seed';
</script>

<svelte:window onkeydown={(e) => $logoutPrompt && e.key === 'Escape' && cancelLogout()} />

{#if $logoutPrompt}
  <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Konfirmasi keluar">
    <!-- backdrop (klik untuk batal) -->
    <button
      type="button"
      aria-label="Tutup"
      onclick={cancelLogout}
      transition:fade={{ duration: 150 }}
      class="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
    ></button>

    <div
      transition:scale={{ duration: 180, start: 0.94 }}
      class="relative z-10 w-full max-w-[360px] rounded-2xl border border-line bg-surface p-6 shadow-2xl"
    >
      <div class="flex flex-col items-center text-center">
        <span class="mb-4 grid h-12 w-12 place-items-center rounded-full border border-awas/30 bg-awas/10 text-awas">
          <LogOut size={22} />
        </span>
        <h2 class="text-[15px] font-semibold text-ink-strong">Keluar dari sesi?</h2>
        <p class="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
          Anda akan keluar dari <span class="text-ink">{BALAI_NAME}</span> dan kembali ke halaman masuk.
        </p>
      </div>

      <div class="mt-5 flex gap-2.5">
        <button
          type="button"
          onclick={cancelLogout}
          class="h-9 flex-1 rounded-lg border border-line bg-transparent text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-white/[0.04] hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Batal
        </button>
        <button
          type="button"
          onclick={logout}
          class="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-awas/40 bg-awas/15 text-[12.5px] font-medium text-awas transition-colors hover:border-awas/60 hover:bg-awas/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-awas/40"
        >
          <LogOut size={14} /> Keluar
        </button>
      </div>
    </div>
  </div>
{/if}
