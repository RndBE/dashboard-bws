<script lang="ts">
  import User from '@lucide/svelte/icons/user';
  import Lock from '@lucide/svelte/icons/lock';
  import LogIn from '@lucide/svelte/icons/log-in';
  import AlertCircle from '@lucide/svelte/icons/circle-alert';
  import Logo from '../layout/Logo.svelte';
  import Button from '../ui/Button.svelte';
  import { login, DEMO_HINT } from '../../auth';
  import { BALAI_NAME } from '../../data/seed';

  let username = $state('');
  let password = $state('');
  let error = $state('');

  function submit(e: Event) {
    e.preventDefault();
    error = '';
    if (!login(username, password)) {
      error = 'Username atau password salah.';
    }
  }
</script>

<div class="relative flex h-screen items-center justify-center overflow-hidden p-4">
  <!-- latar dekoratif command-center -->
  <div
    class="pointer-events-none absolute inset-0 opacity-60"
    style="background:
      radial-gradient(60% 50% at 50% -10%, color-mix(in oklab, var(--color-accent) 22%, transparent), transparent 70%),
      radial-gradient(40% 40% at 90% 110%, color-mix(in oklab, var(--color-accent) 14%, transparent), transparent 70%);"
  ></div>

  <form
    onsubmit={submit}
    class="relative z-10 w-full max-w-[380px] rounded-2xl border border-line bg-surface/95 p-7 shadow-2xl backdrop-blur"
  >
    <div class="mb-6 flex flex-col items-center gap-3 text-center">
      <Logo height={30} />
      <div>
        <div class="text-[9px] font-semibold uppercase tracking-[0.26em] text-pu-bright">
          Pusat Kendali Operasi
        </div>
        <h1 class="mt-0.5 text-[16px] font-semibold tracking-tight text-ink-strong">{BALAI_NAME}</h1>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <label class="block">
        <span class="mb-1 block text-[11px] font-medium text-ink-muted">Username</span>
        <div class="relative">
          <User size={15} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
          <input
            bind:value={username}
            oninput={() => (error = '')}
            type="text"
            autocomplete="username"
            placeholder="masukkan username"
            class="w-full rounded-lg border border-line bg-panel-2 py-2.5 pl-9 pr-3 text-[13px] text-ink-strong placeholder:text-ink-dim focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </label>

      <label class="block">
        <span class="mb-1 block text-[11px] font-medium text-ink-muted">Password</span>
        <div class="relative">
          <Lock size={15} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
          <input
            bind:value={password}
            oninput={() => (error = '')}
            type="password"
            autocomplete="current-password"
            placeholder="masukkan password"
            class="w-full rounded-lg border border-line bg-panel-2 py-2.5 pl-9 pr-3 text-[13px] text-ink-strong placeholder:text-ink-dim focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </label>

      {#if error}
        <div class="flex items-center gap-2 rounded-lg border border-awas/35 bg-awas/10 px-3 py-2 text-[11.5px] text-awas">
          <AlertCircle size={14} class="shrink-0" />
          {error}
        </div>
      {/if}

      <Button type="submit" variant="accent" size="md" class="mt-1 w-full">
        <LogIn size={15} /> Masuk
      </Button>
    </div>

    <p class="mt-5 border-t border-line-soft pt-3 text-center text-[10.5px] text-ink-dim">
      Akun demo: <span class="font-mono text-ink-muted">{DEMO_HINT}</span>
    </p>
  </form>
</div>
