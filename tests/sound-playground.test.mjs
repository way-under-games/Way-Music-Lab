import test from 'node:test';
import assert from 'node:assert/strict';
import {SOUND_WORLDS,soundWorld,exploreSound,mutateSound,blendSounds,preset,validatePatch,newProject,validateProject} from '../src/studio.mjs';

test('sound worlds have contrasting oscillator, envelope, filter and movement identities',()=>{
  const patches=SOUND_WORLDS.map(w=>soundWorld(w.id));
  for(const p of patches)assert.deepEqual(validatePatch(p),p);
  assert.equal(new Set(patches.map(p=>JSON.stringify(p))).size,6);
  assert.ok(soundWorld('drone').attack>soundWorld('crystal').attack*100);
  assert.ok(soundWorld('crystal').cutoff>soundWorld('sub').cutoff*30);
  assert.ok(soundWorld('swarm').effects.drive>soundWorld('crystal').effects.drive+.7);
  assert.equal(soundWorld('arcade').lfoShape,'square');
  assert.throws(()=>soundWorld('missing'));
});

test('planet blends remain bounded, preserve locks, and leave source patches intact',()=>{
  const original=preset();original.locks=['cutoff','attack'];const before=structuredClone(original);
  for(let x=0;x<=10;x++)for(let y=0;y<=10;y++){
    const p=exploreSound(original,x/10,y/10);assert.deepEqual(validatePatch(p),p);
    assert.equal(p.cutoff,original.cutoff);assert.equal(p.attack,original.attack);
  }
  assert.deepEqual(original,before);
  assert.notDeepEqual(exploreSound(original,0,0).frames,exploreSound(original,1,1).frames);
  assert.throws(()=>exploreSound(original,NaN,0));assert.throws(()=>exploreSound(original,0,2));
  assert.deepEqual(blendSounds(original,soundWorld('acid'),0),original);
  assert.deepEqual(blendSounds(original,soundWorld('acid'),1),soundWorld('acid'));
});

test('mutation is reproducible with a supplied random source, respects locks and preserves project notes',()=>{
  const p=newProject();p.parts[0].notes=[{id:'hook',midi:65,start:0,duration:480,velocity:93}];
  const before=structuredClone(p.parts[0].notes),original=structuredClone(p.parts[0].patch);original.locks=['release','cutoff'];
  const mutated=mutateSound(original,1,()=>.45);
  assert.deepEqual(mutated,mutateSound(original,1,()=>.45));
  assert.equal(mutated.release,original.release);assert.equal(mutated.cutoff,original.cutoff);
  assert.notDeepEqual(mutated.oscillators,original.oscillators);
  assert.deepEqual(mutateSound(original,0),original);
  for(const strength of [.01,.5,.99,1])for(const r of [0,.2,.4,.6,.8,1])validatePatch(mutateSound(original,strength,()=>r));
  p.parts[0].patch=mutated;assert.deepEqual(validateProject(p).parts[0].notes,before);
});
