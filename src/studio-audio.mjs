// MIT. Browser adapter for portable Studio parts and patches.
import { PPQ, validatePatch, validateProject, clamp, mappedMacros, AuthoredDirector, bars } from './studio.mjs';
import { parseMeterCycle, barStartTick } from './meter.mjs';
const freq = midi => 440 * 2 ** ((midi - 69) / 12);
export class StudioEngine {
  constructor(context) {
    this.context = context; this.voices = new Map(); this.buses = new Map(); this.sustained = new Map(); this.pedals = new Set(); this.bends = new Map(); this.dropped = 0;
    this.master = context.createGain(); this.master.gain.value = .55;
    this.compressor = context.createDynamicsCompressor(); this.compressor.threshold.value = -12; this.compressor.ratio.value = 12;
    this.analyser = context.createAnalyser(); this.analyser.fftSize = 1024;
    this.master.connect(this.compressor).connect(this.analyser).connect(context.destination);
  }
  bus(key, patch, macros) {
    if (!this.buses.has(key)) {
      const c = this.context, input = c.createGain(), drive = c.createWaveShaper(), delay = c.createDelay(2), feedback = c.createGain(), wet = c.createGain();
      input.connect(drive).connect(this.master); drive.connect(delay); delay.connect(feedback).connect(delay); delay.connect(wet).connect(this.master);
      this.buses.set(key, { input, drive, delay, feedback, wet });
    }
    const b = this.buses.get(key), now = this.context.currentTime;
    if (b.driveAmount !== patch.effects.drive) {
      const amount = 1 + patch.effects.drive * 8;
      b.drive.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh((i / 1023 * 2 - 1) * amount) / Math.tanh(amount)); b.drive.oversample = '2x'; b.driveAmount = patch.effects.drive;
    }
    b.delay.delayTime.setTargetAtTime(.16 + macros.space * .3, now, .05);
    b.feedback.gain.setTargetAtTime(patch.effects.feedback, now, .05);
    b.wet.gain.setTargetAtTime(patch.effects.delay * macros.space * .65, now, .05);
    return b;
  }
  noteOn(key, midi, velocity, partId, patch, { time = this.context.currentTime, channel = 'keys', macros = patch.macros, bend = 0, expression = [], tempo = 92 } = {}) {
    if (!Number.isInteger(midi) || midi < 0 || midi > 127 || !Number.isFinite(velocity) || velocity < 1 || velocity > 127 || !Number.isFinite(time)) throw new TypeError('Invalid performance note');
    this.kill(key); if (this.voices.size >= 32) { this.dropped++; return false; }
    const c = this.context, gain = c.createGain(), filter = c.createBiquadFilter(), pan = c.createStereoPanner();
    filter.type = 'lowpass'; gain.connect(filter).connect(pan).connect(this.bus(partId, patch, macros).input);
    const level = velocity / 127 * .17, attack = time + patch.attack, decay = attack + patch.decay;
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(level, attack); gain.gain.exponentialRampToValueAtTime(Math.max(.00001, level * patch.sustain), decay);
    const voice = { key, midi, velocity, partId, patch: structuredClone(patch), macros: { ...macros }, channel, start: time, gain, filter, pan, sources: [], frameGains: [], released: false, releaseAt: Infinity, end: Infinity, level, attack, decay, bend, expression, tempo };
    patch.oscillators.forEach((spec, oscillatorIndex) => {
      const frames = spec.shape === 'harmonic' ? patch.frames : [null];
      const normalization = Math.max(1, ...patch.frames.map(f => f.reduce((s, a) => s + Math.abs(a), 0)));
      frames.forEach((frame, frameIndex) => {
        const oscillator = c.createOscillator(), volume = c.createGain();
        oscillator.frequency.value = freq(midi); oscillator.detune.value = spec.detune;
        if (frame) {
          const real = new Float32Array(9), imaginary = new Float32Array(9);
          frame.forEach((a, i) => imaginary[i + 1] = a / normalization);
          oscillator.setPeriodicWave(c.createPeriodicWave(real, imaginary, { disableNormalization: true }));
        } else oscillator.type = spec.shape;
        oscillator.connect(volume).connect(gain); volume.gain.value = frame ? spec.level * Math.max(0, 1 - Math.abs(patch.position * (frames.length - 1) - frameIndex)) : spec.level;
        oscillator.start(time); voice.sources.push({ oscillator, volume, spec, oscillatorIndex });
        if (frame) voice.frameGains.push({ volume, index: frameIndex, total: frames.length, level: spec.level });
      });
    });
    this.voices.set(key, voice); this.updateVoice(voice, time); return true;
  }
  updateVoice(v, time = this.context.currentTime, tempo = 92) {
    if (time >= v.releaseAt || time < v.start) return;
    const p = v.patch, m = v.macros, t = time - v.start;
    const rate = p.lfoSync ? tempo / 60 / p.lfoRate : p.lfoRate;
    const phase = t * rate % 1;
    const lfo = (p.lfoShape === 'sine' ? Math.sin(phase * Math.PI * 2) : p.lfoShape === 'triangle' ? 1 - 4 * Math.abs(phase - .5) : phase < .5 ? 1 : -1) * p.lfoDepth * m.motion;
    let position = p.position, cutoff = p.cutoff * 2 ** ((m.brightness - .45) * 3), pitch = (this.bends.get(v.channel) ?? 0) + v.bend;
    // Expression is a step timeline relative to this attack, independent for overlapping notes.
    if (v.expression.length) { let value=0; for(const point of v.expression) { if(point.tick>t*v.tempo/60*PPQ) break; value=point.value; } pitch=(this.bends.get(v.channel)??0)+v.bend+value; }
    for (const r of p.routes) {
      const source = r.source === 'lfo' ? lfo : v.velocity / 127;
      if (r.target === 'position') position += source * r.amount;
      if (r.target === 'cutoff') cutoff *= 2 ** (source * r.amount * 3);
      if (r.target === 'pitch') pitch += source * r.amount * 2;
    }
    const envelope = t < p.attack ? t / p.attack : Math.exp(-(t - p.attack) / p.decay);
    cutoff *= 2 ** (envelope * p.filterEnv * 3);
    v.filter.frequency.setTargetAtTime(clamp(cutoff, 40, Math.min(18000, this.context.sampleRate * .45)), time, .025);
    v.filter.Q.setTargetAtTime(p.resonance, time, .025); v.pan.pan.setTargetAtTime((v.midi % 2 ? -1 : 1) * m.width * .65, time, .025);
    for (const source of v.sources) source.oscillator.detune.setTargetAtTime(source.spec.detune + pitch * 100, time, .015);
    for (const f of v.frameGains) f.volume.gain.setTargetAtTime(f.level * Math.max(0, 1 - Math.abs(clamp(position) * (f.total - 1) - f.index)), time, .025);
  }
  release(key, time = this.context.currentTime) {
    const v = this.voices.get(key); if (!v || v.released && time >= v.releaseAt) return;
    if (this.pedals.has(v.channel)) { this.sustained.set(key, v.channel); return; }
    const t = Math.max(v.start, time), p = v.patch;
    const current = t < v.attack ? v.level * (t - v.start) / p.attack : t < v.decay ? v.level * Math.max(.00001, p.sustain) ** ((t - v.attack) / p.decay) : v.level * p.sustain;
    if(v.gain.gain.cancelAndHoldAtTime) v.gain.gain.cancelAndHoldAtTime(t);
    else { v.gain.gain.cancelScheduledValues(t); v.gain.gain.setValueAtTime(Math.max(0, current), t); }
    v.gain.gain.linearRampToValueAtTime(0, t + p.release);
    for (const s of v.sources) s.oscillator.stop(t + p.release + .02);
    v.released = true; v.releaseAt = t; v.end = t + p.release + .03; this.sustained.delete(key);
  }
  sustain(channel, down) {
    if (down) this.pedals.add(channel); else { this.pedals.delete(channel); for (const [key, ch] of [...this.sustained]) if (ch === channel) this.release(key); }
  }
  bend(channel, semitones) { this.bends.set(channel, semitones); }
  kill(key) {
    const v = this.voices.get(key); if (!v) return;
    for (const s of v.sources) { try { s.oscillator.stop(); } catch {} s.oscillator.disconnect(); s.volume.disconnect(); }
    v.gain.disconnect(); v.filter.disconnect(); v.pan.disconnect(); this.voices.delete(key); this.sustained.delete(key);
  }
  update(partId, patch, macros) {
    this.bus(partId, patch, macros);
    // Oscillator topology/frame edits apply to the next attack; continuous controls update held voices.
    for (const v of this.voices.values()) if (v.partId === partId && this.context.currentTime < v.releaseAt) { v.patch = structuredClone(patch); v.macros = { ...macros }; }
  }
  tick(tempo = 92) { const now = this.context.currentTime; for (const [key, v] of this.voices) if (v.end < now) this.kill(key); else this.updateVoice(v, now, tempo); }
  silence() { this.pedals.clear(); this.bends.clear(); for (const key of [...this.voices.keys()]) this.kill(key); for (const b of this.buses.values()) { b.input.disconnect(); b.drive.disconnect(); b.delay.disconnect(); b.feedback.disconnect(); b.wet.disconnect(); } this.buses.clear(); }
  dispose() { this.silence(); for (const b of this.buses.values()) Object.values(b).forEach(n => n?.disconnect?.()); this.buses.clear(); this.master.disconnect(); this.compressor.disconnect(); this.analyser.disconnect(); }
}
// Deterministic lookahead over authored events; never generates pitches or edits parts.
export class StudioPlayer {
  constructor(engine, project) { this.engine = engine; this.project = validateProject(project); this.running = false; this.cycle = 0; this.pending = []; this.telemetry = { danger: 0, movement: 0, story: 0 }; this.gameEnabled = false; this.smoothed = new Map(); this.director=new AuthoredDirector(); }
  start() { this.stop(); this.director.resetTimeline(); this.running = true; this.origin = this.engine.context.currentTime + .04; this.cycle = 0; this.pending = []; }
  stop() { this.running = false; this.engine.silence(); this.pending = []; }
  tick() {
    const now = this.engine.context.currentTime, p = this.project, seconds = 60 / p.tempo / PPQ, length = p.loopTicks * seconds;
    if(this.gameEnabled&&this.running)this.audibleStage=this.director.advance(this.barAt(now),this.telemetry.danger);
    if (this.running) {
      if (now - (this.origin + this.cycle * length) > length * 2) { this.engine.silence(); this.cycle = Math.floor((now - this.origin) / length); this.pending = []; }
      while (this.origin + this.cycle * length < now + .12) {
        const cycle = this.cycle++;
        for (const part of p.parts) if (!part.muted) for (const n of part.notes) if (n.start < p.loopTicks) this.pending.push({ part, n, time: this.origin + cycle * length + n.start * seconds, key: `clip:${cycle}:${part.id}:${n.id}` });
        if (this.pending.length > 20000) { this.stop(); throw new Error('Too many pending notes'); }
      }
      this.pending = this.pending.filter(event => {
        if (event.time > now + .12) return true;
        if (event.time >= now - .05) {
          const activePart=p.parts.find(part=>part.id===event.part.id);if(!activePart||activePart.muted)return false;
          const eventStage=this.gameEnabled?this.director.advance(this.barAt(event.time),this.telemetry.danger):null;
          if(this.gameEnabled&&!p.scenes[eventStage].parts.includes(activePart.id))return false;
          const currentPatch=this.patchFor(activePart,eventStage),macros = this.macros({...activePart,patch:currentPatch}), channel = `clip:${activePart.id}`;
          this.engine.noteOn(event.key, event.n.midi, event.n.velocity, activePart.id, currentPatch, { time: Math.max(now, event.time), channel, macros, bend:event.n.bend??0, expression:event.n.expression??[], tempo:p.tempo });
          this.engine.release(event.key, Math.max(now, event.time) + event.n.duration * seconds);
        } return false;
      });
    }
    for (const part of p.parts) {
      const activePatch=this.patchFor(part,this.audibleStage),target = this.macros({...part,patch:activePatch}), previous = this.smoothed.get(part.id) ?? { ...activePatch.macros };
      for (const name of Object.keys(target)) { const duration = p.mappings.find(m => m.enabled && m.target === name)?.smoothing ?? .05; previous[name] += (target[name] - previous[name]) * (1 - Math.exp(-.025 / duration)); }
      this.smoothed.set(part.id, previous); this.engine.update(part.id, activePatch, previous);
      if(part.muted||this.gameEnabled&&!p.scenes[this.audibleStage??this.director.current].parts.includes(part.id))for(const [key,v]of this.engine.voices)if(key.startsWith('clip:')&&v.partId===part.id&&v.start<=now)this.engine.release(key,now);
    }
    this.engine.tick(p.tempo);
  }
  macros(part) { return this.gameEnabled ? mappedMacros(this.project, this.telemetry, part.patch.macros) : part.patch.macros; }
  barAt(time){const p=this.project,tick=Math.max(0,(time-this.origin)*p.tempo/60*PPQ)||0,cycle=parseMeterCycle(p.meter),total=cycle.reduce((s,m)=>s+PPQ*4*m.numerator/m.denominator,0),cycleIndex=Math.floor(tick/total),local=tick%total;let bar=cycleIndex*cycle.length;for(let i=1;i<cycle.length;i++)if(barStartTick(cycle,i)<=local)bar++;return bar;}
  patchFor(part,stage=this.audibleStage??this.director.current) { const scene=this.gameEnabled?this.project.scenes[stage]:null;return scene?.variation?this.project.variations[scene.variation][this.project.parts.findIndex(p=>p.id===part.id)]:part.patch; }
  snapshot(){const p=structuredClone(this.project);for(let i=0;i<p.parts.length;i++){p.parts[i].patch=structuredClone(this.patchFor(this.project.parts[i]));p.parts[i].patch.macros={...this.macros(p.parts[i])};if(this.gameEnabled&&!p.scenes[this.audibleStage??this.director.current].parts.includes(p.parts[i].id))p.parts[i].muted=true;}return p;}
  get tickPosition() { return this.running ? Math.max(0, (this.engine.context.currentTime - this.origin) * this.project.tempo / 60 * PPQ) % this.project.loopTicks : 0; }
}
export async function renderStudioWav(project, { sampleRate = 24000, cycles = 1 } = {}) {
  project = validateProject(project);
  if (![24000,44100,48000].includes(sampleRate) || !Number.isInteger(cycles) || cycles < 1 || cycles > 4) throw new TypeError('Invalid render options');
  const seconds = 60 / project.tempo / PPQ, length = project.loopTicks * seconds;
  const lastEnd = Math.max(length * cycles, ...project.parts.filter(p=>!p.muted).flatMap(p=>p.notes.filter(n=>n.start<project.loopTicks).map(n=>(cycles-1)*length+(n.start+n.duration)*seconds+p.patch.release)));
  const duration = lastEnd + 6;
  if (duration > 180) throw new RangeError('Render is limited to three minutes');
  const context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate), engine = new StudioEngine(context);
  // Schedule in time order so offline cleanup and the 32-voice bound reflect overlap, not file size.
  const events = [];
  for (let cycle = 0; cycle < cycles; cycle++) for (const part of project.parts) if (!part.muted) for (const n of part.notes) if (n.start < project.loopTicks) events.push({ part, n, time: cycle * length + n.start * seconds });
  events.sort((a,b) => a.time - b.time);
  const sources=events.reduce((sum,event)=>sum+event.part.patch.oscillators.reduce((n,o)=>n+(o.shape==='harmonic'?event.part.patch.frames.length:1),0),0);
  if(sources>16000){engine.dispose();throw new RangeError('Offline instrument graph is too large; render a shorter loop or use fewer wavetable frames');}
  for (const [i, { part, n, time }] of events.entries()) {
    for (const [key, voice] of engine.voices) if (voice.end <= time) { engine.voices.delete(key); /* Scheduled offline nodes remain connected until render. */ }
    const key = `offline:${i}`; engine.noteOn(key, n.midi, n.velocity, part.id, part.patch, { time, bend:n.bend??0, expression:n.expression??[], tempo:project.tempo });
    const voice=engine.voices.get(key); if(voice) for(let t=time;t<time+n.duration*seconds;t+=1/40) engine.updateVoice(voice,t,project.tempo);
    engine.release(key, time + n.duration * seconds);
  }
  if(engine.dropped) { engine.dispose(); throw new RangeError('Render exceeds the 32 overlapping-voice limit; reduce overlapping notes or releases'); }
  const buffer = await context.startRendering(), bytes = encodeWav(buffer); engine.dispose(); return bytes;
}
export function encodeWav(buffer) {
  const bytes = new ArrayBuffer(44 + buffer.length * 4), d = new DataView(bytes);
  const str = (offset, s) => [...s].forEach((c,i) => d.setUint8(offset+i,c.charCodeAt(0)));
  str(0,'RIFF'); d.setUint32(4, bytes.byteLength-8,true); str(8,'WAVEfmt '); d.setUint32(16,16,true); d.setUint16(20,1,true); d.setUint16(22,2,true); d.setUint32(24,buffer.sampleRate,true); d.setUint32(28,buffer.sampleRate*4,true); d.setUint16(32,4,true); d.setUint16(34,16,true); str(36,'data'); d.setUint32(40,buffer.length*4,true);
  for (let channel=0;channel<2;channel++) { const data=buffer.getChannelData(channel); for(let i=0;i<buffer.length;i++) d.setInt16(44+i*4+channel*2,Math.round(clamp(data[i],-1,1)*32767),true); }
  return bytes;
}
