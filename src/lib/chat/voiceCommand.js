/** @type {{ action: 'open-chat' | 'close-chat'; phrase: string }[]} */
const COMMANDS = [
  { action: 'open-chat', phrase: 'stesy buka chat' },
  { action: 'open-chat', phrase: 'stesy tampilkan chat' },
  { action: 'open-chat', phrase: 'stesy panggil chat' },
  { action: 'open-chat', phrase: 'halo stesy' },
  { action: 'open-chat', phrase: 'hai stesy' },
  { action: 'close-chat', phrase: 'stesy tutup chat' },
  { action: 'close-chat', phrase: 'stesy sembunyikan chat' },
];

/**
 * @param {string} transcript
 * @returns {string}
 */
export function normalizeTranscript(transcript) {
  return transcript
    .toLocaleLowerCase('id-ID')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} transcript
 * @returns {{ action: 'open-chat' | 'close-chat'; phrase: string } | null}
 */
export function matchWakeCommand(transcript) {
  const normalized = normalizeTranscript(transcript);
  const command = COMMANDS.find((item) => normalized.includes(item.phrase));
  return command ? { action: command.action, phrase: command.phrase } : null;
}
