import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import OpenAI from 'openai';
import { createChatReply } from './chatRuntime.js';

const PORT = Number(process.env.PORT ?? process.env.PM2_SERVE_PORT ?? 4781);
const DIST_DIR = resolve(process.env.STATIC_DIR ?? 'dist');
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.5';
const BODY_LIMIT_BYTES = 1_000_000;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

let openaiClient;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  openaiClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];

  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT_BYTES) {
      const error = new Error('Payload chat terlalu besar.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Body harus berupa JSON valid.');
    error.statusCode = 400;
    throw error;
  }
}

async function handleChat(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Gunakan POST untuk /api/chat.' });
    return;
  }

  const client = getOpenAIClient();
  if (!client) {
    sendJson(res, 503, {
      error: 'OPENAI_API_KEY belum diset di environment server.',
    });
    return;
  }

  try {
    const payload = await readJson(req);
    const reply = await createChatReply({
      client,
      model: OPENAI_MODEL,
      messages: payload.messages,
      context: payload.context,
    });

    sendJson(res, 200, { reply, model: OPENAI_MODEL });
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;
    sendJson(res, statusCode, {
      error: statusCode >= 500 ? 'Gagal memproses chat AI.' : error.message,
    });
  }
}

function safeStaticPath(pathname) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const requested = resolve(DIST_DIR, `.${decodeURIComponent(cleanPath)}`);
  return requested.startsWith(DIST_DIR) ? requested : null;
}

async function serveFile(res, filePath, method) {
  const info = await stat(filePath);
  if (!info.isFile()) return false;

  res.writeHead(200, {
    'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
    'content-length': info.size,
  });

  if (method === 'HEAD') {
    res.end();
    return true;
  }

  createReadStream(filePath).pipe(res);
  return true;
}

async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method tidak didukung.' });
    return;
  }

  const requested = safeStaticPath(url.pathname);
  if (!requested) {
    sendJson(res, 403, { error: 'Path tidak valid.' });
    return;
  }

  try {
    if (await serveFile(res, requested, req.method)) return;
  } catch {
    // SPA fallback below.
  }

  try {
    await serveFile(res, resolve(DIST_DIR, 'index.html'), req.method);
  } catch {
    sendJson(res, 404, {
      error: 'Build frontend belum tersedia. Jalankan npm run build terlebih dahulu.',
    });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname === '/api/chat') {
    await handleChat(req, res);
    return;
  }

  await serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`allinone server listening on http://localhost:${PORT}`);
});
