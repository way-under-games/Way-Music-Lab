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
  function add(id,name,tags,description,build){
    const p=preset(name);p.revision=2;p.rack=newRack();const r=p.rack;build(r);
    const primary=r.layers[0],config={
      prism:{motion:.1,contour:.22,velocity:.25,period:12},
      cobalt:{motion:.55,contour:.38,velocity:.3,period:4,fmMotion:.28,fmVelocity:.025},
      bell:{motion:.025,contour:.12,velocity:.25,period:12,fmMotion:.012,fmVelocity:.035},
      map:{motion:.06,contour:.28,velocity:.3,period:12,position:.1},
      canopy:{motion:.02,contour:.08,velocity:.12,period:16},
      crypt:{motion:.02,contour:.06,velocity:.04,period:2}
    }[id];
    Object.assign(p.macros,{brightness:.45,motion:id==='cobalt'?.15:.1,width:id==='prism'?.55:.2,space:.25});
    const movement=newModulator();Object.assign(movement,{name:id==='cobalt'?'Body movement':'Subtle movement',sync:true,period:config.period,retrigger:'note',depthSource:'motion'});
    const contour=newModulator('envelope');contour.envelope={attack:id==='canopy'?.4:.005,decay:id==='bell'?.11:.3,sustain:0,release:.15};
    r.modulators.push(movement,contour);
    const route=(source,target,amount,layer=primary.id)=>r.routes.push({source,target,amount,layer});
    route(movement.id,'cutoff',config.motion);route(contour.id,'cutoff',config.contour);route('velocity','cutoff',config.velocity);
    if(primary.synth.engine==='fm'){route(movement.id,'fmIndex',config.fmMotion);route('velocity','fmIndex',config.fmVelocity);}
    if(primary.synth.engine==='wavetable')route(movement.id,'position',config.position??.025);
    for(const layer of r.layers.filter(l=>l.kind==='synth')){if(layer.synth.unison>1){layer.synth.spread=.1;route('width','spread',.85,layer.id);}if(layer.synth.engine==='wavetable'&&layer!==primary)route(movement.id,'position',.06,layer.id);}
    if(id==='crypt'){movement.sync=false;movement.rate=4.8;route(movement.id,'volume',.04);}
    for(const fx of r.effects)if(['reverb','delay','chorus'].includes(fx.type))fx.spaceDepth=fx.type==='reverb'?.24:.16;
    const ids=new Map();r.layers.forEach((l,i)=>{ids.set(l.id,'factory-'+id+'-layer-'+i);l.id=ids.get(l.id);});r.modulators.forEach((m,i)=>{ids.set(m.id,'factory-'+id+'-mod-'+i);m.id=ids.get(m.id);});r.routes.forEach(route=>{route.layer=ids.get(route.layer)??route.layer;route.source=ids.get(route.source)??route.source;});r.effects.forEach((e,i)=>e.id='factory-'+id+'-effect-'+i);
    const record=createInstrumentRecord(p,{name,tags,author:'Way original',license:'MIT',description:description+' Motion shapes the movement depth; Space controls the room/effect blend. Brightness and velocity shape articulation.'});record.id='factory-'+id;record.revision=2;record.createdAt=record.updatedAt='2026-11-23T00:00:00.000Z';result.push(record);
  }
  add('prism','Prism chorus',['edm','lead','unison'],'A focused, warm five-voice lead with a quieter central body. Width opens the stereo image; Space introduces restrained echoes.',r=>{
    const l=r.layers[0];l.name='Warm saw stack';l.gain=.8;l.synth.unison=5;l.synth.detune=9;l.synth.randomPhase=true;l.filter={type:'lowpass',cutoff:5200,resonance:.55};l.envelope={attack:.012,decay:.28,sustain:.62,release:.22};
    const body=newLayer('synth','Focused center');body.synth.shape='triangle';body.gain=.1;body.filter.cutoff=2200;body.envelope={...l.envelope};r.layers.push(body);
    const e=newEffect('chorus');e.mix=.06;e.depth=.12;e.rate=.35;r.effects.push(e);const d=newEffect('delay');d.mix=.09;d.sync=true;d.beats=.75;d.feedback=.17;r.effects.push(d);
  });
  add('cobalt','Cobalt growl',['edm','bass','fm'],'A centered harmonic FM bass with a clean fundamental at the played pitch. Short articulation and restrained glide; Motion adds body rather than an automatic fast wobble.',r=>{
    const l=r.layers[0];l.name='Harmonic bass body';l.gain=.42;l.synth.engine='fm';l.synth.fm.index=1.1;l.synth.fm.ratio=1;l.synth.fm.envelope={attack:.006,decay:.16,sustain:.22,release:.1};l.filter={type:'lowpass',cutoff:1600,resonance:.65};l.envelope={attack:.008,decay:.15,sustain:.7,release:.09};
    const sub=newLayer('synth','Clean fundamental');sub.synth.shape='sine';sub.tune=0;sub.gain=.35;sub.bypassEffects=true;sub.envelope={...l.envelope};r.layers.push(sub);
    const e=newEffect('distortion');e.drive=.12;e.mix=.1;r.effects.push(e);const d=newEffect('delay');d.time=.12;d.mix=0;d.feedback=.12;r.effects.push(d);r.play={mode:'mono',legato:true,glide:.025,polyphony:1};
  });
  add('bell','Lantern mallet',['game','edm','mallet','fm'],'A rounded, tuned FM tine with a brief wooden attack and a controlled release. Harder playing adds brightness without turning every note into a metallic clang.',r=>{
    const l=r.layers[0];l.name='Rounded tine';l.gain=.65;l.synth.engine='fm';l.synth.fm.ratio=2;l.synth.fm.index=.85;l.synth.fm.envelope={attack:.004,decay:.11,sustain:.015,release:.06};l.filter={type:'lowpass',cutoff:7600,resonance:.55};l.envelope={attack:.004,decay:.65,sustain:.045,release:.26};
    const wood=newLayer('synth','Soft attack');wood.synth.shape='triangle';wood.gain=.045;wood.filter.cutoff=2600;wood.envelope={attack:.003,decay:.07,sustain:0,release:.04};r.layers.push(wood);
    const e=newEffect('reverb');e.duration=.85;e.mix=.09;r.effects.push(e);
  });
  add('map','Map room',['game','keys','warm'],'A warm, clear harmonic keyboard with a quiet upper transient. A solid fundamental and short room leave space for chords and counterlines.',r=>{
    const l=r.layers[0];l.name='Warm keys';l.synth.engine='wavetable';l.synth.frames=[Array.from({length:32},(_,i)=>[1,.22,.09,.035,.015,.008,.004,.002][i]??0),Array.from({length:32},(_,i)=>[1,.25,.12,.05,.022,.01,.005,.002][i]??0)];l.synth.position=.15;l.envelope={attack:.008,decay:.48,sustain:.18,release:.23};l.filter={type:'lowpass',cutoff:3000,resonance:.55};
    const pluck=newLayer('synth','Quiet upper transient');pluck.synth.shape='triangle';pluck.tune=12;pluck.gain=.035;pluck.filter.cutoff=2800;pluck.envelope={attack:.004,decay:.12,sustain:0,release:.06};r.layers.push(pluck);const e=newEffect('reverb');e.mix=.08;e.duration=.9;r.effects.push(e);
  });
  add('canopy','Canopy strings',['game','hybrid','orchestra'],'Recorded strings lead the sound; a very quiet unison synth supports the body without an obvious synthetic octave. Requires the bundled CC0 VSCO bank.',r=>{
    const l=r.layers[0];l.name='Recorded strings';l.kind='orchestra';l.gain=.72;l.orchestra.instrument='strings';l.filter={type:'lowpass',cutoff:8200,resonance:.55};l.envelope={attack:.12,decay:.5,sustain:.85,release:.55};
    const air=newLayer('synth','Quiet body support');air.synth.engine='wavetable';air.gain=.04;air.tune=0;air.synth.frames=[[1,.12,.035,.012,.003,0,0,0],[1,.1,.05,.015,.005,0,0,0]];air.synth.position=.3;air.filter.cutoff=3200;air.envelope={attack:.6,decay:.8,sustain:.55,release:1};r.layers.push(air);const e=newEffect('reverb');e.mix=.12;e.duration=1.35;r.effects.push(e);
  });
  add('crypt','Crypt organ',['game','organ','hybrid'],'A restrained drawbar registration with a soft upper stop. Stable tuning, softened key-on and a small room replace the bright fairground edge.',r=>{
    const l=r.layers[0];l.name='Warm drawbars';l.synth.shape='harmonic';l.synth.engine='wavetable';l.synth.frames=[[1,.3,.12,.06,.04,0,.015,0]];l.filter={type:'lowpass',cutoff:4600,resonance:.55};l.envelope={attack:.012,decay:.1,sustain:.8,release:.16};
    const reed=newLayer('synth','Soft upper stop');reed.synth.shape='triangle';reed.tune=12;reed.gain=.025;reed.filter.cutoff=2300;reed.envelope={...l.envelope};r.layers.push(reed);const e=newEffect('reverb');e.duration=1.1;e.mix=.1;r.effects.push(e);
  });
  return result;
}
