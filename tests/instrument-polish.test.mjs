import test from 'node:test';import assert from 'node:assert/strict';
import{factoryInstruments}from'../src/instrument-factory.mjs';import{validateRack,layerSourceCost}from'../src/instrument-rack.mjs';
import{preset,soundWorld,SOUND_WORLDS,validatePatch}from'../src/studio.mjs';

test('factory instruments start with restrained tuning and processing while retaining independent motion',()=>{
 for(const record of factoryInstruments()){
  const p=record.patch,r=validateRack(p.rack);assert.equal(record.revision,2);assert.ok(p.macros.motion<=.15);
  assert.ok(r.routes.every(route=>route.target!=='pitch'),'Factory movement must not alter the authored key pitch');
  for(const layer of r.layers.filter(l=>l.kind==='synth'))assert.ok(layer.synth.detune<=12);
  for(const fx of r.effects){if(['reverb','delay','chorus'].includes(fx.type))assert.ok(Math.max(0,fx.mix+(p.macros.space-.3)*fx.spaceDepth)<.2);if(fx.type==='delay')assert.ok(fx.feedback<=.2);}
  assert.ok(r.modulators.some(m=>m.depthSource==='motion'));assert.ok(r.layers.reduce((sum,l)=>sum+layerSourceCost(l),0)<=8);
 }
});

test('the rounded mallet uses harmonic FM and bounded velocity brightness; the bass retains its keyed fundamental',()=>{
 const bank=factoryInstruments(),mallet=bank.find(r=>r.id==='factory-bell').patch;
 const tine=mallet.rack.layers[0];assert.equal(tine.synth.fm.ratio%1,0);assert.ok(tine.synth.fm.index<1);
 const velocity=mallet.rack.routes.filter(r=>r.source==='velocity'&&r.target==='fmIndex').reduce((sum,r)=>sum+r.amount*12,0);assert.ok(tine.synth.fm.index+velocity<2);assert.ok(tine.envelope.release<.5);
 const bass=bank.find(r=>r.id==='factory-cobalt').patch.rack,clean=bass.layers.find(l=>l.bypassEffects);assert.ok(clean);assert.equal(clean.synth.shape,'sine');assert.equal(clean.tune,0);assert.ok(bass.play.glide<.04);
});

test('sound worlds keep tonal pitch stable and classic defaults leave more room for the musical arrangement',()=>{
 for(const world of SOUND_WORLDS){const p=soundWorld(world.id);assert.ok(p.routes.every(r=>r.target!=='pitch'));assert.ok(p.effects.feedback<=.25);assert.ok(p.oscillators.every(o=>Math.abs(o.detune)<=7));}
 for(const name of ['Glass lantern','Paper sky','Copper wire','Moss bass']){const p=preset(name);assert.equal(p.effects.drive,0);assert.ok(p.effects.delay<=.1);assert.ok(p.release<=.7);}
});

test('saved expressive sounds remain valid without replacing their tuning, FM ratio, modulation or effects',()=>{
 const p=factoryInstruments()[2].patch;p.rack.layers[0].synth.fm.ratio=3.5;p.rack.layers[0].synth.fm.index=6;p.rack.layers[0].synth.detune=38;p.rack.routes.push({source:'motion',layer:'*',target:'pitch',amount:.8});p.rack.effects[0].mix=.8;
 const saved=JSON.parse(JSON.stringify(p));assert.deepEqual(validatePatch(saved),saved);
 const classic=soundWorld('arcade');classic.routes=[{source:'lfo',target:'pitch',amount:.5}];assert.deepEqual(validatePatch(classic),classic);
});
