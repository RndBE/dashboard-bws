import test from 'node:test';
import assert from 'node:assert/strict';
import { requestChatReply } from '../src/lib/chat/chatClient.js';

test('posts chat messages and dashboard context to the shared backend', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      async json() {
        return { reply: 'Pantau peringatan aktif di panel kanan.' };
      },
    };
  };

  const reply = await requestChatReply({
    fetcher: fakeFetch,
    messages: [{ role: 'user', content: 'Ringkas status' }],
    context: { activeAlerts: 2, overallStatus: 'siaga', topAlerts: ['Pos A Siaga'] },
  });

  assert.equal(reply, 'Pantau peringatan aktif di panel kanan.');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/chat');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    messages: [{ role: 'user', content: 'Ringkas status' }],
    context: { activeAlerts: 2, overallStatus: 'siaga', topAlerts: ['Pos A Siaga'] },
  });
});

test('surfaces backend errors from the shared chat endpoint', async () => {
  const fakeFetch = async () => ({
    ok: false,
    async json() {
      return { error: 'OPENAI_API_KEY belum diset di environment server.' };
    },
  });

  await assert.rejects(
    () =>
      requestChatReply({
        fetcher: fakeFetch,
        messages: [{ role: 'user', content: 'Halo' }],
        context: { activeAlerts: 0, overallStatus: 'normal', topAlerts: [] },
      }),
    /OPENAI_API_KEY belum diset/,
  );
});
