import {movementCurve,lfoValue} from './instrument-design.mjs';
import {validateRack,rackNeedsOrchestra} from './instrument-rack.mjs';
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
  filterEnv: .3, lfoRate: .4, lfoSync: false, lfoShape: 'sine', lfoCurve:movementCurve('sine'), lfoDepth: .15,
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
  if (typeof p.lfoSync !== 'boolean' || !['sine','triangle','square','custom'].includes(p.lfoShape)) throw new TypeError('Invalid LFO');
  p.lfoCurve??=movementCurve('sine');if(!Array.isArray(p.lfoCurve)||p.lfoCurve.length<4||p.lfoCurve.length>64||p.lfoCurve.some(v=>!Number.isFinite(v)||Math.abs(v)>1))throw new TypeError('Movement curve needs 4–64 points between -1 and 1');
  if (!Array.isArray(p.routes) || p.routes.length > 8) throw new TypeError('Too many routes');
  for (const r of p.routes) { if (!['lfo','velocity'].includes(r.source) || !['position','cutoff','pitch'].includes(r.target)) throw new TypeError('Invalid modulation route'); num(r.amount, -1, 1, 'Route amount'); }
  for (const m of MACROS) num(p.macros?.[m], 0, 1, m);
  for (const key of ['drive','delay','feedback']) num(p.effects?.[key], 0, key === 'feedback' ? .7 : 1, key);
  if (!Array.isArray(p.locks) || p.locks.some(k => !['position','cutoff','attack','decay','sustain','release','filterEnv','lfoDepth'].includes(k))) throw new TypeError('Invalid parameter lock');
  if(p.rack!==undefined)p.rack=validateRack(p.rack);
  return p;
}
export function varyPatch(p, random = Math.random) {
  p = validatePatch(p);
  for (const key of ['position','cutoff','attack','decay','sustain','release','filterEnv','lfoDepth']) if (!p.locks.includes(key)) {
    p[key] = key === 'cutoff' ? clamp(p[key] * 2 ** ((random() - .5) * 1.5), 80, 18000) : ['attack','decay','release'].includes(key) ? clamp(p[key] * 2 ** ((random() - .5) * 1.5), .001, 5) : clamp(p[key] + (random() - .5) * .35);
  }
  p.revision++; return p;
}
// Original sound recipes. These are portable patch data, independent of an audio host.
export const SOUND_WORLDS = [
  {id:'crystal',name:'Crystal rain',hint:'Tiny glass strikes · bright, delicate',icon:'✧'},
  {id:'sub',name:'Gravity well',hint:'Round sub bass · deep, compact',icon:'◉'},
  {id:'acid',name:'Solar acid',hint:'Biting saw · resonant filter sweep',icon:'☀'},
  {id:'arcade',name:'Pixel comet',hint:'Hollow square · fast stepped motion',icon:'▦'},
  {id:'swarm',name:'Ion swarm',hint:'Detuned saws · wide, fierce sustain',icon:'≋'},
  {id:'drone',name:'Velvet nebula',hint:'Slow harmonic cloud · long, drifting',icon:'☁'}
];
export function soundWorld(world) {
  if(!SOUND_WORLDS.some(w=>w.id===world))throw new TypeError('Unknown sound world');
  const p=preset();p.name=SOUND_WORLDS.find(w=>w.id===world).name;
  if(world==='crystal')Object.assign(p,{frames:[[1,0,.07,0,.6,0,0,.3],[.4,0,.5,0,.1,0,.7,0]],attack:.002,decay:.18,sustain:.015,release:1.4,cutoff:14000,filterEnv:0,macros:{brightness:.7,motion:.15,width:.65,space:.8},effects:{drive:0,delay:.55,feedback:.48}});
  if(world==='sub')Object.assign(p,{oscillators:[{shape:'sine',level:.85,detune:0},{shape:'triangle',level:.12,detune:0}],attack:.006,decay:.2,sustain:.8,release:.12,cutoff:220,filterEnv:.05,macros:{brightness:.1,motion:0,width:0,space:0},effects:{drive:.08,delay:0,feedback:0},routes:[]});
  if(world==='acid')Object.assign(p,{oscillators:[{shape:'sawtooth',level:.65,detune:0},{shape:'square',level:.12,detune:-7}],attack:.002,decay:.12,sustain:.18,release:.08,cutoff:450,resonance:9,filterEnv:1,lfoRate:3,lfoDepth:.75,routes:[{source:'lfo',target:'cutoff',amount:.8}],macros:{brightness:.55,motion:.85,width:.12,space:.1},effects:{drive:.65,delay:.12,feedback:.2}});
  if(world==='arcade')Object.assign(p,{oscillators:[{shape:'square',level:.48,detune:0},{shape:'triangle',level:.18,detune:0}],attack:.001,decay:.045,sustain:.35,release:.025,cutoff:10000,filterEnv:0,lfoShape:'square',lfoRate:9,lfoDepth:1,routes:[{source:'lfo',target:'pitch',amount:.5}],macros:{brightness:.6,motion:1,width:0,space:.18},effects:{drive:.15,delay:.16,feedback:.2}});
  if(world==='swarm')Object.assign(p,{oscillators:[{shape:'sawtooth',level:.48,detune:-38},{shape:'sawtooth',level:.48,detune:38}],attack:.035,decay:.4,sustain:.8,release:.55,cutoff:7400,resonance:2.4,filterEnv:.2,lfoRate:5,lfoDepth:.6,routes:[{source:'lfo',target:'cutoff',amount:.5}],macros:{brightness:.8,motion:.8,width:1,space:.45},effects:{drive:.85,delay:.35,feedback:.38}});
  if(world==='drone')Object.assign(p,{frames:[[1,.05,.3,0,.12,0,.04,0],[.2,.6,.08,.3,0,.1,0,.15]],oscillators:[{shape:'harmonic',level:.65,detune:-12},{shape:'harmonic',level:.25,detune:12}],attack:1.3,decay:1.5,sustain:.8,release:2.6,cutoff:1800,filterEnv:.3,lfoRate:.16,lfoDepth:1,routes:[{source:'lfo',target:'position',amount:.8},{source:'lfo',target:'cutoff',amount:.35}],macros:{brightness:.4,motion:1,width:.9,space:1},effects:{drive:.04,delay:.65,feedback:.6}});
  return validatePatch(p);
}
function partials(p,o,frame) {
  return Array.from({length:8},(_,i)=>{const n=i+1;return o.shape==='harmonic'?p.frames[frame%p.frames.length][i]:o.shape==='sine'?(n===1?1:0):o.shape==='sawtooth'?1/n:o.shape==='square'?(n%2?1/n:0):(n%2?(-1)**((n-1)/2)/(n*n):0);});
}
export function blendSounds(a,b,amount) {
  a=validatePatch(a);b=validatePatch(b);num(amount,0,1,'Blend');
  if(amount===0)return a;if(amount===1)return b;
  const p=clone(a),mix=(x,y)=>x+(y-x)*amount;
  for(const k of ['position','sustain','filterEnv','lfoDepth','resonance'])p[k]=mix(a[k],b[k]);
  for(const k of ['attack','decay','release','cutoff','lfoRate'])p[k]=a[k]*(b[k]/a[k])**amount;
  // A fixed harmonic topology makes intermediate timbres reproducible and smoothly blended.
  p.frames=Array.from({length:2},(_,f)=>partials(a,a.oscillators[0],f).map((v,i)=>mix(v,partials(b,b.oscillators[0],f)[i])));
  p.oscillators=[{shape:'harmonic',level:mix(a.oscillators[0].level,b.oscillators[0].level),detune:mix(a.oscillators[0].detune,b.oscillators[0].detune)},{shape:'sine',level:mix(a.oscillators[1].level,b.oscillators[1].level),detune:mix(a.oscillators[1].detune,b.oscillators[1].detune)}];
  for(const k of MACROS)p.macros[k]=mix(a.macros[k],b.macros[k]);
  for(const k of ['drive','delay','feedback'])p.effects[k]=mix(a.effects[k],b.effects[k]);
  const routeMap=p=>Object.fromEntries(p.routes.map(r=>[r.source+':'+r.target,r.amount]));const ar=routeMap(a),br=routeMap(b);
  p.routes=[...new Set([...Object.keys(ar),...Object.keys(br)])].map(key=>{const[source,target]=key.split(':');return{source,target,amount:mix(ar[key]??0,br[key]??0)};});
  p.lfoShape=amount<.5?a.lfoShape:b.lfoShape;if(a.lfoShape==='custom'||b.lfoShape==='custom'){p.lfoShape='custom';p.lfoCurve=Array.from({length:Math.max(a.lfoCurve.length,b.lfoCurve.length)},(_,i)=>{const phase=i/Math.max(a.lfoCurve.length,b.lfoCurve.length);return mix(lfoValue(a.lfoShape,phase,a.lfoCurve),lfoValue(b.lfoShape,phase,b.lfoCurve));});}p.lfoSync=amount<.5?a.lfoSync:b.lfoSync;p.source='synth';return validatePatch(p);
}
export function exploreSound(original,x,y) {
  original=validatePatch(original);num(x,0,1,'X');num(y,0,1,'Y');
  const p=blendSounds(blendSounds(soundWorld('drone'),soundWorld('crystal'),x),blendSounds(soundWorld('sub'),soundWorld('acid'),x),y);
  p.name='Planet '+Math.round(x*100)+' / '+Math.round(y*100);p.locks=[...original.locks];
  for(const k of p.locks)p[k]=original[k];p.revision=original.revision+1;return validatePatch(p);
}
export function mutateSound(original,strength=.8,random=Math.random) {
  original=validatePatch(original);num(strength,0,1,'Mutation strength');if(strength===0)return original;
  const target=soundWorld(SOUND_WORLDS[Math.min(5,Math.floor(clamp(random())*6))].id);
  target.frames=target.frames.map(f=>f.map((v,i)=>i===0?v:clamp(v+(random()-.5)*.8,-1,1)));
  target.cutoff=80*200**random();target.position=random();
  const p=blendSounds(original,target,strength);p.name='Mutation · '+target.name;p.locks=[...original.locks];
  for(const k of p.locks)p[k]=original[k];p.revision=original.revision+1;return validatePatch(p);
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
const patchNeedsOrchestra=p=>p.rack?rackNeedsOrchestra(p.rack):p.source==='orchestra';
export const needsSampleBank = project => project.parts.some(part=>patchNeedsOrchestra(part.patch))||Object.values(project.variations).some(patches=>patches.some(patchNeedsOrchestra));
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
