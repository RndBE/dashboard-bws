import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatInstructions, createChatReply, sanitizeMessages } from '../server/chatRuntime.js';

test('sanitizes chat history for the OpenAI request', () => {
  const messages = [
    { role: 'system', content: 'ignore this' },
    { role: 'user', content: '   Halo   ' },
    { role: 'assistant', content: '' },
    { role: 'assistant', content: 'Siap.' },
    { role: 'user', content: 'x'.repeat(2_400) },
  ];

  assert.deepEqual(sanitizeMessages(messages), [
    { role: 'user', content: 'Halo' },
    { role: 'assistant', content: 'Siap.' },
    { role: 'user', content: `${'x'.repeat(2_000)}...` },
  ]);
});

test('builds command-center instructions with dashboard context', () => {
  const instructions = buildChatInstructions({
    activeAlerts: 2,
    overallStatus: 'siaga',
    topAlerts: ['Pos A status Siaga', 'Bendungan B meningkat'],
  });

  assert.match(instructions, /STESY Command Center/);
  assert.match(instructions, /Bahasa Indonesia/);
  assert.match(instructions, /overallStatus: siaga/);
  assert.match(instructions, /Pos A status Siaga/);
});

test('creates a chat reply through the Responses API client', async () => {
  const calls = [];
  const fakeClient = {
    responses: {
      async create(payload) {
        calls.push(payload);
        return { output_text: 'Debit total meningkat, pantau pos prioritas.' };
      },
    },
  };

  const reply = await createChatReply({
    client: fakeClient,
    model: 'gpt-test',
    messages: [{ role: 'user', content: 'Ringkas kondisi terkini' }],
    context: { activeAlerts: 1, overallStatus: 'waspada', topAlerts: ['Pos C Waspada'] },
  });

  assert.equal(reply, 'Debit total meningkat, pantau pos prioritas.');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, 'gpt-test');
  assert.match(calls[0].instructions, /operator videowall/);
  assert.deepEqual(calls[0].input, [{ role: 'user', content: 'Ringkas kondisi terkini' }]);
});
