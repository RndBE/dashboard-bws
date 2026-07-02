/**
 * @typedef {{ role: 'user' | 'assistant'; content: string }} ChatMessage
 * @typedef {{ activeAlerts: number; overallStatus: string; topAlerts: string[] }} ChatContext
 */

/**
 * @param {{
 *   fetcher?: typeof fetch;
 *   messages: ChatMessage[];
 *   context: ChatContext;
 * }} params
 * @returns {Promise<string>}
 */
export async function requestChatReply({ fetcher = fetch, messages, context }) {
  const response = await fetcher('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? 'Chat AI tidak dapat dihubungi.');
  }

  return typeof payload.reply === 'string' ? payload.reply : 'Jawaban AI kosong.';
}
