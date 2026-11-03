// MIT. Portable authoring assets. No DOM, audio device, or generated melody.
import { PPQ, parseMeterCycle, formatMeterCycle, meterTicks, makeBarMap } from './meter.mjs';
export { PPQ };
export const MACROS = ['brightness', 'motion', 'width', 'space'];
export const STAGES = ['title','opening','play','danger','revelation','loss','resolution'];
export const DEFAULT_KEYMAP = Object.freeze({KeyA:0,KeyW:1,KeyS:2,KeyE:3,KeyD:4,KeyF:5,KeyT:6,KeyG:7,KeyY:8,KeyH:9,KeyU:10,KeyJ:11,KeyK:12});
export const clone = value => structuredClone(value);
export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const num = (v, lo, hi, name) => { if (!Number.isFinite(v) || v < lo || v > hi) throw new TypeError(`${name} must be ${lo}–${hi}`); return v; };
const label = v => { if (typeof v !== 'string' || !v.trim() || v.length > 100) throw new TypeError('Names need 1–100 characters'); return v; };
export const id = () => globalThis.crypto.randomUUID();
export const noteName = midi => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi % 12] + (Math.floor(midi / 12) - 1);
const base = () => ({ version: 1, name: 'Glass lantern', author: 'Way original', revision: 1, source: 'synth', instrument: 'woodwind', articulation: 'sustain',
  oscillators: [{ shape: 'harmonic', level: .7, detune: 0 }, { shape: 'sine', level: .2, detune: 5 }],
  frames: [[1, .32, .12, .08, .03, 0, 0, 0], [1, .08, .4, .04, .16, .02, .08, 0]],
  position: .1, attack: .008, decay: .45, sustain: .25, release: .8, cutoff: 4200, resonance: .8,
  filterEnv: .3, lfoRate: .4, lfoSync: false, lfoShape: 'sine', lfoDepth: .15,
  routes: [{ source: 'lfo', target: 'position', amount: .2 }],
  macros: { brightness: .45, motion: .25, width: .25, space: .3 },
  effects: { drive: .1, delay: .12, feedback: .25 }, locks: [] });
export function preset(name = 'Glass lantern') {
  const p = base(); p.name = name;
  if (name === 'Paper sky') Object.assign(p, { attack: .65, decay: .8, sustain: .7, release: 1.8, cutoff: 2000, position: .5, lfoDepth: .35 });
  if (name === 'Copper wire') { Object.assign(p, { attack: .012, decay: .2, sustain: .65, release: .22, cutoff: 3600 }); p.oscillators[1] = { shape: 'sawtooth', level: .2, detune: -7 }; }
  if (name === 'Moss bass') { Object.assign(p, { attack: .005, decay: .25, sustain: .5, release: .18, cutoff: 700, filterEnv: .6 }); p.oscillators[0].shape = 'triangle'; }
  return p;
}
export function validatePatch(input) {
  const p = clone(input);
  if (p?.version !== 1) throw new TypeError('Unsupported instrument version');
  p.source ??= 'synth';p.instrument ??= 'woodwind';p.articulation ??= 'sustain';
  if(!['synth','orchestra'].includes(p.source)||!['strings','harp','woodwind','horn','percussion'].includes(p.instrument)||!['sustain','short'].includes(p.articulation))throw new TypeError('Invalid instrument source');
  label(p.name); label(p.author); num(p.revision, 1, 1e9, 'Revision');
  if (!Array.isArray(p.oscillators) || p.oscillators.length !== 2) throw new TypeError('Two oscillators required');
  for (const o of p.oscillators) { if (!['harmonic','sine','triangle','sawtooth','square'].includes(o.shape)) throw new TypeError('Unknown oscillator'); num(o.level, 0, 1, 'Level'); num(o.detune, -100, 100, 'Detune'); }
  if (!Array.isArray(p.frames) || p.frames.length < 1 || p.frames.length > 16 || p.frames.some(f => !Array.isArray(f) || f.length !== 8 || f.some(v => !Number.isFinite(v) || v < -1 || v > 1))) throw new TypeError('Wavetable needs 1–16 frames of eight harmonic coefficients');
  for (const key of ['position','sustain','filterEnv','lfoDepth']) num(p[key], 0, 1, key);
  for (const key of ['attack','decay','release']) num(p[key], .001, 5, key);
  num(p.cutoff, 80, 18000, 'Cutoff'); num(p.resonance, .1, 12, 'Resonance'); num(p.lfoRate, .05, 16, 'LFO rate');
  if (typeof p.lfoSync !== 'boolean' || !['sine','triangle','square'].includes(p.lfoShape)) throw new TypeError('Invalid LFO');
  if (!Array.isArray(p.routes) || p.routes.length > 8) throw new TypeError('Too many routes');
  for (const r of p.routes) { if (!['lfo','velocity'].includes(r.source) || !['position','cutoff','pitch'].includes(r.target)) throw new TypeError('Invalid modulation route'); num(r.amount, -1, 1, 'Route amount'); }
  for (const m of MACROS) num(p.macros?.[m], 0, 1, m);
  for (const key of ['drive','delay','feedback']) num(p.effects?.[key], 0, key === 'feedback' ? .7 : 1, key);
  if (!Array.isArray(p.locks) || p.locks.some(k => !['position','cutoff','attack','decay','sustain','release','filterEnv','lfoDepth'].includes(k))) throw new TypeError('Invalid parameter lock');
  return p;
}
export function varyPatch(p, random = Math.random) {
  p = validatePatch(p);
  for (const key of ['position','cutoff','attack','decay','sustain','release','filterEnv','lfoDepth']) if (!p.locks.includes(key)) {
    p[key] = key === 'cutoff' ? clamp(p[key] * 2 ** ((random() - .5) * 1.5), 80, 18000) : ['attack','decay','release'].includes(key) ? clamp(p[key] * 2 ** ((random() - .5) * 1.5), .001, 5) : clamp(p[key] + (random() - .5) * .35);
  }
  p.revision++; return p;
}
export function harmonics(p, position = p.position) {
  const pos = clamp(position) * (p.frames.length - 1), left = Math.floor(pos), right = Math.min(left + 1, p.frames.length - 1), mix = pos - left;
  return p.frames[left].map((v, i) => v * (1 - mix) + p.frames[right][i] * mix);
}
export function waveform(p, count = 256) {
  const h = harmonics(p); return Array.from({ length: count }, (_, i) => h.reduce((s, a, n) => s + a * Math.sin(2 * Math.PI * (n + 1) * i / count), 0));
}
export function newProject() {
  return { version: 1, name: 'Untitled score', tempo: 92, meter: '7/8:2+2+3, 5/8:3+2, 4/4:1+1+1+1', loopTicks: PPQ * 10,
    parts: ['Melody','Countermelody','Bass hook'].map((name, i) => ({ id: `part-${i}`, name, muted: false, patch: preset(['Glass lantern','Paper sky','Moss bass'][i]), notes: [] })),
    mappings: MACROS.map((target, i) => ({ source: i === 0 ? 'danger' : i === 1 ? 'movement' : 'story', target, min: .15, max: i === 2 ? .45 : .8, smoothing: .5, enabled: i < 2 })),
    scenes: Object.fromEntries(STAGES.map(stage=>[stage,{parts:stage==='title'||stage==='loss'?['part-0']:stage==='opening'?['part-0','part-1']:['part-0','part-1','part-2'],variation:''}])),
    variations: {}, bindings: {}, keyBindings:{...DEFAULT_KEYMAP} };
}
export function validateProject(input) {
  const p = clone(input);
  if (p?.version !== 1) throw new TypeError('Unsupported project version');
  label(p.name); num(p.tempo, 40, 200, 'Tempo'); parseMeterCycle(p.meter); num(p.loopTicks, 120, PPQ * 128, 'Loop length');
  if (!Array.isArray(p.parts) || p.parts.length < 1 || p.parts.length > 16) throw new TypeError('Project needs 1–16 parts');
  const ids = new Set(); let count = 0;
  for (const part of p.parts) {
    label(part.id); if (ids.has(part.id)) throw new TypeError('Duplicate part ID'); ids.add(part.id); label(part.name);
    if (typeof part.muted !== 'boolean' || !Array.isArray(part.notes)) throw new TypeError('Invalid part');
    part.patch = validatePatch(part.patch); const notes = new Set();
    for (const n of part.notes) { label(n.id); if (notes.has(n.id)) throw new TypeError('Duplicate note ID'); notes.add(n.id); num(n.midi, 0, 127, 'Pitch'); if (!Number.isInteger(n.midi)) throw new TypeError('Pitch must be integer'); num(n.start, 0, PPQ * 256, 'Note start'); num(n.duration, 1, PPQ * 128, 'Note duration'); num(n.velocity, 1, 127, 'Velocity'); if (n.bend !== undefined) num(n.bend, -24, 24, 'Bend'); if (n.expression !== undefined) { if (!Array.isArray(n.expression) || n.expression.length > 1000) throw new TypeError('Invalid note expression'); let last=-1; for(const point of n.expression) {num(point.tick,0,n.duration,'Expression tick'); num(point.value,-24,24,'Expression bend'); if(point.tick<last) throw new TypeError('Expression must be ordered'); last=point.tick;} } }
    count += part.notes.length;
  }
  if (count > 10000) throw new TypeError('Project is limited to 10,000 notes');
  if (!Array.isArray(p.mappings) || p.mappings.length > 16) throw new TypeError('Invalid game mappings');
  for (const m of p.mappings) { if (!['danger','movement','story'].includes(m.source) || !MACROS.includes(m.target) || typeof m.enabled !== 'boolean') throw new TypeError('Invalid game mapping'); num(m.min, 0, 1, 'Mapping minimum'); num(m.max, 0, 1, 'Mapping maximum'); num(m.smoothing, .01, 5, 'Smoothing'); }
  p.variations ??= {}; p.bindings ??= {};
  if (!p.variations || typeof p.variations!=='object' || Array.isArray(p.variations) || Object.keys(p.variations).some(k=>['__proto__','constructor','prototype'].includes(k)) || Object.keys(p.variations).length > 32 || Object.values(p.variations).some(v => !Array.isArray(v) || v.length !== p.parts.length)) throw new TypeError('Invalid patch variation');
  for (const [name,patches] of Object.entries(p.variations)) p.variations[name]=patches.map(validatePatch);
  p.scenes ??= Object.fromEntries(STAGES.map(stage=>[stage,{parts:p.parts.map(part=>part.id),variation:''}]));
  for(const stage of STAGES) { const scene=p.scenes[stage]; if(!scene||!Array.isArray(scene.parts)||scene.parts.some(key=>!ids.has(key))||typeof scene.variation!=='string'||scene.variation&&!Object.hasOwn(p.variations,scene.variation))throw new TypeError('Invalid authored scene '+stage); }
  if(typeof p.bindings!=='object'||Array.isArray(p.bindings)||Object.keys(p.bindings).length>256)throw new TypeError('Invalid MIDI bindings');
  for (const [binding, target] of Object.entries(p.bindings)) if (!/^\d+:\d+$/.test(binding) || !MACROS.includes(target)) throw new TypeError('Invalid MIDI binding');
  p.keyBindings ??= {...DEFAULT_KEYMAP};
  if(typeof p.keyBindings!=='object'||Array.isArray(p.keyBindings)||Object.keys(p.keyBindings).length<1||Object.keys(p.keyBindings).length>36)throw new TypeError('Keyboard map needs 1–36 assignments');
  for(const[key,offset]of Object.entries(p.keyBindings))if(!/^(Key[A-Z]|Digit[0-9])$/.test(key)||!Number.isInteger(offset)||offset<0||offset>23)throw new TypeError('Invalid keyboard assignment');
  return p;
}
export function parseKeyBindings(text){
  if(typeof text!=='string'||text.length>512)throw new TypeError('Enter keys and semitone offsets, such as A:0, W:1, S:2');
  const result={};for(const item of text.split(',')){const match=item.trim().toUpperCase().match(/^([A-Z0-9])\s*:\s*(\d{1,2})$/);if(!match)throw new TypeError('Use key:offset pairs, such as A:0, W:1, S:2');const key=(/\d/.test(match[1])?'Digit':'Key')+match[1],offset=Number(match[2]);if(Object.hasOwn(result,key)||offset>23)throw new TypeError('Keys must be unique and offsets must be 0–23');result[key]=offset;}return result;
}
export function bars(project, count = 32) { return makeBarMap(parseMeterCycle(project.meter), 0, count); }
export function setMeter(project, text) { const cycle = parseMeterCycle(text); project.meter = formatMeterCycle(cycle); return cycle.reduce((sum, m) => sum + meterTicks(m), 0); }
export function mappedMacros(project, telemetry, base) {
  const result = { ...base };
  for (const m of project.mappings) if (m.enabled) result[m.target] = m.min + (m.max - m.min) * clamp(telemetry[m.source] ?? 0);
  return result;
}
export const needsSampleBank = project => project.parts.some(part=>part.patch.source==='orchestra')||Object.values(project.variations).some(patches=>patches.some(p=>p.source==='orchestra'));
export class TakeRecorder {
  constructor({ tempo, startTime = 0, startTick = 0 }) { this.tempo = tempo; this.startTime = startTime; this.startTick = startTick; this.held = new Map(); this.notes = []; }
  tick(time) { return Math.max(0, this.startTick + (time - this.startTime) * this.tempo / 60 * PPQ); }
  on(key, midi, velocity, time, initialBend = 0) { if (time < this.startTime) return; if(this.held.has(key))this.off(key,time); this.held.set(key, { id: id(), midi, velocity, start: this.tick(time), ...(initialBend ? {bend:initialBend} : {}) }); }
  off(key, time) { const n = this.held.get(key); if (!n) return; this.held.delete(key); n.duration = Math.max(1, this.tick(time) - n.start); this.notes.push(n); }
  bend(prefix, value, time) { for (const [key,n] of this.held) if (key.startsWith(prefix)) { n.expression ??= []; if(n.expression.length<1000) n.expression.push({tick:Math.max(0,this.tick(time)-n.start),value:value-(n.bend??0)}); } }
  finish(time) { for (const key of [...this.held.keys()]) this.off(key, time); return clone(this.notes); }
}
export function quantize(notes, grid) { return notes.map(n => ({ ...n, start: Math.max(0, Math.round(n.start / grid) * grid) })); }
export class History {
  constructor(value) { this.values = [clone(value)]; this.cursor = 0; }
  push(value) { this.values.splice(this.cursor + 1); this.values.push(clone(value)); if (this.values.length > 60) this.values.shift(); this.cursor = this.values.length - 1; }
  undo() { this.cursor = Math.max(0, this.cursor - 1); return clone(this.values[this.cursor]); }
  redo() { this.cursor = Math.min(this.values.length - 1, this.cursor + 1); return clone(this.values[this.cursor]); }
}
// Policy changes arrangement only. The director never edits authored note events.
export class AuthoredDirector {
  constructor() { this.base='title';this.current='title';this.lastBar=-1;this.combat=false;this.safe=0;this.pendingCue=null;this.activeCue=null;this.history=new Map(); }
  resetTimeline(){this.lastBar=-1;this.combat=false;this.safe=0;this.activeCue=null;this.history.clear();}
  setStage(stage) { if(!['title','opening','play'].includes(stage))throw new TypeError('Stage must be title, opening or play'); this.base=stage; }
  cue(kind,bars=4) { if(!['revelation','loss','resolution'].includes(kind)||!Number.isInteger(bars)||bars<1||bars>32)throw new TypeError('Invalid authored story cue');this.pendingCue={kind,bars}; }
  advance(bar,danger=0) {
    if(this.history.has(bar))return this.history.get(bar); if(bar<this.lastBar)return this.current; this.lastBar=bar;
    if(this.pendingCue){this.activeCue={kind:this.pendingCue.kind,endBar:bar+this.pendingCue.bars};this.pendingCue=null;}
    if(this.activeCue&&bar>=this.activeCue.endBar)this.activeCue=null;
    if(this.base==='title'){this.combat=false;this.safe=0;}else if(danger>=.65){this.combat=true;this.safe=0;}else if(this.combat&&danger<=.35){if(++this.safe>=2)this.combat=false;}else this.safe=0;
    this.current=this.base==='title'?'title':this.activeCue?.kind??(this.combat?'danger':this.base);this.history.set(bar,this.current);if(this.history.size>8)this.history.delete(this.history.keys().next().value);return this.current;
  }
}
