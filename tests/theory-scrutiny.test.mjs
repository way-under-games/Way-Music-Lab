import test from 'node:test';import assert from 'node:assert/strict';
import{compose,KEYS,validateScore}from'../src/composer.mjs';
import{MAJOR_SCALE,MINOR_SCALE,pitchClass}from'../src/theory.mjs';
import{MUSIC_PRESETS,presetScoreSettings,presetTheme,createDemoProject,demoScorePlan}from'../src/music-presets.mjs';
import{ScoreDirector,SCORE_PROFILES}from'../src/director.mjs';
import{makeBarMap,parseMeterCycle}from'../src/meter.mjs';

test('an authored seventh and modal thirds remain unchanged across harmony, scenes and narrative profiles',()=>{
 const motif=[0,2,4,6,5,4,2,0];
 for(const themeMode of ['minor','major'])for(const [scoreStyle,profile]of Object.entries(SCORE_PROFILES)){
  const settings={...profile,themeMode,themeMotif:motif,scoreStyle,meterCycle:parseMeterCycle('7/8,5/8,4/4')};
  const s=validateScore(compose({...settings,bars:32})),lead=s.events.filter(n=>n.track===(scoreStyle==='title'?'harp':'woodwind'));
  const expected=motif.map(n=>62+(themeMode==='major'?MAJOR_SCALE:MINOR_SCALE)[n]);
  assert.ok(lead.length>=expected.length);for(let i=0;i<lead.length;i++)assert.equal(lead[i].midi,expected[i%8]);
  for(const bar of s.barMap){const one=compose({...settings,startBar:bar.bar,startTick:bar.startTick,bars:1});assert.deepEqual(one.events,s.events.filter(n=>n.startTick>=bar.startTick&&n.startTick<bar.startTick+bar.durationTicks));}
 }
 const d=new ScoreDirector({theme:{...presetTheme('neon-tide'),mode:'major'}});assert.equal(d.advance(0).settings.themeMode,'major');
});

test('accompaniment responds to the authored hook instead of sharing a blind chord list',()=>{
 const settings={scoreStyle:'playful',bars:8};
 const a=compose({...settings,themeMotif:Array(8).fill(0)}),b=compose({...settings,themeMotif:Array(8).fill(6)});
 assert.notDeepEqual(a.harmony.map(h=>h.notes),b.harmony.map(h=>h.notes));
 assert.ok(b.events.filter(n=>n.track==='woodwind').every(n=>pitchClass(n.midi)===0),'D-minor flat seventh remains C natural');
});

test('examples have independent melodic material and actual tonal/modal arrivals with breathing space',()=>{
 const fingerprints=[];
 for(const spec of MUSIC_PRESETS){const p=createDemoProject(spec.id),plan=demoScorePlan(spec.id),lead=p.parts[0].notes,transpose=KEYS[spec.key]-50;
  fingerprints.push(lead.map(n=>n.midi-transpose).join(','));
  assert.equal(pitchClass(lead.at(-1).midi),pitchClass(KEYS[spec.key]));assert.ok(p.loopTicks-lead.at(-1).start-lead.at(-1).duration>=480*.75);
  assert.equal(plan.functions.at(-1),'i');assert.equal(plan.functions[6],spec.id==='neon-tide'?'VII':'V');
  if(spec.id!=='neon-tide'){assert.equal(plan.functions[3],'V');const previous=plan.lead[6].at(-1)[1],arrival=plan.lead[7][0][1];assert.equal(arrival-previous,1,'Authored ti resolves up to do');}
 }
 assert.equal(new Set(fingerprints).size,3);
});

test('the changing-meter study uses native subdivisions and a consistent group pulse',()=>{
 const p=createDemoProject('clockwork-grove'),map=makeBarMap(parseMeterCycle(p.meter),0,8);
 assert.ok(p.parts[0].notes.every(n=>n.start%120===0));
 for(const bar of map){let beat=0;for(const group of bar.groups){assert.ok(p.parts[2].notes.some(n=>n.start===bar.startTick+beat*480));beat+=group*4/bar.denominator;}}
 const s=compose({...presetScoreSettings('clockwork-grove'),bars:32});assert.ok(s.events.filter(n=>n.track==='woodwind').every(n=>n.startTick%240===0));
});

test('deliberate passing motion and modal seventh colour survive the review',()=>{
 const fantasy=demoScorePlan('lantern-trail');assert.deepEqual(fantasy.lead[0].slice(-3).map(n=>n[1]),[81,79,77]);assert.ok(!fantasy.chords[0].some(n=>pitchClass(n)===pitchClass(79)),'G is a passing fourth above D minor, not a forced chord tone');
 const neon=demoScorePlan('neon-tide');assert.equal(pitchClass(neon.lead[0][1][1]-38),10,'C completes the D-minor seventh colour before transposition');
});
