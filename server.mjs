import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { compose } from './src/composer.mjs';
import { exportMidi } from './src/midi.mjs';
import {createLibraryStore,LibraryNotFound,LibraryConflict} from './src/library-store.mjs';
import {factoryInstruments} from './src/instrument-factory.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.wav': 'audio/wav' };
const ALLOWED = new Set(['/web/index.html', '/web/integration.html', '/web/styles.css', '/web/meters.css', '/web/app.mjs', '/src/composer.mjs', '/src/theory.mjs', '/src/meter.mjs', '/src/midi.mjs', '/src/transport.mjs', '/src/webaudio.mjs', '/src/browser-player.mjs']);
ALLOWED.add('/src/samples.mjs'); ALLOWED.add('/samples/vsco-ce/manifest.json');
for (const route of ['/src/director.mjs', '/web/director.html', '/web/director-app.mjs']) ALLOWED.add(route);
for (const route of ['/src/studio.mjs', '/src/studio-audio.mjs', '/src/studio-midi.mjs', '/web/studio.html', '/web/studio.css', '/web/studio-app.mjs']) ALLOWED.add(route);
for(const route of ['/src/instrument-rack.mjs','/src/instrument-library.mjs','/src/instrument-factory.mjs','/src/rack-audio.mjs','/src/instrument-bake.mjs','/src/library-client.mjs','/web/instrument-workshop.mjs','/web/instrument-workshop.css'])ALLOWED.add(route);
ALLOWED.add('/src/studio-host.mjs');ALLOWED.add('/src/instrument-design.mjs');
for(const route of ['/web/meter-builder.mjs','/web/instrument-editor.mjs','/web/instrument-editor.css','/web/way-shell.css'])ALLOWED.add(route);

async function readJson(request, limit=16_384) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > limit) throw new RangeError('Request body exceeds its byte limit');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new TypeError('Body must be valid JSON'); }
}

export function createMusicServer({ artifactRoot = path.join(root, 'artifacts'), libraryRoot=path.join(root,'library') } = {}) {
  const library=createLibraryStore({root:libraryRoot,factory:factoryInstruments()});
  // Revalidate local edits on every request; retain at most 16 MiB of source/sample bytes.
  const cache=new Map(),inflight=new Map(),budget=16*1024*1024;let cachedBytes=0;
  async function readShared(file,etag){
    let pending=inflight.get(file);if(pending?.etag!==etag){pending={etag,promise:readFile(file)};inflight.set(file,pending);}
    try{return await pending.promise;}finally{if(inflight.get(file)===pending)inflight.delete(file);}
  }
  async function serveFile(request,response,file,type,{cached=false}={}) {
    const info=await stat(file);if(!info.isFile()){response.writeHead(404).end();return;}
    const etag=`W/"${info.size.toString(16)}-${info.mtimeMs}-${info.ctimeMs}"`;
    response.setHeader('Cache-Control','private, no-cache');response.setHeader('ETag',etag);
    response.setHeader('Content-Type',type);response.setHeader('Accept-Ranges','bytes');
    if(request.headers['if-none-match']?.split(',').map(s=>s.trim()).some(s=>s===etag||s==='*')){response.writeHead(304).end();return;}
    let start=0,end=info.size-1,status=200;
    const range=request.headers.range;
    // Weak validators cannot satisfy If-Range; send the full representation in that case.
    if(range&&request.method==='GET'&&!request.headers['if-range']) {
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!match||!match[1]&&!match[2]||match.slice(1).some(v=>v&&!Number.isSafeInteger(Number(v)))){response.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
      if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end);}
      else start=Math.max(0,info.size-Number(match[2]));
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){response.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
      status=206;response.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
    }
    response.setHeader('Content-Length',Math.max(0,end-start+1));
    if(request.method==='HEAD'){response.writeHead(status).end();return;}
    if(cached&&info.size<=budget){
      let entry=cache.get(file);if(entry?.etag!==etag){if(entry){cache.delete(file);cachedBytes-=entry.bytes.length;}entry={etag,bytes:await readShared(file,etag)};
        // A concurrent request may have populated the same file while readFile awaited.
        const previous=cache.get(file);if(previous){cachedBytes-=previous.bytes.length;cache.delete(file);}
        while(cachedBytes+entry.bytes.length>budget&&cache.size){const oldest=cache.keys().next().value;cachedBytes-=cache.get(oldest).bytes.length;cache.delete(oldest);}
        cache.set(file,entry);cachedBytes+=entry.bytes.length;
      }else{cache.delete(file);cache.set(file,entry);}
      response.writeHead(status);response.end(entry.bytes.subarray(start,end+1));return;
    }
    response.writeHead(status);
    if(!info.size){response.end();return;}
    await pipeline(createReadStream(file,{start,end}),response);
  }
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    const sendJson = (status, data) => { response.writeHead(status, { 'Content-Type': TYPES['.json'] }); response.end(JSON.stringify(data)); };
    try {
      const url = new URL(request.url, 'http://localhost');
      if(url.pathname.startsWith('/api/v1/library/')){
        const origin=request.headers.origin,host=request.headers.host;
        if(!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host??'')||origin&&origin!=='http://'+host)return sendJson(403,{error:'The local library is available only from this server origin'});
        const route=url.pathname.slice('/api/v1/library/'.length),method=request.method;
        if(!['GET','HEAD'].includes(method)&&!/^application\/json(?:;|$)/.test(request.headers['content-type']??''))return sendJson(400,{error:'Use application/json for library changes'});
        if(route==='instruments'&&method==='GET')return sendJson(200,await library.list());
        if(route==='instruments'&&method==='POST')return sendJson(201,await library.save(await readJson(request,1024*1024)));
        if(route==='assets'&&method==='GET')return sendJson(200,await library.listAssets());
        if(route==='assets'&&method==='POST'){const body=await readJson(request,24*1024*1024);return sendJson(201,await library.putAsset(body.base64,body.metadata));}
        if(route==='import'&&method==='POST')return sendJson(201,await library.importPackage(await readJson(request,48*1024*1024)));
        const instrument=/^instruments\/([a-zA-Z0-9._-]+)(\/package)?$/.exec(route);
        if(instrument){const id=instrument[1];if(instrument[2]&&method==='GET')return sendJson(200,await library.exportPackage(id));if(!instrument[2]){if(method==='GET')return sendJson(200,await library.get(id));if(method==='PUT')return sendJson(200,await library.save(await readJson(request,1024*1024),id));if(method==='DELETE')return sendJson(200,await library.remove(id));}}
        const asset=/^assets\/([a-f0-9]{64})(\.wav)?$/.exec(route);
        if(asset&&['GET','HEAD'].includes(method)){if(!asset[2])return sendJson(200,await library.getAsset(asset[1]));await library.getAsset(asset[1]);await serveFile(request,response,library.assetPath(asset[1]),'audio/wav');return;}
        return sendJson(405,{error:'Unsupported library operation'});
      }
      if (url.pathname === '/api/v1/health' && request.method === 'GET') return sendJson(200, { ok: true, version: '0.10.0', scoreSchemaVersion: 2, studioProjectVersion: 1, audioRenderer: 'client-owned' });
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
      if (/^\/artifacts\/score-[0-9a-f-]{36}\.wav$/.test(url.pathname) && ['GET','HEAD'].includes(request.method)) {
        const filename = path.basename(url.pathname);
        try {
          await serveFile(request,response,path.join(artifactRoot,filename),'audio/wav');return;
        } catch(error) { if(response.headersSent){response.destroy();return;}if(error.code==='ENOENT')return sendJson(404,{error:'Render not found'});throw error; }
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
      await serveFile(request,response,file,TYPES[path.extname(file)],{cached:true});
    } catch (error) {
      if(response.headersSent||response.destroyed){response.destroy();return;}
      response.removeHeader('Content-Length');response.removeHeader('Content-Range');
      if(error instanceof LibraryNotFound)return sendJson(404,{error:error.message});
      if(error instanceof LibraryConflict)return sendJson(409,{error:error.message});
      if(error.code==='ENOENT')return sendJson(404,{error:'File not found'});
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
