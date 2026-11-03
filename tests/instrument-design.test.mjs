import test from 'node:test';
import assert from 'node:assert/strict';
import {lfoValue,movementCurve,sculptFrame} from '../src/instrument-design.mjs';
import {preset,validatePatch,blendSounds,newProject,validateProject} from '../src/studio.mjs';

test('custom movement curves interpolate across the repeat boundary and survive patch export',()=>{
  const curve=[0,1,0,-1];assert.equal(lfoValue('custom',.125,curve),.5);assert.equal(lfoValue('custom',.875,curve),-.5);assert.equal(lfoValue('custom',1,curve),0);assert.equal(lfoValue('custom',-.125,curve),-.5);
  const p=preset();p.lfoShape='custom';p.lfoCurve=curve;assert.deepEqual(validatePatch(JSON.parse(JSON.stringify(p))),p);
  const old=preset();delete old.lfoCurve;assert.deepEqual(validatePatch(old).lfoCurve,movementCurve('sine'));
  for(const bad of [[],[0,0,0],[0,1,2,0],[0,NaN,0,0],Array(65).fill(0)])assert.throws(()=>validatePatch({...p,lfoCurve:bad}));
});

test('movement recipes and spectral tools stay bounded and do not mutate their inputs',()=>{
  for(const kind of ['sine','triangle','rise','fall','gate','bounce','steps'])for(const count of [4,16,64]){const curve=movementCurve(kind,count);assert.equal(curve.length,count);assert.ok(curve.every(v=>Number.isFinite(v)&&Math.abs(v)<=1));}
  const original=[1,.4,.2,.1,.05,.02,.01,-.03],before=[...original];
  for(const operation of ['sine','saw','square','bell','brighten','soften','hollow','invert'])assert.ok(sculptFrame(original,operation).every(v=>Math.abs(v)<=1));
  assert.deepEqual(original,before);assert.deepEqual(sculptFrame(original,'hollow').filter((v,i)=>i%2===1),[0,0,0,0]);
  assert.throws(()=>movementCurve('unknown'));assert.throws(()=>movementCurve('sine',100));assert.throws(()=>sculptFrame([], 'brighten'));
});

test('custom movement morphing is portable, bounded, and never rewrites authored notes',()=>{
  const a=preset(),b=preset();a.lfoShape='custom';a.lfoCurve=[-1,1,1,-1];b.lfoShape='custom';b.lfoCurve=movementCurve('rise',32);
  const result=blendSounds(a,b,.5);assert.equal(result.lfoShape,'custom');assert.equal(result.lfoCurve.length,32);assert.deepEqual(validatePatch(result),result);
  const p=newProject();p.parts[0].notes=[{id:'hook',midi:60,start:0,duration:480,velocity:95}];const before=structuredClone(p.parts[0].notes);p.parts[0].patch=result;assert.deepEqual(validateProject(p).parts[0].notes,before);
});
