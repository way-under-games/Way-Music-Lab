// MIT. Portable layered instrument schema; no browser, file system or engine objects.
const clone=value=>structuredClone(value);
const number=(value,min,max,name)=>{if(!Number.isFinite(value)||value<min||value>max)throw new TypeError(`${name} must be ${min}–${max}`);return value;};
const text=(value,max,name)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new TypeError(`Invalid ${name}`);return value;};
const choice=(value,values,name)=>{if(!values.includes(value))throw new TypeError(`Invalid ${name}`);return value;};
const bool=(value,name)=>{if(typeof value!=='boolean')throw new TypeError(`Invalid ${name}`);return value;};
export const RACK_VERSION=1;
export const LAYER_KINDS=['synth','sample','orchestra','noise'];
export const RACK_TARGETS=['cutoff','resonance','volume','pan','pitch','position','fmIndex','drive'];
export const EFFECT_TYPES=['eq','distortion','chorus','delay','reverb','compressor'];
export const assetId=value=>{if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))throw new TypeError('Invalid audio asset hash');return value;};
export function envelope(input={}){
  const e={attack:.005,decay:.25,sustain:.65,release:.3,...clone(input)};
  for(const key of ['attack','decay','release'])number(e[key],.001,8,`Envelope ${key}`);number(e.sustain,0,1,'Envelope sustain');return e;
}
export function newLayer(kind='synth',name='Sound layer'){
  return {id:globalThis.crypto.randomUUID(),name,kind,enabled:true,gain:.7,pan:0,tune:0,fine:0,loKey:0,hiKey:127,loVelocity:1,hiVelocity:127,
    envelope:envelope(),filter:{type:'lowpass',cutoff:16000,resonance:.7},drive:0,bypassEffects:false,
    synth:{engine:'analog',shape:'sawtooth',phase:0,randomPhase:false,unison:1,detune:12,spread:.7,position:0,frames:[[1,.3,.12,.06,0,0,0,0]],fm:{ratio:2,index:1.5,envelope:envelope({attack:.002,decay:.35,sustain:.15,release:.2})}},
    sample:{assetId:null,rootMidi:60,gainDb:0,start:0,end:null,loop:false,loopStart:0,loopEnd:0,reverse:false},
    orchestra:{instrument:'woodwind',articulation:'sustain'}};
}
export function newRack(){return{version:RACK_VERSION,layers:[newLayer()],play:{mode:'poly',legato:true,glide:0,polyphony:16},seed:1,modulators:[],routes:[],effects:[]};}
export function newModulator(type='lfo'){
  return{id:globalThis.crypto.randomUUID(),name:type==='envelope'?'Articulation':'Movement',type,rate:1,sync:false,period:1,retrigger:'note',curve:Array.from({length:16},(_,i)=>Math.sin(i/16*Math.PI*2)),envelope:envelope({attack:.005,decay:.4,sustain:0,release:.15})};
}
export function newEffect(type){
  choice(type,EFFECT_TYPES,'effect type');return{id:globalThis.crypto.randomUUID(),type,enabled:true,mix:type==='distortion'?1:.25,
    frequency:1000,q:.7,gainDb:0,mode:'soft',drive:.3,rate:.6,depth:.4,time:.3,sync:false,beats:.5,feedback:.25,duration:1.2,threshold:-18,ratio:3,attack:.01,release:.15};
}
export function validateRack(input){
  const r=clone(input);if(r?.version!==RACK_VERSION)throw new TypeError('Unsupported instrument rack version');
  if(!Array.isArray(r.layers)||r.layers.length<1||r.layers.length>6)throw new TypeError('An instrument needs 1–6 layers');
  const ids=new Set();let budget=0;
  for(const l of r.layers){text(l.id,100,'layer id');if(ids.has(l.id))throw new TypeError('Duplicate layer id');ids.add(l.id);text(l.name,100,'layer name');choice(l.kind,LAYER_KINDS,'layer source');bool(l.enabled,'layer enabled');bool(l.bypassEffects,'effect bypass');
    number(l.gain,0,1,'Layer gain');number(l.pan,-1,1,'Layer pan');number(l.tune,-48,48,'Layer tuning');number(l.fine,-100,100,'Fine tuning');
    for(const key of ['loKey','hiKey'])if(!Number.isInteger(l[key])||l[key]<0||l[key]>127)throw new TypeError('Invalid layer key range');if(l.loKey>l.hiKey)throw new TypeError('Invalid layer key range');
    for(const key of ['loVelocity','hiVelocity'])if(!Number.isInteger(l[key])||l[key]<1||l[key]>127)throw new TypeError('Invalid velocity range');if(l.loVelocity>l.hiVelocity)throw new TypeError('Invalid velocity range');
    l.envelope=envelope(l.envelope);choice(l.filter?.type,['lowpass','highpass','bandpass','notch','allpass'],'filter');number(l.filter.cutoff,30,20000,'Cutoff');number(l.filter.resonance,.1,18,'Resonance');number(l.drive,0,1,'Layer drive');
    if(l.kind==='synth'){
      const s=l.synth;choice(s?.engine,['analog','wavetable','fm'],'synthesis engine');choice(s.shape,['sine','triangle','sawtooth','square','harmonic'],'oscillator shape');number(s.phase,0,1,'Phase');bool(s.randomPhase,'phase variation');
      if(!Number.isInteger(s.unison)||s.unison<1||s.unison>7)throw new TypeError('Unison needs 1–7 voices');number(s.detune,0,60,'Unison detune');number(s.spread,0,1,'Unison spread');number(s.position,0,1,'Table position');
      if(!Array.isArray(s.frames)||s.frames.length<1||s.frames.length>16)throw new TypeError('Wavetable needs 1–16 frames');const size=s.frames[0]?.length;
      if(!Number.isInteger(size)||size<4||size>64||s.frames.some(f=>!Array.isArray(f)||f.length!==size||f.some(v=>!Number.isFinite(v)||Math.abs(v)>1)))throw new TypeError('Frames need 4–64 equally sized bounded harmonics');
      number(s.fm?.ratio,.125,16,'FM ratio');number(s.fm.index,0,12,'FM index');s.fm.envelope=envelope(s.fm.envelope);
    }else if(l.kind==='sample'){
      assetId(l.sample?.assetId);l.sample.gainDb??=0;number(l.sample.gainDb,-36,36,'Sample gain');if(!Number.isInteger(l.sample.rootMidi))throw new TypeError('Sample root must be a MIDI note');number(l.sample.rootMidi,0,127,'Root note');number(l.sample.start,0,30,'Sample start');if(l.sample.end!==null)number(l.sample.end,.001,30,'Sample end');if(l.sample.end!==null&&l.sample.end<=l.sample.start)throw new TypeError('Sample trim end must follow start');
      bool(l.sample.loop,'Sample loop');bool(l.sample.reverse,'Sample reverse');number(l.sample.loopStart,0,30,'Loop start');number(l.sample.loopEnd,0,30,'Loop end');if(l.sample.loop&&(l.sample.loopEnd<=l.sample.loopStart||l.sample.loopStart<l.sample.start||l.sample.end!==null&&l.sample.loopEnd>l.sample.end))throw new TypeError('Sample loop must stay inside the trim');
    }else if(l.kind==='orchestra'){choice(l.orchestra?.instrument,['strings','harp','woodwind','horn','percussion'],'orchestra role');choice(l.orchestra.articulation,['sustain','short'],'articulation');}
    if(l.enabled)budget+=layerSourceCost(l);
  }
  if(budget>96)throw new RangeError('This instrument exceeds the 96-source per-note budget; reduce layers or unison');
  choice(r.play?.mode,['poly','mono'],'voice mode');bool(r.play.legato,'legato');number(r.play.glide,0,2,'Glide');if(!Number.isInteger(r.play.polyphony)||r.play.polyphony<1||r.play.polyphony>32)throw new TypeError('Polyphony must be 1–32');if(!Number.isInteger(r.seed)||r.seed<0||r.seed>0xffffffff)throw new TypeError('Invalid instrument seed');
  if(!Array.isArray(r.modulators)||r.modulators.length>4)throw new TypeError('Use at most four independent modulators');const mods=new Set();
  for(const m of r.modulators){text(m.id,100,'modulator id');if(mods.has(m.id))throw new TypeError('Duplicate modulator id');mods.add(m.id);text(m.name,100,'modulator name');choice(m.type,['lfo','envelope','random'],'modulator type');number(m.rate,.01,30,'Modulator rate');number(m.period,.0625,32,'Beat period');bool(m.sync,'tempo sync');choice(m.retrigger,['note','transport'],'modulator trigger');m.envelope=envelope(m.envelope);if(!Array.isArray(m.curve)||m.curve.length<4||m.curve.length>64||m.curve.some(v=>!Number.isFinite(v)||Math.abs(v)>1))throw new TypeError('Movement needs 4–64 bounded points');}
  if(!Array.isArray(r.routes)||r.routes.length>32)throw new TypeError('Use at most 32 modulation routes');
  for(const route of r.routes){if(!['velocity','key','brightness','motion','width','space'].includes(route.source)&&!mods.has(route.source))throw new TypeError('Unknown modulation source');if(route.layer!=='*'&&!ids.has(route.layer))throw new TypeError('Unknown modulation layer');choice(route.target,RACK_TARGETS,'modulation target');number(route.amount,-1,1,'Modulation depth');}
  if(!Array.isArray(r.effects)||r.effects.length>8)throw new TypeError('Use at most eight effects');const effects=new Set();
  for(const e of r.effects){text(e.id,100,'effect id');if(effects.has(e.id))throw new TypeError('Duplicate effect id');effects.add(e.id);choice(e.type,EFFECT_TYPES,'effect type');bool(e.enabled,'effect enabled');number(e.mix,0,1,'Effect mix');
    if(e.type==='eq'){number(e.frequency,30,20000,'EQ frequency');number(e.q,.1,18,'EQ width');number(e.gainDb,-18,18,'EQ gain');}
    if(e.type==='distortion'){choice(e.mode,['soft','hard','fold','crush'],'distortion model');number(e.drive,0,1,'Drive');}
    if(e.type==='chorus'){number(e.rate,.05,8,'Chorus rate');number(e.depth,0,1,'Chorus depth');}
    if(e.type==='delay'){number(e.time,.01,2,'Delay time');number(e.beats,.0625,2,'Delay beats');bool(e.sync,'Delay sync');number(e.feedback,0,.75,'Delay feedback');}
    if(e.type==='reverb')number(e.duration,.1,4,'Room duration');
    if(e.type==='compressor'){number(e.threshold,-60,0,'Compressor threshold');number(e.ratio,1,12,'Compressor ratio');number(e.attack,.001,1,'Compressor attack');number(e.release,.01,2,'Compressor release');}
  }
  return r;
}
export function layerSourceCost(layer){return layer.kind==='synth'?layer.synth.unison*(layer.synth.engine==='fm'||layer.synth.engine==='wavetable'?2:1):1;}
export function rackAssetIds(rack){return [...new Set(rack.layers.filter(l=>l.kind==='sample').map(l=>l.sample.assetId))];}
export function rackNeedsOrchestra(rack){return rack.layers.some(l=>l.enabled&&l.kind==='orchestra');}
export function rackTail(rack){return Math.max(...rack.layers.filter(l=>l.enabled).map(l=>l.envelope.release),0)+Math.min(12,rack.effects.filter(e=>e.enabled).reduce((sum,e)=>sum+(e.type==='reverb'?e.duration:e.type==='delay'?Math.max(e.time,e.beats*1.5)*(e.feedback>0?Math.ceil(Math.log(.001)/Math.log(e.feedback)):1):0),0));}
