import test from 'node:test';
import assert from 'node:assert/strict';
import {MUSIC_PRESETS,createDemoProject,presetTheme,presetScoreSettings,instrumentPreviewNotes} from '../src/music-presets.mjs';
import {newProject,validateProject,PPQ} from '../src/studio.mjs';
import {compose,validateScore} from '../src/composer.mjs';
import {ScoreDirector} from '../src/director.mjs';
import {parseMeterCycle,makeBarMap} from '../src/meter.mjs';

test('original preset scores contain complete contrasting musical roles and valid eight-bar loops',()=>{
  const identities=[];assert.throws(()=>MUSIC_PRESETS[0].motif[0]=6);
  for(const spec of MUSIC_PRESETS){
    const p=validateProject(createDemoProject(spec.id));assert.deepEqual(p,createDemoProject(spec.id));assert.equal(p.parts.length,5);
    assert.ok(p.parts.every(part=>part.notes.length>0));assert.ok(new Set(p.parts[0].notes.map(n=>n.duration)).size>=3);
    assert.ok(new Set(p.parts[0].notes.map(n=>n.midi)).size>=5);
    const map=makeBarMap(parseMeterCycle(p.meter),0,8);assert.equal(p.loopTicks,map.at(-1).startTick+map.at(-1).durationTicks);
    for(const part of p.parts)for(const n of part.notes)assert.ok(n.start+n.duration<=p.loopTicks);
    assert.ok(p.scenes.title.parts.length<p.scenes.danger.parts.length);assert.ok(p.scenes.opening.variation&&p.scenes.loss.variation);
    identities.push(JSON.stringify(p.parts.map(part=>part.notes.map(n=>[n.start,n.duration,n.midi]))));
    const copy=createDemoProject(spec.id);copy.parts[0].notes[0].midi=0;assert.notEqual(createDemoProject(spec.id).parts[0].notes[0].midi,0);
  }
  assert.equal(new Set(identities).size,3);assert.ok(newProject().parts.every(p=>p.notes.length===0),'Blank score API remains available');
});

test('each palette works across scenes and narrative stages with a stable theme on new games',()=>{
  for(const spec of MUSIC_PRESETS){
    for(const scene of ['explore','battle','tension','victory'])validateScore(compose({...presetScoreSettings(spec.id,scene),bars:32}));
    const d=new ScoreDirector({theme:presetTheme(spec.id)}),first=d.advance(0);d.setStage('play');d.setTelemetry({danger:1,movement:.8});for(let i=1;i<12;i++)validateScore(compose({...d.advance(i).settings,startBar:i,bars:1}));
    d.resetTimeline();d.setStage('title');assert.deepEqual(d.advance(0).settings.themeMotif,first.settings.themeMotif);
    assert.deepEqual(d.theme.motif,spec.motif);
  }
  assert.throws(()=>createDemoProject('unknown'));assert.throws(()=>presetTheme('unknown'));
});

test('instrument audition phrases have varied timing and velocity and stay inside a playable register',()=>{
  for(const bass of [false,true]){const notes=instrumentPreviewNotes({bass,midi:bass?48:60});assert.equal(notes.length,5);assert.ok(new Set(notes.map(n=>n.velocity)).size>2);assert.ok(notes.every(n=>n.midi>=48&&n.midi<=84&&n.duration>0));assert.ok(notes.at(-1).beat+notes.at(-1).duration<=4);}
});
