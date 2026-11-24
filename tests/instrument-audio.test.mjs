import test from 'node:test';
import assert from 'node:assert/strict';
import {StudioEngine} from '../src/studio-audio.mjs';
import {preset,PPQ} from '../src/studio.mjs';
import {newRack,newModulator} from '../src/instrument-rack.mjs';
function context(){const nodes=[];const param=()=>({value:0,events:[],setValueAtTime(v,t){this.events.push(['value',v,t]);},linearRampToValueAtTime(v,t){this.events.push(['ramp',v,t]);},setTargetAtTime(v,t){this.events.push(['target',v,t]);},cancelAndHoldAtTime(t){this.events.push(['hold',t]);}});const node=()=>{const n={gain:param(),frequency:param(),detune:param(),pan:param(),Q:param(),delayTime:param(),threshold:param(),ratio:param(),connect(to){return to;},disconnect(){this.disconnected=true;},start(t){this.started=t;},stop(t){this.stopped=t;},setPeriodicWave(w){this.wave=w;}};nodes.push(n);return n;};return{currentTime:0,sampleRate:48000,nodes,destination:{},createGain:node,createBiquadFilter:node,createStereoPanner:node,createWaveShaper:node,createDelay:node,createDynamicsCompressor:node,createAnalyser:node,createOscillator:node,createPeriodicWave:(re,im)=>({re,im})};}
function patch(){const p=preset();p.rack=newRack();return p;}
const last=p=>p.events.filter(e=>e[0]==='target').at(-1)?.[1];
test('rack unison and FM allocate the actual sources, and release/disposal cleans every node',()=>{
  const c=context(),e=new StudioEngine(c),p=patch(),l=p.rack.layers[0];l.synth.engine='fm';l.synth.unison=5;
  assert.ok(e.noteOn('a',60,100,'part',p));const v=e.voices.get('a');assert.equal(v.sources.length,10);assert.equal(v.rackVoice.cost,10);
  assert.notEqual(v.rackVoice.layers[0].sources[0].fm.mod.frequency.value,0);
  const originalRelease=l.envelope.release;l.envelope.release=4;e.update('part',p,p.macros);e.release('a',.5);assert.equal(v.end,.5+originalRelease+.03);
  e.dispose();assert.equal(e.voices.size,0);assert.equal(e.rackAudio.buses.size,0);assert.ok(c.nodes.every(n=>n.disconnected));
});
test('rack articulation uses the portable PPQ and routes independent modulation to each layer',()=>{
  const c=context(),e=new StudioEngine(c),p=patch(),l=p.rack.layers[0];l.filter.cutoff=1000;const m=newModulator();m.curve=[0,1,0,-1];m.rate=1;p.rack.modulators=[m];p.rack.routes=[{source:m.id,layer:l.id,target:'cutoff',amount:1}];
  e.noteOn('a',60,100,'part',p,{tempo:120,expression:[{tick:PPQ,value:2}]});const v=e.voices.get('a'),s=v.rackVoice.layers[0].sources[0];e.updateVoice(v,.25,120);assert.equal(v.cutoff,2000);assert.ok(Math.abs(last(s.osc.frequency)-261.625565)<.001);e.updateVoice(v,.5,120);assert.ok(Math.abs(last(s.osc.frequency)-293.664768)<.001,'Expression starts at one quarter beat, not twice as early');e.dispose();
});
test('mono overlapping notes crossfade at scheduled time and glide from the prior pitch',()=>{
  const c=context(),e=new StudioEngine(c),p=patch();p.rack.play={mode:'mono',legato:true,glide:.2,polyphony:1};
  e.noteOn('a',60,100,'part',p,{time:0});e.release('a',2);e.noteOn('b',72,100,'part',p,{time:.5});const first=e.voices.get('a'),second=e.voices.get('b');assert.equal(first.releaseAt,.5);assert.ok(first.end<.55);assert.equal(second.rackVoice.fromMidi,60);assert.ok(second.rackVoice.legato);e.updateVoice(second,.7);assert.ok(Math.abs(last(second.rackVoice.layers[0].sources[0].osc.frequency)-523.25113)<.001);e.dispose();
});
test('runtime source budget rejects allocation before creating another oversized graph',()=>{
  const c=context(),e=new StudioEngine(c),p=patch();p.rack.layers[0].synth.engine='fm';p.rack.layers[0].synth.unison=7;
  for(let i=0;i<18;i++)assert.equal(e.noteOn(String(i),60,100,'part',p),true);const count=c.nodes.length;assert.equal(e.noteOn('overflow',60,100,'part',p),false);assert.equal(c.nodes.length,count);assert.equal(e.dropped,1);e.dispose();
});

test('wavetable morph schedules fixed frame gains with honest source counts for offline parity',()=>{
  const c=context(),e=new StudioEngine(c),p=patch(),l=p.rack.layers[0];l.synth.engine='wavetable';l.synth.frames=[[1,0,0,0],[0,1,0,0],[0,0,1,0]];l.synth.unison=2;
  e.noteOn('wave',60,100,'part',p);const v=e.voices.get('wave'),sources=v.rackVoice.layers[0].sources;assert.equal(sources.length,6);assert.equal(v.rackVoice.cost,6);const waves=sources.map(s=>s.osc.wave);p.rack.layers[0].synth.position=1;e.update('part',p,p.macros);e.updateVoice(v,.5);assert.deepEqual(sources.map(s=>s.osc.wave),waves,'Future control changes cannot replace the wave of an already scheduled offline oscillator');assert.equal(last(sources[0].level.gain),0);assert.equal(last(sources[2].level.gain),1/Math.sqrt(2));e.dispose();
});


test('phase-bearing table reaches native wave coefficients and preserves phase under start offset',()=>{
  const c=context(),e=new StudioEngine(c),p=patch(),s=p.rack.layers[0].synth;s.engine='wavetable';s.frames=[[0,0,0,0]];s.frameCosines=[[1,0,0,0]];
  e.noteOn('cos',69,100,'part',p);const wave=e.voices.get('cos').rackVoice.layers[0].sources[0].osc.wave;
  assert.equal(wave.re[1],1);assert.equal(wave.im[1],0);e.silence();s.phase=.25;e.noteOn('shift',69,100,'part',p);
  const shifted=e.voices.get('shift').rackVoice.layers[0].sources[0].osc.wave;assert.ok(Math.abs(shifted.im[1]+1)<1e-6);e.dispose();
});

test('held-note Width changes unison stereo spread and Space reuses the shared effect bus',async()=>{
  const {newEffect}=await import('../src/instrument-rack.mjs');const c=context(),e=new StudioEngine(c),p=patch(),s=p.rack.layers[0].synth;s.unison=3;s.spread=0;
  p.rack.routes=[{source:'width',layer:'*',target:'spread',amount:1}];const fx=newEffect('delay');fx.mix=.2;fx.spaceDepth=.5;p.rack.effects=[fx];p.macros.width=0;p.macros.space=.3;
  e.noteOn('held',60,100,'part',p);const v=e.voices.get('held'),bus=v.rackVoice.bus,source=v.rackVoice.layers[0].sources[0];assert.ok(last(source.stereo.pan)===0);assert.equal(last(bus.mixes[0].wet),.2);
  p.macros.width=1;p.macros.space=1;e.update('part',p,p.macros);e.updateVoice(v,.5);
  assert.equal(last(source.stereo.pan),-1);assert.ok(Math.abs(last(bus.mixes[0].wet)-.55)<1e-10);assert.equal(e.rackAudio.buses.size,1);assert.equal(v.rackVoice.bus,bus);e.dispose();
});
