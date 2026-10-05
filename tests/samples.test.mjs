import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateSampleManifest, selectSample, loadSampleBank } from '../src/samples.mjs';
import { WebAudioRenderer } from '../src/webaudio.mjs';
import { compose } from '../src/composer.mjs';
import { preparePcm } from '../scripts/sample-pcm.mjs';

const manifest = JSON.parse(await readFile(new URL('../samples/vsco-ce/manifest.json', import.meta.url)));
const event = { id: '0:strings:0', track: 'strings', midi: 66, velocity: 50 };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('bundled bank is intact, compact, licensed and traceable to pinned sources', async () => {
  validateSampleManifest(manifest);
  assert.equal(manifest.license, 'CC0-1.0'); assert.equal(manifest.regions.length, 95);
  let bytes = 0;
  for (const region of manifest.regions) {
    const data = await readFile(new URL(`../samples/vsco-ce/${region.url}`, import.meta.url));
    assert.equal(hash(data), region.sha256); assert.equal(data.length, region.bytes);
    assert.equal(data.toString('ascii', 0, 4), 'RIFF'); assert.equal(data.readUInt32LE(24), 24000);
    assert.equal(data.readUInt16LE(22), 1); assert.equal(data.readUInt16LE(34), 16);
    assert.ok(region.sourceUrl.includes(manifest.audioRevision)); assert.match(region.sourceSha256, /^[a-f0-9]{64}$/);
    if (region.loop) {
      const start = Math.round(region.loop.start * 24000), end = Math.round(region.loop.end * 24000);
      assert.ok(end < (data.length - 44) / 2);
      assert.ok(Math.abs(data.readInt16LE(44 + start * 2) - data.readInt16LE(44 + (end - 1) * 2)) / 32768 < 0.1);
    }
    bytes += data.length;
  }
  assert.equal(bytes, manifest.bytes); assert.ok(bytes < 10 * 1024 * 1024);
});

test('sample selection chooses articulation, dynamic layer, instrument split and reproducible takes', () => {
  const sustained = selectSample(manifest.regions, event, 1);
  assert.equal(sustained.articulation, 'sustain'); assert.equal(sustained.loVel, 1); assert.ok(sustained.loop);
  const short = selectSample(manifest.regions, { ...event, velocity: 100 }, 0.1);
  assert.equal(short.articulation, 'short'); assert.equal(short.loVel, 63);
  assert.equal(selectSample(manifest.regions, event, 1), sustained);
  const takes = new Set(Array.from({ length: 10 }, (_, index) => selectSample(manifest.regions, { ...event, id: `0:strings:${index}` }, 0.1).rr));
  assert.equal(takes.size, 2);
  const bass = selectSample(manifest.regions, { ...event, midi: 40 }, 1);
  assert.ok(bass.sourcePath.includes('Cello'));
  assert.equal(selectSample(manifest.regions, { ...event, track: 'percussion', midi: 44 }, 0.1), null);
  assert.equal(selectSample(manifest.regions, { ...event, track: 'percussion', midi: 38 }, 0.1).midi, 38);
});

test('all emitted tracks find recorded regions across keys, scenes, rhythms and energy levels', () => {
  for (const key of ['D', 'E', 'G', 'A', 'C']) for (const scene of ['explore', 'tension', 'battle', 'victory']) for (const rhythm of ['flowing', 'math-rock']) for (const intensity of [0, 1]) {
    const score = compose({ key, scene, rhythm, intensity });
    for (const note of score.events) assert.ok(selectSample(manifest.regions, note, note.durationTicks * 60 / score.settings.tempo / score.ppq), `${key} ${scene} ${note.track} ${note.midi}`);
  }
});

test('malformed sample regions are rejected before network or audio allocations', () => {
  for (const patch of [{ url: '../private.wav' }, { url: 'https://example.com/a.wav' }, { midi: 128 }, { loVel: 0 }, { hiVel: 0 },
    { sha256: 'bad' }, { loop: { start: 2, end: 1 } }, { loop: { start: 0, end: 99 } }, { release: NaN }, { oneShot: 'yes' }]) {
    assert.throws(() => validateSampleManifest({ ...manifest, regions: [{ ...manifest.regions[0], ...patch }] }));
  }
});

test('loader checks content integrity, enforces memory bounds and returns complete decoded banks', async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
  const minimal = { ...manifest, regions: [{ ...manifest.regions[0], sha256: hash(Buffer.from(bytes)) }] };
  const fetchImpl = async url => url.pathname.endsWith('.json') ? { ok: true, json: async () => minimal } : { ok: true, arrayBuffer: async () => bytes };
  const context = { decodeAudioData: async () => ({ length: 24000 * 3, numberOfChannels: 1, duration: 3 }) };
  const bank = await loadSampleBank(context, 'http://localhost/bank/manifest.json', { fetchImpl });
  assert.equal(bank.regions.length, 1); assert.equal(bank.decodedBytes, 288000);
  await assert.rejects(loadSampleBank(context, 'http://localhost/bank/manifest.json', { fetchImpl, maxEncodedBytes: 3 }), /encoded memory/);
  await assert.rejects(loadSampleBank(context, 'http://localhost/bank/manifest.json', { fetchImpl, maxDecodedBytes: 100 }), /decoded memory/);
  minimal.regions[0].sha256 = '0'.repeat(64);
  await assert.rejects(loadSampleBank(context, 'http://localhost/bank/manifest.json', { fetchImpl }), /integrity/);
});

function fakeContext() {
  const sources = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} });
  const node = () => ({ gain: param(), pan: param(), frequency: param(), detune: param(), playbackRate: param(), connect(next) { return next; }, disconnect() {},
    start(time) { this.startTime = time; }, stop(time) { this.stopTime = time; }, threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
  return { currentTime: 5, sampleRate: 24000, destination: node(), sources,
    createGain: node, createStereoPanner: node, createBiquadFilter: node, createConvolver: node, createDynamicsCompressor: node,
    createBuffer(channels, frames, rate) { return { length: frames, duration: frames / rate, numberOfChannels: channels, getChannelData() { return new Float32Array(frames); } }; },
    createBufferSource() { const result = node(); sources.push(result); return result; }, createOscillator: node };
}

test('sampled renderer schedules tuned looped sources, natural hits and cancels queued voices', () => {
  const context = fakeContext(), renderer = new WebAudioRenderer(context);
  const regions = manifest.regions.map(region => ({ ...region, buffer: { duration: region.duration } }));
  renderer.setSampleBank({ manifest, regions });
  renderer.schedule({ ...event, midi: 67 }, 6, 3);
  assert.equal(context.sources[0].loop, true);
  assert.ok(Math.abs(context.sources[0].playbackRate.value - 2 ** (1 / 12)) < 1e-9);
  renderer.schedule({ ...event, track: 'percussion', midi: 36 }, 6, 0.1);
  assert.equal(context.sources[1].playbackRate.value, 1);
  assert.ok(context.sources[1].stopTime > 6.5);
  assert.equal(renderer.sampledEvents, 2); assert.equal(renderer.synthesizedEvents, 0);
  renderer.silence(); assert.equal(renderer.voices.size, 0);
  assert.ok(context.sources.every(source => source.stopTime === 5.03));
  renderer.dispose();
});

test('sample preparation rejects damaged input and suppresses out-of-band aliasing', () => {
  assert.throws(() => preparePcm(Buffer.alloc(10)));
  const frames = 4800, wav = Buffer.alloc(44 + frames * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(96000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(frames * 2, 40);
  for (let index = 0; index < frames; index++) wav.writeInt16LE(Math.round(16000 * Math.sin(2 * Math.PI * 16000 * index / 48000)), 44 + index * 2);
  const result = preparePcm(wav), data = result.bytes;
  let sum = 0;
  for (let index = 200; index < 2200; index++) sum += (data.readInt16LE(44 + index * 2) / 32768) ** 2;
  assert.ok(Math.sqrt(sum / 2000) < 0.01);
  assert.equal(result.sampleRate, 24000); assert.equal(result.duration, 0.1);
});
