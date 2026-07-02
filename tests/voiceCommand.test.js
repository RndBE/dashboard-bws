import test from 'node:test';
import assert from 'node:assert/strict';
import { matchWakeCommand, normalizeTranscript } from '../src/lib/chat/voiceCommand.js';

test('normalizes Indonesian speech transcripts for command matching', () => {
  assert.equal(normalizeTranscript('  STESY,   buka chat!  '), 'stesy buka chat');
});

test('matches a wake command that opens the wall chatbot', () => {
  assert.deepEqual(matchWakeCommand('STESY buka chat'), {
    action: 'open-chat',
    phrase: 'stesy buka chat',
  });
});

test('matches a command that hides the wall chatbot', () => {
  assert.deepEqual(matchWakeCommand('tolong stesy tutup chat sekarang'), {
    action: 'close-chat',
    phrase: 'stesy tutup chat',
  });
});

test('ignores speech that is not a chatbot command', () => {
  assert.equal(matchWakeCommand('status bendungan riam kanan'), null);
});
