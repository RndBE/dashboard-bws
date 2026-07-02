<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Bot from '@lucide/svelte/icons/bot';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import MessageSquareText from '@lucide/svelte/icons/message-square-text';
  import Mic from '@lucide/svelte/icons/mic';
  import MicOff from '@lucide/svelte/icons/mic-off';
  import SendHorizontal from '@lucide/svelte/icons/send-horizontal';
  import X from '@lucide/svelte/icons/x';
  import type { AlertItem, Siaga } from '../../types';
  import { STATUS } from '../../status';
  import { requestChatReply } from '../../chat/chatClient.js';
  import { matchWakeCommand } from '../../chat/voiceCommand.js';

  interface SpeechRecognitionAlternative {
    transcript: string;
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
  }
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    abort: () => void;
    start: () => void;
    stop: () => void;
  }
  type SpeechRecognitionConstructor = new () => SpeechRecognition;

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
  let listening = $state(false);
  let speechSupported = $state(false);
  let voiceStatus = $state('Voice offline');
  let error = $state('');
  let messageList: HTMLDivElement | null = $state(null);
  let recognition: SpeechRecognition | null = null;

  let messages = $state<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Siap membantu membaca kondisi operasi STESY Command Center.',
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

  function scrollToEnd() {
    tick().then(() => {
      messageList?.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' });
    });
  }

  function historyFrom(items: ChatMessage[]) {
    return items.slice(-12).map((item) => ({
      role: item.role,
      content: item.content,
    }));
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
    open = true;
    scrollToEnd();

    try {
      const reply = await requestChatReply({
        messages: historyFrom(nextMessages),
        context: chatContext,
      });

      messages = [
        ...messages,
        {
          id: messageId(),
          role: 'assistant',
          content: reply,
          at: Date.now(),
        },
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

  function handleTranscript(transcript: string) {
    const command = matchWakeCommand(transcript);
    if (!command) return;

    if (command.action === 'open-chat') {
      open = true;
      voiceStatus = 'Chat dipanggil';
    } else {
      open = false;
      voiceStatus = 'Chat disembunyikan';
    }
  }

  function startListening() {
    if (!recognition) {
      voiceStatus = 'Voice tidak didukung';
      return;
    }

    try {
      listening = true;
      voiceStatus = 'Voice standby';
      recognition.start();
    } catch {
      voiceStatus = 'Voice sudah aktif';
    }
  }

  function stopListening() {
    listening = false;
    voiceStatus = 'Voice dijeda';
    recognition?.stop();
  }

  function toggleListening() {
    if (listening) stopListening();
    else startListening();
  }

  onMount(() => {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    speechSupported = Boolean(Recognition);
    if (!Recognition) return;

    const instance = new Recognition();
    recognition = instance;
    instance.lang = 'id-ID';
    instance.continuous = true;
    instance.interimResults = true;
    voiceStatus = 'Voice siap';

    instance.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i]?.[0]?.transcript ?? '';
      }
      handleTranscript(transcript);
    };

    instance.onerror = (event) => {
      voiceStatus = event.error === 'not-allowed' ? 'Mic ditolak' : 'Voice error';
      listening = false;
    };

    instance.onend = () => {
      if (!listening) return;
      try {
        instance.start();
      } catch {
        // Browser can briefly reject restart while the previous session closes.
      }
    };

    return () => instance.abort();
  });
</script>

<div class="pointer-events-none absolute inset-0 z-[670]">
  <div class="pointer-events-auto absolute bottom-[148px] left-1/2 -translate-x-1/2">
    {#if open}
      <section class="glass-strong hud-bracket hud-bracket-gold flex h-[min(520px,calc(100vh-190px))] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl">
        <div class="glass-sheen"></div>
        <header class="flex items-center gap-3 border-b border-line/60 px-3.5 py-3">
          <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-accent/35 bg-accent/15 text-accent-bright">
            <Bot size={18} strokeWidth={1.9} />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[13px] font-semibold text-ink-strong">GPT Operator</div>
            <div class="mt-0.5 flex items-center gap-2 text-[10.5px] text-ink-dim">
              <span class="h-1.5 w-1.5 rounded-full" style="background:{STATUS[overallStatus].color}"></span>
              <span>{STATUS[overallStatus].label}</span>
              <span>·</span>
              <span>{activeAlerts.length} peringatan</span>
            </div>
          </div>
          <button
            onclick={toggleListening}
            title={listening ? 'Jeda voice command' : 'Aktifkan voice command'}
            class="grid h-9 w-9 place-items-center rounded-lg border transition-colors {listening
              ? 'border-normal/50 bg-normal/15 text-normal'
              : 'border-line text-ink-muted hover:bg-white/[0.06] hover:text-ink-strong'}"
          >
            {#if listening}<Mic size={16} />{:else}<MicOff size={16} />{/if}
          </button>
          <button
            onclick={() => (open = false)}
            title="Tutup chat"
            class="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink-strong"
          >
            <X size={16} />
          </button>
        </header>

        <div bind:this={messageList} class="min-h-0 flex-1 space-y-2 overflow-y-auto px-3.5 py-3">
          {#each messages as message (message.id)}
            <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
              <div
                class="max-w-[82%] rounded-xl border px-3 py-2 text-[12.5px] leading-relaxed {message.role === 'user'
                  ? 'border-accent/35 bg-accent/15 text-ink-strong'
                  : 'border-line/70 bg-white/[0.035] text-ink'}"
              >
                {message.content}
              </div>
            </div>
          {/each}

          {#if loading}
            <div class="flex justify-start">
              <div class="inline-flex items-center gap-2 rounded-xl border border-line/70 bg-white/[0.035] px-3 py-2 text-[12px] text-ink-muted">
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

        <form onsubmit={onSubmit} class="border-t border-line/60 p-3">
          <div class="flex items-end gap-2">
            <textarea
              bind:value={draft}
              onkeydown={onDraftKeydown}
              rows="2"
              placeholder="Tanya kondisi operasi..."
              class="min-h-11 flex-1 resize-none rounded-xl border border-line bg-black/25 px-3 py-2 text-[12.5px] leading-relaxed text-ink-strong outline-none transition-colors placeholder:text-ink-dim focus:border-accent/60"
            ></textarea>
            <button
              type="submit"
              disabled={!draft.trim() || loading}
              title="Kirim pesan"
              class="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/45 bg-accent/15 text-accent-bright transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:border-line disabled:bg-white/[0.03] disabled:text-ink-dim"
            >
              <SendHorizontal size={18} />
            </button>
          </div>
        </form>
      </section>
    {:else}
      <div class="flex items-center gap-2">
        <button
          onclick={() => (open = true)}
          title="Buka chat GPT"
          class="glass hud-bracket grid h-12 w-12 place-items-center rounded-xl border border-accent/35 text-accent-bright transition-colors hover:bg-accent/15"
        >
          <MessageSquareText size={20} strokeWidth={1.9} />
        </button>
        <button
          onclick={toggleListening}
          disabled={!speechSupported}
          title={listening ? 'Jeda voice command' : 'Aktifkan voice command'}
          class="glass hud-bracket flex h-12 items-center gap-2 rounded-xl border px-3 text-[11.5px] transition-colors {listening
            ? 'border-normal/45 text-normal'
            : 'border-line text-ink-muted hover:bg-white/[0.05] hover:text-ink-strong'} disabled:cursor-not-allowed disabled:opacity-60"
        >
          {#if listening}<Mic size={16} />{:else}<MicOff size={16} />{/if}
          <span>{voiceStatus}</span>
        </button>
      </div>
    {/if}
  </div>
</div>
