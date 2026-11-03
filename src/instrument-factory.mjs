// MIT. Original recipes: technique references are documented, no vendor presets copied.
import {preset,validatePatch} from './studio.mjs';
import {newRack,newLayer,newEffect,newModulator} from './instrument-rack.mjs';
import {createInstrumentRecord} from './instrument-library.mjs';
export function classicToRack(input){
  const p=validatePatch(input);if(p.rack)return p;
  const r=newRack();r.layers=[];
  for(const [index,o]of p.oscillators.entries()){
    if(p.source!=='orchestra'&&o.level===0)continue;if(p.source==='orchestra'&&index)break;
    const l=newLayer(p.source==='orchestra'?'orchestra':'synth',p.source==='orchestra'?p.instrument:`Oscillator ${index+1}`);
    l.gain=p.source==='orchestra'?.7:o.level;l.fine=o.detune;l.envelope={attack:p.attack,decay:p.decay,sustain:p.sustain,release:p.release};l.filter={type:'lowpass',cutoff:p.cutoff,resonance:p.resonance};
    l.synth.shape=o.shape;l.synth.engine=o.shape==='harmonic'?'wavetable':'analog';l.synth.frames=structuredClone(p.frames);l.synth.position=p.position;l.orchestra={instrument:p.instrument,articulation:p.articulation};r.layers.push(l);
  }
  if(!r.layers.length){const l=newLayer();l.gain=0;r.layers.push(l);}
  const movement=newModulator();Object.assign(movement,{rate:p.lfoRate,sync:p.lfoSync,period:p.lfoRate,curve:p.lfoCurve});r.modulators.push(movement);
  r.routes=p.routes.map(route=>({...route,layer:'*',source:route.source==='lfo'?movement.id:route.source,amount:route.amount*(route.source==='lfo'?p.lfoDepth:1)}));
  const contour=newModulator('envelope');contour.envelope={attack:p.attack,decay:p.decay,sustain:0,release:p.release};r.modulators.push(contour);r.routes.push({source:contour.id,layer:'*',target:'cutoff',amount:p.filterEnv});
  if(p.effects.drive){const e=newEffect('distortion');e.drive=p.effects.drive;r.effects.push(e);}if(p.effects.delay){const e=newEffect('delay');e.mix=p.effects.delay*.6;e.time=.16+p.macros.space*.3;e.feedback=p.effects.feedback;r.effects.push(e);}
  p.rack=r;return validatePatch(p);
}
export function factoryInstruments(){
  const result=[];
  function add(id,name,tags,description,build){const p=preset(name);p.rack=newRack();build(p.rack);p.rack.layers.forEach((l,i)=>l.id='factory-'+id+'-layer-'+i);p.rack.effects.forEach((e,i)=>e.id='factory-'+id+'-effect-'+i);const record=createInstrumentRecord(p,{name,tags,author:'Way original',license:'MIT',description});record.id='factory-'+id;record.createdAt=record.updatedAt='2026-11-03T00:00:00.000Z';result.push(record);}
  add('prism','Prism chorus',['edm','lead','unison'],'Seven detuned voices with stereo spread. Play chords or a single soaring melody.',r=>{const l=r.layers[0];l.name='Stereo saw ensemble';l.synth.unison=7;l.synth.detune=24;l.synth.randomPhase=true;l.filter.cutoff=7500;l.envelope.release=.5;const e=newEffect('chorus');e.mix=.2;r.effects.push(e);const d=newEffect('delay');d.mix=.16;r.effects.push(d);});
  add('cobalt','Cobalt growl',['edm','bass','fm'],'Audio-rate FM and a separate brightness contour over a clean sub. Try lower octaves.',r=>{const l=r.layers[0];l.name='FM bite';l.synth.engine='fm';l.synth.fm.index=5;l.synth.fm.ratio=1;l.filter.cutoff=4500;l.envelope.release=.15;const sub=newLayer('synth','Clean sub');sub.synth.shape='sine';sub.tune=-12;sub.gain=.35;sub.bypassEffects=true;sub.envelope.release=.15;r.layers.push(sub);const e=newEffect('distortion');e.drive=.45;e.mix=.2;r.effects.push(e);r.play={mode:'mono',legato:true,glide:.08,polyphony:1};});
  add('bell','Lantern mallet',['game','edm','mallet','fm'],'Original FM bell recipe for gentle authored hooks. Bake this into a tuned sample library.',r=>{const l=r.layers[0];l.name='Struck glass';l.synth.engine='fm';l.synth.fm.ratio=3.5;l.synth.fm.index=2.4;l.synth.fm.envelope={attack:.001,decay:.18,sustain:0,release:.1};l.envelope={attack:.002,decay:1.2,sustain:0,release:.9};const e=newEffect('reverb');e.duration=1.3;e.mix=.18;r.effects.push(e);});
  add('map','Map room',['game','keys','warm'],'Soft harmonic keys with a plucked upper layer, suited to contemplative exploration.',r=>{const l=r.layers[0];l.name='Warm keys';l.synth.engine='wavetable';l.synth.frames=[[1,.25,.08,.02,0,0,0,0],[1,.05,.15,0,.03,0,0,0]];l.envelope={attack:.012,decay:.7,sustain:.12,release:.7};l.filter.cutoff=3800;const e=newEffect('reverb');e.mix=.2;r.effects.push(e);});
  add('canopy','Canopy strings',['game','hybrid','orchestra'],'CC0 recorded strings with an original airy synth layer. Requires the bundled VSCO bank.',r=>{const l=r.layers[0];l.name='Recorded strings';l.kind='orchestra';l.orchestra.instrument='strings';l.envelope={attack:.25,decay:.6,sustain:.8,release:1.2};const air=newLayer('synth','Harmonic air');air.synth.engine='wavetable';air.gain=.18;air.tune=12;air.envelope={attack:.5,decay:.8,sustain:.6,release:1.3};r.layers.push(air);const e=newEffect('reverb');e.mix=.25;e.duration=2;r.effects.push(e);});
  add('crypt','Crypt organ',['game','organ','hybrid'],'Original additive organ with an octave reed, a sharp attack and a small room.',r=>{const l=r.layers[0];l.name='Drawbar organ';l.synth.shape='harmonic';l.synth.engine='wavetable';l.synth.frames=[[1,.5,.35,.15,.08,0,.05,0]];l.envelope={attack:.006,decay:.1,sustain:.8,release:.12};const reed=newLayer('synth','Octave reed');reed.synth.shape='square';reed.tune=12;reed.gain=.12;reed.filter.cutoff=3500;r.layers.push(reed);const e=newEffect('reverb');e.duration=.8;e.mix=.15;r.effects.push(e);});
  return result;
}
