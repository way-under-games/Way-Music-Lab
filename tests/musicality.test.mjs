import test from 'node:test';
import assert from 'node:assert/strict';
import {cycleCoefficients,cycleValue} from '../src/waveform.mjs';
import {compose,validateScore,normalizeSettings} from '../src/composer.mjs';
import {DEFAULT_THEME,ScoreDirector} from '../src/director.mjs';
import {newRack,validateRack} from '../src/instrument-rack.mjs';
import {factoryInstruments} from '../src/instrument-factory.mjs';
import {parseMeterCycle} from '../src/meter.mjs';

test('drawn cosine, asymmetric and independent-phase cycles reconstruct without losing phase',()=>{
  for(const fn of [x=>Math.cos(x),x=>.4*Math.cos(x)+.25*Math.sin(2*x)+.2*Math.cos(3*x+.7)]){
    const samples=Array.from({length:192},(_,i)=>fn(i/192*2*Math.PI));
    const {sine,cosine}=cycleCoefficients(samples,32);
    assert.ok(samples.every((v,i)=>Math.abs(v-cycleValue(sine,cosine,i/192,false))<1e-12));
  }
  const legacy=[1,.25,.1,0];assert.equal(cycleValue(legacy,[],0),0);
  const dc=cycleCoefficients(Array(192).fill(.3),32);assert.ok([...dc.sine,...dc.cosine].every(x=>Math.abs(x)<1e-13));
  assert.throws(()=>cycleCoefficients([1,NaN],32));assert.throws(()=>cycleCoefficients(Array(16).fill(0),8));
});

test('phase-bearing frames validate and survive portable patch recall with legacy compatibility',()=>{
  const rack=newRack(),s=rack.layers[0].synth;s.engine='wavetable';s.frameCosines=[s.frames[0].map((_,i)=>i===0?1:0)];
  assert.deepEqual(validateRack(JSON.parse(JSON.stringify(rack))),rack);
  s.frameCosines=[[2]];assert.throws(()=>validateRack(rack));delete s.frameCosines;assert.deepEqual(validateRack(rack),rack);
});

test('quiet arrangements retain every theme pitch in order and keep rhythmic breathing space',()=>{
  const expected=DEFAULT_THEME.motif.map(n=>62+[0,2,3,5,7,8,10][n]);
  for(const scoreStyle of ['contemplative','loss']){
    const score=validateScore(compose({themeMotif:DEFAULT_THEME.motif,scoreStyle,bars:4}));
    const notes=score.events.filter(n=>n.track==='woodwind');assert.deepEqual(notes.map(n=>n.midi),expected);
    assert.ok(new Set(notes.map(n=>n.durationTicks)).size>=3);
    assert.ok(notes.reduce((sum,n)=>sum+n.durationTicks,0)<score.durationTicks*.6);
  }
});

test('authored theme rhythm is immutable, validated and retained by director and partial mixed-meter requests',()=>{
  const rhythm=Array.from({length:8},(_,i)=>({position:i/8,duration:.05}));
  const director=new ScoreDirector({theme:{...DEFAULT_THEME,rhythm,meterCycle:parseMeterCycle('7/8,5/8,4/4')}});
  rhythm[0].position=.2;assert.equal(director.theme.rhythm[0].position,0);
  const settings=director.advance(0).settings,whole=compose({...settings,bars:32});
  assert.deepEqual(settings.themeRhythm,director.theme.rhythm);
  for(const bar of whole.barMap){const one=compose({...settings,bars:1,startBar:bar.bar,startTick:bar.startTick});assert.deepEqual(one.events,whole.events.filter(n=>n.startTick>=bar.startTick&&n.startTick<bar.startTick+bar.durationTicks));}
  assert.throws(()=>normalizeSettings({themeRhythm:[{position:0,duration:0}]}));
  assert.throws(()=>normalizeSettings({themeRhythm:Array(8).fill({position:.2,duration:.1})}));
});

test('longer arrangements contrast and return while the protected theme retains its pitch order',()=>{
  const score=compose({themeMotif:DEFAULT_THEME.motif,scoreStyle:'playful',bars:32});
  const pattern=bar=>score.events.filter(n=>n.startTick>=bar*1920&&n.startTick<(bar+1)*1920).map(n=>[n.track,n.startTick-bar*1920,n.durationTicks,n.midi]);
  assert.notDeepEqual(pattern(0),pattern(8));assert.notDeepEqual(score.harmony.slice(0,8).map(h=>h.notes),score.harmony.slice(16,24).map(h=>h.notes));
  assert.deepEqual(pattern(0),pattern(24));
  const lead=score.events.filter(n=>n.track==='woodwind').map(n=>n.midi);
  for(let i=8;i<lead.length;i+=8)assert.deepEqual(lead.slice(i,i+8),lead.slice(0,8));
});

test('every factory instrument has stable, connected articulation and motion mappings',()=>{
  for(const {patch} of factoryInstruments()){
    const r=validateRack(patch.rack);assert.ok(r.modulators.some(m=>m.depthSource==='motion'));
    assert.ok(r.routes.some(route=>route.source==='velocity'));assert.ok(r.effects.some(e=>e.spaceDepth>0));
    assert.ok(r.routes.some(route=>r.modulators.some(m=>m.id===route.source)));
  }
});
