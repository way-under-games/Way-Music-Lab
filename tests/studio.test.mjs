import test from 'node:test';
import assert from 'node:assert/strict';
import { newProject, validateProject, validatePatch, preset, varyPatch, setMeter, bars, mappedMacros, TakeRecorder, quantize, History, harmonics, AuthoredDirector, parseKeyBindings } from '../src/studio.mjs';
import { StudioEngine, StudioPlayer, encodeWav, renderStudioWav } from '../src/studio-audio.mjs';
import { BrowserStudio } from '../src/studio-host.mjs';
import { exportStudioMidi } from '../src/studio-midi.mjs';

function context() {
  const nodes=[];
  const param=()=>({value:0,events:[],setValueAtTime(v,t){this.events.push(['value',v,t]);},linearRampToValueAtTime(v,t){this.events.push(['linear',v,t]);},exponentialRampToValueAtTime(v,t){this.events.push(['exp',v,t]);},setTargetAtTime(v,t,s){this.events.push(['target',v,t,s]);},cancelScheduledValues(t){this.events.push(['cancel',t]);},cancelAndHoldAtTime(t){this.events.push(['hold',t]);}});
  const node=()=>{const n={gain:param(),frequency:param(),detune:param(),pan:param(),Q:param(),delayTime:param(),threshold:param(),ratio:param(),connected:[],connect(to){this.connected.push(to);return to;},disconnect(){this.disconnected=true;},start(t){this.started=t;},stop(t){this.stopped=t;},setPeriodicWave(w){this.wave=w;}};nodes.push(n);return n;};
  return {currentTime:0,sampleRate:48000,nodes,destination:{},createGain:node,createBiquadFilter:node,createStereoPanner:node,createWaveShaper:node,createDelay:node,createDynamicsCompressor:node,createAnalyser:node,createOscillator:node,createBufferSource(){const s=node();s.playbackRate=param();return s;},createPeriodicWave:(r,i,o)=>({real:r,imaginary:i,options:o})};
}
const note=(extra={})=>({id:'authored-note',midi:62,velocity:91,start:300,duration:650,...extra});

test('audio caches harmonic waves and snapshots while keeping active amplitude envelopes stable',()=>{
  const c=context(),e=new StudioEngine(c),p=preset();p.oscillators[1].shape='harmonic';
  e.noteOn('a',60,90,'part',p);e.noteOn('b',64,90,'part',p);
  assert.equal(e.waveCache.size,2);assert.equal(e.voices.get('a').patch,e.voices.get('b').patch);
  const v=e.voices.get('a'),oldRelease=p.release;p.release=4;p.frames[0][2]=.9;p.oscillators[0].detune=64;
  assert.equal(v.patch.release,oldRelease,'Input mutations cannot alter a voice snapshot');
  e.update('part',p,p.macros);assert.equal(v.patch.release,4);assert.equal(v.amplitude.release,oldRelease);assert.equal(v.sources[0].spec.detune,0,'Held oscillator detune stays fixed until a new attack');
  e.release('a',.4);assert.equal(v.end,.4+oldRelease+.03);
  e.noteOn('c',67,90,'part',p);assert.equal(e.waveCache.size,4,'A changed normalization invalidates both frame waves');
  const steady=e.voices.get('b'),count=steady.pan.pan.events.length;e.updateVoice(steady,.1);e.updateVoice(steady,.2);
  assert.equal(steady.pan.pan.events.length,count,'Unchanged pan does not append automation');
  e.update('part',p,{...p.macros,width:1});e.updateVoice(steady,.3);assert.equal(steady.pan.pan.events.length,count+1);
  e.dispose();assert.equal(e.waveCache.size,0);
});

test('idle players do not create buses, and zero drive is an actual linear bypass',()=>{
  const c=context(),e=new StudioEngine(c),p=newProject(),player=new StudioPlayer(e,p);
  player.tick();assert.equal(e.buses.size,0);
  const patch=p.parts[0].patch;patch.effects.drive=0;patch.oscillators[1].level=0;
  e.noteOn('a',60,90,'part',patch);assert.equal(e.buses.get('part').drive.curve,null);assert.equal(e.buses.get('part').drive.oversample,'none');
  assert.equal(e.voices.get('a').sources.length,patch.frames.length,'Silent oscillator is not allocated');
  patch.effects.drive=.8;e.update('part',patch,patch.macros);const curve=e.buses.get('part').drive.curve;assert.equal(curve[512],0);assert.equal(curve[0],-curve[1024]);
  player.stop();player.tick();assert.equal(e.buses.size,0);
});

test('game smoothing uses elapsed audio time and the winning mapping duration',()=>{
  const c=context(),e=new StudioEngine(c),p=newProject();
  p.mappings=[{source:'danger',target:'brightness',min:.9,max:.9,smoothing:5,enabled:true},{source:'story',target:'brightness',min:.9,max:.9,smoothing:.1,enabled:true}];
  const player=new StudioPlayer(e,p);player.gameEnabled=true;player.tick();let expected=.45+(.9-.45)*(1-Math.exp(-.025/.1));assert.ok(Math.abs(player.smoothed.get('part-0').brightness-expected)<1e-12);
  c.currentTime=.1;player.tick();expected+=(.9-expected)*(1-Math.exp(-.1/.1));assert.ok(Math.abs(player.smoothed.get('part-0').brightness-expected)<1e-12);
});

test('stop cancels browser host starts pending resume and sample preload',async t=>{
  const previousAudio=globalThis.AudioContext,previousDocument=globalThis.document;let resume;
  const c=context();c.resume=()=>new Promise(resolve=>resume=resolve);c.close=async()=>{};
  globalThis.AudioContext=class{constructor(){return c;}};globalThis.document={addEventListener(){},removeEventListener(){}};
  t.after(()=>{globalThis.AudioContext=previousAudio;globalThis.document=previousDocument;});
  const p=newProject();p.parts[0].patch.source='orchestra';const host=new BrowserStudio(p);
  let loads=0;host.engine.ensureSampleBank=async()=>{loads++;};const pending=host.start();host.stop();resume();await pending;
  assert.equal(host.player.running,false);assert.equal(loads,0);
  c.resume=async()=>{};let releaseBank,reachedBank;const reached=new Promise(resolve=>reachedBank=resolve);
  host.engine.ensureSampleBank=()=>{reachedBank();return new Promise(resolve=>releaseBank=resolve);};
  const loading=host.start();await reached;host.stop();releaseBank();await loading;assert.equal(host.player.running,false);assert.equal(host.timer,null);await host.dispose();
});

test('studio projects start without generated hooks; serialization preserves overlapping authored parts and expression',()=>{
  const p=newProject();assert.ok(p.parts.every(p=>p.notes.length===0));p.parts[0].notes=[note({expression:[{tick:10,value:.7},{tick:220,value:-.25}]})];p.parts[1].notes=[note({id:'answer',midi:67,start:330})];
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
  const before=structuredClone(p.parts.map(p=>p.notes));setMeter(p,'5/8:3+2, 7/8:2+2+3');p.parts[0].patch=varyPatch(p.parts[0].patch,()=>.8);mappedMacros(p,{danger:.9},p.parts[0].patch.macros);
  assert.deepEqual(p.parts.map(p=>p.notes),before);assert.equal(bars(p)[1].startTick,1200);
  p.parts[0].notes[0].expression[0].value=NaN;assert.throws(()=>validateProject(p),/Expression/);
});
test('invalid imported patches and oversized assets fail before audio allocation',()=>{
  for(const mutate of [p=>p.cutoff=Infinity,p=>p.oscillators[0].shape='code',p=>p.frames=[[0]],p=>p.effects.feedback=1,p=>p.routes=[{source:'script',target:'pitch',amount:1}]]){const p=preset();mutate(p);assert.throws(()=>validatePatch(p));}
  const p=newProject();p.parts.push(p.parts[0]);assert.throws(()=>validateProject(p),/Duplicate part/);
  const q=newProject();q.variations=JSON.parse('{"__proto__": []}');assert.throws(()=>validateProject(q),/variation/);
});
test('sound exploration respects locks and harmonic frames interpolate without mutating sources',()=>{
  const p=preset();p.locks=['attack','cutoff','position'];const v=varyPatch(p,()=>.9);assert.equal(v.attack,p.attack);assert.equal(v.cutoff,p.cutoff);assert.equal(v.position,p.position);assert.notEqual(v.sustain,p.sustain);assert.equal(v.revision,p.revision+1);
  const mid=harmonics(p,.5);assert.equal(mid[1],(p.frames[0][1]+p.frames[1][1])/2);assert.notStrictEqual(v.frames,p.frames);
});
test('performance capture preserves wall-clock timing, rests, overlaps, repeated pitches and pitch gestures',()=>{
  const r=new TakeRecorder({tempo:120,startTime:2});r.on('early',60,80,1);assert.equal(r.held.size,0);r.on('midi:0:60',60,100,2.5);r.on('second',67,80,2.7);r.bend('midi:',.5,2.75);r.off('second',2.9);r.on('midi:0:60',60,90,3);r.off('midi:0:60',3.25);
  const notes=r.finish(4);assert.equal(notes.length,3);const first=notes.find(n=>n.velocity===100);assert.equal(first.start,480);assert.equal(first.duration,480);assert.deepEqual(first.expression,[{tick:240,value:.5}]);assert.equal(notes.find(n=>n.velocity===90).duration,240);
  const h=new History({notes});h.push({notes:quantize(notes,240)});assert.deepEqual(h.undo().notes,notes);assert.deepEqual(h.redo().notes,quantize(notes,240));
});
test('live voices release by identity; sustain and note retriggers do not leave hanging notes',()=>{
  const c=context(),e=new StudioEngine(c),p=preset();e.noteOn('a',60,90,'melody',p);e.noteOn('b',60,80,'counter',p);assert.equal(e.voices.size,2);
  e.sustain('keys',true);e.release('a');assert.equal(e.voices.get('a').released,false);e.sustain('keys',false);assert.equal(e.voices.get('a').released,true);assert.equal(e.voices.get('b').released,false);
  c.currentTime=1;e.noteOn('b',62,90,'counter',p);assert.equal(e.voices.get('b').midi,62);e.release('b');c.currentTime=3;e.tick();assert.equal(e.voices.size,0);
  e.noteOn('c',65,90,'melody',p);const buses=[...e.buses.values()];e.silence();assert.equal(e.voices.size,0);assert.equal(e.buses.size,0);assert.ok(buses.every(b=>b.delay.disconnected));
});
test('scheduled notes retain modulation before release and wavetable frame gain is bounded',()=>{
  const c=context(),e=new StudioEngine(c),p=preset();e.noteOn('future',64,100,'melody',p,{time:.05});e.release('future',1);
  c.currentTime=.4;e.update('melody',p,{...p.macros,brightness:1});e.tick();const v=e.voices.get('future');assert.ok(v.filter.frequency.events.some(x=>x[0]==='target'&&x[2]===.4));assert.equal(v.releaseAt,1);
  for(const f of v.frameGains)assert.ok(f.volume.gain.events.every(x=>x[1]>=0&&x[1]<=f.level));assert.ok(v.gain.gain.events.some(x=>x[0]==='hold'&&x[1]===1));
});
test('authored loop scheduling survives odd meters, releases beyond bar lines, stalls and stop',()=>{
  const c=context(),e=new StudioEngine(c),p=newProject();p.parts[0].notes=[note({start:0,duration:2100})];const before=structuredClone(p);const player=new StudioPlayer(e,p);player.start();player.tick();assert.equal(e.voices.size,1);const v=[...e.voices.values()][0];assert.equal(v.midi,62);assert.ok(v.releaseAt>1);
  const gain=v.filter.frequency.events.length;c.currentTime=.3;player.gameEnabled=true;player.telemetry.danger=1;player.tick();assert.ok(v.filter.frequency.events.length>gain);assert.deepEqual(p,before);
  c.currentTime=100;player.tick();assert.ok(player.pending.length<10);player.stop();assert.equal(e.voices.size,0);assert.deepEqual(player.pending,[]);
});
test('mapping bypass, reversed ranges and deterministic precedence preserve authored macros',()=>{
  const p=newProject(),base={...p.parts[0].patch.macros};p.mappings=[{source:'danger',target:'brightness',min:.9,max:.1,smoothing:.5,enabled:true},{source:'story',target:'brightness',min:.2,max:.4,smoothing:.5,enabled:true}];assert.equal(mappedMacros(p,{danger:1,story:.5},base).brightness,.30000000000000004);assert.deepEqual(p.parts[0].patch.macros,base);
  const c=context(),player=new StudioPlayer(new StudioEngine(c),p);assert.deepEqual(player.macros(p.parts[0]),base);
});
test('SMF export includes authored note events, independent parts, tempo and meter cycle without altering data',()=>{
  const p=newProject();p.parts[0].notes=[note({start:120,duration:720})];p.parts[1].notes=[note({id:'answer',midi:69,start:2100})];const before=structuredClone(p),bytes=exportStudioMidi(p);
  assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'MThd');assert.ok(Buffer.from(bytes).includes(Buffer.from([144,62,91])));assert.ok(Buffer.from(bytes).includes(Buffer.from([145,69,91])));assert.ok(Buffer.from(bytes).includes(Buffer.from([255,88,4,7,3,24,8])));assert.ok(Buffer.from(bytes).includes(Buffer.from([255,88,4,5,3,24,8])));assert.deepEqual(p,before);
});
test('WAV encoding is stereo PCM with valid lengths and bounded values',()=>{
  const bytes=encodeWav({length:3,sampleRate:24000,getChannelData:ch=>ch?new Float32Array([0,1,-2]):new Float32Array([0,-1,2])});const d=new DataView(bytes);assert.equal(bytes.byteLength,56);assert.equal(d.getUint32(40,true),12);assert.equal(d.getInt16(54,true),-32767);assert.equal(d.getUint16(22,true),2);
});
test('authored stage policy debounces danger, preserves committed bars and returns after timed story cues',()=>{
  const d=new AuthoredDirector();assert.equal(d.advance(0,1),'title');d.setStage('opening');assert.equal(d.advance(0,1),'title');assert.equal(d.advance(1,0),'opening');d.setStage('play');assert.equal(d.advance(2,.8),'danger');assert.equal(d.advance(3,.4),'danger');assert.equal(d.advance(4,.2),'danger');assert.equal(d.advance(5,.2),'play');
  d.cue('loss',2);assert.equal(d.advance(6,.9),'loss');assert.equal(d.advance(7,.9),'loss');assert.equal(d.advance(8,.9),'danger');d.resetTimeline();assert.equal(d.advance(0,0),'play');
});
test('scene silence and patch variations change arrangement without replacing authored notes',()=>{
  const c=context(),e=new StudioEngine(c),p=newProject();p.parts[0].notes=[note({start:0,duration:4000})];p.variations.quiet=p.parts.map(part=>({...structuredClone(part.patch),cutoff:300}));p.scenes.opening.variation='quiet';p.scenes.loss.parts=[];
  const source=structuredClone(p),player=new StudioPlayer(e,p);player.gameEnabled=true;player.director.setStage('opening');player.start();player.tick();assert.equal([...e.voices.values()][0].patch.cutoff,300);assert.equal(player.snapshot().parts[0].patch.cutoff,300);
  player.director.cue('loss');c.currentTime=3;player.tick();assert.equal(player.audibleStage,'loss');assert.ok([...e.voices.values()].every(v=>v.releaseAt<=c.currentTime));assert.ok(player.snapshot().parts.every(part=>part.muted));assert.deepEqual(p,source);
});
test('voice and offline graph limits bound allocation, and muted parts do not consume MIDI channels',async t=>{
  const c=context(),e=new StudioEngine(c),p=preset();for(let i=0;i<33;i++)e.noteOn('voice'+i,60,80,'part',p);assert.equal(e.voices.size,32);assert.equal(e.dropped,1);e.silence();assert.equal(e.voices.size,0);
  const previous=globalThis.OfflineAudioContext;globalThis.OfflineAudioContext=class {constructor(){return context();}};t.after(()=>globalThis.OfflineAudioContext=previous);
  const project=newProject();project.parts[0].patch.frames=Array.from({length:16},()=>[1,0,0,0,0,0,0,0]);project.parts[0].notes=Array.from({length:1000},(_,i)=>note({id:'note'+i,start:0}));await assert.rejects(()=>renderStudioWav(project),/graph is too large/);
  const midi=newProject();midi.parts=Array.from({length:16},(_,i)=>({id:'part-'+i,name:'part '+i,muted:i<15,patch:preset(),notes:i===15?[note()]:[]}));assert.ok(exportStudioMidi(midi).length>50);
});
test('browser host validates telemetry atomically and disposal cancels an asynchronous start',async t=>{
  const previousAudio=globalThis.AudioContext,previousDocument=globalThis.document;let resume;const c=context();c.resume=()=>new Promise(resolve=>resume=resolve);c.close=async()=>{c.closed=true;};
  globalThis.AudioContext=class{constructor(){return c;}};globalThis.document={addEventListener(){},removeEventListener(){}};t.after(()=>{globalThis.AudioContext=previousAudio;globalThis.document=previousDocument;});
  const host=new BrowserStudio(newProject());assert.throws(()=>host.setTelemetry({danger:.8,movement:2}));assert.equal(host.player.telemetry.danger,0);host.setTelemetry({danger:.8});assert.equal(host.player.telemetry.danger,.8);
  const start=host.start();await host.dispose();resume();await start;assert.equal(host.player.running,false);assert.equal(host.timer,null);await host.dispose();assert.equal(c.closed,true);await assert.rejects(()=>host.start(),/disposed/);
});
test('capture preserves pitch bend already held at attack and records later bend relative to it',()=>{
  const recorder=new TakeRecorder({tempo:120});recorder.on('midi:0:60',60,90,.1,1.25);recorder.bend('midi:',-.5,.2);recorder.off('midi:0:60',.3);const [captured]=recorder.finish(.4);
  assert.equal(captured.bend,1.25);assert.deepEqual(captured.expression,[{tick:96,value:-1.75}]);
  const c=context(),engine=new StudioEngine(c);engine.noteOn('replay',captured.midi,90,'part',preset(),{bend:captured.bend,expression:captured.expression,tempo:120});c.currentTime=.1;engine.tick();
  assert.equal(engine.voices.get('replay').sources[0].oscillator.detune.events.at(-1)[1],-50);
});
test('unsorted authored notes commit upcoming stage decisions in chronological order',()=>{
  const project=newProject();project.tempo=200;project.meter='1/16';project.loopTicks=480;project.parts[0].notes=[note({id:'later',start:250}),note({id:'earlier',start:130})];project.scenes.loss.parts=[];
  const c=context(),engine=new StudioEngine(c),player=new StudioPlayer(engine,project);player.gameEnabled=true;player.director.setStage('play');player.director.cue('loss',2);player.start();c.currentTime=.08;player.tick();
  assert.equal(engine.voices.size,1);assert.ok([...engine.voices.keys()][0].endsWith(':later'));assert.equal(player.director.history.get(1),'loss');assert.equal(player.director.history.get(2),'play');
});
test('authored parts can use recorded instruments with stable take selection and held-note release',()=>{
  const c=context(),engine=new StudioEngine(c),patch=preset();patch.source='orchestra';patch.instrument='woodwind';
  assert.throws(()=>engine.noteOn('key',60,90,'melody',patch),/Load the recorded bank/);assert.equal(engine.voices.size,0);
  const region={track:'woodwind',midi:60,loKey:0,hiKey:127,loVel:1,hiVel:127,rr:1,url:'flute-1.wav',articulation:'sustain',gainDb:0,buffer:{duration:3},loop:{start:.5,end:2.5}};
  engine.sampleBank={manifest:{gain:1},regions:[region,{...region,rr:2,url:'flute-2.wav'}]};
  engine.noteOn('live-key',64,90,'melody',patch,{eventId:'melody:hook-1'});const live=engine.voices.get('live-key');assert.equal(live.sources[0].oscillator.playbackRate.value,2**(4/12));assert.equal(live.sources[0].oscillator.loop,true);
  engine.noteOn('offline-key',64,90,'melody',patch,{eventId:'melody:hook-1'});assert.equal(engine.voices.get('offline-key').sample.url,live.sample.url);engine.release('live-key',.5);assert.equal(live.releaseAt,.5);assert.ok(Number.isFinite(live.end));engine.dispose();assert.equal(engine.voices.size,0);assert.equal(engine.sampleBank,null);
});
test('custom keyboard layouts are portable and reject duplicate or out-of-range assignments',()=>{
  assert.deepEqual(parseKeyBindings('Q:0, 2:1, W:2'),{KeyQ:0,Digit2:1,KeyW:2});const project=newProject();project.keyBindings=parseKeyBindings('Q:0, W:2');assert.deepEqual(validateProject(project).keyBindings,project.keyBindings);
  for(const bad of ['A:24','A:0,A:2','Control:0','A=2',''])assert.throws(()=>parseKeyBindings(bad));
});
test('earlier version-one projects normalize newly optional patch fields in parts and variations',()=>{
  const project=newProject();project.variations.old=project.parts.map(part=>structuredClone(part.patch));delete project.keyBindings;
  for(const patch of [...project.parts.map(p=>p.patch),...project.variations.old]){delete patch.source;delete patch.instrument;delete patch.articulation;}
  const restored=validateProject(project);assert.equal(restored.parts[0].patch.source,'synth');assert.equal(restored.variations.old[0].instrument,'woodwind');assert.equal(restored.keyBindings.KeyA,0);
});
