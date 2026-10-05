import { randomStream, PPQ, validateScore } from './composer.mjs';
import { scoreBarMap } from './meter.mjs';
import { loadSampleBank, selectSample } from './samples.mjs';

const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
const PAN = { strings: -0.2, harp: 0.32, woodwind: -0.12, horn: 0.14, percussion: 0 };
const SAMPLE_GAIN = { strings: 0.1, harp: 0.17, woodwind: 0.18, horn: 0.12, percussion: 0.24 };
const TIMBRES = {
  strings: { waves: ['sawtooth', 'sawtooth'], detunes: [-5, 5], attack: 0.16, release: 0.3, cutoff: 1400, gain: 0.065 },
  harp: { waves: ['triangle', 'sine'], detunes: [0, 0], attack: 0.005, release: 0.28, cutoff: 4800, gain: 0.14 },
  woodwind: { waves: ['sine', 'triangle'], detunes: [0, 2], attack: 0.07, release: 0.12, cutoff: 2700, gain: 0.14 },
  horn: { waves: ['triangle', 'sawtooth'], detunes: [0, -3], attack: 0.1, release: 0.18, cutoff: 950, gain: 0.11 }
};

export class WebAudioRenderer {
  constructor(context, { volume = 0.6, maxVoices = 128, room = 0.12 } = {}) {
    this.context = context;
    this.disposed = false;
    this.maxVoices = maxVoices;
    this.voices = new Set();
    this.samples = new Map();
    this.sampleBank = null;
    this.sampledEvents = 0;
    this.synthesizedEvents = 0;
    if (!Number.isFinite(room) || room < 0 || room > 0.5) throw new RangeError('room must be 0–0.5');
    this.room = room;
    this.voiceLimitHits = 0;
    this.master = context.createGain();
    this.master.gain.value = Math.max(0, Math.min(1, volume));
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -15;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.2;
    this.master.connect(this.compressor).connect(context.destination);
    this.impulse = context.createBuffer(2, Math.round(context.sampleRate * 1.1), context.sampleRate);
    const roomRandom = randomStream('way-original-room');
    for (let channel = 0; channel < 2; channel++) {
      const data = this.impulse.getChannelData(channel);
      for (let frame = 0; frame < data.length; frame++) data[frame] = (roomRandom() * 2 - 1) * Math.exp(-frame / context.sampleRate * 7) * (frame < context.sampleRate * 0.025 ? 0 : 1);
    }
    this.bus = this.makeBus();
    this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const random = randomStream('way-percussion');
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
  }

  makeBus() {
    const input = this.context.createGain(), output = this.context.createGain();
    const dry = this.context.createGain(), wet = this.context.createGain(), reverb = this.context.createConvolver();
    dry.gain.value = 1 - this.room; wet.gain.value = this.room; reverb.buffer = this.impulse;
    input.connect(dry).connect(output); input.connect(reverb).connect(wet).connect(output); output.connect(this.master);
    return { input, gain: output.gain, disconnect: () => [input, dry, reverb, wet, output].forEach(node => node.disconnect()) };
  }
  setSampleBank(bank) { if (this.disposed) throw new Error('Renderer is disposed'); this.sampleBank = bank; }
  async loadSampleBank(url, options) { const bank = await loadSampleBank(this.context, url, options); this.setSampleBank(bank); return bank; }
  now() { return this.context.currentTime; }
  setVolume(volume) {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) throw new RangeError('volume must be 0–1');
    this.master.gain.setTargetAtTime(volume, this.now(), 0.03);
  }

  // Optional owned/licensed samples replace synthesis without changing the score.
  async loadSamples(track, entries) {
    if (!Object.hasOwn(PAN, track) || !Array.isArray(entries) || !entries.length || entries.length > 128) throw new TypeError('Invalid sample bank');
    const loaded = [];
    for (const entry of entries) {
      if (!Number.isInteger(entry.midi) || entry.midi < 0 || entry.midi > 127 || typeof entry.url !== 'string') throw new TypeError('Samples need a root midi note and URL');
      const response = await fetch(entry.url);
      if (!response.ok) throw new Error(`Sample could not be loaded: ${response.status}`);
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      loaded.push({ midi: entry.midi, buffer });
    }
    this.samples.set(track, loaded);
  }

  schedule(event, time, duration) {
    if (this.disposed) throw new Error('Renderer is disposed');
    if (this.voices.size >= this.maxVoices) { this.voiceLimitHits++; return; }
    if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) throw new TypeError('Invalid audio event time');
    const context = this.context;
    const gain = context.createGain(), pan = context.createStereoPanner(), filter = context.createBiquadFilter();
    pan.pan.value = PAN[event.track] ?? 0;
    filter.type = 'lowpass';
    const sample = this.sampleBank ? selectSample(this.sampleBank.regions, event, duration) : null;
    const synthSpec = TIMBRES[event.track] ?? { attack: 0.003, release: 0.1, cutoff: 3200, gain: 0.17 };
    const spec = sample ? { attack: 0.005, release: sample.release, cutoff: 11000,
      gain: SAMPLE_GAIN[event.track] * (this.sampleBank.manifest.gain ?? 1) * 10 ** (sample.gainDb / 20) } : synthSpec;
    filter.frequency.value = spec.cutoff;
    gain.connect(filter).connect(pan).connect(this.bus.input);
    const level = spec.gain * event.velocity / 127;
    const attack = Math.min(spec.attack, duration * 0.4);
    const rate = sample && event.track !== 'percussion' ? 2 ** ((event.midi - sample.midi) / 12) : 1;
    const heldDuration = sample?.oneShot ? Math.min(sample.buffer.duration / rate, sample.maxTail ?? 2.5) : duration;
    const end = time + heldDuration + spec.release;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + attack);
    if (!sample && (event.track === 'harp' || event.track === 'percussion')) gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level * 0.12), time + duration);
    else gain.gain.setValueAtTime(level, time + heldDuration);
    gain.gain.linearRampToValueAtTime(0, end);
    const sources = [];
    const bank = this.samples.get(event.track);
    if (sample) {
      const source = context.createBufferSource(); source.buffer = sample.buffer; source.playbackRate.value = rate;
      if (sample.loop) { source.loop = true; source.loopStart = sample.loop.start; source.loopEnd = sample.loop.end; }
      this.sampledEvents++; sources.push(source);
    } else if (bank) {
      const sample = bank.reduce((best, candidate) => Math.abs(candidate.midi - event.midi) < Math.abs(best.midi - event.midi) ? candidate : best);
      const source = context.createBufferSource();
      source.buffer = sample.buffer;
      source.playbackRate.value = 2 ** ((event.midi - sample.midi) / 12);
      this.sampledEvents++; sources.push(source);
    } else if (event.track === 'percussion') {
      if (event.midi === 36 || event.midi === 45) {
        const source = context.createOscillator();
        source.type = 'sine';
        source.frequency.setValueAtTime(event.midi === 36 ? 145 : 210, time);
        source.frequency.exponentialRampToValueAtTime(event.midi === 36 ? 45 : 90, time + duration);
        sources.push(source);
      } else {
        const source = context.createBufferSource();
        source.buffer = this.noise;
        filter.type = 'highpass';
        filter.frequency.value = event.midi === 42 ? 6500 : 1600;
        sources.push(source);
      }
    } else {
      if (!spec.waves) throw new TypeError('Unknown instrument');
      spec.waves.forEach((wave, index) => {
        const source = context.createOscillator();
        source.type = wave;
        source.frequency.value = frequency(event.midi) * (event.track === 'woodwind' && index === 1 ? 2 : 1);
        source.detune.value = spec.detunes[index];
        sources.push(source);
      });
    }
    if (!sample && !bank) this.synthesizedEvents++;
    const voice = { sources, nodes: [gain, filter, pan], end };
    this.voices.add(voice);
    let remaining = sources.length;
    for (const source of sources) {
      source.connect(gain);
      source.onended = () => {
        source.disconnect();
        if (--remaining === 0) { voice.nodes.forEach(node => node.disconnect()); this.voices.delete(voice); }
      };
      source.start(time);
      source.stop(end + 0.01);
    }
  }

  silence() {
    const now = this.now(), previousBus = this.bus;
    previousBus.gain.cancelScheduledValues(now);
    previousBus.gain.setValueAtTime(previousBus.gain.value, now);
    previousBus.gain.linearRampToValueAtTime(0, now + 0.025);
    for (const voice of this.voices) for (const source of voice.sources) {
      try { source.stop(now + 0.03); } catch { /* Already ended. */ }
    }
    this.voices.clear();
    this.bus = this.makeBus();
    // Immediate disconnect would erase the fade; release the old bus afterwards.
    setTimeout(() => previousBus.disconnect(), 60);
  }

  dispose() {
    if (this.disposed) return;
    this.silence();
    this.disposed = true;
    this.bus.disconnect();
    this.master.disconnect();
    this.compressor.disconnect();
    this.samples.clear();
    this.sampleBank = null;
  }
}

export async function renderWav(score, { sampleRate = 24000, sampleBank = null, bankUrl, onProgress, room = 0.12 } = {}) {
  validateScore(score);
  if (score.bars > 32) throw new RangeError('Browser WAV export is bounded to 32 bars');
  if (![24000, 44100, 48000].includes(sampleRate)) throw new RangeError('Unsupported sample rate');
  const secondsPerTick = 60 / score.settings.tempo / PPQ;
  const map = scoreBarMap(score), offset = map[0].startTick;
  const totalTicks = map.at(-1).startTick + map.at(-1).durationTicks - offset;
  const duration = totalTicks * secondsPerTick + 4;
  if (duration > 180) throw new RangeError('WAV export is limited to three minutes; use fewer bars or a faster tempo');
  const context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  // Offline sources remain in the active set until render; no live voice cap.
  const renderer = new WebAudioRenderer(context, { maxVoices: 100_000, room });
  if (bankUrl) sampleBank = await loadSampleBank(context, bankUrl, { onProgress });
  renderer.setSampleBank(sampleBank);
  for (const event of score.events) renderer.schedule(event, (event.startTick - offset) * secondsPerTick, event.durationTicks * secondsPerTick);
  const buffer = await context.startRendering();
  const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
  const bytes = new ArrayBuffer(44 + buffer.length * 4), view = new DataView(bytes);
  const writeText = (offset, text) => [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  writeText(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); writeText(8, 'WAVE');
  writeText(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 2, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true); view.setUint16(34, 16, true); writeText(36, 'data'); view.setUint32(40, buffer.length * 4, true);
  let peak = 0, sum = 0, clipped = 0;
  for (let frame = 0; frame < buffer.length; frame++) for (let channel = 0; channel < 2; channel++) {
    const value = channels[channel][frame];
    peak = Math.max(peak, Math.abs(value)); sum += value * value;
    if (Math.abs(value) >= 1) clipped++;
    view.setInt16(44 + (frame * 2 + channel) * 2, Math.round(Math.max(-1, Math.min(1, value)) * (value < 0 ? 32768 : 32767)), true);
  }
  const sampledEvents = renderer.sampledEvents, synthesizedEvents = renderer.synthesizedEvents;
  renderer.dispose();
  return { bytes, duration, peak, rms: Math.sqrt(sum / (buffer.length * 2)), clipped, sampleRate,
    sampledEvents, synthesizedEvents, bankId: sampleBank?.manifest.id ?? null };
}
