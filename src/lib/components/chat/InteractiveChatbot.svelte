<script lang="ts">
  import { tick } from 'svelte';
  import Bot from '@lucide/svelte/icons/bot';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import MessageSquareText from '@lucide/svelte/icons/message-square-text';
  import SendHorizontal from '@lucide/svelte/icons/send-horizontal';
  import X from '@lucide/svelte/icons/x';
  import type { AlertItem, Siaga } from '../../types';
  import { STATUS } from '../../status';
  import { requestChatReply } from '../../chat/chatClient.js';

  interface Props {
    activeAlerts: AlertItem[];
    overallStatus: Siaga;
  }

  interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    at: number;
  }

  let { activeAlerts, overallStatus }: Props = $props();

  let open = $state(false);
  let draft = $state('');
  let loading = $state(false);
  let error = $state('');
  let messageList: HTMLDivElement | null = $state(null);
  let messages = $state<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Halo. Saya siap membantu membaca data dashboard interaktif.',
      at: Date.now(),
    },
  ]);

  const chatContext = $derived({
    activeAlerts: activeAlerts.length,
    overallStatus,
    topAlerts: activeAlerts.slice(0, 6).map((item) => item.message),
  });

  function messageId() {
    return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function historyFrom(items: ChatMessage[]) {
    return items.slice(-12).map((item) => ({
      role: item.role,
      content: item.content,
    }));
  }

  function scrollToEnd() {
    tick().then(() => {
      messageList?.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' });
    });
  }

  async function sendMessage(text = draft) {
    const content = text.trim();
    if (!content || loading) return;

    const nextMessages = [
      ...messages,
      { id: messageId(), role: 'user' as const, content, at: Date.now() },
    ];
    messages = nextMessages;
    draft = '';
    error = '';
    loading = true;
    scrollToEnd();

    try {
      const reply = await requestChatReply({
        messages: historyFrom(nextMessages),
        context: chatContext,
      });

      messages = [
        ...messages,
        { id: messageId(), role: 'assistant', content: reply, at: Date.now() },
      ];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Chat AI tidak dapat dihubungi.';
    } finally {
      loading = false;
      scrollToEnd();
    }
  }

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    sendMessage();
  }

  function onDraftKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="fixed bottom-4 right-4 z-[760] sm:bottom-5 sm:right-5">
  {#if open}
    <section class="flex h-[min(580px,calc(100vh-120px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_24px_70px_-24px_rgba(0,0,0,0.55)]">
      <header class="flex items-center gap-3 border-b border-line bg-panel-2/70 px-3.5 py-3">
        <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-accent/35 bg-accent/10 text-accent-bright">
          <Bot size={18} strokeWidth={1.9} />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[13px] font-semibold text-ink-strong">Chatbot GPT</div>
          <div class="mt-0.5 flex items-center gap-2 text-[10.5px] text-ink-dim">
            <span class="h-1.5 w-1.5 rounded-full" style="background:{STATUS[overallStatus].color}"></span>
            <span>{STATUS[overallStatus].label}</span>
            <span>·</span>
            <span>{activeAlerts.length} peringatan aktif</span>
          </div>
        </div>
        <button
          onclick={() => (open = false)}
          title="Tutup chatbot"
          class="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-[var(--surface-hover)] hover:text-ink-strong"
        >
          <X size={16} />
        </button>
      </header>

      <div bind:this={messageList} class="min-h-0 flex-1 space-y-2 overflow-y-auto p-3.5">
        {#each messages as message (message.id)}
          <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div
              class="max-w-[82%] rounded-xl border px-3 py-2 text-[12.5px] leading-relaxed {message.role === 'user'
                ? 'border-accent/35 bg-accent/10 text-ink-strong'
                : 'border-line bg-panel-2 text-ink'}"
            >
              {message.content}
            </div>
          </div>
        {/each}

        {#if loading}
          <div class="flex justify-start">
            <div class="inline-flex items-center gap-2 rounded-xl border border-line bg-panel-2 px-3 py-2 text-[12px] text-ink-muted">
              <LoaderCircle size={14} class="animate-spin" />
              Memproses
            </div>
          </div>
        {/if}
      </div>

      {#if error}
        <div class="border-t border-awas/25 bg-awas/10 px-3.5 py-2 text-[11.5px] text-awas">
          {error}
        </div>
      {/if}

      <form onsubmit={onSubmit} class="border-t border-line bg-panel-2/45 p-3">
        <div class="flex items-end gap-2">
          <textarea
            bind:value={draft}
            onkeydown={onDraftKeydown}
            rows="2"
            placeholder="Tanya data dashboard..."
            class="min-h-11 flex-1 resize-none rounded-xl border border-line bg-bg/70 px-3 py-2 text-[12.5px] leading-relaxed text-ink-strong outline-none transition-colors placeholder:text-ink-dim focus:border-accent/60"
          ></textarea>
          <button
            type="submit"
            disabled={!draft.trim() || loading}
            title="Kirim pesan"
            class="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/45 bg-accent/10 text-accent-bright transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:border-line disabled:bg-panel disabled:text-ink-dim"
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      </form>
    </section>
  {:else}
    <button
      onclick={() => (open = true)}
      title="Buka chatbot GPT"
      class="grid h-13 w-13 place-items-center rounded-full border border-accent/45 bg-panel text-accent-bright shadow-[0_16px_46px_-18px_rgba(0,0,0,0.72)] transition-colors hover:bg-accent/10 sm:h-14 sm:w-14"
    >
      <MessageSquareText size={23} strokeWidth={1.9} />
    </button>
  {/if}
</div>
