import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { compose } from './src/composer.mjs';
import { exportMidi } from './src/midi.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.wav': 'audio/wav' };
const ALLOWED = new Set(['/web/index.html', '/web/integration.html', '/web/styles.css', '/web/meters.css', '/web/app.mjs', '/src/composer.mjs', '/src/theory.mjs', '/src/meter.mjs', '/src/midi.mjs', '/src/transport.mjs', '/src/webaudio.mjs', '/src/browser-player.mjs']);
ALLOWED.add('/src/samples.mjs'); ALLOWED.add('/samples/vsco-ce/manifest.json');
for (const route of ['/src/director.mjs', '/web/director.html', '/web/director-app.mjs']) ALLOWED.add(route);
for (const route of ['/src/studio.mjs', '/src/studio-audio.mjs', '/src/studio-midi.mjs', '/web/studio.html', '/web/studio.css', '/web/studio-app.mjs']) ALLOWED.add(route);
ALLOWED.add('/src/studio-host.mjs');

async function readJson(request) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 16_384) throw new RangeError('Request body exceeds 16 KB');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new TypeError('Body must be valid JSON'); }
}

export function createMusicServer({ artifactRoot = path.join(root, 'artifacts') } = {}) {
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    const sendJson = (status, data) => { response.writeHead(status, { 'Content-Type': TYPES['.json'] }); response.end(JSON.stringify(data)); };
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/api/v1/health' && request.method === 'GET') return sendJson(200, { ok: true, version: '0.6.0', scoreSchemaVersion: 2, studioProjectVersion: 1, audioRenderer: 'client-owned' });
      if (url.pathname === '/api/v1/renders/wav') {
        if (request.method !== 'POST') return sendJson(405, { error: 'Use POST with rendered WAV bytes' });
        if (request.headers['content-type'] !== 'audio/wav') return sendJson(400, { error: 'Content-Type must be audio/wav' });
        const chunks = []; let size = 0;
        for await (const chunk of request) { size += chunk.length; if (size > 32 * 1024 * 1024) throw new RangeError('WAV exceeds 32 MB'); chunks.push(chunk); }
        const wav = Buffer.concat(chunks);
        if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE' ||
          wav.toString('ascii', 12, 16) !== 'fmt ' || wav.readUInt32LE(16) !== 16 || wav.readUInt16LE(20) !== 1 ||
          wav.readUInt16LE(22) !== 2 || wav.readUInt16LE(34) !== 16 || wav.toString('ascii', 36, 40) !== 'data' ||
          wav.readUInt32LE(4) !== wav.length - 8 || wav.readUInt32LE(40) !== wav.length - 44 || (wav.length - 44) % 4 !== 0 ||
          ![24000, 44100, 48000].includes(wav.readUInt32LE(24)) || wav.readUInt32LE(28) !== wav.readUInt32LE(24) * 4 || wav.readUInt16LE(32) !== 4) throw new TypeError('Expected a valid stereo 16-bit PCM WAV');
        const filename = `score-${randomUUID()}.wav`;
        await mkdir(artifactRoot, { recursive: true });
        await writeFile(path.join(artifactRoot, filename), wav, { flag: 'wx' });
        return sendJson(201, { filename, url: `/artifacts/${filename}`, bytes: wav.length, duration: (wav.length - 44) / wav.readUInt32LE(28) });
      }
      if (/^\/artifacts\/score-[0-9a-f-]{36}\.wav$/.test(url.pathname) && request.method === 'GET') {
        const filename = path.basename(url.pathname);
        try {
          const wav = await readFile(path.join(artifactRoot, filename));
          response.writeHead(200, { 'Content-Type': 'audio/wav' });
          return response.end(wav);
        } catch { return sendJson(404, { error: 'Render not found' }); }
      }
      if (url.pathname === '/api/v1/compose' || url.pathname === '/api/v1/midi') {
        if (request.method !== 'POST') return sendJson(405, { error: 'Use POST with JSON settings' });
        const score = compose(await readJson(request));
        if (url.pathname.endsWith('/compose')) return sendJson(200, score);
        response.writeHead(200, { 'Content-Type': 'audio/midi', 'Content-Disposition': 'attachment; filename="way-score.mid"' });
        return response.end(exportMidi(score));
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(405, { error: 'Method not allowed' });
      const route = url.pathname === '/' ? '/web/studio.html' : url.pathname;
      if (!ALLOWED.has(route) && !/^\/samples\/vsco-ce\/[a-zA-Z0-9_-]+\.wav$/.test(route)) return sendJson(404, { error: 'Not found' });
      const file = path.join(root, route.slice(1));
      const contents = await readFile(file);
      response.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] });
      response.end(request.method === 'HEAD' ? undefined : contents);
    } catch (error) {
      if (error instanceof RangeError || error instanceof TypeError) sendJson(400, { error: error.message });
      else sendJson(500, { error: 'Request failed' });
    }
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const port = Number(process.env.WAY_MUSIC_PORT ?? 4317);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('Invalid WAY_MUSIC_PORT');
  const server = createMusicServer();
  server.on('error', error => { console.error(`Way Music server: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Way Music: http://127.0.0.1:${port}`));
}
