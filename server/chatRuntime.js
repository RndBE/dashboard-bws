const MAX_MESSAGES = 16;
const MAX_CONTENT_LENGTH = 2_000;

/**
 * @typedef {{ role: 'user' | 'assistant'; content: string }} ChatMessage
 * @typedef {{ activeAlerts?: number; overallStatus?: string; topAlerts?: string[] }} WallContext
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function safeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {string} content
 * @returns {string}
 */
function clampContent(content) {
  if (content.length <= MAX_CONTENT_LENGTH) return content;
  return `${content.slice(0, MAX_CONTENT_LENGTH)}...`;
}

/**
 * @param {unknown} messages
 * @returns {ChatMessage[]}
 */
export function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && typeof message === 'object')
    .map((message) => {
      const item = /** @type {{ role?: unknown; content?: unknown }} */ (message);
      const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
      const content = safeText(item.content);
      return role && content ? { role, content: clampContent(content) } : null;
    })
    .filter((message) => message !== null)
    .slice(-MAX_MESSAGES);
}

/**
 * @param {WallContext | undefined} context
 * @returns {string}
 */
export function buildChatInstructions(context = {}) {
  const activeAlerts = Number.isFinite(context.activeAlerts) ? context.activeAlerts : 0;
  const overallStatus = safeText(context.overallStatus) || 'tidak diketahui';
  const topAlerts = Array.isArray(context.topAlerts)
    ? context.topAlerts.map(safeText).filter(Boolean).slice(0, 6)
    : [];

  return [
    'Kamu adalah asisten AI untuk STESY Command Center, dashboard operasi Balai Wilayah Sungai.',
    'Jawab dalam Bahasa Indonesia yang ringkas, tenang, dan operasional.',
    'Kamu membantu operator videowall memahami kondisi hidrologi, bendungan, irigasi, CCTV, dan peringatan.',
    'Gunakan hanya konteks dashboard yang diberikan dan percakapan pengguna. Jangan mengarang data sensor, angka, atau status realtime.',
    'Jika data tidak tersedia, katakan data belum tersedia dan sarankan pemeriksaan panel terkait.',
    '',
    'Konteks videowall saat ini:',
    `activeAlerts: ${activeAlerts}`,
    `overallStatus: ${overallStatus}`,
    `topAlerts: ${topAlerts.length ? topAlerts.join(' | ') : 'tidak ada peringatan prioritas'}`,
  ].join('\n');
}

/**
 * @param {{
 *   client: { responses: { create: (payload: { model: string; instructions: string; input: ChatMessage[] }) => Promise<{ output_text?: string }> } };
 *   model: string;
 *   messages: unknown;
 *   context?: WallContext;
 * }} params
 * @returns {Promise<string>}
 */
export async function createChatReply({ client, model, messages, context }) {
  const input = sanitizeMessages(messages);
  if (!input.length) {
    const error = new Error('Pesan chat kosong.');
    error.statusCode = 400;
    throw error;
  }

  const response = await client.responses.create({
    model,
    instructions: buildChatInstructions(context),
    input,
  });

  const reply = safeText(response.output_text);
  if (!reply) throw new Error('OpenAI tidak mengembalikan jawaban teks.');
  return reply;
}
